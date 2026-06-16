import json
import os

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from .cloud_connections import get_aws_identity_from_runtime_env, resolve_lab_cloud_connection_with_source
from .models import (
    AmiCatalogEntry,
    CloudExecutionDelegation,
    CloudAuthTypeChoices,
    CloudConnection,
    CloudConnectionScopeChoices,
    Course,
    KeyPairCatalogEntry,
    Lab,
    Plan,
    PlanExecutionRecord,
    ProviderChoices,
    ROLE_PLATFORM_ADMIN,
    ROLE_STUDENT,
    ROLE_TEACHER,
    STATUS_ACTIVE,
    STATUS_DEACTIVATED,
    STATUS_PENDING,
    UserProfile,
    VisibilityScopeChoices,
)
from .permissions import can_edit_cloud_connection, can_execute_plan, canonical_role
from .providers.connection_registry import get_provider_connection_spec
from .providers.runtime_registry import get_provider_runtime_hooks, get_runtime_identity


ROLE_CHOICES = [ROLE_PLATFORM_ADMIN, ROLE_TEACHER, ROLE_STUDENT]
STATUS_CHOICES = [STATUS_PENDING, STATUS_ACTIVE, STATUS_DEACTIVATED]


class PlanExecutionRecordSerializer(serializers.ModelSerializer):
    requested_by = serializers.SerializerMethodField()
    delegation_id = serializers.UUIDField(source="delegation.id", read_only=True)

    class Meta:
        model = PlanExecutionRecord
        fields = (
            "id",
            "action",
            "status",
            "simulate_only",
            "provider",
            "task_id",
            "cloud_connection_name",
            "cloud_connection_scope",
            "resolved_execution_source",
            "credential_source",
            "account_id",
            "arn",
            "sts_user_id",
            "error",
            "requested_by",
            "delegation_id",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_requested_by(self, obj):
        if not obj.requested_by_id:
            return None
        user = obj.requested_by
        full = f"{user.first_name} {user.last_name}".strip()
        return {
            "id": user.id,
            "email": user.email,
            "display_name": full or user.username or user.email,
            "role": canonical_role(user),
        }


class CloudExecutionDelegationSerializer(serializers.ModelSerializer):
    owner_user = serializers.SerializerMethodField()
    delegate_user = serializers.SerializerMethodField()
    lab = serializers.SerializerMethodField()
    cloud_connection = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = CloudExecutionDelegation
        fields = (
            "id",
            "lab",
            "cloud_connection",
            "owner_user",
            "delegate_user",
            "course",
            "provider",
            "note",
            "is_active",
            "status",
            "expires_at",
            "revoked_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_status(self, obj):
        if obj.revoked_at:
            return "revoked"
        if obj.expires_at and obj.expires_at <= timezone.now():
            return "expired"
        return "active" if obj.is_currently_active else "inactive"

    def _serialize_user(self, user):
        if not user:
            return None
        full = f"{user.first_name} {user.last_name}".strip()
        return {
            "id": user.id,
            "email": user.email,
            "display_name": full or user.username or user.email,
            "role": canonical_role(user),
        }

    def get_owner_user(self, obj):
        return self._serialize_user(getattr(obj, "owner_user", None))

    def get_delegate_user(self, obj):
        return self._serialize_user(getattr(obj, "delegate_user", None))

    def get_lab(self, obj):
        return {
            "id": str(obj.lab_id),
            "name": obj.lab.name,
            "canvas_id": obj.lab.canvas_id,
        } if obj.lab_id else None

    def get_cloud_connection(self, obj):
        if not obj.cloud_connection_id:
            return None
        return {
            "id": str(obj.cloud_connection_id),
            "name": obj.cloud_connection.name,
            "scope": obj.cloud_connection.scope,
        }

    def get_course(self, obj):
        if not obj.course_id:
            return None
        return {
            "id": str(obj.course_id),
            "name": obj.course.name,
            "code": obj.course.code,
            "teacher_id": obj.course.teacher_id,
            "teacher_email": obj.course.teacher.email,
            "is_active": obj.course.is_active,
        }


class CanonicalProviderChoiceField(serializers.ChoiceField):
    def to_internal_value(self, data):
        value = data

        if isinstance(value, (list, tuple)):
            value = value[0] if value else ""

        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned.startswith("["):
                try:
                    parsed = json.loads(cleaned)
                except Exception:
                    cleaned = cleaned.replace("[", "").replace("]", "").replace('"', "").strip()
                else:
                    value = parsed
                    if isinstance(value, (list, tuple)):
                        value = value[0] if value else ""
                    elif value is None:
                        value = ""
                    else:
                        value = str(value)
                    cleaned = str(value).strip()
            value = cleaned.lower()

        return super().to_internal_value(value)


class PlanListSerializer(serializers.ModelSerializer):
    can_apply = serializers.SerializerMethodField()
    simulate_only = serializers.SerializerMethodField()
    can_destroy = serializers.SerializerMethodField()
    canvas_id = serializers.SerializerMethodField()
    firestore_vpc_id = serializers.SerializerMethodField()
    lab = serializers.SerializerMethodField()
    owner_user = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = (
            "id",
            "name",
            "status",
            "applied",
            "last_action",
            "auto_destroy_at",
            "created_at",
            "can_apply",
            "simulate_only",
            "can_destroy",
            "canvas_id",
            "firestore_vpc_id",
            "lab",
            "owner_user",
            "course",
        )
        read_only_fields = fields

    def get_simulate_only(self, obj):
        if bool(getattr(obj, "applied", False)):
            return False
        return bool(getattr(obj, "payload_simulate_only", True))

    def get_can_apply(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        return can_execute_plan(request.user, obj)

    def get_can_destroy(self, obj):
        return bool(self.get_can_apply(obj) and getattr(obj, "can_destroy_now", False))

    def get_canvas_id(self, obj):
        return obj.canvas_id

    def get_firestore_vpc_id(self, obj):
        # Deprecated alias kept for backward compatibility with older clients.
        return obj.canvas_id

    def get_lab(self, obj):
        if not obj.lab_id:
            return None
        return {
            "id": str(obj.lab_id),
            "name": obj.lab.name,
            "notes": obj.lab.notes,
            "owner_user": UserSummarySerializer(obj.lab.owner_user).data if getattr(obj.lab, "owner_user", None) else None,
            "course": CourseSummarySerializer(obj.lab.course).data if getattr(obj.lab, "course", None) else None,
            "visibility_scope": obj.lab.visibility_scope,
        }

    def get_owner_user(self, obj):
        if not getattr(obj, "lab", None) or not getattr(obj.lab, "owner_user", None):
            return None
        return UserSummarySerializer(obj.lab.owner_user).data

    def get_course(self, obj):
        if not getattr(obj, "lab", None) or not getattr(obj.lab, "course", None):
            return None
        return CourseSummarySerializer(obj.lab.course).data


class PlanDetailSerializer(serializers.ModelSerializer):
    can_apply = serializers.SerializerMethodField()
    simulate_only = serializers.SerializerMethodField()
    can_destroy = serializers.SerializerMethodField()
    canvas_id = serializers.SerializerMethodField()
    firestore_vpc_id = serializers.SerializerMethodField()
    lab = serializers.SerializerMethodField()
    last_apply_context = serializers.JSONField(read_only=True)
    resolved_execution_target = serializers.SerializerMethodField()
    execution_history = serializers.SerializerMethodField()
    cloud_target_state = serializers.SerializerMethodField()
    owner_user = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = (
            "id",
            "name",
            "status",
            "task_id",
            "created_at",
            "updated_at",
            "payload",
            "outputs",
            "applied",
            "last_action",
            "auto_destroy_at",
            "error",
            "can_apply",
            "simulate_only",
            "can_destroy",
            "last_deploy_task_id",
            "last_destroy_task_id",
            "auto_destroy_task_id",
            "last_apply_context",
            "resolved_execution_target",
            "execution_history",
            "cloud_target_state",
            "canvas_id",
            "firestore_vpc_id",
            "canvas_hash",
            "canvas_updated_at",
            "lab",
            "owner_user",
            "course",
        )
        read_only_fields = fields

    def get_simulate_only(self, obj):
        if bool(getattr(obj, "applied", False)):
            return False
        return bool(getattr(obj, "payload_simulate_only", True))

    def get_can_apply(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        return can_execute_plan(request.user, obj)

    def get_can_destroy(self, obj):
        return bool(self.get_can_apply(obj) and getattr(obj, "can_destroy_now", False))

    def get_canvas_id(self, obj):
        return obj.canvas_id

    def get_firestore_vpc_id(self, obj):
        # Deprecated alias kept for backward compatibility with older clients.
        return obj.canvas_id

    def get_lab(self, obj):
        if not obj.lab_id:
            return None
        return {
            "id": str(obj.lab_id),
            "name": obj.lab.name,
            "notes": obj.lab.notes,
            "owner_user": UserSummarySerializer(obj.lab.owner_user).data if getattr(obj.lab, "owner_user", None) else None,
            "course": CourseSummarySerializer(obj.lab.course).data if getattr(obj.lab, "course", None) else None,
            "visibility_scope": obj.lab.visibility_scope,
        }

    def get_resolved_execution_target(self, obj):
        return serialize_resolved_execution_target(getattr(obj, "lab", None), getattr(obj, "payload", None))

    def get_execution_history(self, obj):
        history = list(obj.execution_history.select_related("requested_by", "delegation").all()[:10])
        return PlanExecutionRecordSerializer(history, many=True).data

    def get_cloud_target_state(self, obj):
        return serialize_cloud_target_state(obj)

    def get_owner_user(self, obj):
        if not getattr(obj, "lab", None) or not getattr(obj.lab, "owner_user", None):
            return None
        return UserSummarySerializer(obj.lab.owner_user).data

    def get_course(self, obj):
        if not getattr(obj, "lab", None) or not getattr(obj.lab, "course", None):
            return None
        return CourseSummarySerializer(obj.lab.course).data


class CourseSummarySerializer(serializers.ModelSerializer):
    teacher_id = serializers.UUIDField(source="teacher.id", read_only=True)
    teacher_email = serializers.EmailField(source="teacher.email", read_only=True)

    class Meta:
        model = Course
        fields = (
            "id",
            "name",
            "code",
            "teacher_id",
            "teacher_email",
            "auto_destroy_minutes",
            "is_active",
        )
        read_only_fields = fields


class UserSummarySerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    status = serializers.CharField(source="profile.status", read_only=True)
    photo_url = serializers.CharField(source="profile.photo_url", read_only=True)
    course = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "display_name",
            "first_name",
            "last_name",
            "role",
            "status",
            "photo_url",
            "course",
        )
        read_only_fields = fields

    def get_role(self, obj):
        return canonical_role(obj)

    def get_course(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile or not profile.course_id:
            return None
        return CourseSummarySerializer(profile.course).data

    def get_display_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or obj.username or obj.email


class MeSerializer(UserSummarySerializer):
    settings = serializers.JSONField(source="profile.settings", read_only=True)

    class Meta(UserSummarySerializer.Meta):
        fields = UserSummarySerializer.Meta.fields + ("settings",)


class UserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ROLE_CHOICES)
    status = serializers.ChoiceField(choices=STATUS_CHOICES, default=STATUS_PENDING)
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")
    course_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_role(self, value):
        return ROLE_PLATFORM_ADMIN if value == "superadmin" else value


class UserUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=STATUS_CHOICES, required=False)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False)
    course_id = serializers.UUIDField(required=False, allow_null=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    def validate_role(self, value):
        return ROLE_PLATFORM_ADMIN if value == "superadmin" else value


class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, trim_whitespace=False)


class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField()


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    photo_url = serializers.URLField(required=False, allow_blank=True)
    settings = serializers.JSONField(required=False)


class CourseCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    code = serializers.CharField(required=False, allow_blank=True, default="")
    teacher_id = serializers.IntegerField(required=False)
    auto_destroy_minutes = serializers.IntegerField(required=False, min_value=1)


class CourseUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    code = serializers.CharField(required=False, allow_blank=True)
    teacher_id = serializers.IntegerField(required=False)
    auto_destroy_minutes = serializers.IntegerField(required=False, min_value=1)
    is_active = serializers.BooleanField(required=False)


class CourseEnrollmentSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class CloudConnectionSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()
    course_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    masked_access_key_id = serializers.CharField(read_only=True)
    masked_role_arn = serializers.CharField(read_only=True)
    aws_role_arn = serializers.CharField(read_only=True)
    secret_configured = serializers.SerializerMethodField()
    external_id_configured = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    provider_support = serializers.SerializerMethodField()
    provider_details = serializers.SerializerMethodField()

    class Meta:
        model = CloudConnection
        fields = (
            "id",
            "name",
            "provider",
            "scope",
            "auth_type",
            "course",
            "course_id",
            "default_region",
            "masked_access_key_id",
            "masked_role_arn",
            "aws_role_arn",
            "secret_configured",
            "external_id_configured",
            "provider_support",
            "provider_details",
            "is_active",
            "last_test_status",
            "last_test_message",
            "last_test_identity",
            "last_tested_at",
            "can_edit",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "course",
            "masked_access_key_id",
            "masked_role_arn",
            "aws_role_arn",
            "secret_configured",
            "external_id_configured",
            "provider_support",
            "provider_details",
            "last_test_status",
            "last_test_message",
            "last_test_identity",
            "last_tested_at",
            "can_edit",
            "created_at",
            "updated_at",
        )

    def get_secret_configured(self, obj):
        return bool(obj.aws_secret_access_key_encrypted)

    def get_external_id_configured(self, obj):
        return bool(obj.aws_external_id_encrypted)

    def get_course(self, obj):
        if not obj.course_id:
            return None
        return {
            "id": str(obj.course_id),
            "name": obj.course.name,
            "code": obj.course.code,
            "teacher_id": obj.course.teacher_id,
            "teacher_email": obj.course.teacher.email,
            "is_active": obj.course.is_active,
        }

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        return can_edit_cloud_connection(request.user, obj)

    def get_provider_support(self, obj):
        spec = get_provider_connection_spec(obj.provider)
        return spec.capabilities()

    def get_provider_details(self, obj):
        spec = get_provider_connection_spec(obj.provider)
        return spec.serialize_details(obj)


def _serialize_execution_connection(connection, source: str, provider: str):
    runtime_hooks = get_provider_runtime_hooks(provider)
    identity = connection.last_test_identity if connection else {}
    identity = identity if isinstance(identity, dict) else {}
    identity_summary = runtime_hooks.summarize_identity(identity)

    if not connection:
        return {
            "provider": provider,
            "source": source,
            "status": "missing",
            "id": "",
            "name": "",
            "scope": "",
            "default_region": "",
            "account_id": "",
            "arn": "",
            "last_test_status": "",
        }

    return {
        "provider": connection.provider or provider,
        "source": source,
        "status": "resolved",
        "id": str(connection.id),
        "name": connection.name,
        "scope": connection.scope,
        "default_region": connection.default_region,
        "account_id": identity_summary["account_id"],
        "arn": identity_summary["arn"],
        "last_test_status": connection.last_test_status or "",
    }


def _serialize_environment_execution_target(provider: str):
    runtime_hooks = get_provider_runtime_hooks(provider)
    runtime_env = dict(os.environ)
    region = runtime_hooks.resolve_region(runtime_env=runtime_env)
    try:
        identity = get_aws_identity_from_runtime_env({}) if provider == ProviderChoices.AWS else get_runtime_identity(provider, {})
    except Exception:
        identity = {}

    identity = identity if isinstance(identity, dict) else {}
    identity_summary = runtime_hooks.summarize_identity(identity)
    is_resolved = bool(identity)
    return {
        "provider": provider,
        "source": "environment",
        "status": "resolved" if is_resolved else "missing",
        "id": "",
        "name": runtime_hooks.environment_target_name if is_resolved else "",
        "scope": "environment",
        "default_region": region,
        "account_id": identity_summary["account_id"],
        "arn": identity_summary["arn"],
        "last_test_status": "sts_ok" if is_resolved else "",
    }


def serialize_resolved_execution_target(lab, payload=None):
    provider = str(
        (payload or {}).get("cloud")
        or getattr(lab, "target_provider", ProviderChoices.AWS)
        or ProviderChoices.AWS
    ).strip().lower()
    connection, source = resolve_lab_cloud_connection_with_source(lab, provider)
    target = _serialize_execution_connection(connection, source, provider)
    if target.get("status") == "resolved":
        return target

    env_target = _serialize_environment_execution_target(provider)
    if env_target.get("status") == "resolved":
        return env_target
    return target


def serialize_cloud_target_state(plan):
    if not plan:
        return {
            "status": "unknown",
            "message": "No hay suficiente contexto para reconciliar la cuenta cloud de este plan.",
            "is_mismatch": False,
        }

    last_apply = getattr(plan, "last_apply_context", None) or {}
    if not isinstance(last_apply, dict) or not last_apply:
        return {
            "status": "no_real_apply",
            "message": "Aún no existe un APPLY real previo para comparar contra la conexión cloud actual.",
            "is_mismatch": False,
        }

    current = serialize_resolved_execution_target(getattr(plan, "lab", None), getattr(plan, "payload", None))
    current_id = str(current.get("id") or "").strip()
    current_account = str(current.get("account_id") or "").strip()
    last_conn_id = str(last_apply.get("cloud_connection_id") or "").strip()
    last_account = str(last_apply.get("account_id") or "").strip()
    last_credential_source = str(last_apply.get("credential_source") or "").strip()
    current_scope = str(current.get("scope") or "").strip()
    last_scope = str(last_apply.get("cloud_connection_scope") or "").strip()

    if current.get("status") == "missing":
        return {
            "status": "unresolved_current_target",
            "message": (
                "El último APPLY real se hizo con otra conexión cloud y hoy el laboratorio ya no "
                "resuelve una conexión ejecutable compatible."
            ),
            "is_mismatch": True,
            "current_target": current,
            "last_apply_context": last_apply,
        }

    same_connection = bool(current_id and last_conn_id and current_id == last_conn_id)
    same_account = bool(current_account and last_account and current_account == last_account)
    same_scope = bool(current_scope and last_scope and current_scope == last_scope)
    same_environment_identity = bool(
        last_credential_source == "environment"
        and current.get("source") == "environment"
        and same_account
    )

    if same_connection or (same_account and same_scope) or same_environment_identity:
        return {
            "status": "aligned",
            "message": (
                "La conexión cloud actual coincide con la usada en el último APPLY real."
                if not same_environment_identity
                else "La identidad AWS actual del servidor coincide con la usada en el último APPLY real."
            ),
            "is_mismatch": False,
            "current_target": current,
            "last_apply_context": last_apply,
        }

    return {
        "status": "target_changed",
        "message": (
            "La conexión cloud actual ya no coincide con la usada en el último APPLY real. "
            "El estado ACTIVE pasa a ser histórico respecto de otra cuenta cloud."
        ),
        "is_mismatch": True,
        "current_target": current,
        "last_apply_context": last_apply,
    }


class CloudConnectionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, default=ProviderChoices.AWS)
    scope = serializers.ChoiceField(
        choices=CloudConnectionScopeChoices.choices,
        default=CloudConnectionScopeChoices.PERSONAL,
    )
    auth_type = serializers.CharField(required=False, allow_blank=True, default=CloudAuthTypeChoices.AWS_STATIC_KEYS)
    course_id = serializers.UUIDField(required=False, allow_null=True)
    default_region = serializers.CharField(required=False, allow_blank=True, default="")
    aws_access_key_id = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    aws_secret_access_key = serializers.CharField(write_only=True, trim_whitespace=True, required=False, allow_blank=True, default="")
    aws_role_arn = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    aws_external_id = serializers.CharField(write_only=True, trim_whitespace=True, required=False, allow_blank=True, default="")
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        provider = attrs.get("provider")
        attrs["auth_type"] = str(attrs.get("auth_type") or CloudAuthTypeChoices.AWS_STATIC_KEYS).strip().lower()
        spec = get_provider_connection_spec(provider)
        return spec.validate_create(attrs)


class CloudConnectionUpdateSerializer(serializers.Serializer):
    auth_type = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(max_length=120, required=False)
    default_region = serializers.CharField(required=False, allow_blank=True)
    aws_access_key_id = serializers.CharField(max_length=128, required=False)
    aws_secret_access_key = serializers.CharField(write_only=True, trim_whitespace=True, required=False, allow_blank=True)
    aws_role_arn = serializers.CharField(max_length=255, required=False, allow_blank=True)
    aws_external_id = serializers.CharField(write_only=True, trim_whitespace=True, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        instance = self.context.get("instance")
        if "auth_type" in attrs:
            attrs["auth_type"] = str(attrs.get("auth_type") or "").strip().lower()
        spec = get_provider_connection_spec(getattr(instance, "provider", ProviderChoices.AWS))
        return spec.validate_update(attrs, instance)


class CloudExecutionDelegationCreateSerializer(serializers.Serializer):
    lab_id = serializers.UUIDField()
    delegate_user_id = serializers.IntegerField(required=False)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class LabSerializer(serializers.ModelSerializer):
    owner_user_id = serializers.IntegerField(source="owner_user.id", read_only=True)
    owner_user = UserSummarySerializer(read_only=True)
    course = CourseSummarySerializer(read_only=True)
    course_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    cloud_connection = CloudConnectionSerializer(read_only=True)
    cloud_connection_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    resolved_execution_target = serializers.SerializerMethodField()
    canvas_id = serializers.SerializerMethodField()
    legacy_canvas_id = serializers.SerializerMethodField()
    visibility_scope = serializers.ChoiceField(choices=VisibilityScopeChoices.choices, required=False)
    target_provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, required=False)

    class Meta:
        model = Lab
        fields = (
            "id",
            "canvas_id",
            "legacy_canvas_id",
            "name",
            "owner_user_id",
            "owner_user",
            "course",
            "course_id",
            "cloud_connection",
            "cloud_connection_id",
            "resolved_execution_target",
            "visibility_scope",
            "created_by_role",
            "target_provider",
            "flow",
            "intent",
            "metadata",
            "capabilities",
            "provider_overrides",
            "cidr_block",
            "prefix_length",
            "region",
            "notes",
            "narrative",
            "lab_template",
            "plan_canvas_hash",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "canvas_id",
            "legacy_canvas_id",
            "owner_user_id",
            "owner_user",
            "course",
            "created_by_role",
            "created_at",
            "updated_at",
        )

    def get_canvas_id(self, obj):
        return obj.canvas_id

    def get_legacy_canvas_id(self, obj):
        return obj.legacy_canvas_id

    def get_resolved_execution_target(self, obj):
        return serialize_resolved_execution_target(obj)


class LabCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    target_provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, default=ProviderChoices.AWS)
    cidr_block = serializers.CharField(required=False, allow_blank=True, default="")
    prefix_length = serializers.IntegerField(required=False, allow_null=True)
    region = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    narrative = serializers.CharField(required=False, allow_blank=True, default="advanced")
    lab_template = serializers.CharField(required=False, allow_blank=True, default="")
    flow = serializers.JSONField(required=False)
    metadata = serializers.JSONField(required=False)
    intent = serializers.JSONField(required=False)
    capabilities = serializers.ListField(required=False, child=serializers.CharField())
    provider_overrides = serializers.JSONField(required=False)
    visibility_scope = serializers.ChoiceField(
        choices=VisibilityScopeChoices.choices,
        required=False,
        default=VisibilityScopeChoices.OWNER,
    )
    course_id = serializers.UUIDField(required=False, allow_null=True)
    cloud_connection_id = serializers.UUIDField(required=False, allow_null=True)


class LabUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128, required=False)
    target_provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, required=False)
    cidr_block = serializers.CharField(required=False, allow_blank=True)
    prefix_length = serializers.IntegerField(required=False, allow_null=True)
    region = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    narrative = serializers.CharField(required=False, allow_blank=True)
    lab_template = serializers.CharField(required=False, allow_blank=True)
    flow = serializers.JSONField(required=False)
    metadata = serializers.JSONField(required=False)
    intent = serializers.JSONField(required=False)
    capabilities = serializers.ListField(required=False, child=serializers.CharField())
    provider_overrides = serializers.JSONField(required=False)
    visibility_scope = serializers.ChoiceField(choices=VisibilityScopeChoices.choices, required=False)
    course_id = serializers.UUIDField(required=False, allow_null=True)
    plan_canvas_hash = serializers.CharField(required=False, allow_blank=True, max_length=64)
    cloud_connection_id = serializers.UUIDField(required=False, allow_null=True)


class AmiCatalogEntrySerializer(serializers.ModelSerializer):
    provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, required=False)

    class Meta:
        model = AmiCatalogEntry
        fields = ("id", "code", "label", "provider", "region", "metadata", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class KeyPairCatalogEntrySerializer(serializers.ModelSerializer):
    provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, required=False)
    owner_user = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()
    cloud_connection = serializers.SerializerMethodField()

    class Meta:
        model = KeyPairCatalogEntry
        fields = (
            "id",
            "name",
            "label",
            "provider",
            "region",
            "scope",
            "owner_user",
            "course",
            "cloud_connection",
            "metadata",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "owner_user",
            "course",
            "cloud_connection",
            "created_at",
            "updated_at",
        )

    def get_owner_user(self, obj):
        if not obj.owner_user_id:
            return None
        return UserSummarySerializer(obj.owner_user).data

    def get_course(self, obj):
        if not obj.course_id:
            return None
        return CourseSummarySerializer(obj.course).data

    def get_cloud_connection(self, obj):
        if not obj.cloud_connection_id:
            return None
        return {
            "id": str(obj.cloud_connection_id),
            "name": obj.cloud_connection.name,
            "scope": obj.cloud_connection.scope,
            "provider": obj.cloud_connection.provider,
            "default_region": obj.cloud_connection.default_region,
        }


class SubnetSerializer(serializers.Serializer):
    name = serializers.CharField()
    cidr_block = serializers.CharField()
    availability_zone = serializers.CharField()
    subnet_type = serializers.CharField()
    map_public_ip_on_launch = serializers.BooleanField(required=False, default=False)
    public_ip = serializers.BooleanField(required=False, default=False)
    route_table = serializers.CharField(required=False, default="main")
    instances = serializers.ListField(required=False)


class RouteSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default="")
    dest_cidr = serializers.CharField()
    target = serializers.CharField()
    via_router_id = serializers.CharField(required=False, allow_null=True)


class RouteTableSerializer(serializers.Serializer):
    name = serializers.CharField()
    routes = RouteSerializer(many=True, required=False)


class NatGwSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(default=False)
    public_subnet = serializers.CharField(required=False, allow_blank=True, default="")
    elastic_ip = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_elastic_ip(self, value):
        value = (value or "").strip()
        if not value:
            return ""
        if not value.startswith("eipalloc-"):
            raise serializers.ValidationError(
                "Elastic IP must be an allocation ID (e.g. eipalloc-0123456789abcdef0)."
            )
        return value


class VpcSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    region = serializers.CharField()
    cidr_block = serializers.CharField()
    internet_gateway = serializers.BooleanField(required=False, default=False)
    allowed_ssh_cidr = serializers.CharField(required=False, allow_blank=True, default="")
    nat_gateway = NatGwSerializer(required=False)
    subnets = SubnetSerializer(many=True)
    route_tables = RouteTableSerializer(many=True, required=False)


class LinkRoutesDirSerializer(serializers.Serializer):
    a_to_b = RouteSerializer(many=True, required=False)
    b_to_a = RouteSerializer(many=True, required=False)


class LinkTgwRoutesSerializer(serializers.Serializer):
    to_router = RouteSerializer(many=True, required=False)


class LinkSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["peering", "tgw-attach"])
    via_router_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    vpc_a_id = serializers.CharField(required=False)
    vpc_b_id = serializers.CharField(required=False)
    router_id = serializers.CharField(required=False)
    vpc_id = serializers.CharField(required=False)
    subnet_names = serializers.ListField(child=serializers.CharField(), required=False)
    routes = LinkTgwRoutesSerializer(required=False)

    def validate(self, data):
        t = data.get("type")

        if t == "peering":
            missing = [
                f for f in ("via_router_id", "vpc_a_id", "vpc_b_id") if not data.get(f)
            ]
            if missing:
                raise serializers.ValidationError(
                    {f: "This field is required for peering link" for f in missing}
                )

        elif t == "tgw-attach":
            missing = [
                f for f in ("router_id", "vpc_id", "subnet_names") if not data.get(f)
            ]
            if missing:
                raise serializers.ValidationError(
                    {f: "This field is required for tgw-attach link" for f in missing}
                )

        return data


class RouterSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField(required=False, allow_blank=True, default="")
    type = serializers.ChoiceField(choices=["tgw"])


class VlanSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default="")
    region = serializers.CharField(required=False, allow_blank=True, default="")
    master_cidr = serializers.CharField(required=False, allow_blank=True, default="")


class MultiPlanSerializer(serializers.Serializer):
    cloud = CanonicalProviderChoiceField(choices=[ProviderChoices.AWS])
    simulate_only = serializers.BooleanField(default=True)
    vlan = VlanSerializer(required=False)
    vpcs = VpcSerializer(many=True)
    links = LinkSerializer(many=True, required=False)
    routers = RouterSerializer(many=True, required=False)

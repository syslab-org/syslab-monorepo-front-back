import json

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    AmiCatalogEntry,
    Course,
    Lab,
    Plan,
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
from .permissions import can_execute_plan, canonical_role


ROLE_CHOICES = [ROLE_PLATFORM_ADMIN, ROLE_TEACHER, ROLE_STUDENT]
STATUS_CHOICES = [STATUS_PENDING, STATUS_ACTIVE, STATUS_DEACTIVATED]


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

    class Meta:
        model = Plan
        fields = (
            "id",
            "name",
            "status",
            "applied",
            "last_action",
            "created_at",
            "can_apply",
            "simulate_only",
            "can_destroy",
            "canvas_id",
            "firestore_vpc_id",
            "lab",
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
        return {"id": str(obj.lab_id), "name": obj.lab.name}


class PlanDetailSerializer(serializers.ModelSerializer):
    can_apply = serializers.SerializerMethodField()
    simulate_only = serializers.SerializerMethodField()
    can_destroy = serializers.SerializerMethodField()
    canvas_id = serializers.SerializerMethodField()
    firestore_vpc_id = serializers.SerializerMethodField()
    lab = serializers.SerializerMethodField()

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
            "error",
            "can_apply",
            "simulate_only",
            "can_destroy",
            "last_deploy_task_id",
            "last_destroy_task_id",
            "canvas_id",
            "firestore_vpc_id",
            "canvas_hash",
            "canvas_updated_at",
            "lab",
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
        return {"id": str(obj.lab_id), "name": obj.lab.name}


class CourseSummarySerializer(serializers.ModelSerializer):
    teacher_id = serializers.UUIDField(source="teacher.id", read_only=True)
    teacher_email = serializers.EmailField(source="teacher.email", read_only=True)

    class Meta:
        model = Course
        fields = ("id", "name", "code", "teacher_id", "teacher_email", "is_active")
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


class CourseUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    code = serializers.CharField(required=False, allow_blank=True)
    teacher_id = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)


class CourseEnrollmentSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class LabSerializer(serializers.ModelSerializer):
    owner_user_id = serializers.IntegerField(source="owner_user.id", read_only=True)
    owner_user = UserSummarySerializer(read_only=True)
    course = CourseSummarySerializer(read_only=True)
    course_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
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


class LabCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    target_provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, default=ProviderChoices.AWS)
    cidr_block = serializers.CharField(required=False, allow_blank=True, default="")
    prefix_length = serializers.IntegerField(required=False, allow_null=True)
    region = serializers.CharField(required=False, allow_blank=True, default="")
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


class LabUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128, required=False)
    target_provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, required=False)
    cidr_block = serializers.CharField(required=False, allow_blank=True)
    prefix_length = serializers.IntegerField(required=False, allow_null=True)
    region = serializers.CharField(required=False, allow_blank=True)
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


class AmiCatalogEntrySerializer(serializers.ModelSerializer):
    provider = CanonicalProviderChoiceField(choices=ProviderChoices.choices, required=False)

    class Meta:
        model = AmiCatalogEntry
        fields = ("id", "code", "label", "provider", "region", "metadata", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


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

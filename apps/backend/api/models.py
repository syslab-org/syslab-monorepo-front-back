import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


ROLE_SUPERADMIN_LEGACY = "superadmin"
ROLE_PLATFORM_ADMIN = "platform_admin"
ROLE_TEACHER = "teacher"
ROLE_STUDENT = "student"

STATUS_PENDING = "pending"
STATUS_ACTIVE = "active"
STATUS_DEACTIVATED = "deactivated"

VISIBILITY_OWNER = "owner"
VISIBILITY_COURSE = "course"

PROVIDER_AWS = "aws"
PROVIDER_GCP = "gcp"
PROVIDER_AZURE = "azure"

CLOUD_SCOPE_PERSONAL = "personal"
CLOUD_SCOPE_COURSE_SHARED = "course_shared"

CLOUD_AUTH_AWS_STATIC = "aws_static_keys"
CLOUD_AUTH_AWS_ASSUME_ROLE = "aws_assume_role"


class RoleChoices(models.TextChoices):
    PLATFORM_ADMIN = ROLE_PLATFORM_ADMIN, "Platform Admin"
    TEACHER = ROLE_TEACHER, "Teacher"
    STUDENT = ROLE_STUDENT, "Student"


class UserStatusChoices(models.TextChoices):
    PENDING = STATUS_PENDING, "Pending"
    ACTIVE = STATUS_ACTIVE, "Active"
    DEACTIVATED = STATUS_DEACTIVATED, "Deactivated"


class ProviderChoices(models.TextChoices):
    AWS = PROVIDER_AWS, "AWS"
    GCP = PROVIDER_GCP, "GCP"
    AZURE = PROVIDER_AZURE, "Azure"


class VisibilityScopeChoices(models.TextChoices):
    OWNER = VISIBILITY_OWNER, "Owner"
    COURSE = VISIBILITY_COURSE, "Course"


class CloudConnectionScopeChoices(models.TextChoices):
    PERSONAL = CLOUD_SCOPE_PERSONAL, "Personal"
    COURSE_SHARED = CLOUD_SCOPE_COURSE_SHARED, "Course Shared"


class CloudAuthTypeChoices(models.TextChoices):
    AWS_STATIC_KEYS = CLOUD_AUTH_AWS_STATIC, "AWS Static Keys"
    AWS_ASSUME_ROLE = CLOUD_AUTH_AWS_ASSUME_ROLE, "AWS Assume Role"


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=64, blank=True, default="")
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="teaching_courses",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "name"],
                name="uniq_course_name_per_teacher",
            )
        ]

    def __str__(self):
        return self.name


class CloudConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    provider = models.CharField(
        max_length=16,
        choices=ProviderChoices.choices,
        default=ProviderChoices.AWS,
        db_index=True,
    )
    scope = models.CharField(
        max_length=24,
        choices=CloudConnectionScopeChoices.choices,
        default=CloudConnectionScopeChoices.PERSONAL,
        db_index=True,
    )
    auth_type = models.CharField(
        max_length=32,
        choices=CloudAuthTypeChoices.choices,
        default=CloudAuthTypeChoices.AWS_STATIC_KEYS,
    )
    owner_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cloud_connections",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cloud_connections",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_cloud_connections",
    )
    default_region = models.CharField(max_length=32, blank=True, default="")
    aws_access_key_id = models.CharField(max_length=128, blank=True, default="")
    aws_secret_access_key_encrypted = models.TextField(blank=True, default="")
    aws_role_arn = models.CharField(max_length=255, blank=True, default="")
    aws_external_id_encrypted = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    last_test_status = models.CharField(max_length=24, blank=True, default="")
    last_test_message = models.TextField(blank=True, default="")
    last_test_identity = models.JSONField(default=dict, blank=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "-updated_at"]

    def __str__(self):
        return self.name

    @property
    def masked_access_key_id(self) -> str:
        value = str(self.aws_access_key_id or "").strip()
        if len(value) <= 4:
            return value
        return f"{value[:4]}...{value[-4:]}"

    @property
    def masked_role_arn(self) -> str:
        value = str(self.aws_role_arn or "").strip()
        if len(value) <= 18:
            return value
        return f"{value[:12]}...{value[-6:]}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(
        max_length=32,
        choices=RoleChoices.choices,
        default=RoleChoices.STUDENT,
        db_index=True,
    )
    status = models.CharField(
        max_length=32,
        choices=UserStatusChoices.choices,
        default=UserStatusChoices.PENDING,
        db_index=True,
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )
    photo_url = models.URLField(blank=True, default="")
    settings = models.JSONField(default=dict, blank=True)
    google_sub = models.CharField(max_length=255, blank=True, default="")
    invite_token = models.UUIDField(null=True, blank=True, unique=True)
    invitation_expires_at = models.DateTimeField(null=True, blank=True)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invited_profiles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email", "created_at"]

    def __str__(self):
        return f"{self.user.email} [{self.role}]"

    @property
    def canonical_role(self) -> str:
        if self.user.is_superuser or self.role == ROLE_SUPERADMIN_LEGACY:
            return ROLE_PLATFORM_ADMIN
        return self.role

    def issue_invitation(self, hours: int = 48):
        self.invite_token = uuid.uuid4()
        self.invitation_expires_at = timezone.now() + timedelta(hours=hours)

    def is_invitation_valid(self) -> bool:
        return bool(
            self.invite_token
            and self.invitation_expires_at
            and timezone.now() < self.invitation_expires_at
        )


class Lab(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    owner_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="labs",
    )
    cloud_connection = models.ForeignKey(
        CloudConnection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="labs",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="labs",
    )
    visibility_scope = models.CharField(
        max_length=16,
        choices=VisibilityScopeChoices.choices,
        default=VisibilityScopeChoices.OWNER,
        db_index=True,
    )
    created_by_role = models.CharField(max_length=32, default=RoleChoices.STUDENT)
    target_provider = models.CharField(
        max_length=16,
        choices=ProviderChoices.choices,
        default=ProviderChoices.AWS,
        db_index=True,
    )
    flow = models.JSONField(default=dict, blank=True)
    intent = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    capabilities = models.JSONField(default=list, blank=True)
    provider_overrides = models.JSONField(default=dict, blank=True)
    cidr_block = models.CharField(max_length=64, blank=True, default="")
    prefix_length = models.IntegerField(null=True, blank=True)
    region = models.CharField(max_length=32, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    narrative = models.CharField(max_length=32, blank=True, default="advanced")
    lab_template = models.CharField(max_length=128, blank=True, default="")
    legacy_canvas_id = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        unique=True,
        help_text="Alias legacy del canvas. Se mantiene por compatibilidad con ids historicos ya emitidos.",
    )
    plan_canvas_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name

    @property
    def canvas_id(self) -> str:
        return self.legacy_canvas_id or str(self.id)


class AmiCatalogEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=128, unique=True)
    label = models.CharField(max_length=128, blank=True, default="")
    provider = models.CharField(
        max_length=16,
        choices=ProviderChoices.choices,
        default=ProviderChoices.AWS,
    )
    region = models.CharField(max_length=32, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ami_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["provider", "region", "code"]

    def __str__(self):
        return self.code


class KeyPairCatalogEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    label = models.CharField(max_length=128, blank=True, default="")
    provider = models.CharField(
        max_length=16,
        choices=ProviderChoices.choices,
        default=ProviderChoices.AWS,
    )
    region = models.CharField(max_length=32, blank=True, default="")
    scope = models.CharField(
        max_length=24,
        choices=CloudConnectionScopeChoices.choices,
        default=CloudConnectionScopeChoices.PERSONAL,
        db_index=True,
    )
    owner_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="key_pair_entries",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="key_pair_entries",
    )
    cloud_connection = models.ForeignKey(
        CloudConnection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="key_pair_entries",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_key_pair_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["provider", "scope", "region", "name"]

    def __str__(self):
        return self.label or self.name


class Plan(models.Model):
    CANVAS_STORAGE_FIELD = "canvas_id"

    class Status(models.TextChoices):
        PENDING = "PENDING"
        RUNNING = "RUNNING"
        SUCCESS = "SUCCESS"
        FAILURE = "FAILURE"

    class LastAction(models.TextChoices):
        PLAN = "plan"
        APPLY = "apply"
        DESTROY = "destroy"
        CANVAS_UPDATE = "canvas_update"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab = models.ForeignKey(
        Lab,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plans",
    )
    name = models.CharField(max_length=128, blank=True, default="")
    payload = models.JSONField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text="Estado actual del plan: PENDING | RUNNING | SUCCESS | FAILURE",
    )
    task_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="Ultima task_id (compat). Preferir last_deploy_task_id / last_destroy_task_id.",
    )
    s3_key = models.CharField(
        max_length=256,
        blank=True,
        default="",
        help_text="(Reservado) Key de logs en S3. En DEV/local se usa last_log en DB.",
    )
    error = models.TextField(blank=True, default="")
    canvas_id = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        db_index=True,
        help_text="Identificador canónico del canvas asociado a este plan.",
    )
    canvas_hash = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        db_index=True,
        help_text="Hash del canvas/payload para detectar cambios sin comparar todo.",
    )
    canvas_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha/hora del ultimo sync desde el canvas.",
    )
    applied = models.BooleanField(
        default=False,
        help_text="True si la ultima ejecucion fue un APPLY real (infra creada).",
    )
    last_action = models.CharField(
        max_length=20,
        choices=LastAction.choices,
        blank=True,
        default="",
        help_text='Ultima accion ejecutada sobre este plan: "plan" | "apply" | "destroy" | "canvas_update"',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    outputs = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        help_text="Ultimos outputs conocidos (despues de APPLY o del ultimo RUN).",
    )
    last_log = models.TextField(
        blank=True,
        default="",
        help_text="Log unificado de la ultima ejecucion (plan/apply/destroy).",
    )
    last_log_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha/hora de la ultima actualizacion de last_log.",
    )
    last_deploy_task_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="task_id de la ultima ejecucion deploy (plan/apply).",
    )
    last_destroy_task_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="task_id de la ultima ejecucion destroy.",
    )
    last_apply_context = models.JSONField(
        blank=True,
        default=dict,
        help_text=(
            "Snapshot auditado del ultimo APPLY real: conexion cloud usada, "
            "region, fuente de credenciales e identidad STS resuelta."
        ),
    )

    def __str__(self) -> str:
        return f"{self.id} [{self.status}] {self.name}"

    @classmethod
    def canvas_lookup(cls, canvas_id):
        return {cls.CANVAS_STORAGE_FIELD: canvas_id}

    @classmethod
    def canvas_lookup_in(cls, canvas_ids):
        return {f"{cls.CANVAS_STORAGE_FIELD}__in": list(canvas_ids)}

    def assign_canvas_id(self, canvas_id: str):
        self.canvas_id = canvas_id or None

    def mark_running(self, *, task_id: str, last_action: str, payload=None, deploy: bool = False, destroy: bool = False):
        if payload is not None:
            self.payload = payload
        self.status = self.Status.RUNNING
        self.error = ""
        self.s3_key = ""
        self.task_id = task_id
        if deploy:
            self.last_deploy_task_id = task_id
        if destroy:
            self.last_destroy_task_id = task_id
        self.last_action = last_action
        self.last_log = ""
        self.last_log_updated_at = timezone.now()
        self.updated_at = timezone.now()

        update_fields = [
            "status",
            "error",
            "s3_key",
            "task_id",
            "last_action",
            "last_log",
            "last_log_updated_at",
            "updated_at",
        ]
        if payload is not None:
            update_fields.append("payload")
        if deploy:
            update_fields.append("last_deploy_task_id")
        if destroy:
            update_fields.append("last_destroy_task_id")
        self.save(update_fields=update_fields)

    def mark_failure(self, *, error: str, full_log: str, last_action: str | None = None, applied=None):
        self.last_log = full_log + ("" if full_log.endswith("\n") else "")
        self.last_log_updated_at = timezone.now()
        self.status = self.Status.FAILURE
        self.error = str(error)
        if last_action is not None:
            self.last_action = last_action
        if applied is not None:
            self.applied = applied
        self.updated_at = timezone.now()

        update_fields = [
            "status",
            "error",
            "last_log",
            "last_log_updated_at",
            "updated_at",
        ]
        if last_action is not None:
            update_fields.append("last_action")
        if applied is not None:
            update_fields.append("applied")
        self.save(update_fields=update_fields)

    def mark_success(self, *, full_log: str, applied: bool, last_action: str, outputs=None):
        self.last_log = full_log
        self.last_log_updated_at = timezone.now()
        self.status = self.Status.SUCCESS
        self.s3_key = ""
        self.error = ""
        self.applied = applied
        self.last_action = last_action
        self.updated_at = timezone.now()
        if outputs is not None:
            self.outputs = outputs
        self.save(
            update_fields=[
                "status",
                "s3_key",
                "error",
                "applied",
                "last_action",
                "outputs",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
        )

    def mark_destroy_noop(self, *, message: str, full_log: str):
        self.status = self.Status.SUCCESS
        self.error = ""
        self.applied = False
        self.last_action = self.LastAction.DESTROY
        self.last_log = full_log + message
        self.last_log_updated_at = timezone.now()
        self.updated_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "error",
                "applied",
                "last_action",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
        )

    @property
    def firestore_vpc_id(self) -> str:
        # Deprecated alias kept for compatibility with older code paths.
        return self.canvas_id or ""

    @firestore_vpc_id.setter
    def firestore_vpc_id(self, value: str):
        self.canvas_id = value or None

    @property
    def payload_simulate_only(self) -> bool:
        payload = self.payload or {}
        if isinstance(payload, dict):
            return bool(payload.get("simulate_only", True))
        return True

    @property
    def can_destroy_now(self) -> bool:
        if self.status == self.Status.RUNNING:
            return False

        if bool(self.applied):
            return True

        return (
            self.last_action == self.LastAction.APPLY
            and self.status == self.Status.FAILURE
            and not self.payload_simulate_only
        )

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["canvas_id"],
                condition=models.Q(canvas_id__isnull=False),
                name="uniq_plan_canvas_id",
            )
        ]


class CloudExecutionDelegation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab = models.ForeignKey(
        Lab,
        on_delete=models.CASCADE,
        related_name="execution_delegations",
    )
    cloud_connection = models.ForeignKey(
        CloudConnection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="execution_delegations",
    )
    owner_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="execution_delegations_granted",
    )
    delegate_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="execution_delegations_received",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="execution_delegations",
    )
    provider = models.CharField(
        max_length=16,
        choices=ProviderChoices.choices,
        default=ProviderChoices.AWS,
        db_index=True,
    )
    note = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_execution_delegations",
    )
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revoked_execution_delegations",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.owner_user_id}->{self.delegate_user_id} {self.lab_id}"

    @property
    def is_currently_active(self) -> bool:
        if not self.is_active or self.revoked_at:
            return False
        if self.expires_at and timezone.now() >= self.expires_at:
            return False
        return True


class PlanExecutionRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"
        NOOP = "noop", "No-op"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name="execution_history",
    )
    lab = models.ForeignKey(
        Lab,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="execution_history",
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_plan_executions",
    )
    delegation = models.ForeignKey(
        CloudExecutionDelegation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="execution_history",
    )
    action = models.CharField(
        max_length=20,
        choices=Plan.LastAction.choices,
        db_index=True,
    )
    simulate_only = models.BooleanField(default=True)
    provider = models.CharField(
        max_length=16,
        choices=ProviderChoices.choices,
        default=ProviderChoices.AWS,
        db_index=True,
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    task_id = models.CharField(max_length=64, blank=True, default="")
    cloud_connection = models.ForeignKey(
        CloudConnection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="execution_history",
    )
    cloud_connection_name = models.CharField(max_length=120, blank=True, default="")
    cloud_connection_scope = models.CharField(max_length=24, blank=True, default="")
    resolved_execution_source = models.CharField(max_length=32, blank=True, default="")
    credential_source = models.CharField(max_length=32, blank=True, default="")
    account_id = models.CharField(max_length=64, blank=True, default="")
    arn = models.CharField(max_length=512, blank=True, default="")
    sts_user_id = models.CharField(max_length=128, blank=True, default="")
    error = models.TextField(blank=True, default="")
    request_summary = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.plan_id}:{self.action}:{self.status}"

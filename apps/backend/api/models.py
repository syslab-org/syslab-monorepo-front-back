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

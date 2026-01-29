# apps/backend/api/models.py

import uuid
from django.db import models


class Plan(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING"
        RUNNING = "RUNNING"
        SUCCESS = "SUCCESS"
        FAILURE = "FAILURE"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
        help_text="Última task_id (compat). Preferir last_deploy_task_id / last_destroy_task_id.",
    )
    s3_key = models.CharField(
        max_length=256,
        blank=True,
        default="",
        help_text="(Reservado) Key de logs en S3. En DEV/local se usa last_log en DB.",
    )
    error = models.TextField(blank=True, default="")
    firestore_vpc_id = models.CharField(
        max_length=128, null=True, blank=True, db_index=True
    )
    applied = models.BooleanField(
        default=False,
        help_text="True si la última ejecución fue un APPLY real (infra creada).",
    )

    class LastAction(models.TextChoices):
        PLAN = "plan"
        APPLY = "apply"
        DESTROY = "destroy"

    last_action = models.CharField(
        max_length=20,
        choices=LastAction.choices,
        blank=True,
        default="",
        help_text='Última acción ejecutada sobre este plan: "plan" | "apply" | "destroy"',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    outputs = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        help_text="Últimos outputs conocidos (después de APPLY o del último RUN).",
    )
    last_log = models.TextField(
        blank=True,
        default="",
        help_text="Log unificado de la última ejecución (plan/apply/destroy).",
    )
    last_log_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha/hora de la última actualización de last_log.",
    )
    last_deploy_task_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="task_id de la última ejecución deploy (plan/apply).",
    )
    last_destroy_task_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="task_id de la última ejecución destroy.",
    )

    def __str__(self) -> str:
        return f"{self.id} [{self.status}] {self.name}"

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            # Camino 1: 1 Canvas = 1 Plan. Garantiza unicidad cuando firestore_vpc_id existe.
            models.UniqueConstraint(
                fields=["firestore_vpc_id"],
                condition=models.Q(firestore_vpc_id__isnull=False),
                name="uniq_plan_firestore_vpc_id",
            )
        ]

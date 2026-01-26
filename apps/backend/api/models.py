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
        max_length=16, choices=Status.choices, default=Status.PENDING
    )
    task_id = models.CharField(max_length=64, blank=True, null=True)
    s3_key = models.CharField(max_length=256, blank=True, default="")
    error = models.TextField(blank=True, default="")
    firestore_vpc_id = models.CharField(max_length=128, null=True, blank=True)
    applied = models.BooleanField(default=False)
    last_action = models.CharField(
        max_length=20, blank=True, default=""
    )  # "plan" | "apply" | "destroy"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    outputs = models.JSONField(blank=True, null=True, default=dict)
    last_outputs = models.JSONField(blank=True, null=True, default=dict)

    def __str__(self) -> str:
        return f"{self.id} [{self.status}] {self.name}"

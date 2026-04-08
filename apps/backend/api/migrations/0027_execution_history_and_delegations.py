from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0026_cloudconnection_assume_role_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="CloudExecutionDelegation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("aws", "AWS"), ("gcp", "GCP"), ("azure", "Azure")], db_index=True, default="aws", max_length=16)),
                ("note", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("cloud_connection", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="execution_delegations", to="api.cloudconnection")),
                ("course", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="execution_delegations", to="api.course")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_execution_delegations", to=settings.AUTH_USER_MODEL)),
                ("delegate_user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="execution_delegations_received", to=settings.AUTH_USER_MODEL)),
                ("lab", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="execution_delegations", to="api.lab")),
                ("owner_user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="execution_delegations_granted", to=settings.AUTH_USER_MODEL)),
                ("revoked_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="revoked_execution_delegations", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PlanExecutionRecord",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(choices=[("plan", "plan"), ("apply", "apply"), ("destroy", "destroy"), ("canvas_update", "canvas_update")], db_index=True, max_length=20)),
                ("simulate_only", models.BooleanField(default=True)),
                ("provider", models.CharField(choices=[("aws", "AWS"), ("gcp", "GCP"), ("azure", "Azure")], db_index=True, default="aws", max_length=16)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("success", "Success"), ("failure", "Failure"), ("noop", "No-op")], db_index=True, default="pending", max_length=16)),
                ("task_id", models.CharField(blank=True, default="", max_length=64)),
                ("cloud_connection_name", models.CharField(blank=True, default="", max_length=120)),
                ("cloud_connection_scope", models.CharField(blank=True, default="", max_length=24)),
                ("resolved_execution_source", models.CharField(blank=True, default="", max_length=32)),
                ("credential_source", models.CharField(blank=True, default="", max_length=32)),
                ("account_id", models.CharField(blank=True, default="", max_length=64)),
                ("arn", models.CharField(blank=True, default="", max_length=512)),
                ("sts_user_id", models.CharField(blank=True, default="", max_length=128)),
                ("error", models.TextField(blank=True, default="")),
                ("request_summary", models.JSONField(blank=True, default=dict)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("cloud_connection", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="execution_history", to="api.cloudconnection")),
                ("delegation", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="execution_history", to="api.cloudexecutiondelegation")),
                ("lab", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="execution_history", to="api.lab")),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="execution_history", to="api.plan")),
                ("requested_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="requested_plan_executions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0024_cloudconnection_lab_cloud_connection"),
    ]

    operations = [
        migrations.AddField(
            model_name="plan",
            name="last_apply_context",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Snapshot auditado del ultimo APPLY real: conexion cloud usada, "
                    "region, fuente de credenciales e identidad STS resuelta."
                ),
            ),
        ),
    ]

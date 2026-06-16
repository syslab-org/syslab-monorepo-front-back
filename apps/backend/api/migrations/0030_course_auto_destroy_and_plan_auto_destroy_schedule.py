import api.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_lab_notes"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="auto_destroy_minutes",
            field=models.PositiveIntegerField(
                default=api.models.default_course_auto_destroy_minutes,
                help_text="Tiempo por defecto en minutos para destruir automáticamente planes desplegados del curso.",
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="auto_destroy_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Fecha/hora programada para el destroy automático del despliegue activo.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="auto_destroy_task_id",
            field=models.CharField(
                blank=True,
                default="",
                help_text="task_id de la tarea diferida que encola el destroy automático.",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="auto_destroy_token",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Token de correlación para invalidar auto-destroys diferidos obsoletos.",
                max_length=64,
            ),
        ),
    ]

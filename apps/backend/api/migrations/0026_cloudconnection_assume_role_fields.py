from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0025_plan_last_apply_context"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cloudconnection",
            name="auth_type",
            field=models.CharField(
                choices=[
                    ("aws_static_keys", "AWS Static Keys"),
                    ("aws_assume_role", "AWS Assume Role"),
                ],
                default="aws_static_keys",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="cloudconnection",
            name="aws_role_arn",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="cloudconnection",
            name="aws_external_id_encrypted",
            field=models.TextField(blank=True, default=""),
        ),
    ]

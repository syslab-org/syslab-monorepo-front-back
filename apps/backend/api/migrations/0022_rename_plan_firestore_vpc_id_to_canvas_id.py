from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_backfill_user_profiles"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="plan",
            name="uniq_plan_firestore_vpc_id",
        ),
        migrations.RenameField(
            model_name="plan",
            old_name="firestore_vpc_id",
            new_name="canvas_id",
        ),
        migrations.AlterField(
            model_name="plan",
            name="canvas_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Identificador canónico del canvas asociado a este plan.",
                max_length=128,
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name="plan",
            constraint=models.UniqueConstraint(
                condition=models.Q(canvas_id__isnull=False),
                fields=("canvas_id",),
                name="uniq_plan_canvas_id",
            ),
        ),
    ]

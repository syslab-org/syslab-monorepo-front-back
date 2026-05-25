from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0028_alter_planexecutionrecord_action_keypaircatalogentry"),
    ]

    operations = [
        migrations.AddField(
            model_name="lab",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
    ]

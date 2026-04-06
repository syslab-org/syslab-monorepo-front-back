from django.db import migrations


ROLE_PLATFORM_ADMIN = "platform_admin"
ROLE_STUDENT = "student"
STATUS_ACTIVE = "active"


def backfill_user_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("api", "UserProfile")

    for user in User.objects.all().iterator():
        defaults = {
            "role": ROLE_PLATFORM_ADMIN if user.is_superuser else ROLE_STUDENT,
            "status": STATUS_ACTIVE if user.is_superuser else STATUS_ACTIVE,
        }
        UserProfile.objects.get_or_create(user=user, defaults=defaults)


def noop(apps, schema_editor):
    return None


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0020_course_alter_plan_applied_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_user_profiles, noop),
    ]

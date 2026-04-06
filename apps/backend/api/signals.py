from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ROLE_PLATFORM_ADMIN, UserProfile


@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance, created, **kwargs):
    if created:
        role = ROLE_PLATFORM_ADMIN if instance.is_superuser else UserProfile._meta.get_field("role").default
        UserProfile.objects.get_or_create(
            user=instance,
            defaults={"role": role},
        )
        return

    profile, _ = UserProfile.objects.get_or_create(user=instance)
    if instance.is_superuser and profile.role != ROLE_PLATFORM_ADMIN:
        profile.role = ROLE_PLATFORM_ADMIN
        profile.save(update_fields=["role", "updated_at"])

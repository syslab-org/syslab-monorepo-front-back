from django.contrib import admin

from .models import AmiCatalogEntry, Course, Lab, Plan, UserProfile


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "status", "lab", "created_at")
    list_filter = ("status", "created_at", "last_action")
    search_fields = ("id", "name", "firestore_vpc_id")


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "target_provider", "visibility_scope", "owner_user", "course", "updated_at")
    list_filter = ("target_provider", "visibility_scope", "created_by_role")
    search_fields = ("id", "name", "legacy_canvas_id")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "teacher", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "code", "teacher__email")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "status", "course", "updated_at")
    list_filter = ("role", "status")
    search_fields = ("user__email", "user__username")


@admin.register(AmiCatalogEntry)
class AmiCatalogEntryAdmin(admin.ModelAdmin):
    list_display = ("code", "provider", "region", "created_by", "updated_at")
    list_filter = ("provider", "region")
    search_fields = ("code", "label")

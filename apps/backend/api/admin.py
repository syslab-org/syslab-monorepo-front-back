from django.contrib import admin

from .models import (
    AmiCatalogEntry,
    CloudConnection,
    CloudExecutionDelegation,
    Course,
    Lab,
    Plan,
    PlanExecutionRecord,
    UserProfile,
)


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "canvas_id_display", "status", "lab", "created_at")
    list_filter = ("status", "created_at", "last_action")
    search_fields = ("id", "name", "canvas_id", "lab__legacy_canvas_id")

    @admin.display(description="Canvas ID")
    def canvas_id_display(self, obj):
        return obj.canvas_id


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "canvas_id_display", "target_provider", "visibility_scope", "owner_user", "course", "updated_at")
    list_filter = ("target_provider", "visibility_scope", "created_by_role")
    search_fields = ("id", "name", "legacy_canvas_id")

    @admin.display(description="Canvas ID")
    def canvas_id_display(self, obj):
        return obj.canvas_id


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


@admin.register(CloudConnection)
class CloudConnectionAdmin(admin.ModelAdmin):
    list_display = ("name", "provider", "scope", "owner_user", "course", "is_active", "updated_at")
    list_filter = ("provider", "scope", "is_active")
    search_fields = ("name", "aws_access_key_id", "owner_user__email", "course__name")


@admin.register(PlanExecutionRecord)
class PlanExecutionRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "plan", "action", "status", "requested_by", "cloud_connection_name", "created_at")
    list_filter = ("action", "status", "provider", "simulate_only")
    search_fields = ("plan__name", "task_id", "account_id", "arn", "requested_by__email")


@admin.register(CloudExecutionDelegation)
class CloudExecutionDelegationAdmin(admin.ModelAdmin):
    list_display = ("id", "lab", "owner_user", "delegate_user", "cloud_connection", "is_active", "expires_at", "created_at")
    list_filter = ("provider", "is_active", "course")
    search_fields = ("lab__name", "owner_user__email", "delegate_user__email", "cloud_connection__name")

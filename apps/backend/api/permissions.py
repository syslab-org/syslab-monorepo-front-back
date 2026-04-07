from django.db.models import Q
from rest_framework.permissions import BasePermission

from .cloud_connections import resolve_lab_cloud_connection_with_source
from .models import (
    CLOUD_SCOPE_COURSE_SHARED,
    ROLE_PLATFORM_ADMIN,
    ROLE_STUDENT,
    ROLE_TEACHER,
    VISIBILITY_COURSE,
    CloudConnection,
    Lab,
)


def canonical_role(user) -> str:
    if not user or not user.is_authenticated:
        return ""
    if user.is_superuser:
        return ROLE_PLATFORM_ADMIN
    profile = getattr(user, "profile", None)
    if not profile:
        return ""
    return profile.canonical_role



def is_platform_admin(user) -> bool:
    return canonical_role(user) == ROLE_PLATFORM_ADMIN



def is_teacher(user) -> bool:
    return canonical_role(user) == ROLE_TEACHER



def is_student(user) -> bool:
    return canonical_role(user) == ROLE_STUDENT



def visible_labs_queryset(user, base_qs=None):
    qs = base_qs if base_qs is not None else Lab.objects.all()
    if not user or not user.is_authenticated:
        return qs.none()
    if is_platform_admin(user):
        return qs
    if is_teacher(user):
        return qs.filter(Q(course__teacher=user) | Q(owner_user=user)).distinct()

    course_id = getattr(getattr(user, "profile", None), "course_id", None)
    return qs.filter(
        Q(owner_user=user)
        | Q(course_id=course_id, visibility_scope=VISIBILITY_COURSE)
    ).distinct()



def can_view_lab(user, lab: Lab) -> bool:
    return visible_labs_queryset(user).filter(id=lab.id).exists()



def can_edit_lab(user, lab: Lab) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_platform_admin(user):
        return True
    if is_teacher(user):
        return lab.owner_user_id == user.id or (lab.course and lab.course.teacher_id == user.id)
    return lab.owner_user_id == user.id


def can_execute_lab(user, lab: Lab) -> bool:
    if not user or not user.is_authenticated or not lab:
        return False
    if is_platform_admin(user):
        return True
    if lab.owner_user_id == user.id:
        return True

    connection, _source = resolve_lab_cloud_connection_with_source(
        lab,
        getattr(lab, "target_provider", None),
    )
    if (
        connection
        and connection.scope == CLOUD_SCOPE_COURSE_SHARED
        and is_teacher(user)
        and lab.course
        and lab.course.teacher_id == user.id
    ):
        return True

    return False


def can_execute_plan(user, plan) -> bool:
    if not user or not user.is_authenticated or not plan:
        return False
    if is_platform_admin(user):
        return True
    if not getattr(plan, "lab_id", None):
        return False
    return can_execute_lab(user, getattr(plan, "lab", None))


def visible_cloud_connections_queryset(user, base_qs=None):
    qs = base_qs if base_qs is not None else CloudConnection.objects.all()
    if not user or not user.is_authenticated:
        return qs.none()
    if is_platform_admin(user):
        return qs
    if is_teacher(user):
        return qs.filter(
            Q(owner_user=user)
            | Q(scope=CLOUD_SCOPE_COURSE_SHARED, course__teacher=user)
        ).distinct()

    course_id = getattr(getattr(user, "profile", None), "course_id", None)
    return qs.filter(
        Q(owner_user=user)
        | Q(scope=CLOUD_SCOPE_COURSE_SHARED, course_id=course_id)
    ).distinct()


def can_edit_cloud_connection(user, connection: CloudConnection) -> bool:
    if not user or not user.is_authenticated or not connection:
        return False
    if is_platform_admin(user):
        return True
    if connection.owner_user_id == user.id:
        return True
    return bool(
        connection.scope == CLOUD_SCOPE_COURSE_SHARED
        and is_teacher(user)
        and connection.course
        and connection.course.teacher_id == user.id
    )


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_platform_admin(request.user))

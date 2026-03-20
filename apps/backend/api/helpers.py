from typing import Optional
from uuid import UUID

from django.db.models import Q

from .models import Lab, Plan, VISIBILITY_COURSE, VISIBILITY_OWNER
from .permissions import is_platform_admin, is_student, is_teacher, visible_labs_queryset



def visible_plans_queryset(user, base_qs=None):
    qs = base_qs if base_qs is not None else Plan.objects.all()
    if not user or not user.is_authenticated:
        return qs.none()
    if is_platform_admin(user):
        return qs

    labs_qs = visible_labs_queryset(user)
    lab_ids = labs_qs.values_list("id", flat=True)
    canvas_ids = [lab.canvas_id for lab in labs_qs]
    return qs.filter(Q(lab_id__in=lab_ids) | Q(lab__isnull=True, **Plan.canvas_lookup_in(canvas_ids))).distinct()



def resolve_lab_by_canvas_id(user, canvas_id: str):
    if not canvas_id:
        return None
    qs = visible_labs_queryset(user, Lab.objects.select_related("course", "course__teacher", "owner_user", "owner_user__profile"))
    filters = Q(legacy_canvas_id=canvas_id)
    try:
        UUID(str(canvas_id))
        filters |= Q(id=canvas_id)
    except (TypeError, ValueError, AttributeError):
        pass
    return qs.filter(filters).first()



def ensure_lab_for_canvas(user, canvas_id: str, name: str = "", metadata: Optional[dict] = None):
    lab = resolve_lab_by_canvas_id(user, canvas_id)
    if lab:
        return lab

    role = getattr(user.profile, "canonical_role", user.profile.role)
    course = None
    visibility_scope = VISIBILITY_OWNER

    if is_student(user):
        course = user.profile.course
        visibility_scope = VISIBILITY_OWNER
    elif is_teacher(user):
        teacher_courses = list(user.teaching_courses.filter(is_active=True).order_by("name"))
        if len(teacher_courses) == 1:
            course = teacher_courses[0]
        elif teacher_courses:
            course = teacher_courses[0]
        visibility_scope = VISIBILITY_COURSE if course else VISIBILITY_OWNER

    lab = Lab.objects.create(
        name=name or f"Lab {canvas_id}",
        owner_user=user,
        course=course,
        visibility_scope=visibility_scope,
        created_by_role=role,
        target_provider="aws",
        metadata=metadata or {},
        legacy_canvas_id=canvas_id,
    )
    if not lab.legacy_canvas_id:
        lab.legacy_canvas_id = str(lab.id)
        lab.save(update_fields=["legacy_canvas_id", "updated_at"])
    return lab

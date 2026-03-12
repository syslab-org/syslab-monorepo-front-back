from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Course, Lab, ROLE_PLATFORM_ADMIN, ROLE_STUDENT, ROLE_TEACHER, VISIBILITY_COURSE, VISIBILITY_OWNER
from .permissions import can_edit_lab, is_platform_admin, is_student, is_teacher, visible_labs_queryset
from .serializers import LabCreateSerializer, LabSerializer, LabUpdateSerializer


class LabViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _queryset(self, request):
        return visible_labs_queryset(request.user, Lab.objects.select_related("owner_user", "owner_user__profile", "course", "course__teacher"))

    def list(self, request):
        serializer = LabSerializer(self._queryset(request), many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        lab = get_object_or_404(self._queryset(request), id=pk)
        return Response(LabSerializer(lab).data)

    def create(self, request):
        serializer = LabCreateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        role = getattr(user.profile, "canonical_role", user.profile.role)
        course = None
        visibility_scope = data.get("visibility_scope", VISIBILITY_OWNER)

        if is_student(user):
            course = user.profile.course
            visibility_scope = VISIBILITY_OWNER
        elif is_teacher(user):
            course_id = data.get("course_id")
            if course_id:
                course = Course.objects.filter(id=course_id, teacher=user).first()
            else:
                teacher_courses = list(user.teaching_courses.filter(is_active=True).order_by("name"))
                if len(teacher_courses) == 1:
                    course = teacher_courses[0]
            if not course:
                return Response({"detail": "Debes seleccionar uno de tus cursos para crear el laboratorio."}, status=status.HTTP_400_BAD_REQUEST)
            visibility_scope = VISIBILITY_COURSE
        elif is_platform_admin(user):
            course_id = data.get("course_id")
            if course_id:
                course = Course.objects.filter(id=course_id).first()
                if not course:
                    return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        lab = Lab.objects.create(
            name=data["name"],
            owner_user=user,
            course=course,
            visibility_scope=visibility_scope,
            created_by_role=role,
            target_provider=data.get("target_provider", "aws"),
            flow=data.get("flow") or {},
            intent=data.get("intent") or {},
            metadata=data.get("metadata") or {},
            capabilities=data.get("capabilities") or [],
            provider_overrides=data.get("provider_overrides") or {},
            cidr_block=data.get("cidr_block", ""),
            prefix_length=data.get("prefix_length"),
            region=data.get("region", ""),
            narrative=data.get("narrative", "advanced"),
            lab_template=data.get("lab_template", ""),
        )
        lab.legacy_canvas_id = str(lab.id)
        lab.save(update_fields=["legacy_canvas_id", "updated_at"])
        return Response(LabSerializer(lab).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        lab = get_object_or_404(self._queryset(request), id=pk)
        if not can_edit_lab(request.user, lab):
            return Response({"detail": "No autorizado para editar este laboratorio."}, status=status.HTTP_403_FORBIDDEN)

        serializer = LabUpdateSerializer(data=request.data or {}, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "course_id" in data:
            course = None
            if data["course_id"]:
                base_qs = Course.objects.all()
                if is_teacher(request.user):
                    base_qs = base_qs.filter(teacher=request.user)
                course = base_qs.filter(id=data["course_id"]).first()
                if not course:
                    return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            lab.course = course
        for field in (
            "name",
            "target_provider",
            "flow",
            "intent",
            "metadata",
            "capabilities",
            "provider_overrides",
            "cidr_block",
            "prefix_length",
            "region",
            "narrative",
            "lab_template",
            "visibility_scope",
            "plan_canvas_hash",
        ):
            if field in data:
                setattr(lab, field, data[field])
        lab.save()
        return Response(LabSerializer(lab).data)

    def destroy(self, request, pk=None):
        lab = get_object_or_404(self._queryset(request), id=pk)
        if not can_edit_lab(request.user, lab):
            return Response({"detail": "No autorizado para eliminar este laboratorio."}, status=status.HTTP_403_FORBIDDEN)
        lab.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

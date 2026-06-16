from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Course, ROLE_STUDENT
from .permissions import is_platform_admin, is_teacher
from .serializers import (
    CourseCreateSerializer,
    CourseEnrollmentSerializer,
    CourseSummarySerializer,
    CourseUpdateSerializer,
)


class CourseViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _queryset(self, request):
        qs = Course.objects.select_related("teacher").all().order_by("name")
        if is_platform_admin(request.user):
            return qs
        if is_teacher(request.user):
            return qs.filter(teacher=request.user)
        course_id = getattr(getattr(request.user, "profile", None), "course_id", None)
        return qs.filter(id=course_id)

    def list(self, request):
        return Response(CourseSummarySerializer(self._queryset(request), many=True).data)

    def create(self, request):
        if not (is_platform_admin(request.user) or is_teacher(request.user)):
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CourseCreateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        teacher = request.user
        if is_platform_admin(request.user) and data.get("teacher_id"):
            teacher = User.objects.filter(id=data["teacher_id"]).first()
            if not teacher:
                return Response({"detail": "Profesor no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        course = Course.objects.create(
            name=data["name"],
            code=data.get("code", ""),
            teacher=teacher,
            auto_destroy_minutes=data.get("auto_destroy_minutes", Course._meta.get_field("auto_destroy_minutes").get_default()),
        )
        return Response(CourseSummarySerializer(course).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        course = self._queryset(request).filter(id=pk).first()
        if not course:
            return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseUpdateSerializer(data=request.data or {}, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        for field in ("name", "code", "is_active", "auto_destroy_minutes"):
            if field in data:
                setattr(course, field, data[field])
        if "teacher_id" in data:
            if not is_platform_admin(request.user):
                return Response({"detail": "Solo el admin puede reasignar cursos."}, status=status.HTTP_403_FORBIDDEN)
            teacher = User.objects.filter(id=data["teacher_id"]).first()
            if not teacher:
                return Response({"detail": "Profesor no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            course.teacher = teacher
        course.save()
        return Response(CourseSummarySerializer(course).data)

    @action(detail=True, methods=["post"], url_path="enroll-student")
    def enroll_student(self, request, pk=None):
        course = self._queryset(request).filter(id=pk).first()
        if not course:
            return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseEnrollmentSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        student = User.objects.select_related("profile").filter(id=serializer.validated_data["user_id"]).first()
        if not student or student.profile.role != ROLE_STUDENT:
            return Response({"detail": "Alumno no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        student.profile.course = course
        student.profile.save(update_fields=["course", "updated_at"])
        return Response({"ok": True, "course_id": str(course.id), "user_id": student.id})

    @action(detail=True, methods=["post"], url_path="remove-student")
    def remove_student(self, request, pk=None):
        course = self._queryset(request).filter(id=pk).first()
        if not course:
            return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseEnrollmentSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        student = User.objects.select_related("profile").filter(id=serializer.validated_data["user_id"]).first()
        if not student or student.profile.course_id != course.id:
            return Response({"detail": "Alumno no encontrado en este curso."}, status=status.HTTP_404_NOT_FOUND)
        student.profile.course = None
        student.profile.save(update_fields=["course", "updated_at"])
        return Response({"ok": True, "course_id": str(course.id), "user_id": student.id})

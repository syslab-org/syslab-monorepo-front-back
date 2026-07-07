from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Course, ROLE_STUDENT, STATUS_PENDING
from .permissions import is_platform_admin, is_teacher
from .serializers import UserCreateSerializer, UserSummarySerializer, UserUpdateSerializer


class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _base_queryset(self, request):
        qs = User.objects.select_related("profile", "profile__course").all().order_by("email")
        if is_platform_admin(request.user):
            return qs
        if is_teacher(request.user):
            return qs.filter(
                Q(profile__course__teacher=request.user)
                | Q(profile__role=ROLE_STUDENT, profile__course__isnull=True)
            ).exclude(id=request.user.id).distinct()
        return qs.filter(id=request.user.id)

    def list(self, request):
        serializer = UserSummarySerializer(self._base_queryset(request), many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = UserCreateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        role = data["role"]
        if is_teacher(request.user) and role != ROLE_STUDENT:
            return Response({"detail": "Los profesores solo pueden invitar alumnos."}, status=status.HTTP_403_FORBIDDEN)
        if not (is_platform_admin(request.user) or is_teacher(request.user)):
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        email = data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Ya existe un usuario con ese email."}, status=status.HTTP_400_BAD_REQUEST)

        course = None
        course_id = data.get("course_id")
        if course_id:
            course = Course.objects.filter(id=course_id).first()
            if not course:
                return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            if is_teacher(request.user) and course.teacher_id != request.user.id:
                return Response({"detail": "Solo puedes asignar alumnos a tus cursos."}, status=status.HTTP_403_FORBIDDEN)
        elif role == ROLE_STUDENT and is_teacher(request.user):
            teacher_courses = list(request.user.teaching_courses.filter(is_active=True))
            if len(teacher_courses) == 1:
                course = teacher_courses[0]

        user = User.objects.create(
            username=email,
            email=email,
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])

        profile = user.profile
        profile.role = role
        profile.status = data.get("status", STATUS_PENDING)
        profile.course = course
        profile.invited_by = request.user
        profile.issue_invitation()
        profile.save(update_fields=["role", "status", "course", "invited_by", "invite_token", "invitation_expires_at", "updated_at"])

        payload = UserSummarySerializer(user).data
        payload["invite_token"] = str(profile.invite_token)
        payload["invite_url"] = f"/registration/{profile.invite_token}"
        return Response(payload, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        user = self._base_queryset(request).filter(id=pk).first()
        if not user:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserUpdateSerializer(data=request.data or {}, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        profile = user.profile
        if "role" in data:
            if not is_platform_admin(request.user):
                return Response({"detail": "Solo el admin puede cambiar roles."}, status=status.HTTP_403_FORBIDDEN)
            profile.role = data["role"]
        if "status" in data:
            profile.status = data["status"]
        if "course_id" in data:
            course = None
            if data["course_id"]:
                course = Course.objects.filter(id=data["course_id"]).first()
                if not course:
                    return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
                if is_teacher(request.user) and course.teacher_id != request.user.id:
                    return Response({"detail": "Solo puedes asignar alumnos a tus cursos."}, status=status.HTTP_403_FORBIDDEN)
            profile.course = course
        profile.updated_at = timezone.now()
        profile.save()

        user_updates = []
        if "first_name" in data:
            user.first_name = data["first_name"]
            user_updates.append("first_name")
        if "last_name" in data:
            user.last_name = data["last_name"]
            user_updates.append("last_name")
        if user_updates:
            user.save(update_fields=user_updates)

        return Response(UserSummarySerializer(user).data)

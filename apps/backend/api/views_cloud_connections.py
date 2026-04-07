from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .cloud_connections import test_aws_connection
from .models import (
    CLOUD_SCOPE_COURSE_SHARED,
    CLOUD_SCOPE_PERSONAL,
    Course,
    ProviderChoices,
    ROLE_STUDENT,
    CloudConnection,
)
from .permissions import can_edit_cloud_connection, is_platform_admin, is_teacher, visible_cloud_connections_queryset
from .secret_store import encrypt_secret
from .serializers import CloudConnectionCreateSerializer, CloudConnectionSerializer, CloudConnectionUpdateSerializer


class CloudConnectionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _queryset(self, request):
        return visible_cloud_connections_queryset(
            request.user,
            CloudConnection.objects.select_related("course", "course__teacher", "owner_user"),
        )

    def list(self, request):
        qs = self._queryset(request).order_by("scope", "name")
        provider = str(request.query_params.get("provider") or "").strip().lower()
        if provider:
            qs = qs.filter(provider=provider)
        serializer = CloudConnectionSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        serializer = CloudConnectionCreateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user

        scope = data["scope"]
        course = None
        owner_user = None

        if scope == CLOUD_SCOPE_PERSONAL:
            owner_user = user
        elif scope == CLOUD_SCOPE_COURSE_SHARED:
            course = Course.objects.filter(id=data["course_id"]).first()
            if not course:
                return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            if not (is_platform_admin(user) or (is_teacher(user) and course.teacher_id == user.id)):
                return Response({"detail": "No autorizado para crear conexiones compartidas en este curso."}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"detail": "Scope no soportado."}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(user.profile, "canonical_role", user.profile.role) == ROLE_STUDENT and scope != CLOUD_SCOPE_PERSONAL:
            return Response({"detail": "Los estudiantes solo pueden registrar conexiones personales."}, status=status.HTTP_403_FORBIDDEN)

        connection = CloudConnection.objects.create(
            name=data["name"],
            provider=data.get("provider", ProviderChoices.AWS),
            scope=scope,
            auth_type=data["auth_type"],
            owner_user=owner_user,
            course=course,
            created_by=user,
            default_region=data.get("default_region", ""),
            aws_access_key_id=data["aws_access_key_id"].strip(),
            aws_secret_access_key_encrypted=encrypt_secret(data["aws_secret_access_key"]),
            is_active=bool(data.get("is_active", True)),
        )
        out = CloudConnectionSerializer(connection, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        connection = get_object_or_404(self._queryset(request), id=pk)
        if not can_edit_cloud_connection(request.user, connection):
            return Response({"detail": "No autorizado para editar esta conexion."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CloudConnectionUpdateSerializer(data=request.data or {}, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        for field in ("name", "default_region", "aws_access_key_id", "is_active"):
            if field in data:
                setattr(connection, field, data[field])

        if "aws_secret_access_key" in data and str(data["aws_secret_access_key"] or "").strip():
            connection.aws_secret_access_key_encrypted = encrypt_secret(data["aws_secret_access_key"])

        connection.save()
        out = CloudConnectionSerializer(connection, context={"request": request})
        return Response(out.data)

    def destroy(self, request, pk=None):
        connection = get_object_or_404(self._queryset(request), id=pk)
        if not can_edit_cloud_connection(request.user, connection):
            return Response({"detail": "No autorizado para eliminar esta conexion."}, status=status.HTTP_403_FORBIDDEN)
        connection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        connection = get_object_or_404(self._queryset(request), id=pk)
        if not can_edit_cloud_connection(request.user, connection):
            return Response({"detail": "No autorizado para probar esta conexion."}, status=status.HTTP_403_FORBIDDEN)

        ok, message, identity = test_aws_connection(connection)
        connection.last_test_status = "success" if ok else "failure"
        connection.last_test_message = message
        connection.last_test_identity = identity or {}
        connection.last_tested_at = timezone.now()
        connection.save(update_fields=["last_test_status", "last_test_message", "last_test_identity", "last_tested_at", "updated_at"])

        payload = CloudConnectionSerializer(connection, context={"request": request}).data
        return Response({"ok": ok, "message": message, "identity": identity, "connection": payload})

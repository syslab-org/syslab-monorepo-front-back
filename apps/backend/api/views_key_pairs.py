from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    CLOUD_SCOPE_COURSE_SHARED,
    CLOUD_SCOPE_PERSONAL,
    Course,
    ProviderChoices,
    ROLE_STUDENT,
    CloudConnection,
    KeyPairCatalogEntry,
)
from .permissions import (
    can_edit_cloud_connection,
    can_edit_key_pair,
    is_platform_admin,
    is_teacher,
    visible_cloud_connections_queryset,
    visible_key_pairs_queryset,
)
from .serializers import KeyPairCatalogEntrySerializer


class KeyPairCatalogViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _queryset(self, request):
        return visible_key_pairs_queryset(
            request.user,
            KeyPairCatalogEntry.objects.select_related(
                "owner_user",
                "course",
                "course__teacher",
                "cloud_connection",
            ),
        )

    def list(self, request):
        qs = self._queryset(request)
        provider = str(request.query_params.get("provider") or "").strip().lower()
        if provider:
            qs = qs.filter(provider=provider)
        region = str(request.query_params.get("region") or "").strip()
        if region:
            qs = qs.filter(region=region)
        scope = str(request.query_params.get("scope") or "").strip()
        if scope:
            qs = qs.filter(scope=scope)
        serializer = KeyPairCatalogEntrySerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        user = request.user
        data = request.data or {}

        name = str(data.get("name") or "").strip()
        if not name:
            return Response({"detail": "El nombre del key pair es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        scope = str(data.get("scope") or CLOUD_SCOPE_PERSONAL).strip()
        if scope not in {CLOUD_SCOPE_PERSONAL, CLOUD_SCOPE_COURSE_SHARED}:
            return Response({"detail": "Scope no soportado."}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(user.profile, "canonical_role", user.profile.role) == ROLE_STUDENT and scope != CLOUD_SCOPE_PERSONAL:
            return Response({"detail": "Los estudiantes solo pueden registrar key pairs personales."}, status=status.HTTP_403_FORBIDDEN)

        course = None
        owner_user = None
        if scope == CLOUD_SCOPE_PERSONAL:
            owner_user = user
        else:
            course_id = data.get("course_id")
            course = Course.objects.filter(id=course_id).first()
            if not course:
                return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            if not (is_platform_admin(user) or (is_teacher(user) and course.teacher_id == user.id)):
                return Response({"detail": "No autorizado para registrar key pairs compartidos en este curso."}, status=status.HTTP_403_FORBIDDEN)

        cloud_connection = None
        cloud_connection_id = data.get("cloud_connection_id")
        if cloud_connection_id:
            cloud_connection = get_object_or_404(
                visible_cloud_connections_queryset(
                    user,
                    CloudConnection.objects.select_related("course", "course__teacher", "owner_user"),
                ),
                id=cloud_connection_id,
            )
            if not can_edit_cloud_connection(user, cloud_connection):
                return Response({"detail": "No autorizado para vincular esta conexión cloud."}, status=status.HTTP_403_FORBIDDEN)
            if cloud_connection.provider != ProviderChoices.AWS:
                return Response({"detail": "Solo se soportan key pairs AWS por ahora."}, status=status.HTTP_400_BAD_REQUEST)
            if scope == CLOUD_SCOPE_PERSONAL and cloud_connection.scope != CLOUD_SCOPE_PERSONAL:
                return Response({"detail": "Un key pair personal debe apuntar a una conexión personal."}, status=status.HTTP_400_BAD_REQUEST)
            if scope == CLOUD_SCOPE_COURSE_SHARED and cloud_connection.scope != CLOUD_SCOPE_COURSE_SHARED:
                return Response({"detail": "Un key pair compartido debe apuntar a una conexión compartida."}, status=status.HTTP_400_BAD_REQUEST)
            if scope == CLOUD_SCOPE_COURSE_SHARED and course and cloud_connection.course_id != course.id:
                return Response({"detail": "La conexión cloud debe pertenecer al mismo curso."}, status=status.HTTP_400_BAD_REQUEST)

        entry = KeyPairCatalogEntry.objects.create(
            name=name,
            label=str(data.get("label") or "").strip(),
            provider=str(data.get("provider") or ProviderChoices.AWS).strip().lower(),
            region=str(data.get("region") or "").strip(),
            scope=scope,
            owner_user=owner_user,
            course=course,
            cloud_connection=cloud_connection,
            metadata=data.get("metadata") or {},
            created_by=user,
        )
        serializer = KeyPairCatalogEntrySerializer(entry, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        entry = get_object_or_404(self._queryset(request), id=pk)
        if not can_edit_key_pair(request.user, entry):
            return Response({"detail": "No autorizado para eliminar este key pair."}, status=status.HTTP_403_FORBIDDEN)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

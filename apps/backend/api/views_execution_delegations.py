from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .cloud_connections import resolve_lab_cloud_connection_with_source
from .models import CLOUD_SCOPE_PERSONAL, CloudExecutionDelegation, Lab, ROLE_TEACHER
from .permissions import (
    canonical_role,
    is_platform_admin,
    visible_execution_delegations_queryset,
)
from .serializers import (
    CloudExecutionDelegationCreateSerializer,
    CloudExecutionDelegationSerializer,
)


class CloudExecutionDelegationViewSet(viewsets.ViewSet):
    def list(self, request):
        qs = visible_execution_delegations_queryset(
            request.user,
            CloudExecutionDelegation.objects.select_related(
                "lab",
                "cloud_connection",
                "owner_user",
                "delegate_user",
                "course",
                "course__teacher",
            ),
        ).order_by("-created_at")
        return Response(CloudExecutionDelegationSerializer(qs, many=True).data)

    def create(self, request):
        data = CloudExecutionDelegationCreateSerializer(data=request.data or {})
        data.is_valid(raise_exception=True)
        payload = data.validated_data

        lab = Lab.objects.select_related(
            "owner_user",
            "course",
            "course__teacher",
            "cloud_connection",
        ).filter(id=payload["lab_id"]).first()
        if not lab:
            return Response({"detail": "Lab no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not (is_platform_admin(request.user) or lab.owner_user_id == request.user.id):
            return Response(
                {"detail": "Solo el owner del laboratorio o platform admin puede delegar ejecución."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not lab.course_id or not lab.course or not lab.course.teacher_id:
            return Response(
                {"detail": "El laboratorio debe pertenecer a un curso con docente asignado para delegar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delegate_user_id = payload.get("delegate_user_id") or lab.course.teacher_id
        delegate_user = User.objects.filter(id=delegate_user_id).first()
        if not delegate_user:
            return Response({"detail": "Usuario delegado no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if canonical_role(delegate_user) != ROLE_TEACHER:
            return Response(
                {"detail": "La delegación explícita de ejecución solo está habilitada hacia docentes."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if delegate_user.id != lab.course.teacher_id and not is_platform_admin(request.user):
            return Response(
                {"detail": "Solo puedes delegar al docente titular del curso."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection, source = resolve_lab_cloud_connection_with_source(lab, lab.target_provider)
        if not connection or connection.scope != CLOUD_SCOPE_PERSONAL or connection.owner_user_id != lab.owner_user_id:
            return Response(
                {
                    "detail": (
                        "La delegación explícita solo aplica cuando el laboratorio resuelve una conexión "
                        "personal del owner."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        delegation = CloudExecutionDelegation.objects.create(
            lab=lab,
            cloud_connection=connection,
            owner_user=lab.owner_user,
            delegate_user=delegate_user,
            course=lab.course,
            provider=lab.target_provider,
            note=payload.get("note", ""),
            expires_at=payload.get("expires_at"),
            created_by=request.user,
            metadata={"resolved_execution_source": source},
        )
        return Response(
            CloudExecutionDelegationSerializer(delegation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        delegation = visible_execution_delegations_queryset(
            request.user,
            CloudExecutionDelegation.objects.select_related("course", "course__teacher"),
        ).filter(id=pk).first()
        if not delegation:
            return Response({"detail": "Delegación no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not (
            is_platform_admin(request.user)
            or delegation.owner_user_id == request.user.id
            or delegation.delegate_user_id == request.user.id
        ):
            return Response(
                {"detail": "No tienes permiso para revocar esta delegación."},
                status=status.HTTP_403_FORBIDDEN,
            )

        delegation.is_active = False
        delegation.revoked_at = timezone.now()
        delegation.revoked_by = request.user
        delegation.save(update_fields=["is_active", "revoked_at", "revoked_by", "updated_at"])
        return Response(CloudExecutionDelegationSerializer(delegation).data)

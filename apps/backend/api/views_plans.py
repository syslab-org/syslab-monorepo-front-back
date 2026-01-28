# apps/backend/api/views_plans.py
import os
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Plan
from .serializers import PlanListSerializer, PlanDetailSerializer


def _read_s3_text(bucket: str, key: str) -> str:
    import boto3

    obj = boto3.client("s3").get_object(Bucket=bucket, Key=key)
    return obj["Body"].read().decode("utf-8", errors="replace")


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/network/plans/         -> lista de planes (sin payload)
    GET /api/network/plans/<id>/    -> detalle del plan (con payload)
    GET /api/network/plans/<id>/payload/ -> solo el JSON (payload "crudo")
    """

    queryset = Plan.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("retrieve", "payload"):
            return PlanDetailSerializer
        return PlanListSerializer

    @action(detail=True, methods=["get"])
    def payload(self, request, pk=None):
        plan = self.get_object()
        return Response(plan.payload)

    @action(detail=True, methods=["get"])
    def outputs(self, request, pk=None):
        plan = self.get_object()
        return Response(
            {
                "plan_id": str(plan.id),
                "applied": plan.applied,
                "status": plan.status,
                "outputs": plan.outputs or {},
            }
        )

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        plan = self.get_object()

        if not plan.last_log:
            return Response(
                {
                    "ok": False,
                    "error": "Este plan aún no tiene logs persistidos.",
                },
                status=404,
            )

        return Response(
            {
                "plan_id": str(plan.id),
                "updated_at": (
                    plan.last_log_updated_at.isoformat()
                    if plan.last_log_updated_at
                    else None
                ),
                "last_action": plan.last_action,
                "status": plan.status,
                "log": plan.last_log or "",
            }
        )

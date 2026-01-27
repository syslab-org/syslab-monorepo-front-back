# apps/backend/api/views_plans.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Plan
from .serializers import PlanListSerializer, PlanDetailSerializer


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

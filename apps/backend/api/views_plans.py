# apps/backend/api/views_plans.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Plan
from .serializers import PlanListSerializer, PlanDetailSerializer
from .tasks import process_network_plan

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/network/plans/         -> lista de planes (sin payload)
    GET /api/network/plans/<id>/    -> detalle del plan (con payload)
    GET /api/network/plans/<id>/payload/ -> solo el JSON (payload "crudo")
    """
    queryset  = Plan.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ("retrieve", "payload"):
            return PlanDetailSerializer
        return PlanListSerializer

    @action(detail=True, methods=['get'])
    def payload(self, request, pk=None):
        plan = self.get_object()
        return Response(plan.payload)

    @action(detail=True, methods=['post'])
    def deploy(self, request, pk=None):
        plan = get_object_or_404(Plan, pk=pk)


        # Encolar tarea de procesamiento con el payload del plan
        async_res = process_network_plan.delay(
            plan_id=str(plan.id),
            payload=plan.payload
        )

        # Actualizar estado y task_id
        plan.status = Plan.Status.RUNNING

        plan.task_id = async_res.id


        plan.save(update_fields=["status", "task_id", "updated_at"])

         #  Responder
        return Response(
            {"ok": True, "plan_id": str(plan.id), "task_id": async_res.id},
            status=status.HTTP_202_ACCEPTED,
        )

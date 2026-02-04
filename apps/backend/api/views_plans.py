import os

from django.db import IntegrityError, transaction
from django.db.utils import ProgrammingError
from django.utils.dateparse import parse_datetime

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
    GET /api/network/plans/<id>/logs/ -> log persistido de la última ejecución (apply o destroy)
    """

    queryset = Plan.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("retrieve", "payload"):
            return PlanDetailSerializer
        return PlanListSerializer

    @action(
        detail=False,
        methods=["post"],
        url_path="sync-from-canvas",
        url_name="sync-from-canvas",
    )
    def sync_from_canvas(self, request):
        try:
            # Accept canvas id from: canvas_id, firestore_vpc_id, vpcId
            data = request.data
            firestore_vpc_id = (
                data.get("canvas_id")
                or data.get("firestore_vpc_id")
                or data.get("vpcId")
            )
            if not firestore_vpc_id:
                return Response(
                    {"ok": False, "error": "firestore_vpc_id/canvas_id es requerido."},
                    status=400,
                )

            payload = data.get("payload", None)
            if payload is None:
                payload = dict(data)
                payload.pop("payload", None)

            name = data.get("name", "")
            canvas_hash = data.get("canvas_hash")
            canvas_updated_at = data.get("canvas_updated_at")

            dt_canvas_updated_at = None
            if canvas_updated_at:
                dt_canvas_updated_at = parse_datetime(canvas_updated_at)

            created = False

            with transaction.atomic():
                plan = Plan.objects.filter(firestore_vpc_id=firestore_vpc_id).first()
                if plan:
                    plan.name = name or plan.name or ""
                    plan.payload = payload
                    plan.canvas_hash = canvas_hash
                    plan.canvas_updated_at = dt_canvas_updated_at
                    plan.error = ""
                    plan.save()
                    msg = "Plan actualizado desde canvas"
                else:
                    try:
                        plan = Plan.objects.create(
                            name=name or "",
                            payload=payload,
                            firestore_vpc_id=firestore_vpc_id,
                            canvas_hash=canvas_hash,
                            canvas_updated_at=dt_canvas_updated_at,
                            status=Plan.Status.PENDING,
                        )
                        created = True
                        msg = "Plan creado desde canvas"
                    except IntegrityError:
                        # Race: duplicate, fetch and update
                        plan = Plan.objects.get(firestore_vpc_id=firestore_vpc_id)
                        plan.name = name or plan.name or ""
                        plan.payload = payload
                        plan.canvas_hash = canvas_hash
                        plan.canvas_updated_at = dt_canvas_updated_at
                        plan.error = ""
                        plan.save()
                        msg = "Plan actualizado desde canvas"

            return Response(
                {
                    "ok": True,
                    "plan_id": str(plan.id),
                    "created": created,
                    "message": msg,
                }
            )
        except ProgrammingError as e:
            return Response(
                {
                    "ok": False,
                    "error": (
                        "Error de esquema en la base de datos. Parece que faltan migraciones del modelo Plan. "
                        "Ejecuta: python manage.py makemigrations api && python manage.py migrate"
                    ),
                    "detail": str(e),
                },
                status=500,
            )
        except Exception as e:
            return Response(
                {
                    "ok": False,
                    "error": "Error inesperado al sincronizar el plan.",
                    "detail": str(e),
                },
                status=500,
            )

    @action(
        detail=False,
        methods=["post"],
        url_path="sync_from_canvas",
        url_name="sync_from_canvas",
    )
    def sync_from_canvas_legacy(self, request):
        return self.sync_from_canvas(request)

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

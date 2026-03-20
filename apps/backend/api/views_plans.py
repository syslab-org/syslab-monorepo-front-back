import os
from datetime import timedelta

from celery.result import AsyncResult
from django.db import IntegrityError, transaction
from django.db.utils import ProgrammingError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .helpers import ensure_lab_for_canvas, visible_plans_queryset
from .models import Plan
from .serializers import PlanDetailSerializer, PlanListSerializer
from .validators import validate_network_plan


TERMINAL_TASK_STATES = {"SUCCESS", "FAILURE", "REVOKED"}



def _reconcile_running_plan(plan: Plan) -> bool:
    if plan.status != Plan.Status.RUNNING or not plan.task_id:
        return False

    task_state = AsyncResult(plan.task_id).state
    now = timezone.now()

    if task_state == "PENDING":
        stale_minutes = int(os.getenv("PLAN_RUNNING_STALE_MINUTES", "20"))
        if plan.updated_at and now - plan.updated_at > timedelta(minutes=stale_minutes):
            plan.status = Plan.Status.FAILURE
            plan.error = (
                f"La tarea {plan.task_id} quedo en estado PENDING por mas de "
                f"{stale_minutes} minutos. Marca reconciliada como fallo."
            )
            plan.updated_at = now
            plan.save(update_fields=["status", "error", "updated_at"])
            return True
        return False

    if task_state not in TERMINAL_TASK_STATES:
        return False

    result = AsyncResult(plan.task_id).result

    if task_state in {"FAILURE", "REVOKED"}:
        plan.status = Plan.Status.FAILURE
        plan.error = str(result or f"Tarea {task_state.lower()}.")
        plan.updated_at = now
        plan.save(update_fields=["status", "error", "updated_at"])
        return True

    task_ok = not (isinstance(result, dict) and result.get("ok") is False)
    if task_ok:
        plan.status = Plan.Status.SUCCESS
        if plan.last_action == Plan.LastAction.DESTROY:
            plan.applied = False
            plan.payload = {**(plan.payload or {}), "simulate_only": True}
            plan.error = ""
            plan.updated_at = now
            plan.save(update_fields=["status", "applied", "payload", "error", "updated_at"])
            return True

        if isinstance(result, dict) and "applied" in result:
            plan.applied = bool(result.get("applied"))
        plan.error = ""
        plan.updated_at = now
        plan.save(update_fields=["status", "applied", "error", "updated_at"])
        return True

    plan.status = Plan.Status.FAILURE
    plan.error = (result or {}).get("error") if isinstance(result, dict) else str(result or "La tarea finalizo con error.")
    plan.updated_at = now
    plan.save(update_fields=["status", "error", "updated_at"])
    return True



def _sanitize_payload_for_storage(payload: dict, fallback_canvas_id=None) -> dict:
    sanitized = validate_network_plan(payload)
    raw = payload if isinstance(payload, dict) else {}
    out = dict(sanitized)

    vlan_raw = raw.get("vlan") if isinstance(raw.get("vlan"), dict) else {}
    resolved_canvas_id = (
        fallback_canvas_id
        or out.get("canvas_id")
        or raw.get("canvas_id")
        or raw.get("firestore_vpc_id")
        or raw.get("vpcId")
        or vlan_raw.get("id")
    )
    if resolved_canvas_id:
        out["canvas_id"] = resolved_canvas_id

    return out


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return visible_plans_queryset(
            self.request.user,
            Plan.objects.select_related("lab", "lab__course", "lab__course__teacher"),
        ).order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("retrieve", "payload"):
            return PlanDetailSerializer
        return PlanListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        for plan in queryset:
            _reconcile_running_plan(plan)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        _reconcile_running_plan(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="sync-from-canvas", url_name="sync-from-canvas")
    def sync_from_canvas(self, request):
        try:
            data = request.data or {}
            canvas_id = data.get("canvas_id") or data.get("firestore_vpc_id") or data.get("vpcId")
            if not canvas_id:
                return Response({"ok": False, "error": "canvas_id es requerido."}, status=400)

            payload = data.get("payload")
            if payload is None:
                payload = dict(data)
                payload.pop("payload", None)

            try:
                payload = _sanitize_payload_for_storage(payload, fallback_canvas_id=canvas_id)
            except Exception as e:
                return Response({"ok": False, "error": str(e)}, status=400)

            name = data.get("name") or payload.get("name", "")
            canvas_hash = data.get("canvas_hash")
            canvas_updated_at = data.get("canvas_updated_at")

            dt_canvas_updated_at = parse_datetime(canvas_updated_at) if canvas_updated_at else None
            lab = ensure_lab_for_canvas(request.user, str(canvas_id), name=name)
            created = False

            with transaction.atomic():
                plan = self.get_queryset().filter(**Plan.canvas_lookup(lab.canvas_id)).first()
                if plan:
                    payload_changed = plan.payload != payload
                    hash_changed = plan.canvas_hash != canvas_hash
                    plan.lab = lab
                    plan.name = name or plan.name or ""
                    plan.payload = payload
                    plan.canvas_hash = canvas_hash
                    plan.canvas_updated_at = dt_canvas_updated_at
                    plan.error = ""
                    if payload_changed or hash_changed:
                        plan.last_action = Plan.LastAction.CANVAS_UPDATE
                        plan.status = Plan.Status.PENDING
                    plan.save()
                    msg = "Plan actualizado desde canvas"
                else:
                    try:
                        plan = Plan.objects.create(
                            lab=lab,
                            name=name or "",
                            payload=payload,
                            **Plan.canvas_lookup(lab.canvas_id),
                            canvas_hash=canvas_hash,
                            canvas_updated_at=dt_canvas_updated_at,
                            status=Plan.Status.PENDING,
                        )
                        created = True
                        msg = "Plan creado desde canvas"
                    except IntegrityError:
                        plan = Plan.objects.get(**Plan.canvas_lookup(lab.canvas_id))
                        plan.lab = lab
                        plan.name = name or plan.name or ""
                        plan.payload = payload
                        plan.canvas_hash = canvas_hash
                        plan.canvas_updated_at = dt_canvas_updated_at
                        plan.error = ""
                        plan.save()
                        msg = "Plan actualizado desde canvas"

            if lab.plan_canvas_hash != (canvas_hash or ""):
                lab.plan_canvas_hash = canvas_hash or ""
                lab.save(update_fields=["plan_canvas_hash", "updated_at"])

            return Response(
                {
                    "ok": True,
                    "plan_id": str(plan.id),
                    "created": created,
                    "message": msg,
                    "canvas_id": lab.canvas_id,
                    "lab_id": str(lab.id),
                }
            )
        except ProgrammingError as e:
            return Response(
                {
                    "ok": False,
                    "error": "Error de esquema en la base de datos. Parece que faltan migraciones.",
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

    @action(detail=False, methods=["post"], url_path="sync_from_canvas", url_name="sync_from_canvas")
    def sync_from_canvas_legacy(self, request):
        return self.sync_from_canvas(request)

    @action(detail=True, methods=["get"])
    def payload(self, request, pk=None):
        return Response(self.get_object().payload)

    @action(detail=True, methods=["get"])
    def outputs(self, request, pk=None):
        plan = self.get_object()
        return Response({
            "plan_id": str(plan.id),
            "applied": plan.applied,
            "status": plan.status,
            "outputs": plan.outputs or {},
        })

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        plan = self.get_object()
        if not plan.last_log:
            return Response({"ok": False, "error": "Este plan aun no tiene logs persistidos."}, status=404)

        return Response(
            {
                "plan_id": str(plan.id),
                "updated_at": plan.last_log_updated_at.isoformat() if plan.last_log_updated_at else None,
                "last_action": plan.last_action,
                "status": plan.status,
                "log": plan.last_log or "",
            }
        )

# apps/backend/api/views.py
import json
from uuid import UUID
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from celery.result import AsyncResult
from .validators import validate_network_plan
from .tasks import prueba_larga, process_network_plan, destroy_last_deploy
from .models import Plan
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


def _is_running(plan) -> bool:
    return plan.status == Plan.Status.RUNNING


@api_view(["GET"])
@permission_classes([AllowAny])
def ping(_request):
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def run_prueba(request):
    body = request.data or {}
    try:
        n = int(body.get("n", 5))
    except Exception:
        n = 5
    async_res = prueba_larga.delay(n)
    return Response({"task_id": async_res.id}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@permission_classes([AllowAny])
def task_status(request, task_id: str):
    res = AsyncResult(task_id)
    payload = {"task_id": task_id, "state": res.state}
    if res.state == "SUCCESS":
        payload["result"] = res.result
    elif res.state == "FAILURE":
        payload["error"] = str(res.info)
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def network_plan_create(request):
    payload = request.data or {}
    # 1) Validación
    try:
        validate_network_plan(payload)
    except Exception as e:
        return Response(
            {"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST
        )
    # 2) Firestore ID (si viene)
    firestore_vpc_id = (
        payload.get("firestore_vpc_id")
        or payload.get("vpcId")
        or payload.get("vlan", {}).get("id")
    )

    # 3) Crear Plan (NO dispara task aquí, tu decisión actual)
    plan = Plan.objects.create(
        name=payload.get("name", ""),
        payload=payload,
        status=Plan.Status.PENDING,
        firestore_vpc_id=firestore_vpc_id,
    )

    return Response(
        {"ok": True, "plan_id": str(plan.id)}, status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def deploy_plan(request, plan_id: UUID):
    # 1) Obtiene el Plan
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        return Response(
            {"ok": False, "error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND
        )

    # 2) Bloqueo si está corriendo
    if _is_running(plan):
        return Response(
            {
                "ok": False,
                "error": "Plan en ejecución. Espera a que termine antes de lanzar otra acción.",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # 3) Leer flag simulate_only (default True)

    body = request.data or {}
    simulate_only = bool(body.get("simulate_only", True))

    # 4) Valida payload guardado

    try:
        validate_network_plan(plan.payload)
    except Exception as e:
        plan.status = Plan.Status.FAILURE
        plan.error = str(e)
        plan.save(update_fields=["status", "error"])
        return Response(
            {"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST
        )

    # 5) Marcar RUNNING
    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.save(update_fields=["status", "error"])

    # 6) Payload final para la task
    merged_payload = dict(plan.payload or {})
    merged_payload["simulate_only"] = simulate_only

    # Persistimos el simulate_only en el payload (single source of truth)
    plan.updated_at = timezone.now()
    plan.payload = merged_payload
    plan.save(update_fields=["updated_at", "payload"])

    # 7) Amarre de firestore_vpc_id si faltaba
    firestore_vpc_id = (
        merged_payload.get("firestore_vpc_id")
        or merged_payload.get("vpcId")
        or (merged_payload.get("vlan") or {}).get("id")
    )
    if firestore_vpc_id and not plan.firestore_vpc_id:
        plan.firestore_vpc_id = firestore_vpc_id
        plan.save(update_fields=["firestore_vpc_id"])

    # 8) Lanza task
    task = process_network_plan.delay(plan_id=str(plan.id), payload=merged_payload)
    plan.task_id = task.id
    plan.save(update_fields=["task_id"])

    return Response(
        {
            "ok": True,
            "plan_id": str(plan.id),
            "task_id": task.id,
            "simulate_only": simulate_only,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def destroy_plan(request, plan_id: UUID):

    # if not plan_id:
    #     return Response(
    #         {"ok": False, "error": "plan_id is required"},
    #         status=status.HTTP_400_BAD_REQUEST,
    #     )
    # 1) Obtener plan
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        return Response(
            {"ok": False, "error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND
        )
    # 1.1) Solo se destruyen planes que hayan terminado OK
    if plan.status != Plan.Status.SUCCESS:
        return Response(
            {
                "ok": False,
                "error": f"No se puede destruir un plan en estado {plan.status}. Debe estar en SUCCESS.",
            },
            status=status.HTTP_409_CONFLICT,
        )
    # 2) Bloqueo si está corriendo
    if _is_running(plan):
        return Response(
            {
                "ok": False,
                "error": "Plan en ejecución. Espera a que termine antes de lanzar otra acción.",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # 3) Bloqueo si es simulación (no hay infraestructura real que destruir)
    if bool((plan.payload or {}).get("simulate_only", True)):
        return Response(
            {
                "ok": False,
                "error": "Plan en modo simulación: no hay infraestructura que destruir.",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # 4) Marcar RUNNING + lanzar task
    # Aseguramos consistencia: destruir siempre implica simulate_only=False
    merged_payload = dict(plan.payload or {})
    merged_payload["simulate_only"] = False
    plan.payload = merged_payload
    plan.updated_at = timezone.now()

    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.save(update_fields=["status", "error", "updated_at", "payload"])

    task = destroy_last_deploy.delay(str(plan.id))
    plan.task_id = task.id
    plan.updated_at = timezone.now()
    plan.save(update_fields=["task_id", "updated_at"])

    return Response(
        {
            "ok": True,
            "plan_id": str(plan.id),
            "task_id": task.id,
            "firestore_vpc_id": plan.firestore_vpc_id,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def destroy_last_plan(request):
    plan = (
        Plan.objects.filter(status=Plan.Status.SUCCESS)
        .exclude(payload__simulate_only=True)
        .order_by("-updated_at")
        .first()
    )
    if not plan:
        return Response(
            {"ok": False, "error": "No hay planes SUCCESS aplicados para destruir."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # reutiliza tu lógica real: llama destroy_plan(plan_id)
    return destroy_plan(request, plan.id)

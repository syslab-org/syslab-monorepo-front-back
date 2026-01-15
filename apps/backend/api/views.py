# apps/backend/api/views.py
import json
from django.http import JsonResponse
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


@csrf_exempt
def ping(_request):
    return JsonResponse({"ok": True})


@csrf_exempt
@require_POST
def run_prueba(request):
    try:
        body = json.loads(request.body or "{}")
        n = int(body.get("n", 5))
    except Exception:
        n = 5
    async_res = prueba_larga.delay(n)
    return JsonResponse({"task_id": async_res.id}, status=202)


def task_status(request, task_id: str):
    res = AsyncResult(task_id)
    payload = {"task_id": task_id, "state": res.state}
    if res.state == "SUCCESS":
        payload["result"] = res.result
    elif res.state == "FAILURE":
        payload["error"] = str(res.info)
    return JsonResponse(payload)


@csrf_exempt
@require_POST
def network_plan_create(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
        validate_network_plan(payload)
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=400)

    firestore_vpc_id = (
        payload.get("firestore_vpc_id")
        or payload.get("vpcId")
        or payload.get("vlan", {}).get("id")
    )

    plan = Plan.objects.create(
        name=payload.get("name", ""),
        payload=payload,
        status=Plan.Status.PENDING,
        firestore_vpc_id=firestore_vpc_id,
    )
    # task = process_network_plan.delay(plan_id=str(plan.id), payload=payload)
    # plan.task_id = task.id
    # plan.save(update_fields=["task_id"])
    return JsonResponse({"ok": True, "plan_id": str(plan.id)}, status=201)


@csrf_exempt
@require_POST
def deploy_plan(request, plan_id):
    # 1) Obtiene el Plan
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Plan not found"}, status=404)

    if _is_running(plan):
        return JsonResponse(
            {
                "ok": False,
                "error": "Plan en ejecución. Espera a que termine antes de lanzar otra acción.",
            },
            status=409,
        )

    # 2) Leer flag desde el body (simulate_only = True por defecto)
    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}
    simulate_only = bool(body.get("simulate_only", True))

    # 3) Valida el payload guardado
    try:
        validate_network_plan(plan.payload)
    except Exception as e:
        plan.status = Plan.Status.FAILURE
        plan.error = str(e)
        plan.save(update_fields=["status", "error"])
        return JsonResponse({"ok": False, "error": str(e)}, status=400)

    # 4) Marca estado y lanzar tarea  con override de simulate_only
    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.save(update_fields=["status", "error"])

    merged_payload = dict(plan.payload or {})
    merged_payload["simulate_only"] = simulate_only

    firestore_vpc_id = (
        merged_payload.get("firestore_vpc_id")
        or merged_payload.get("vpcId")
        or (merged_payload.get("vlan") or {}).get("id")
    )

    if firestore_vpc_id and not plan.firestore_vpc_id:
        plan.firestore_vpc_id = firestore_vpc_id
        plan.save(update_fields=["firestore_vpc_id"])

    task = process_network_plan.delay(plan_id=str(plan.id), payload=merged_payload)
    plan.task_id = task.id
    plan.save(update_fields=["task_id"])
    return JsonResponse(
        {
            "ok": True,
            "plan_id": str(plan.id),
            "task_id": task.id,
            "simulate_only": simulate_only,
        },
        status=202,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def destroy_plan(request, plan_id=None):
    if not plan_id:
        return Response(
            {"ok": False, "error": "plan_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # 1️⃣ Obtener el plan
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        return Response(
            {"ok": False, "error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND
        )
    # 2️⃣ ⛔ BLOQUEO SI YA ESTÁ RUNNING  ← AQUÍ VA
    if _is_running(plan):
        return Response(
            {
                "ok": False,
                "error": "Plan en ejecución. Espera a que termine antes de lanzar otra acción.",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # 3️⃣ ⛔ BLOQUEO SI ES SOLO SIMULACIÓN
    if (plan.payload or {}).get("simulate_only", True):
        return Response(
            {
                "ok": False,
                "error": "Plan en modo simulación: no hay infraestructura que destruir.",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # 4️⃣ Marcar RUNNING y lanzar task
    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.save(update_fields=["status", "error"])

    task = destroy_last_deploy.delay(str(plan.id))
    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.task_id = task.id
    plan.save(update_fields=["status", "error", "task_id"])

    return Response(
        {
            "ok": True,
            "plan_id": str(plan.id),
            "task_id": task.id,
            "firestore_vpc_id": plan.firestore_vpc_id,
        },
        status=status.HTTP_202_ACCEPTED,
    )

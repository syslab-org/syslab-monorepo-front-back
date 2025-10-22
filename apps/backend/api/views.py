# apps/backend/api/views.py
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from celery.result import AsyncResult
from .validators import validate_network_plan
from .tasks import prueba_larga, process_network_plan, destroy_last_deploy
from .models import Plan

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

    plan = Plan.objects.create(
        name=payload.get("name", ""),
        payload=payload,
        status=Plan.Status.PENDING,
    )
    task = process_network_plan.delay(plan_id=str(plan.id), payload=payload)
    plan.task_id = task.id
    plan.save(update_fields=["task_id"])
    return JsonResponse({"ok": True, "plan_id": str(plan.id), "task_id": task.id}, status=202)

@csrf_exempt
@require_POST
def deploy_plan(request, plan_id):
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Plan not found"}, status=404)

    try:
        validate_network_plan(plan.payload)
    except Exception as e:
        plan.status = Plan.Status.FAILURE
        plan.error = str(e)
        plan.save(update_fields=["status", "error"])
        return JsonResponse({"ok": False, "error": str(e)}, status=400)

    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.save(update_fields=["status", "error"])

    task = process_network_plan.delay(plan_id=str(plan.id), payload=plan.payload)
    plan.task_id = task.id
    plan.save(update_fields=["task_id"])
    return JsonResponse({"ok": True, "plan_id": str(plan.id), "task_id": task.id}, status=202)

# --- NUEVO: destroy ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(["POST"])
@permission_classes([AllowAny])  # ajusta permisos según tu auth
def destroy_plan(request, plan_id=None):
    task = destroy_last_deploy.delay(plan_id)
    return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)

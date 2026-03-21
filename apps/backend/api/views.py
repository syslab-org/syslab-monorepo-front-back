import os
from typing import Optional
from uuid import UUID

import boto3
from botocore.exceptions import ClientError
from celery.result import AsyncResult
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .helpers import ensure_lab_for_canvas, visible_plans_queryset
from .models import Plan
from .providers.aws.payload import get_network_id, get_region
from .tasks import destroy_last_deploy, process_network_plan, prueba_larga
from .validators import validate_network_plan


TERMINAL_TASK_STATES = {"SUCCESS", "FAILURE", "REVOKED"}



def _sanitize_payload_for_storage(payload: dict, fallback_canvas_id=None) -> dict:
    """Valida y persiste payloads usando `canvas_id` como identificador canónico.

    Se aceptan aliases legacy (`firestore_vpc_id`, `vpcId`, `vlan.id`) solo
    para compatibilidad con clientes y datos históricos.
    """
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



def _is_running(plan) -> bool:
    return plan.status == Plan.Status.RUNNING



def _plan_running_conflict(plan: Plan) -> Response:
    return Response(
        {
            "ok": False,
            "error": "Plan en ejecucion. Espera a que termine antes de lanzar otra accion.",
            "code": "PLAN_RUNNING",
            "plan_id": str(plan.id),
            "status": plan.status,
            "task_id": plan.task_id,
        },
        status=status.HTTP_409_CONFLICT,
    )



def _plan_state_conflict(plan: Plan, action: str) -> Optional[Response]:
    if action == "destroy" and not plan.can_destroy_now:
        return Response(
            {
                "ok": False,
                "error": "El plan no esta aplicado (ni quedo en apply real fallido). No hay infraestructura que destruir.",
                "code": "PLAN_NOT_APPLIED",
                "plan_id": str(plan.id),
            },
            status=status.HTTP_409_CONFLICT,
        )
    return None



def _can_run_real_terraform() -> bool:
    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    allow_local = os.getenv("ALLOW_LOCAL_APPLY") == "1"
    has_static_creds = bool(
        os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    )
    has_profile = (
        bool(os.getenv("AWS_PROFILE")) and os.getenv("AWS_SDK_LOAD_CONFIG") == "1"
    )
    return running_in_ecs or (allow_local and (has_static_creds or has_profile))



def _probe_plan_live_vpcs(plan: Plan):
    """Detecta si el despliegue AWS aún existe usando los VPC ids del último apply."""
    outputs = plan.outputs or {}
    if not isinstance(outputs, dict):
        return None, "missing_outputs"

    vpc_map = outputs.get("vpc_ids")
    if not isinstance(vpc_map, dict) or not vpc_map:
        return None, "missing_vpc_ids"

    vpc_ids = sorted({str(v).strip() for v in vpc_map.values() if str(v or "").strip()})
    if not vpc_ids:
        return None, "missing_vpc_ids"

    payload = plan.payload or {}
    region = get_region(payload)
    profile = os.getenv("AWS_PROFILE")
    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    ec2 = session.client("ec2", region_name=region)

    found = 0
    for vpc_id in vpc_ids:
        try:
            ec2.describe_vpcs(VpcIds=[vpc_id])
            found += 1
        except ClientError as e:
            code = (e.response.get("Error", {}) or {}).get("Code", "")
            if code == "InvalidVpcID.NotFound":
                continue
            return None, f"probe_error:{code}"
        except Exception as e:
            return None, f"probe_error:{e}"

    return found > 0, f"vpcs_found={found}/{len(vpc_ids)}"



def _reconcile_applied_flag_if_drifted(plan: Plan):
    if not bool(plan.applied) or not _can_run_real_terraform():
        return False

    has_live, reason = _probe_plan_live_vpcs(plan)
    if has_live is not False:
        return False

    payload = dict(plan.payload or {})
    payload["simulate_only"] = True
    plan.applied = False
    plan.status = Plan.Status.PENDING
    plan.last_action = Plan.LastAction.PLAN
    plan.error = (
        "Se detecto drift: la infraestructura ya no existe en AWS y el estado local "
        f"se reconcilio a no aplicado ({reason})."
    )
    plan.updated_at = timezone.now()
    plan.payload = payload
    plan.save(
        update_fields=["applied", "status", "last_action", "error", "updated_at", "payload"]
    )
    return True



def _get_visible_plan_or_404(request, plan_id):
    plan = visible_plans_queryset(
        request.user,
        Plan.objects.select_related("lab", "lab__course", "lab__course__teacher"),
    ).filter(id=plan_id).first()
    if not plan:
        return None
    return plan


@api_view(["GET"])
@permission_classes([AllowAny])
def ping(_request):
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_prueba(request):
    body = request.data or {}
    try:
        n = int(body.get("n", 5))
    except Exception:
        n = 5
    async_res = prueba_larga.delay(n)
    return Response({"task_id": async_res.id}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_status(request, task_id: str):
    plan = visible_plans_queryset(request.user).filter(task_id=task_id).first()
    if not plan:
        return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)
    res = AsyncResult(task_id)
    payload = {"task_id": task_id, "state": res.state, "plan_id": str(plan.id)}
    if res.state == "SUCCESS":
        payload["result"] = res.result
    elif res.state == "FAILURE":
        payload["error"] = str(res.info)
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def network_plan_create(request):
    payload = request.data or {}

    try:
        sanitized_payload = _sanitize_payload_for_storage(payload)
    except Exception as e:
        return Response({"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    canvas_id = (
        sanitized_payload.get("canvas_id")
        or payload.get("canvas_id")
        or payload.get("firestore_vpc_id")
        or payload.get("vpcId")
        or get_network_id(payload)
    )
    if not canvas_id:
        return Response(
            {
                "ok": False,
                "error": "canvas_id es requerido para mantener 1 Canvas = 1 Plan.",
                "code": "MISSING_CANVAS_ID",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    lab = ensure_lab_for_canvas(request.user, str(canvas_id), name=sanitized_payload.get("name", ""))

    plan, created = Plan.objects.get_or_create(
        **Plan.canvas_lookup(lab.canvas_id),
        defaults={
            "lab": lab,
            "name": sanitized_payload.get("name", ""),
            "payload": sanitized_payload,
            "status": Plan.Status.PENDING,
        },
    )

    if not created:
        if _is_running(plan):
            return _plan_running_conflict(plan)
        plan.lab = lab
        plan.name = sanitized_payload.get("name", plan.name or "")
        plan.payload = sanitized_payload
        plan.applied = False
        plan.last_action = Plan.LastAction.CANVAS_UPDATE
        plan.updated_at = timezone.now()
        plan.status = Plan.Status.PENDING
        plan.error = ""
        plan.save(
            update_fields=[
                "lab",
                "name",
                "payload",
                "updated_at",
                "status",
                "error",
                "applied",
                "last_action",
            ]
        )

    return Response(
        {
            "ok": True,
            "plan_id": str(plan.id),
            "created": created,
            "canvas_id": lab.canvas_id,
            "lab_id": str(lab.id),
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def deploy_plan(request, plan_id: UUID):
    plan = _get_visible_plan_or_404(request, plan_id)
    if not plan:
        return Response({"ok": False, "error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

    if _is_running(plan):
        return _plan_running_conflict(plan)

    body = request.data or {}
    simulate_only = bool(body.get("simulate_only", True))

    if bool(plan.applied):
        drift_reconciled = _reconcile_applied_flag_if_drifted(plan)
        if drift_reconciled:
            plan.refresh_from_db()

    if not simulate_only:
        conflict = _plan_state_conflict(plan, "apply")
        if conflict:
            return conflict

    if not simulate_only and not _can_run_real_terraform():
        return Response(
            {
                "ok": False,
                "error": (
                    "Terraform apply BLOQUEADO: no hay credenciales IAM detectadas. "
                    "En local requiere ALLOW_LOCAL_APPLY=1 y AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. "
                    "En produccion, ejecutar en ECS con task role."
                ),
            },
            status=status.HTTP_409_CONFLICT,
        )

    raw_payload = dict(plan.payload or {})
    try:
        sanitized_payload = _sanitize_payload_for_storage(raw_payload, fallback_canvas_id=plan.canvas_id)
    except Exception as e:
        plan.status = Plan.Status.FAILURE
        plan.error = str(e)
        plan.save(update_fields=["status", "error"])
        return Response({"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.last_action = Plan.LastAction.APPLY if not simulate_only else Plan.LastAction.PLAN
    plan.save(update_fields=["status", "error", "last_action"])

    task_payload = dict(sanitized_payload or {})
    task_payload["simulate_only"] = simulate_only

    persisted_payload = dict(task_payload)
    if simulate_only and bool(plan.applied):
        persisted_payload["simulate_only"] = bool((plan.payload or {}).get("simulate_only", False))

    plan.updated_at = timezone.now()
    plan.payload = persisted_payload
    plan.last_action = Plan.LastAction.APPLY if not simulate_only else Plan.LastAction.PLAN
    plan.lab = plan.lab or ensure_lab_for_canvas(request.user, plan.canvas_id, name=plan.name)
    plan.save(update_fields=["updated_at", "payload", "last_action", "lab"])

    canvas_id = persisted_payload.get("canvas_id") or get_network_id(persisted_payload)
    if canvas_id and not plan.canvas_id:
        plan.assign_canvas_id(canvas_id)
        plan.save(update_fields=["canvas_id"])

    task = process_network_plan.delay(plan_id=str(plan.id), payload=task_payload)
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
@permission_classes([IsAuthenticated])
def destroy_plan(request, plan_id: UUID):
    plan = _get_visible_plan_or_404(request, plan_id)
    if not plan:
        return Response({"ok": False, "error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)
    return _start_destroy_for_plan(plan)



def _start_destroy_for_plan(plan: Plan):
    if _is_running(plan):
        return _plan_running_conflict(plan)

    conflict = _plan_state_conflict(plan, "destroy")
    if conflict:
        return conflict

    if not _can_run_real_terraform():
        return Response(
            {
                "ok": False,
                "error": (
                    "Terraform destroy BLOQUEADO: no hay credenciales IAM detectadas. "
                    "En local requiere ALLOW_LOCAL_APPLY=1 y AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. "
                    "En produccion, ejecutar en ECS con task role."
                ),
            },
            status=status.HTTP_409_CONFLICT,
        )

    merged_payload = dict(plan.payload or {})
    merged_payload["simulate_only"] = False
    plan.payload = merged_payload
    plan.updated_at = timezone.now()
    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.last_action = Plan.LastAction.DESTROY
    plan.save(update_fields=["status", "error", "updated_at", "payload", "last_action"])

    task = destroy_last_deploy.delay(str(plan.id))
    plan.task_id = task.id
    plan.updated_at = timezone.now()
    plan.save(update_fields=["task_id", "updated_at"])

    return Response(
        {
            "ok": True,
            "plan_id": str(plan.id),
            "task_id": task.id,
            "canvas_id": plan.canvas_id,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def destroy_last_plan(request):
    plan = visible_plans_queryset(request.user).order_by("-updated_at").first()
    if not plan:
        return Response({"ok": False, "error": "No hay planes disponibles."}, status=status.HTTP_404_NOT_FOUND)
    return _start_destroy_for_plan(plan)

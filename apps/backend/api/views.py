# apps/backend/api/views.py
import os
from uuid import UUID
from django.utils import timezone
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


def _plan_running_conflict(plan: Plan) -> Response:
    """Respuesta estándar cuando un Plan ya está en ejecución.

    Centraliza el mensaje/shape para que el frontend pueda manejarlo de forma consistente.
    """
    return Response(
        {
            "ok": False,
            "error": "Plan en ejecución. Espera a que termine antes de lanzar otra acción.",
            "code": "PLAN_RUNNING",
            "plan_id": str(plan.id),
            "status": plan.status,
            "task_id": plan.task_id,
        },
        status=status.HTTP_409_CONFLICT,
    )


def _plan_state_conflict(plan: Plan, action: str) -> Response:
    """
    Enforce Camino 1: 1 Plan = 1 stack.
    - apply: solo permitido si applied == False
    - destroy: solo permitido si applied == True
    """
    if action == "apply" and plan.applied:
        return Response(
            {
                "ok": False,
                "error": "El plan ya fue aplicado. Debe destruirse antes de volver a aplicar.",
                "code": "PLAN_ALREADY_APPLIED",
                "plan_id": str(plan.id),
            },
            status=status.HTTP_409_CONFLICT,
        )
    if action == "destroy" and not plan.applied:
        return Response(
            {
                "ok": False,
                "error": "El plan no está aplicado. No hay infraestructura que destruir.",
                "code": "PLAN_NOT_APPLIED",
                "plan_id": str(plan.id),
            },
            status=status.HTTP_409_CONFLICT,
        )
    return None


def _can_run_real_terraform() -> bool:
    """Regla única para permitir acciones reales (apply/destroy).

    - En producción/ECS: permitido por task role.
    - En local: solo si ALLOW_LOCAL_APPLY=1 y existen AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
    """
    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    allow_local = os.getenv("ALLOW_LOCAL_APPLY") == "1"
    # Caso A: keys directas en env
    has_static_creds = bool(
        os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    )
    # Caso B: profile + config montado
    has_profile = (
        bool(os.getenv("AWS_PROFILE")) and os.getenv("AWS_SDK_LOAD_CONFIG") == "1"
    )
    return running_in_ecs or (allow_local and (has_static_creds or has_profile))


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

    # Reglas Camino 1: necesitamos un identificador estable del canvas.
    if not firestore_vpc_id:
        return Response(
            {
                "ok": False,
                "error": "firestore_vpc_id (canvas id) es requerido para mantener 1 Canvas = 1 Plan.",
                "code": "MISSING_CANVAS_ID",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 3) Upsert del Plan por canvas_id (1 Canvas = 1 Plan)
    plan, created = Plan.objects.get_or_create(
        firestore_vpc_id=firestore_vpc_id,
        defaults={
            "name": payload.get("name", ""),
            "payload": payload,
            "status": Plan.Status.PENDING,
        },
    )

    # Si ya existe, actualizamos name/payload (pero respetamos RUNNING)
    if not created:
        if _is_running(plan):
            return _plan_running_conflict(plan)

        plan.name = payload.get("name", plan.name or "")
        plan.payload = payload
        # Si el plan estaba aplicado y el canvas cambió, marcamos que ahora hay cambios pendientes.
        plan.applied = False
        plan.last_action = "canvas_update"
        plan.updated_at = timezone.now()
        # Mantener estado consistente: cambios desde canvas => PENDING y sin errores.
        plan.status = Plan.Status.PENDING
        plan.error = ""
        plan.save(
            update_fields=[
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
            "firestore_vpc_id": firestore_vpc_id,
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
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
        return _plan_running_conflict(plan)

    conflict = _plan_state_conflict(plan, "apply")
    if conflict:
        return conflict

    # 3) Leer flag simulate_only (default True)

    body = request.data or {}
    simulate_only = bool(body.get("simulate_only", True))

    # 3.1) Si es apply real, valida que el entorno permite acciones reales
    if not simulate_only and not _can_run_real_terraform():
        return Response(
            {
                "ok": False,
                "error": (
                    "Terraform apply BLOQUEADO: no hay credenciales IAM detectadas. "
                    "En local requiere ALLOW_LOCAL_APPLY=1 y AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. "
                    "En producción, ejecutar en ECS con task role."
                ),
            },
            status=status.HTTP_409_CONFLICT,
        )

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
    # Guardamos la intención (la ejecución real la confirma tasks.py)
    plan.last_action = "apply" if not simulate_only else "plan"
    plan.save(update_fields=["status", "error", "last_action"])

    # 6) Payload final para la task
    merged_payload = dict(plan.payload or {})
    merged_payload["simulate_only"] = simulate_only

    # Persistimos el simulate_only en el payload (single source of truth)
    plan.updated_at = timezone.now()
    plan.payload = merged_payload
    plan.last_action = "apply" if not simulate_only else "plan"
    plan.save(update_fields=["updated_at", "payload", "last_action"])

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
    # 1.1) Solo se destruyen planes que hayan terminado OK y que realmente fueron aplicados
    # if plan.status != Plan.Status.SUCCESS:
    #     return Response(
    #         {
    #             "ok": False,
    #             "error": f"No se puede destruir un plan en estado {plan.status}. Debe estar en SUCCESS.",
    #         },
    #         status=status.HTTP_409_CONFLICT,
    #     )

    # Si nunca se aplicó (solo plan/simulación), no hay nada real que destruir
    # if not bool(getattr(plan, "applied", False)):
    #     return Response(
    #         {
    #             "ok": False,
    #             "error": "Este plan no fue aplicado (applied=False). No hay infraestructura real que destruir.",
    #         },
    #         status=status.HTTP_409_CONFLICT,
    #     )
    # 2) Bloqueo si está corriendo
    if _is_running(plan):
        return _plan_running_conflict(plan)

    conflict = _plan_state_conflict(plan, "destroy")
    if conflict:
        return conflict

    # 3) Bloqueo si es simulación (no hay infraestructura real que destruir)
    if bool((plan.payload or {}).get("simulate_only", True)):
        return Response(
            {
                "ok": False,
                "error": "Plan en modo simulación: no hay infraestructura que destruir.",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # 3.1) Destroy real también requiere credenciales
    if not _can_run_real_terraform():
        return Response(
            {
                "ok": False,
                "error": (
                    "Terraform destroy BLOQUEADO: no hay credenciales IAM detectadas. "
                    "En local requiere ALLOW_LOCAL_APPLY=1 y AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. "
                    "En producción, ejecutar en ECS con task role."
                ),
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
    plan.last_action = "destroy"
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
            "firestore_vpc_id": plan.firestore_vpc_id,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def destroy_last_plan(request):
    plan = (
        Plan.objects.filter(status=Plan.Status.SUCCESS, applied=True)
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

import json
import os
import time
from dataclasses import dataclass

from celery import shared_task
from django.db import transaction

from .models import Plan
from .providers.aws.payload import uses_tgw
from .providers.aws.runtime import (
    aws_creds_diagnostics,
    can_call_aws_sts,
    check_tgw_quota_preflight,
    cleanup_residual_nat_gateways,
    normalize_payload,
)
from .providers.aws.terraform import (
    ensure_apply_succeeded,
    ensure_destroy_succeeded,
    ensure_init_succeeded,
    ensure_plan_succeeded,
    read_main_preview,
    read_outputs_json,
    render_workspace,
    terraform_apply,
    terraform_destroy,
    terraform_init,
    terraform_plan,
)
from provisioning.terraform_runner import cleanup  # solo usamos cleanup aquí


@dataclass
class AwsExecutionBundle:
    plan_id: str
    payload: dict
    simulate_only: bool
    diag: dict
    sts_ok: bool
    sts_reason: str
    allow_local_apply: bool
    creds_ok_for_apply: bool
    workdir: str | None = None
    state_path: str | None = None
    tf_text: str = ""
    full_log: str = ""

    def append_log(self, text: str) -> None:
        self.full_log += text


def _normalize_incoming_payload(payload):
    if isinstance(payload, str):
        try:
            payload = json.loads(payload or "{}")
        except Exception:
            payload = {}
    return normalize_payload(payload if isinstance(payload, dict) else {})


def _build_execution_bundle(plan_id: str, payload, *, force_simulate_only: bool | None = None) -> AwsExecutionBundle:
    normalized_payload = _normalize_incoming_payload(payload)
    if force_simulate_only is not None:
        normalized_payload["simulate_only"] = force_simulate_only

    diag = aws_creds_diagnostics()
    allow_local_apply = diag["allow_local_apply"]
    sts_ok, sts_reason = can_call_aws_sts()
    creds_ok_for_apply = bool(diag["running_in_ecs"] or (allow_local_apply and sts_ok))

    return AwsExecutionBundle(
        plan_id=plan_id,
        payload=normalized_payload,
        simulate_only=bool(normalized_payload["simulate_only"]),
        diag=diag,
        sts_ok=sts_ok,
        sts_reason=sts_reason,
        allow_local_apply=allow_local_apply,
        creds_ok_for_apply=creds_ok_for_apply,
    )


def _prepare_workspace(bundle: AwsExecutionBundle, *, prefix: str, include_debug_dumps: bool) -> None:
    workdir, state_path, tf_text = render_workspace(
        plan_id=bundle.plan_id,
        payload=bundle.payload,
        simulate_only=bundle.simulate_only,
        prefix=prefix,
    )
    bundle.workdir = workdir
    bundle.state_path = state_path
    bundle.tf_text = tf_text

    bundle.append_log(f"[state] backend local path={state_path}\n")

    if include_debug_dumps:
        try:
            from .providers.aws.terraform import write_debug_dumps

            write_debug_dumps(workdir, bundle.payload, tf_text)
            bundle.append_log(f"[debug] dumps escritos en {workdir}\n")
        except Exception as e:
            bundle.append_log(f"[debug] no pude escribir dumps: {e}\n")

        try:
            preview = read_main_preview(workdir, lines=40)
            bundle.append_log(
                f"\n--- main.tf (primeras líneas) ---\n{preview}\n-------------------------------\n"
            )
        except Exception:
            pass


def _append_runtime_diagnostics(bundle: AwsExecutionBundle, *, action_label: str) -> None:
    bundle.append_log(f"workdir={bundle.workdir}\n")
    bundle.append_log(f"{action_label} simulate_only={bundle.simulate_only}\n")
    bundle.append_log(
        f"aws_diag={bundle.diag} sts_ok={bundle.sts_ok} "
        f"sts_reason={bundle.sts_reason} ALLOW_LOCAL_APPLY={bundle.allow_local_apply}\n\n"
    )


def _blocked_credentials_message(action: str, bundle: AwsExecutionBundle) -> str:
    return (
        f"Terraform {action} BLOQUEADO: no hay credenciales AWS resolubles en este container. "
        "En ECS se resuelve por task role. En local requiere ALLOW_LOCAL_APPLY=1 y credenciales disponibles "
        "(env vars o AWS_PROFILE + ~/.aws montado). "
        f"Diagnóstico: {bundle.diag} / sts_reason={bundle.sts_reason}"
    )


# === TAREAS CELERY ===
@shared_task(name="api.tasks.prueba_larga")
def prueba_larga(n: int = 3):
    import time

    time.sleep(1)
    return {"ok": True, "n": n}


@shared_task(bind=True)
def process_network_plan(self, plan_id: str, payload: dict):
    """
    Renderiza main.tf.j2 y ejecuta Terraform (plan o apply).
    - simulate_only=True => modo simulación (sin aplicar)
    - simulate_only=False => apply real (requiere credenciales)
    """
    bundle = _build_execution_bundle(plan_id, payload)
    plan_obj = None
    previous_applied = False

    try:
        # === 1) Actualiza estado del Plan ===
        with transaction.atomic():
            try:
                plan_obj = Plan.objects.select_for_update().get(id=plan_id)
                previous_applied = bool(plan_obj.applied)
                if bundle.payload and not plan_obj.payload:
                    plan_obj.payload = bundle.payload
            except Plan.DoesNotExist:
                plan_obj = Plan.objects.create(
                    name=bundle.payload.get("name", ""),
                    payload=bundle.payload,
                    status=Plan.Status.PENDING,
                )
                previous_applied = False

            plan_obj.mark_running(
                task_id=self.request.id,
                last_action="apply" if not bundle.simulate_only else "plan",
                payload=plan_obj.payload,
                deploy=True,
            )

        # === 2) Renderiza workspace Terraform ===
        _prepare_workspace(
            bundle,
            prefix="tf-multi-",
            include_debug_dumps=True,
        )
        _append_runtime_diagnostics(bundle, action_label="plan")

        # === 5.1) Preflight TGW quota (solo apply real con TGW) ===
        if not bundle.simulate_only:
            try:
                tgw_ok, tgw_reason, tgw_info = check_tgw_quota_preflight(bundle.payload)
            except Exception as e:
                tgw_ok, tgw_reason, tgw_info = (
                    False,
                    f"TGW preflight error: {e}",
                    {"used": uses_tgw(bundle.payload), "preflight_error": str(e)},
                )

            bundle.append_log(f"[preflight][tgw] reason={tgw_reason} info={tgw_info}\n\n")

            if not tgw_ok:
                msg = (
                    f"Terraform apply BLOQUEADO: {tgw_reason} "
                    "Puedes destruir TGWs viejos o cambiar el router a modo peering."
                )
                plan_obj.mark_failure(error=msg, full_log=bundle.full_log, last_action="apply", applied=False)

                return {
                    "ok": False,
                    "error": msg,
                    "plan_id": str(plan_obj.id),
                    "log": bundle.full_log,
                }

        # === 6) Terraform init ===
        proc = terraform_init(bundle.workdir)
        bundle.append_log(proc.log_block())
        ensure_init_succeeded(proc)

        # === 7) Terraform plan ===
        # En preview mantenemos refresh=false para no depender de llamadas AWS.
        # En apply real usamos refresh=true para reconciliar drift manual en AWS.
        proc = terraform_plan(bundle.workdir, simulate_only=bundle.simulate_only)
        bundle.append_log(f"\n{proc.log_block()}")
        ensure_plan_succeeded(proc)

        # === 8) Terraform apply (solo si simulate_only=False) ===
        applied = False
        if not bundle.simulate_only:
            if not bundle.creds_ok_for_apply:
                msg = _blocked_credentials_message("apply", bundle)
                bundle.append_log(f"\n[SEGURIDAD] {msg}\n")
                plan_obj.mark_failure(error=msg, full_log=bundle.full_log, last_action="apply", applied=False)

                return {
                    "ok": False,
                    "error": msg,
                    "plan_id": str(plan_obj.id),
                    "log": bundle.full_log,
                }

            proc = terraform_apply(bundle.workdir)
            bundle.append_log(f"\n{proc.log_block()}")
            ensure_apply_succeeded(proc)
            applied = True

            # Guardar outputs (solo después de apply real)
            try:
                tf_outputs = read_outputs_json(bundle.workdir)
                plan_obj.outputs = tf_outputs
            except Exception as oe:
                bundle.append_log(f"\n[outputs] No pude leer terraform output -json: {oe}\n")

        # === 9) Guarda logs y marca SUCCESS ===
        # Persistimos logs en DB para depuración desde el frontend
        outputs = plan_obj.outputs
        # Si fue solo plan (simulate), intentamos leer outputs pero puede no existir state.
        if not applied:
            try:
                outputs = read_outputs_json(bundle.workdir)
            except Exception:
                pass

        plan_obj.mark_success(
            full_log=bundle.full_log,
            applied=previous_applied if bundle.simulate_only else applied,
            last_action="apply" if applied else "plan",
            outputs=outputs,
        )

        return {
            "ok": True,
            "plan_id": str(plan_obj.id),
            "applied": applied,
            "s3_key": "",
            "log": bundle.full_log,
        }

    except Exception as e:
        # === Error general ===
        if plan_obj:
            plan_obj.mark_failure(error=str(e), full_log=bundle.full_log + f"\n\nERROR: {e}\n")

        return {
            "ok": False,
            "error": str(e),
            "plan_id": (str(plan_obj.id) if plan_obj else None),
            "log": bundle.full_log,
        }

    finally:
        # === Limpieza del directorio temporal ===
        if bundle.workdir:
            if os.getenv("KEEP_TF_DIRS", "0") == "1":
                bundle.append_log(f"[debug] KEEP_TF_DIRS activo, conservando {bundle.workdir}\n")
            else:
                cleanup(bundle.workdir)


@shared_task(bind=True)
def destroy_last_deploy(self, plan_id: str):
    plan = Plan.objects.get(id=plan_id)
    bundle = _build_execution_bundle(plan_id, plan.payload or {}, force_simulate_only=False)

    # La validación de "si se puede destruir" se hace en la vista antes de encolar.
    # Aquí evitamos revalidar con `can_destroy_now` porque el plan ya viene en RUNNING.
    if (plan.payload or {}).get("simulate_only", True) and not plan.applied:
        # No-op idempotente: no hay recursos reales que destruir.
        msg = "Plan en modo simulación: no hay infraestructura real que destruir."
        plan.mark_destroy_noop(message=msg, full_log=bundle.full_log)
        return {
            "ok": True,
            "message": msg,
            "log": msg,
            "state_path": None,
            "plan_id": str(plan.id),
        }

    if not bundle.creds_ok_for_apply:
        msg = _blocked_credentials_message("destroy", bundle)
        plan.mark_failure(error=msg, full_log=bundle.full_log + msg, last_action="destroy")
        return {
            "ok": False,
            "error": msg,
            "log": "",
            "state_path": None,
            "plan_id": str(plan.id),
        }

    # (Opcional pero recomendado)
    # si este plan NUNCA fue apply real, destroy no tiene sentido
    # si quieres, bloquea cuando payload.simulate_only == True
    # if payload.get("simulate_only", True):
    #     return {"ok": False, "error": "Plan en modo simulación: no hay infraestructura que destruir."}

    plan.mark_running(
        task_id=self.request.id,
        last_action="destroy",
        destroy=True,
    )

    try:
        _prepare_workspace(
            bundle,
            prefix="tf-destroy-",
            include_debug_dumps=False,
        )
        _append_runtime_diagnostics(bundle, action_label="destroy")

        # 4) init
        p_init = terraform_init(bundle.workdir)
        bundle.append_log(p_init.log_block())
        ensure_init_succeeded(p_init)

        # 5) destroy
        p = terraform_destroy(bundle.workdir)
        bundle.append_log(p.log_block())
        nat_cleanup_error = ""
        nat_cleanup_summary = {}
        try:
            nat_cleanup_summary = cleanup_residual_nat_gateways(
                bundle.payload, plan.outputs or {}
            )
            bundle.append_log(
                f"[cleanup][nat] {json.dumps(nat_cleanup_summary, indent=2, sort_keys=True)}\n"
            )
        except Exception as cleanup_exc:
            nat_cleanup_error = str(cleanup_exc)
            bundle.append_log(f"[cleanup][nat][error] {cleanup_exc}\n")
        ensure_destroy_succeeded(p)
        if nat_cleanup_error:
            raise RuntimeError(
                f"destroy completed but NAT residual cleanup failed: {nat_cleanup_error}"
            )
        if nat_cleanup_summary.get("remaining_nat_ids"):
            remaining = ", ".join(nat_cleanup_summary["remaining_nat_ids"])
            raise RuntimeError(
                f"destroy completed but residual NAT Gateways remain: {remaining}"
            )

        # Importante: NO borramos outputs en destroy.
        # Se conservan como "últimos outputs cuando estuvo ACTIVE" para auditoría/debug.
        plan.mark_success(full_log=bundle.full_log, applied=False, last_action="destroy", outputs=plan.outputs)

        return {
            "ok": True,
            "log": bundle.full_log,
            "state_path": bundle.state_path,
            "plan_id": str(plan.id),
            "s3_key": "",
        }

    except Exception as e:
        plan.mark_failure(error=str(e), full_log=bundle.full_log + f"\n\nERROR: {e}\n", last_action="destroy")
        return {"ok": False, "error": str(e), "log": bundle.full_log}

    finally:
        if bundle.workdir:
            cleanup(bundle.workdir)

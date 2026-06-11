import json
import time

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .cloud_connections import (
    resolve_lab_cloud_connection,
)
from .models import Plan, PlanExecutionRecord
from .providers import (
    build_connection_runtime_env,
    get_provider_executor,
    get_provider_key,
    get_provider_runtime_hooks,
    get_runtime_identity,
)


LOG_FLUSH_MIN_INTERVAL_SECONDS = 1.0
LOG_FLUSH_MIN_CHARS = 160


def _make_incremental_log_flusher(plan_obj, bundle):
    state = {"ts": 0.0, "size": 0}

    def flush(*, force: bool = False):
        size = len(bundle.full_log or "")
        if size == 0:
            return

        now = time.monotonic()
        grew_enough = (size - state["size"]) >= LOG_FLUSH_MIN_CHARS
        waited_enough = (now - state["ts"]) >= LOG_FLUSH_MIN_INTERVAL_SECONDS

        if not force and not grew_enough and not waited_enough:
            return

        Plan.objects.filter(id=plan_obj.id).update(
            last_log=bundle.full_log,
            last_log_updated_at=timezone.now(),
            updated_at=timezone.now(),
        )
        state["ts"] = now
        state["size"] = size

    return flush


def _build_last_apply_context(*, provider, connection, bundle, identity=None, identity_error=""):
    identity = identity or {}
    runtime_env = bundle.runtime_env or {}
    runtime_hooks = get_provider_runtime_hooks(provider)
    identity_summary = runtime_hooks.summarize_identity(identity)
    region = runtime_hooks.resolve_region(runtime_env=runtime_env, diag=bundle.diag)
    context = {
        "provider": provider,
        "credential_source": bundle.diag.get("credential_source") or ("cloud_connection" if connection else "environment"),
        "region": region,
        "cloud_connection_id": str(connection.id) if connection else "",
        "cloud_connection_name": getattr(connection, "name", "") if connection else "",
        "cloud_connection_scope": getattr(connection, "scope", "") if connection else "",
        "account_id": identity_summary["account_id"],
        "arn": identity_summary["arn"],
        "user_id": identity_summary["user_id"],
        "identity": identity,
        "captured_at": timezone.now().isoformat(),
    }
    if identity_error:
        context["identity_error"] = identity_error
    return context


def _mark_execution_record_running(record_id: str | None, *, task_id: str):
    if not record_id:
        return
    PlanExecutionRecord.objects.filter(id=record_id).update(
        status=PlanExecutionRecord.Status.RUNNING,
        task_id=task_id,
        started_at=timezone.now(),
        updated_at=timezone.now(),
    )


def _mark_execution_record_finished(
    record_id: str | None,
    *,
    status_value: str,
    task_id: str = "",
    bundle=None,
    connection=None,
    identity=None,
    error: str = "",
):
    if not record_id:
        return

    identity = identity or {}
    updates = {
        "status": status_value,
        "completed_at": timezone.now(),
        "updated_at": timezone.now(),
        "error": str(error or ""),
    }
    if task_id:
        updates["task_id"] = task_id
    if bundle:
        updates["credential_source"] = bundle.diag.get("credential_source") or ("cloud_connection" if connection else "environment")
    if connection:
        updates["cloud_connection_id"] = connection.id
        updates["cloud_connection_name"] = getattr(connection, "name", "") or ""
        updates["cloud_connection_scope"] = getattr(connection, "scope", "") or ""
    if identity:
        provider = getattr(bundle, "provider", "") or getattr(connection, "provider", "")
        identity_summary = get_provider_runtime_hooks(provider).summarize_identity(identity)
        updates["account_id"] = identity_summary["account_id"]
        updates["arn"] = identity_summary["arn"]
        updates["sts_user_id"] = identity_summary["user_id"]
    PlanExecutionRecord.objects.filter(id=record_id).update(**updates)


# === TAREAS CELERY ===
@shared_task(name="api.tasks.prueba_larga")
def prueba_larga(n: int = 3):
    import time

    time.sleep(1)
    return {"ok": True, "n": n}


@shared_task(bind=True)
def process_network_plan(self, plan_id: str, payload: dict, execution_record_id: str | None = None):
    """
    Renderiza main.tf.j2 y ejecuta Terraform (plan o apply).
    - simulate_only=True => modo simulación (sin aplicar)
    - simulate_only=False => apply real (requiere credenciales)
    """
    raw_payload = payload
    if isinstance(raw_payload, str):
        try:
            raw_payload = json.loads(raw_payload or "{}")
        except Exception:
            raw_payload = {}
    provider = get_provider_key((raw_payload or {}).get("cloud") if isinstance(raw_payload, dict) else None)
    plan_obj = None
    previous_applied = False
    executor = get_provider_executor(provider)
    bundle = None
    connection = None

    try:
        # === 1) Actualiza estado del Plan ===
        with transaction.atomic():
            try:
                plan_obj = Plan.objects.select_for_update().get(id=plan_id)
                previous_applied = bool(plan_obj.applied)
                if raw_payload and not plan_obj.payload:
                    plan_obj.payload = raw_payload
            except Plan.DoesNotExist:
                plan_obj = Plan.objects.create(
                    name=(raw_payload or {}).get("name", ""),
                    payload=raw_payload or {},
                    status=Plan.Status.PENDING,
                )
                previous_applied = False

            runtime_env = {}
            if plan_obj.lab_id:
                plan_obj = Plan.objects.select_related(
                    "lab",
                    "lab__cloud_connection",
                    "lab__course",
                    "lab__owner_user",
                ).get(id=plan_obj.id)
                connection = resolve_lab_cloud_connection(plan_obj.lab, provider)
                runtime_env = build_connection_runtime_env(connection, provider) if connection else {}

            bundle = executor.build_bundle(plan_id, raw_payload, runtime_env=runtime_env)

            plan_obj.mark_running(
                task_id=self.request.id,
                last_action="apply" if not bundle.simulate_only else "plan",
                payload=plan_obj.payload,
                deploy=True,
            )
        _mark_execution_record_running(execution_record_id, task_id=self.request.id)
        log_flush = _make_incremental_log_flusher(plan_obj, bundle)
        bundle.on_log_append = lambda _bundle: log_flush()

        # === 2) Renderiza workspace Terraform ===
        executor.prepare_workspace(
            bundle,
            prefix="tf-multi-",
            include_debug_dumps=True,
        )
        executor.append_runtime_diagnostics(bundle, action_label="plan")

        # === 5.1) Preflight TGW quota (solo apply real con TGW) ===
        if not bundle.simulate_only:
            preflight_ok, preflight_reason, preflight_info = executor.preflight_apply(bundle)
            bundle.append_log(f"[preflight][apply] reason={preflight_reason} info={preflight_info}\n\n")

            if not preflight_ok:
                if str(preflight_info.get("kind") or "") == "key_pairs":
                    missing = preflight_info.get("missing_key_pairs") or []
                    missing_text = ", ".join(missing) if missing else "unknown"
                    msg = (
                        "Terraform apply BLOQUEADO por key pair inexistente. "
                        f"AWS no encontró: {missing_text}. "
                        "Revisa ssh_access y confirma que esa key pair exista en la cuenta y región efectivas."
                    )
                    bundle.append_log(
                        f"[preflight][key_pairs] missing={missing} region={preflight_info.get('region')}\n\n"
                    )
                else:
                    msg = (
                        f"Terraform apply BLOQUEADO: {preflight_reason} "
                        "Corrige el prerequisito AWS faltante antes de reintentar."
                    )
                plan_obj.mark_failure(error=msg, full_log=bundle.full_log, last_action="apply", applied=False)
                _mark_execution_record_finished(
                    execution_record_id,
                    status_value=PlanExecutionRecord.Status.FAILURE,
                    task_id=self.request.id,
                    bundle=bundle,
                    connection=connection,
                    error=msg,
                )

                return {
                    "ok": False,
                    "error": msg,
                    "plan_id": str(plan_obj.id),
                    "log": bundle.full_log,
                }

        # === 6) Terraform init ===
        proc = executor.terraform_init(bundle)
        bundle.append_log(proc.log_block())
        executor.ensure_init_succeeded(proc)

        # === 7) Terraform plan ===
        # En preview mantenemos refresh=false para no depender de llamadas AWS.
        # En apply real usamos refresh=true para reconciliar drift manual en AWS.
        proc = executor.terraform_plan(bundle)
        bundle.append_log(f"\n{proc.log_block()}")
        executor.ensure_plan_succeeded(proc)

        # === 8) Terraform apply (solo si simulate_only=False) ===
        applied = False
        if not bundle.simulate_only:
            if not bundle.creds_ok_for_apply:
                msg = executor.blocked_credentials_message("apply", bundle)
                bundle.append_log(f"\n[SEGURIDAD] {msg}\n")
                plan_obj.mark_failure(error=msg, full_log=bundle.full_log, last_action="apply", applied=False)
                _mark_execution_record_finished(
                    execution_record_id,
                    status_value=PlanExecutionRecord.Status.FAILURE,
                    task_id=self.request.id,
                    bundle=bundle,
                    connection=connection,
                    error=msg,
                )

                return {
                    "ok": False,
                    "error": msg,
                    "plan_id": str(plan_obj.id),
                    "log": bundle.full_log,
                }

            identity = {}
            identity_error = ""
            try:
                identity = get_runtime_identity(provider, bundle.runtime_env)
            except Exception as exc:
                identity_error = str(exc)

            apply_context = _build_last_apply_context(
                provider=provider,
                connection=connection,
                bundle=bundle,
                identity=identity,
                identity_error=identity_error,
            )
            bundle.append_log(f"[audit][apply] {json.dumps(apply_context, sort_keys=True)}\n\n")
            plan_obj.last_apply_context = apply_context
            plan_obj.updated_at = timezone.now()
            plan_obj.save(update_fields=["last_apply_context", "updated_at"])

            proc = executor.terraform_apply(bundle)
            bundle.append_log(f"\n{proc.log_block()}")
            executor.ensure_apply_succeeded(proc)
            applied = True

            # Guardar outputs (solo después de apply real)
            try:
                tf_outputs = executor.read_outputs(bundle)
                plan_obj.outputs = tf_outputs
            except Exception as oe:
                bundle.append_log(f"\n[outputs] No pude leer terraform output -json: {oe}\n")

        # === 9) Guarda logs y marca SUCCESS ===
        # Persistimos logs en DB para depuración desde el frontend
        outputs = plan_obj.outputs
        # Si fue solo plan (simulate), intentamos leer outputs pero puede no existir state.
        if not applied:
            try:
                outputs = executor.read_outputs(bundle)
            except Exception:
                pass

        plan_obj.mark_success(
            full_log=bundle.full_log,
            applied=previous_applied if bundle.simulate_only else applied,
            last_action="apply" if applied else "plan",
            outputs=outputs,
        )
        _mark_execution_record_finished(
            execution_record_id,
            status_value=PlanExecutionRecord.Status.SUCCESS,
            task_id=self.request.id,
            bundle=bundle,
            connection=connection,
            identity=identity if not bundle.simulate_only else {},
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
            plan_obj.mark_failure(
                error=str(e),
                full_log=((bundle.full_log if bundle else "") + f"\n\nERROR: {e}\n"),
            )
        _mark_execution_record_finished(
            execution_record_id,
            status_value=PlanExecutionRecord.Status.FAILURE,
            task_id=getattr(self.request, "id", ""),
            bundle=bundle,
            connection=connection,
            error=str(e),
        )

        return {
            "ok": False,
            "error": str(e),
            "plan_id": (str(plan_obj.id) if plan_obj else None),
            "log": bundle.full_log,
        }

    finally:
        # === Limpieza del directorio temporal ===
        if bundle:
            executor.cleanup_workspace(bundle)


@shared_task(bind=True)
def destroy_last_deploy(self, plan_id: str, execution_record_id: str | None = None):
    plan = Plan.objects.select_related("lab", "lab__cloud_connection", "lab__course", "lab__owner_user").get(id=plan_id)
    provider = get_provider_key((plan.payload or {}).get("cloud"))
    executor = get_provider_executor(provider)
    connection = resolve_lab_cloud_connection(getattr(plan, "lab", None), provider)
    runtime_env = build_connection_runtime_env(connection, provider) if connection else {}
    bundle = executor.build_bundle(plan_id, plan.payload or {}, force_simulate_only=False, runtime_env=runtime_env)

    # La validación de "si se puede destruir" se hace en la vista antes de encolar.
    # Aquí evitamos revalidar con `can_destroy_now` porque el plan ya viene en RUNNING.
    if (plan.payload or {}).get("simulate_only", True) and not plan.applied:
        # No-op idempotente: no hay recursos reales que destruir.
        msg = "Plan en modo simulación: no hay infraestructura real que destruir."
        plan.mark_destroy_noop(message=msg, full_log=bundle.full_log)
        _mark_execution_record_finished(
            execution_record_id,
            status_value=PlanExecutionRecord.Status.NOOP,
            task_id=self.request.id,
            bundle=bundle,
            connection=connection,
            error="",
        )
        return {
            "ok": True,
            "message": msg,
            "log": msg,
            "state_path": None,
            "plan_id": str(plan.id),
        }

    if not bundle.creds_ok_for_apply:
        msg = executor.blocked_credentials_message("destroy", bundle)
        plan.mark_failure(error=msg, full_log=bundle.full_log + msg, last_action="destroy")
        _mark_execution_record_finished(
            execution_record_id,
            status_value=PlanExecutionRecord.Status.FAILURE,
            task_id=self.request.id,
            bundle=bundle,
            connection=connection,
            error=msg,
        )
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
    _mark_execution_record_running(execution_record_id, task_id=self.request.id)
    log_flush = _make_incremental_log_flusher(plan, bundle)
    bundle.on_log_append = lambda _bundle: log_flush()

    try:
        executor.prepare_workspace(
            bundle,
            prefix="tf-destroy-",
            include_debug_dumps=False,
        )
        executor.append_runtime_diagnostics(bundle, action_label="destroy")

        # 4) init
        p_init = executor.terraform_init(bundle)
        bundle.append_log(p_init.log_block())
        executor.ensure_init_succeeded(p_init)

        # 5) destroy
        p = executor.terraform_destroy(bundle)
        bundle.append_log(p.log_block())
        nat_cleanup_error = ""
        nat_cleanup_summary = {}
        try:
            nat_cleanup_summary = executor.cleanup_after_destroy(bundle, outputs=plan.outputs or {})
            bundle.append_log(
                f"[cleanup][nat] {json.dumps(nat_cleanup_summary, indent=2, sort_keys=True)}\n"
            )
        except Exception as cleanup_exc:
            nat_cleanup_error = str(cleanup_exc)
            bundle.append_log(f"[cleanup][nat][error] {cleanup_exc}\n")
        executor.ensure_destroy_succeeded(p)
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
        _mark_execution_record_finished(
            execution_record_id,
            status_value=PlanExecutionRecord.Status.SUCCESS,
            task_id=self.request.id,
            bundle=bundle,
            connection=connection,
        )

        return {
            "ok": True,
            "log": bundle.full_log,
            "state_path": bundle.state_path,
            "plan_id": str(plan.id),
            "s3_key": "",
        }

    except Exception as e:
        plan.mark_failure(error=str(e), full_log=bundle.full_log + f"\n\nERROR: {e}\n", last_action="destroy")
        _mark_execution_record_finished(
            execution_record_id,
            status_value=PlanExecutionRecord.Status.FAILURE,
            task_id=self.request.id,
            bundle=bundle,
            connection=connection,
            error=str(e),
        )
        return {"ok": False, "error": str(e), "log": bundle.full_log}

    finally:
        executor.cleanup_workspace(bundle)

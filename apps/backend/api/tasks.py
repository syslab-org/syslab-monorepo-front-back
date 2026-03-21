import json
import os
import pathlib
import subprocess
import tempfile
import time

from celery import shared_task
from django.db import transaction
from django.utils import timezone
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pathlib import Path

from .models import Plan
from .providers.aws.runtime import (
    aws_creds_diagnostics,
    can_call_aws_sts,
    check_tgw_quota_preflight,
    cleanup_residual_nat_gateways,
    normalize_payload,
)
from provisioning.terraform_runner import cleanup  # solo usamos cleanup aquí

# === CONFIGURACIONES GLOBALES ===
TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "provisioning" / "templates"


# === FUNCIONES AUXILIARES ===
def run(cmd, cwd):
    """Ejecuta un comando y captura stdout/stderr sin levantar excepción."""
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


# === Helper: Lee outputs de Terraform como JSON simplificado ===
def read_terraform_outputs_json(cwd: str) -> dict:
    """Lee `terraform output -json` y devuelve un dict simplificado (solo values).

    Nota: solo funciona si existe state con outputs (normalmente después de apply).
    """
    proc = run(["terraform", "output", "-json", "-no-color"], cwd=cwd)
    if proc.returncode != 0:
        raise RuntimeError(f"terraform output failed: {proc.stderr.strip()}")

    raw = (proc.stdout or "{}").strip() or "{}"
    data = json.loads(raw)

    # Terraform devuelve: { key: { value, type, sensitive } }
    simplified = {}
    for k, v in (data or {}).items():
        if isinstance(v, dict) and "value" in v:
            simplified[k] = v.get("value")
        else:
            simplified[k] = v
    return simplified


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
    workdir = None
    full_log = ""
    plan_obj = None
    previous_applied = False

    # --- Normaliza payload ---
    if isinstance(payload, str):
        try:
            payload = json.loads(payload or "{}")
        except Exception:
            payload = {}

    payload = normalize_payload(payload if isinstance(payload, dict) else {})
    simulate_only = payload["simulate_only"]

    # --- Detecta entorno/credenciales (soporta AWS_PROFILE + ~/.aws montado) ---
    diag = aws_creds_diagnostics()
    ALLOW_LOCAL = diag["allow_local_apply"]

    # Solo exigimos credenciales si se va a hacer apply real.
    # En ECS: ok por task role. En local: requiere ALLOW_LOCAL_APPLY=1 y credenciales resolubles.
    sts_ok, sts_reason = can_call_aws_sts()
    creds_ok_for_apply = bool(diag["running_in_ecs"] or (ALLOW_LOCAL and sts_ok))

    try:
        # === 1) Actualiza estado del Plan ===
        with transaction.atomic():
            try:
                plan_obj = Plan.objects.select_for_update().get(id=plan_id)
                previous_applied = bool(plan_obj.applied)
                if payload and not plan_obj.payload:
                    plan_obj.payload = payload
            except Plan.DoesNotExist:
                plan_obj = Plan.objects.create(
                    name=payload.get("name", ""),
                    payload=payload,
                    status=Plan.Status.PENDING,
                )
                previous_applied = False

            plan_obj.status = Plan.Status.RUNNING
            plan_obj.task_id = self.request.id
            # ✅ Persistimos el task_id específico del último deploy (plan/apply)
            plan_obj.last_deploy_task_id = self.request.id
            plan_obj.updated_at = timezone.now()
            plan_obj.last_log = ""
            plan_obj.last_log_updated_at = timezone.now()
            plan_obj.last_action = "apply" if not simulate_only else "plan"
            plan_obj.save(
                update_fields=[
                    "status",
                    "task_id",
                    "last_deploy_task_id",
                    "payload",
                    "updated_at",
                    "last_log",
                    "last_log_updated_at",
                    "last_action",
                ]
            )

        # === 2) Renderiza main.tf (Jinja) ===
        env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            trim_blocks=True,
            lstrip_blocks=True,
            undefined=StrictUndefined,
        )
        tpl = env.get_template("main.tf.j2")

        tf_text = tpl.render(
            payload=payload,
            simulate_only=simulate_only,
        )

        # === 3) Crea directorio temporal de trabajo ===
        workdir = tempfile.mkdtemp(prefix="tf-multi-")
        main_tf = os.path.join(workdir, "main.tf")

        # === 3.1) Estado Terraform estable por plan (DEV) ===
        state_dir = f"/tfstate/{plan_id}"
        os.makedirs(state_dir, exist_ok=True)
        state_path = f"{state_dir}/terraform.tfstate"

        backend_tf = f"""terraform {{
            backend "local" {{
                path = "{state_path}"
            }}
        }}
        """.lstrip()

        # 1) backend.tf primero
        with open(os.path.join(workdir, "backend.tf"), "w") as f:
            f.write(backend_tf)

        # 2) main.tf después
        with open(main_tf, "w") as f:
            f.write(tf_text)

        full_log += f"[state] backend local path={state_path}\n"

        # === 4) Archivos de depuración ===
        try:
            import json as _json

            pathlib.Path(workdir, "_received_plan.json").write_text(
                _json.dumps(payload, indent=2, default=str)
            )
            preview = "".join(tf_text.splitlines(True)[:60])
            pathlib.Path(workdir, "_main_preview.txt").write_text(preview)
            full_log += f"[debug] dumps escritos en {workdir}\n"
        except Exception as e:
            full_log += f"[debug] no pude escribir dumps: {e}\n"

        # === 5) Añade preview al log ===
        try:
            preview = "".join(pathlib.Path(main_tf).read_text().splitlines(True)[:40])
            full_log += f"\n--- main.tf (primeras líneas) ---\n{preview}\n-------------------------------\n"
        except Exception:
            pass

        full_log += f"workdir={workdir}\n"
        full_log += f"simulate_only={simulate_only}\n"
        full_log += f"aws_diag={diag} sts_ok={sts_ok} sts_reason={sts_reason} ALLOW_LOCAL_APPLY={ALLOW_LOCAL}\n\n"

        # === 5.1) Preflight TGW quota (solo apply real con TGW) ===
        if not simulate_only:
            try:
                tgw_ok, tgw_reason, tgw_info = check_tgw_quota_preflight(payload)
            except Exception as e:
                tgw_ok, tgw_reason, tgw_info = (
                    False,
                    f"TGW preflight error: {e}",
                    {"used": uses_tgw(payload), "preflight_error": str(e)},
                )

            full_log += f"[preflight][tgw] reason={tgw_reason} info={tgw_info}\n\n"

            if not tgw_ok:
                msg = (
                    f"Terraform apply BLOQUEADO: {tgw_reason} "
                    "Puedes destruir TGWs viejos o cambiar el router a modo peering."
                )
                plan_obj.last_log = full_log
                plan_obj.last_log_updated_at = timezone.now()
                plan_obj.status = Plan.Status.FAILURE
                plan_obj.error = msg
                plan_obj.applied = False
                plan_obj.last_action = "apply"
                plan_obj.updated_at = timezone.now()
                plan_obj.save(
                    update_fields=[
                        "status",
                        "error",
                        "applied",
                        "last_action",
                        "last_log",
                        "last_log_updated_at",
                        "updated_at",
                    ]
                )

                return {
                    "ok": False,
                    "error": msg,
                    "plan_id": str(plan_obj.id),
                    "log": full_log,
                }

        # === 6) Terraform init ===
        proc = run(["terraform", "init", "-input=false", "-no-color"], cwd=workdir)
        full_log += f"$ terraform init\n{proc.stdout}\n{proc.stderr}\n"
        if proc.returncode != 0:
            raise RuntimeError("terraform init failed")

        # === 7) Terraform plan ===
        # En preview mantenemos refresh=false para no depender de llamadas AWS.
        # En apply real usamos refresh=true para reconciliar drift manual en AWS.
        plan_cmd = [
            "terraform",
            "plan",
            "-input=false",
            "-refresh=false" if simulate_only else "-refresh=true",
            "-no-color",
            "-out",
            "plan.out",
        ]
        proc = run(plan_cmd, cwd=workdir)
        full_log += f"\n$ {' '.join(plan_cmd)}\n{proc.stdout}\n{proc.stderr}\n"
        if proc.returncode != 0:
            raise RuntimeError("terraform plan failed")

        # === 8) Terraform apply (solo si simulate_only=False) ===
        applied = False
        if not simulate_only:
            if not creds_ok_for_apply:
                msg = (
                    "Terraform apply BLOQUEADO: no hay credenciales AWS resolubles en este container. "
                    "En ECS se resuelve por task role. En local requiere ALLOW_LOCAL_APPLY=1 y credenciales disponibles "
                    "(env vars o AWS_PROFILE + ~/.aws montado). "
                    f"Diagnóstico: {diag} / sts_reason={sts_reason}"
                )
                full_log += f"\n[SEGURIDAD] {msg}\n"
                # Persistimos logs en DB para depuración desde el frontend
                plan_obj.last_log = full_log
                plan_obj.last_log_updated_at = timezone.now()
                # Marca el plan como FAILURE (apply intentado sin credenciales)
                plan_obj.status = Plan.Status.FAILURE
                plan_obj.error = msg
                plan_obj.applied = False
                plan_obj.last_action = "apply"
                plan_obj.updated_at = timezone.now()
                plan_obj.save(
                    update_fields=[
                        "status",
                        "error",
                        "applied",
                        "last_action",
                        "last_log",
                        "last_log_updated_at",
                        "updated_at",
                    ]
                )

                return {
                    "ok": False,
                    "error": msg,
                    "plan_id": str(plan_obj.id),
                    "log": full_log,
                }

            proc = run(
                ["terraform", "apply", "-input=false", "-no-color", "plan.out"],
                cwd=workdir,
            )
            full_log += f"\n$ terraform apply\n{proc.stdout}\n{proc.stderr}\n"
            if proc.returncode != 0:
                err_text = f"{proc.stdout}\n{proc.stderr}".lower()
                if "transitgatewaylimitexceeded" in err_text:
                    raise RuntimeError(
                        "terraform apply failed: TransitGatewayLimitExceeded. "
                        "La cuenta alcanzó el límite de Transit Gateways en esta región."
                    )
                if "invalidsubnetid.notfound" in err_text:
                    raise RuntimeError(
                        "terraform apply failed: InvalidSubnetID.NotFound. "
                        "Se detectó drift: AWS ya no tiene una subnet referenciada en el state. "
                        "Ejecuta Destroy del plan para limpiar estado y vuelve a aplicar."
                    )
                raise RuntimeError("terraform apply failed")
            applied = True

            # Guardar outputs (solo después de apply real)
            try:
                tf_outputs = read_terraform_outputs_json(workdir)
                plan_obj.outputs = tf_outputs
            except Exception as oe:
                full_log += f"\n[outputs] No pude leer terraform output -json: {oe}\n"

        # === 9) Guarda logs y marca SUCCESS ===
        # Persistimos logs en DB para depuración desde el frontend
        plan_obj.last_log = full_log
        plan_obj.last_log_updated_at = timezone.now()

        plan_obj.status = Plan.Status.SUCCESS
        plan_obj.s3_key = ""
        plan_obj.error = ""
        plan_obj.applied = previous_applied if simulate_only else applied
        plan_obj.last_action = "apply" if applied else "plan"
        plan_obj.updated_at = timezone.now()

        # Si fue solo plan (simulate), intentamos leer outputs pero puede no existir state.
        if not applied:
            try:
                tf_outputs = read_terraform_outputs_json(workdir)
                plan_obj.outputs = tf_outputs
            except Exception:
                pass

        plan_obj.save(
            update_fields=[
                "status",
                "s3_key",
                "error",
                "applied",
                "last_action",
                "outputs",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
        )

        return {
            "ok": True,
            "plan_id": str(plan_obj.id),
            "applied": applied,
            "s3_key": "",
            "log": full_log,
        }

    except Exception as e:
        # === Error general ===
        if plan_obj:
            # Persistimos logs en DB incluso en fallo
            plan_obj.last_log = full_log + f"\n\nERROR: {e}\n"
            plan_obj.last_log_updated_at = timezone.now()
            plan_obj.status = Plan.Status.FAILURE
            plan_obj.error = str(e)
            plan_obj.updated_at = timezone.now()
            plan_obj.save(
                update_fields=[
                    "status",
                    "error",
                    "last_log",
                    "last_log_updated_at",
                    "updated_at",
                ]
            )

        return {
            "ok": False,
            "error": str(e),
            "plan_id": (str(plan_obj.id) if plan_obj else None),
            "log": full_log,
        }

    finally:
        # === Limpieza del directorio temporal ===
        if workdir:
            if os.getenv("KEEP_TF_DIRS", "0") == "1":
                full_log += f"[debug] KEEP_TF_DIRS activo, conservando {workdir}\n"
            else:
                cleanup(workdir)


@shared_task(bind=True)
def destroy_last_deploy(self, plan_id: str):
    full_log = ""
    workdir = None

    plan = Plan.objects.get(id=plan_id)
    payload = plan.payload or {}

    # La validación de "si se puede destruir" se hace en la vista antes de encolar.
    # Aquí evitamos revalidar con `can_destroy_now` porque el plan ya viene en RUNNING.

    # --- Detecta entorno/credenciales (soporta AWS_PROFILE + ~/.aws montado) ---
    diag = aws_creds_diagnostics()
    ALLOW_LOCAL = diag["allow_local_apply"]

    sts_ok, sts_reason = can_call_aws_sts()
    creds_ok_for_apply = bool(diag["running_in_ecs"] or (ALLOW_LOCAL and sts_ok))

    if payload.get("simulate_only", True) and not plan.applied:
        # No-op idempotente: no hay recursos reales que destruir.
        msg = "Plan en modo simulación: no hay infraestructura real que destruir."
        plan.status = Plan.Status.SUCCESS
        plan.error = ""
        plan.applied = False
        plan.last_action = "destroy"
        plan.last_log = full_log + msg
        plan.last_log_updated_at = timezone.now()
        plan.updated_at = timezone.now()
        plan.save(
            update_fields=[
                "status",
                "error",
                "applied",
                "last_action",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
        )
        return {
            "ok": True,
            "message": msg,
            "log": msg,
            "state_path": None,
            "plan_id": str(plan.id),
        }

    if not creds_ok_for_apply:
        msg = (
            "Terraform destroy BLOQUEADO: no hay credenciales AWS resolubles en este container. "
            "En ECS se resuelve por task role. En local requiere ALLOW_LOCAL_APPLY=1 y credenciales disponibles "
            "(env vars o AWS_PROFILE + ~/.aws montado). "
            f"Diagnóstico: {diag} / sts_reason={sts_reason}"
        )
        plan.status = Plan.Status.FAILURE
        plan.error = msg
        plan.last_log = full_log + msg
        plan.last_log_updated_at = timezone.now()
        plan.updated_at = timezone.now()
        plan.save(
            update_fields=[
                "status",
                "error",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
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

    plan.status = Plan.Status.RUNNING
    plan.error = ""
    plan.s3_key = ""
    plan.task_id = self.request.id
    # ✅ Persistimos el task_id específico del último destroy
    plan.last_destroy_task_id = self.request.id
    plan.last_action = "destroy"
    plan.last_log = ""
    plan.last_log_updated_at = timezone.now()
    plan.updated_at = timezone.now()
    plan.save(
        update_fields=[
            "status",
            "error",
            "s3_key",
            "task_id",
            "last_destroy_task_id",
            "last_action",
            "last_log",
            "last_log_updated_at",
            "updated_at",
        ]
    )

    try:
        # 1) workdir nuevo
        workdir = tempfile.mkdtemp(prefix="tf-destroy-")

        full_log += f"[destroy] workdir={workdir}\n"
        full_log += f"aws_diag={diag} sts_ok={sts_ok} sts_reason={sts_reason} ALLOW_LOCAL_APPLY={ALLOW_LOCAL}\n"

        # 2) backend estable por plan_id (primero, para construir backend.tf)
        state_dir = f"/tfstate/{plan_id}"
        os.makedirs(state_dir, exist_ok=True)
        state_path = f"{state_dir}/terraform.tfstate"

        backend_tf = f"""terraform {{
            backend "local" {{
                path = "{state_path}"
            }}
        }}
        """.lstrip()

        # 3) render main.tf
        env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            trim_blocks=True,
            lstrip_blocks=True,
            undefined=StrictUndefined,
        )
        tpl = env.get_template("main.tf.j2")

        payload = normalize_payload(payload if isinstance(payload, dict) else {})
        payload["simulate_only"] = False

        tf_text = tpl.render(
            payload=payload, simulate_only=False
        )  # destroy siempre real

        # 4) escribir backend.tf primero, main.tf después
        pathlib.Path(os.path.join(workdir, "backend.tf")).write_text(backend_tf)
        pathlib.Path(os.path.join(workdir, "main.tf")).write_text(tf_text)

        full_log += f"[state] backend local path={state_path}\n"

        # 4) init
        p_init = run(["terraform", "init", "-input=false", "-no-color"], cwd=workdir)
        full_log += f"$ terraform init\n{p_init.stdout}\n{p_init.stderr}\n"
        if p_init.returncode != 0:
            raise RuntimeError("terraform init failed")

        # 5) destroy
        p = run(["terraform", "destroy", "-auto-approve", "-no-color"], cwd=workdir)
        full_log += f"$ terraform destroy\n{p.stdout}\n{p.stderr}\n"
        nat_cleanup_error = ""
        nat_cleanup_summary = {}
        try:
            nat_cleanup_summary = cleanup_residual_nat_gateways(
                payload, plan.outputs or {}
            )
            full_log += (
                f"[cleanup][nat] {json.dumps(nat_cleanup_summary, indent=2, sort_keys=True)}\n"
            )
        except Exception as cleanup_exc:
            nat_cleanup_error = str(cleanup_exc)
            full_log += f"[cleanup][nat][error] {cleanup_exc}\n"
        if p.returncode != 0:
            raise RuntimeError("terraform destroy failed")
        if nat_cleanup_error:
            raise RuntimeError(
                f"destroy completed but NAT residual cleanup failed: {nat_cleanup_error}"
            )
        if nat_cleanup_summary.get("remaining_nat_ids"):
            remaining = ", ".join(nat_cleanup_summary["remaining_nat_ids"])
            raise RuntimeError(
                f"destroy completed but residual NAT Gateways remain: {remaining}"
            )

        plan.last_log = full_log
        plan.last_log_updated_at = timezone.now()
        plan.status = Plan.Status.SUCCESS
        plan.s3_key = ""
        plan.error = ""
        plan.applied = False
        # Importante: NO borramos outputs en destroy.
        # Se conservan como "últimos outputs cuando estuvo ACTIVE" para auditoría/debug.
        plan.last_action = "destroy"
        plan.updated_at = timezone.now()
        plan.save(
            update_fields=[
                "status",
                "s3_key",
                "error",
                "applied",
                "last_action",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
        )

        return {
            "ok": True,
            "log": full_log,
            "state_path": state_path,
            "plan_id": str(plan.id),
            "s3_key": "",
        }

    except Exception as e:
        plan.last_log = full_log + f"\n\nERROR: {e}\n"
        plan.last_log_updated_at = timezone.now()
        plan.status = Plan.Status.FAILURE
        plan.error = str(e)
        plan.last_action = "destroy"
        plan.updated_at = timezone.now()
        plan.save(
            update_fields=[
                "status",
                "error",
                "last_action",
                "last_log",
                "last_log_updated_at",
                "updated_at",
            ]
        )
        return {"ok": False, "error": str(e), "log": full_log}

    finally:
        if workdir:
            cleanup(workdir)

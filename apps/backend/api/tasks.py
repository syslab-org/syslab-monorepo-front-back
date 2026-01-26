# apps/backend/api/tasks.py
from celery import shared_task
import os, tempfile, subprocess, json, pathlib, glob
from django.utils import timezone
from django.db import transaction
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pathlib import Path
from .models import Plan
from provisioning.terraform_runner import cleanup  # solo usamos cleanup aquí

# === CONFIGURACIONES GLOBALES ===
TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "provisioning" / "templates"
S3_BUCKET = os.getenv("S3_PLANS_BUCKET", "")


# === FUNCIONES AUXILIARES ===
def run(cmd, cwd):
    """Ejecuta un comando y captura stdout/stderr sin levantar excepción."""
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


def _maybe_upload_to_s3(key: str, content: str):
    """Sube logs a S3 si está configurado."""
    if not S3_BUCKET:
        return
    try:
        import boto3

        boto3.client("s3").put_object(
            Bucket=S3_BUCKET, Key=key, Body=content.encode("utf-8")
        )
    except Exception:
        pass


def normalize_payload(payload: dict) -> dict:
    """Asegura shape estable del payload para que Jinja/Terraform no dependan del curl."""
    payload = payload or {}

    # Colecciones esperadas
    payload.setdefault("vpcs", [])
    payload.setdefault("links", [])
    payload.setdefault("routers", [])

    # vlan suele existir en algunos flujos (aunque venga vacío)
    vlan = payload.get("vlan")
    if not isinstance(vlan, dict):
        vlan = {}
    payload["vlan"] = vlan

    # Normaliza región si viene en vpcs[0]
    if not vlan.get("region") and payload.get("vpcs"):
        first_vpc = (
            payload["vpcs"][0]
            if isinstance(payload["vpcs"], list) and payload["vpcs"]
            else {}
        )
        if isinstance(first_vpc, dict) and first_vpc.get("region"):
            vlan["region"] = first_vpc.get("region")

    # Normaliza simulate_only (default True)
    payload["simulate_only"] = bool(payload.get("simulate_only", True))

    return payload


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

    # --- Normaliza payload ---
    if isinstance(payload, str):
        try:
            payload = json.loads(payload or "{}")
        except Exception:
            payload = {}

    payload = normalize_payload(payload if isinstance(payload, dict) else {})
    simulate_only = payload["simulate_only"]

    # --- Detecta entorno (para permitir apply real solo si hay credenciales válidas) ---
    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    has_static_creds = bool(
        os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    )
    ALLOW_LOCAL = os.getenv("ALLOW_LOCAL_APPLY") == "1"

    # Solo exigimos credenciales si se va a hacer apply real.
    creds_ok_for_apply = running_in_ecs or (ALLOW_LOCAL and has_static_creds)

    try:
        # === 1) Actualiza estado del Plan ===
        with transaction.atomic():
            try:
                plan_obj = Plan.objects.select_for_update().get(id=plan_id)
                if payload and not plan_obj.payload:
                    plan_obj.payload = payload
            except Plan.DoesNotExist:
                plan_obj = Plan.objects.create(
                    name=payload.get("name", ""),
                    payload=payload,
                    status=Plan.Status.PENDING,
                )

            plan_obj.status = Plan.Status.RUNNING
            plan_obj.task_id = self.request.id
            plan_obj.updated_at = timezone.now()
            plan_obj.save(update_fields=["status", "task_id", "payload", "updated_at"])

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
        full_log += f"running_in_ecs={running_in_ecs} has_static_creds={has_static_creds} ALLOW_LOCAL_APPLY={ALLOW_LOCAL}\n\n"

        # === 6) Terraform init ===
        proc = run(["terraform", "init", "-input=false", "-no-color"], cwd=workdir)
        full_log += f"$ terraform init\n{proc.stdout}\n{proc.stderr}\n"
        if proc.returncode != 0:
            raise RuntimeError("terraform init failed")

        # === 7) Terraform plan ===
        proc = run(
            [
                "terraform",
                "plan",
                "-input=false",
                "-refresh=false",
                "-no-color",
                "-out",
                "plan.out",
            ],
            cwd=workdir,
        )
        full_log += f"\n$ terraform plan\n{proc.stdout}\n{proc.stderr}\n"
        if proc.returncode != 0:
            raise RuntimeError("terraform plan failed")

        # === 8) Terraform apply (solo si simulate_only=False) ===
        applied = False
        if not simulate_only:
            if not creds_ok_for_apply:
                msg = (
                    "Terraform apply BLOQUEADO: sin credenciales IAM detectadas. "
                    "Ejecuta en ECS (task role) o exporta ALLOW_LOCAL_APPLY=1 y "
                    "AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY."
                )
                full_log += f"\n[SEGURIDAD] {msg}\n"

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
                raise RuntimeError("terraform apply failed")
            applied = True

            # Guardar outputs (solo después de apply real)
            try:
                tf_outputs = read_terraform_outputs_json(workdir)
                plan_obj.outputs = tf_outputs
                plan_obj.last_outputs = tf_outputs
            except Exception as oe:
                full_log += f"\n[outputs] No pude leer terraform output -json: {oe}\n"

        # === 9) Guarda logs y marca SUCCESS ===
        s3_key = f"plans/{plan_obj.id}.log"
        _maybe_upload_to_s3(s3_key, full_log)

        plan_obj.status = Plan.Status.SUCCESS
        plan_obj.s3_key = s3_key if S3_BUCKET else ""
        plan_obj.error = ""
        plan_obj.applied = applied
        plan_obj.last_action = "apply" if applied else "plan"
        plan_obj.updated_at = timezone.now()

        # Si fue solo plan (simulate), intentamos leer outputs pero puede no existir state.
        if not applied:
            try:
                tf_outputs = read_terraform_outputs_json(workdir)
                plan_obj.outputs = tf_outputs
                plan_obj.last_outputs = tf_outputs
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
                "last_outputs",
                "updated_at",
            ]
        )

        return {
            "ok": True,
            "plan_id": str(plan_obj.id),
            "applied": applied,
            "s3_key": plan_obj.s3_key,
            "log": full_log,
        }

    except Exception as e:
        # === Error general ===
        try:
            if full_log:
                _maybe_upload_to_s3(
                    f"plans/{str(plan_obj.id) if plan_obj else 'no-plan'}.error.log",
                    full_log + f"\n\nERROR: {e}\n",
                )
        except Exception:
            pass

        if plan_obj:
            plan_obj.status = Plan.Status.FAILURE
            plan_obj.error = str(e)
            plan_obj.updated_at = timezone.now()
            plan_obj.save(update_fields=["status", "error", "updated_at"])

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

    # --- Detecta entorno (para permitir destroy real solo si hay credenciales válidas) ---
    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    has_static_creds = bool(
        os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    )
    ALLOW_LOCAL = os.getenv("ALLOW_LOCAL_APPLY") == "1"
    creds_ok_for_apply = running_in_ecs or (ALLOW_LOCAL and has_static_creds)

    if payload.get("simulate_only", True):
        # No es un fallo del sistema: es un NO-OP (no hay nada que destruir).
        msg = "Plan en modo simulación: no hay infraestructura que destruir."
        plan.error = msg
        plan.updated_at = timezone.now()
        # OJO: NO cambiamos status a FAILURE
        plan.save(update_fields=["error", "updated_at"])
        return {
            "ok": False,
            "error": msg,
            "log": "",
            "state_path": None,
            "plan_id": str(plan.id),
        }

    if not creds_ok_for_apply:
        msg = "Terraform destroy BLOQUEADO: sin credenciales IAM detectadas."
        plan.status = Plan.Status.FAILURE
        plan.error = msg
        plan.updated_at = timezone.now()
        plan.save(update_fields=["status", "error", "updated_at"])
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
    plan.last_action = "destroy"
    plan.updated_at = timezone.now()
    plan.save(
        update_fields=[
            "status",
            "error",
            "s3_key",
            "task_id",
            "last_action",
            "updated_at",
        ]
    )

    try:
        # 1) workdir nuevo
        workdir = tempfile.mkdtemp(prefix="tf-destroy-")

        full_log += f"[destroy] workdir={workdir}\n"

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
        if p.returncode != 0:
            raise RuntimeError("terraform destroy failed")

        s3_key = f"plans/{plan.id}.destroy.log"
        _maybe_upload_to_s3(s3_key, full_log)

        plan.status = Plan.Status.SUCCESS
        plan.s3_key = s3_key if S3_BUCKET else ""
        plan.error = ""
        plan.applied = False
        plan.last_outputs = plan.outputs or {}  # guarda outputs previos
        plan.outputs = {}
        plan.updated_at = timezone.now()
        plan.save(
            update_fields=[
                "status",
                "s3_key",
                "error",
                "applied",
                "outputs",
                "updated_at",
                "last_outputs",
            ]
        )

        return {
            "ok": True,
            "log": full_log,
            "state_path": state_path,
            "plan_id": str(plan.id),
            "s3_key": plan.s3_key,
        }

    except Exception as e:
        try:
            if full_log:
                _maybe_upload_to_s3(
                    f"plans/{str(plan.id)}.destroy.error.log",
                    full_log + f"\n\nERROR: {e}\n",
                )
        except Exception:
            pass

        plan.status = Plan.Status.FAILURE
        plan.error = str(e)
        plan.last_action = "destroy"
        plan.updated_at = timezone.now()
        plan.save(update_fields=["status", "error", "last_action", "updated_at"])
        return {"ok": False, "error": str(e), "log": full_log}

    finally:
        if workdir:
            cleanup(workdir)

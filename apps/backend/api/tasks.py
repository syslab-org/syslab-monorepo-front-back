# apps/backend/api/tasks.py
from celery import shared_task
import os, tempfile, subprocess, json, pathlib, glob
from django.utils import timezone
from django.db import transaction
from jinja2 import Environment, FileSystemLoader
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
        boto3.client("s3").put_object(Bucket=S3_BUCKET, Key=key, Body=content.encode("utf-8"))
    except Exception:
        pass

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
    payload = payload or {}
    simulate_only = bool(payload.get("simulate_only", True))

    # --- Detecta entorno (para permitir apply real solo si hay credenciales válidas) ---
    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    has_static_creds = bool(os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"))
    ALLOW_LOCAL = os.getenv("ALLOW_LOCAL_APPLY") == "1"
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
        )
        tpl = env.get_template("main.tf.j2")

        tf_text = tpl.render(
            payload=payload,
            simulate_only=payload.get("simulate_only", True),
        )

        # === 3) Crea directorio temporal de trabajo ===
        workdir = tempfile.mkdtemp(prefix="tf-multi-")
        main_tf = os.path.join(workdir, "main.tf")

        # Guarda el main.tf generado
        with open(main_tf, "w") as f:
            f.write(tf_text)

        # === 4) Archivos de depuración ===
        try:
            import json as _json
            pathlib.Path(workdir, "_received_plan.json").write_text(_json.dumps(payload, indent=2))
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
        full_log += f"running_in_ecs={running_in_ecs} has_static_creds={has_static_creds}\n\n"

        # === 6) Terraform init ===
        proc = run(["terraform", "init", "-input=false", "-no-color"], cwd=workdir)
        full_log += f"$ terraform init\n{proc.stdout}\n{proc.stderr}\n"
        if proc.returncode != 0:
            raise RuntimeError("terraform init failed")

        # === 7) Terraform plan ===
        proc = run(["terraform", "plan", "-input=false", "-refresh=false", "-no-color", "-out", "plan.out"], cwd=workdir)
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
                raise RuntimeError(msg)

            proc = run(["terraform", "apply", "-input=false", "-no-color", "plan.out"], cwd=workdir)
            full_log += f"\n$ terraform apply\n{proc.stdout}\n{proc.stderr}\n"
            if proc.returncode != 0:
                raise RuntimeError("terraform apply failed")
            applied = True

        # === 9) Guarda logs y marca SUCCESS ===
        s3_key = f"plans/{plan_obj.id}.log"
        _maybe_upload_to_s3(s3_key, full_log)

        plan_obj.status = Plan.Status.SUCCESS
        plan_obj.s3_key = s3_key if S3_BUCKET else ""
        plan_obj.error = ""
        plan_obj.updated_at = timezone.now()
        plan_obj.save(update_fields=["status", "s3_key", "error", "updated_at"])

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
def destroy_last_deploy(self, plan_id: str | None = None):
    """
    Destruye el último despliegue local de Terraform (el /tmp/tf-multi-* más reciente).
    Usa las credenciales actuales del contenedor. Solo para DEV (state local).
    """
    full_log = ""
    workdir = None
    try:
        dirs = sorted(glob.glob("/tmp/tf-multi-*"))
        if not dirs:
            raise RuntimeError("No hay directorios /tmp/tf-multi-* para destruir (¿KEEP_TF_DIRS=1?)")
        workdir = dirs[-1]
        full_log += f"[destroy] workdir={workdir}\n"

        # init silencioso por si falta el .terraform
        p_init = subprocess.run(
            ["terraform", "init", "-input=false", "-no-color"],
            cwd=workdir, text=True, capture_output=True, check=False
        )
        full_log += f"$ terraform init\n{p_init.stdout}\n{p_init.stderr}\n"

        p = subprocess.run(
            ["terraform", "destroy", "-auto-approve", "-no-color"],
            cwd=workdir, text=True, capture_output=True, check=False
        )
        full_log += f"$ terraform destroy\n{p.stdout}\n{p.stderr}\n"
        if p.returncode != 0:
            raise RuntimeError("terraform destroy failed")

        # marcar plan si nos pasaron id (opcional)
        if plan_id:
            try:
                plan = Plan.objects.get(id=plan_id)
                plan.status = Plan.Status.SUCCESS  # o DESTROYED si agregas ese estado
                plan.error = ""
                plan.updated_at = timezone.now()
                plan.save(update_fields=["status", "error", "updated_at"])
            except Exception:
                pass

        return {"ok": True, "log": full_log, "workdir": workdir}
    except Exception as e:
        return {"ok": False, "error": str(e), "log": full_log, "workdir": workdir}

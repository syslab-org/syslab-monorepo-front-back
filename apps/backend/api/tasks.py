# apps/backend/api/tasks.py
from celery import shared_task
import os
import json
from django.utils import timezone
from django.db import transaction
import pathlib

from .models import Plan
from provisioning.terraform_runner import (
    render_tf_dir, tf_init, tf_plan, tf_apply, cleanup,
)

# Bucket S3 opcional para guardar logs (si no está definido, no sube nada)
S3_BUCKET = os.getenv("S3_PLANS_BUCKET", "")


def _maybe_upload_to_s3(key: str, content: str):
    """
    Sube 'content' al bucket S3 si S3_PLANS_BUCKET está configurado.
    No lanza excepciones hacia arriba: es best-effort.
    """
    if not S3_BUCKET:
        return
    try:
        import boto3
        s3 = boto3.client("s3")
        s3.put_object(Bucket=S3_BUCKET, Key=key, Body=content.encode("utf-8"))
    except Exception:
        # No hacemos raise; el flujo de la tarea no debe romperse por fallos de logging
        pass


@shared_task(name="api.tasks.prueba_larga")
def prueba_larga(n: int = 3):
    """Tarea demo usada por el smoke-test."""
    import time
    time.sleep(1)
    return {"ok": True, "n": n}

@shared_task(name="api.tasks.process_network_plan", bind=True)
def process_network_plan(self, plan_id=None, payload=None):
    """
    Ejecuta el ciclo Terraform para un plan:
      - terraform init
      - terraform plan
      - terraform apply (solo si simulate_only == False y hay credenciales válidas)

    Devuelve logs completos (éxito y error) para que el front pueda mostrarlos.
    """
    workdir = None
    full_log = ""
    plan = None

    # --- Normaliza payload ---
    if isinstance(payload, str):
        try:
            payload = json.loads(payload or "{}")
        except Exception:
            payload = {}
    payload = payload or {}

    # --- Flag de simulación (true por defecto) ---
    simulate_only = bool(payload.get("simulate_only", True))

    # --- Detección de entorno/credenciales para proteger apply en local ---
    # Consideramos "entorno con credenciales" si:
    #   - estamos en ECS (role de tarea disponible vía IMDS), o
    #   - existen AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    has_static_creds = bool(
        os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    )
    # Solo permitimos apply real si estamos en ECS.
    # Si realmente quieres permitirlo en local, debes exportar ALLOW_LOCAL_APPLY=1 explícitamente.
    ALLOW_LOCAL = os.getenv("ALLOW_LOCAL_APPLY") == "1"
    creds_ok_for_apply = running_in_ecs or (ALLOW_LOCAL and has_static_creds)


    try:
        # 1) Crear/actualizar Plan y ponerlo RUNNING
        with transaction.atomic():
            if plan_id:
                try:
                    plan = Plan.objects.select_for_update().get(id=plan_id)
                    if payload and not plan.payload:
                        plan.payload = payload
                except Plan.DoesNotExist:
                    plan = Plan.objects.create(
                        name=payload.get("name", ""),
                        payload=payload,
                        status=Plan.Status.PENDING,
                    )
            else:
                plan = Plan.objects.create(
                    name=payload.get("name", ""),
                    payload=payload,
                    status=Plan.Status.PENDING,
                )

            plan.status = Plan.Status.RUNNING
            plan.task_id = self.request.id
            plan.updated_at = timezone.now()
            plan.save(update_fields=["status", "task_id", "payload", "updated_at"])

        # 2) Render de directorio Terraform (el template ya usa simulate_only desde payload)
        workdir = render_tf_dir(plan.payload)

        # --- Autodiagnóstico: dump de main.tf generado ---
        try:
            preview = "".join((pathlib.Path(workdir) / "main.tf").read_text().splitlines(True)[:30])
            full_log += f"\n--- main.tf (primeras líneas) ---\n{preview}\n-------------------------------\n"
        except Exception:
            pass

        full_log += f"workdir={workdir}\n"
        full_log += f"simulate_only={simulate_only}\n"
        full_log += f"running_in_ecs={running_in_ecs} has_static_creds={has_static_creds}\n\n"

        # 3) terraform init
        rc, out = tf_init(workdir)
        full_log += f"$ terraform init\n{out}\n"
        if rc != 0:
            raise RuntimeError("terraform init failed")

        # 4) terraform plan
        rc, out = tf_plan(workdir)
        full_log += f"\n$ terraform plan\n{out}\n"
        if rc != 0:
            raise RuntimeError("terraform plan failed")

        # 5) terraform apply si corresponde
        do_apply = not simulate_only
        applied = False

        if do_apply:
            if not creds_ok_for_apply:
                # Protegemos entornos sin credenciales (e.g. Docker Compose local)
                msg = (
                    "Terraform apply BLOQUEADO: no se detectaron credenciales AWS "
                    "(IAM Task Role en ECS o variables AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY). "
                    "Ejecuta en ECS o configura credenciales; usa simulate_only=true en local."
                )
                full_log += f"\n[SEGURIDAD] {msg}\n"
                raise RuntimeError(msg)

            rc, out = tf_apply(workdir)
            full_log += f"\n$ terraform apply\n{out}\n"
            if rc != 0:
                raise RuntimeError("terraform apply failed")
            applied = True

        # 6) Guardar logs (best-effort) y marcar SUCCESS
        s3_key = f"plans/{plan.id}.log"
        _maybe_upload_to_s3(s3_key, full_log)

        plan.status = Plan.Status.SUCCESS
        plan.s3_key = s3_key if S3_BUCKET else ""
        plan.error = ""
        plan.updated_at = timezone.now()
        plan.save(update_fields=["status", "s3_key", "error", "updated_at"])

        return {
            "ok": True,
            "plan_id": str(plan.id),
            "applied": applied,
            "s3_key": (s3_key if S3_BUCKET else ""),
            "log": full_log,
        }

    except Exception as e:
        # Subir log de error a S3 si se puede
        try:
            if full_log:
                err_key = f"plans/{str(plan.id) if plan else 'no-plan'}.error.log"
                _maybe_upload_to_s3(err_key, full_log + f"\n\nERROR: {e}\n")
        except Exception:
            pass

        if plan:
            plan.status = Plan.Status.FAILURE
            plan.error = str(e)
            plan.updated_at = timezone.now()
            plan.save(update_fields=["status", "error", "updated_at"])

        return {
            "ok": False,
            "error": str(e),
            "plan_id": (str(plan.id) if plan else None),
            "log": full_log,
        }

    finally:
        if workdir:
            cleanup(workdir)


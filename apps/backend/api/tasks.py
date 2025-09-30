# apps/backend/api/tasks.py
from celery import shared_task
import os
import json
from django.utils import timezone
from django.db import transaction

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
      - terraform apply (solo si simulate_only == False)

    Devuelve logs completos (éxito y error) para que el front pueda mostrarlos.
    """
    workdir = None
    full_log = ""      # acumulamos todo lo que ejecutamos
    plan = None

    # Normaliza 'payload'
    if isinstance(payload, str):
        try:
            payload = json.loads(payload or "{}")
        except Exception:
            payload = {}
    payload = payload or {}

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

        # 2) Render de directorio Terraform
        workdir = render_tf_dir(plan.payload)
        full_log += f"workdir={workdir}\n\n"

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
        do_apply = not bool(plan.payload.get("simulate_only", True))
        if do_apply:
            rc, out = tf_apply(workdir)
            full_log += f"\n$ terraform apply\n{out}\n"
            if rc != 0:
                raise RuntimeError("terraform apply failed")

        # 6) Guardar logs (best-effort) y marcar SUCCESS
        s3_key = f"plans/{plan.id}.log"
        _maybe_upload_to_s3(s3_key, full_log)

        plan.status = Plan.Status.SUCCESS
        plan.s3_key = s3_key if S3_BUCKET else ""
        plan.error = ""
        plan.updated_at = timezone.now()
        plan.save(update_fields=["status", "s3_key", "error", "updated_at"])

        # 👉 devolvemos también el log en éxito
        return {
            "ok": True,
            "plan_id": str(plan.id),
            "applied": do_apply,
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


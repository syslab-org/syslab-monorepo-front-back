from celery import shared_task
import os, tempfile, subprocess, json, pathlib
import re
import time

import boto3
from botocore.exceptions import (
    ProfileNotFound,
    NoCredentialsError,
    NoRegionError,
    ClientError,
)
from django.utils import timezone
from django.db import transaction
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pathlib import Path
from .models import Plan
from provisioning.terraform_runner import cleanup  # solo usamos cleanup aquí

# === CONFIGURACIONES GLOBALES ===
TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "provisioning" / "templates"


# === FUNCIONES AUXILIARES ===
def run(cmd, cwd):
    """Ejecuta un comando y captura stdout/stderr sin levantar excepción."""
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


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


def build_nat_cleanup_targets(payload: dict, outputs: dict) -> dict[str, dict]:
    """Relaciona VPC real -> metadata de cleanup NAT a partir de payload y outputs."""
    payload = payload if isinstance(payload, dict) else {}
    outputs = outputs if isinstance(outputs, dict) else {}

    logical_to_actual = outputs.get("vpc_ids") if isinstance(outputs.get("vpc_ids"), dict) else {}
    vpcs = payload.get("vpcs") if isinstance(payload.get("vpcs"), list) else []

    targets = {}
    for vpc in vpcs:
        if not isinstance(vpc, dict):
            continue
        logical_id = str(vpc.get("id") or "").strip()
        actual_vpc_id = str(logical_to_actual.get(logical_id) or "").strip()
        nat_cfg = vpc.get("nat_gateway") if isinstance(vpc.get("nat_gateway"), dict) else {}
        nat_enabled = bool(nat_cfg.get("enabled"))
        if not logical_id or not actual_vpc_id or not nat_enabled:
            continue
        provided_eip = str(nat_cfg.get("elastic_ip") or "").strip()
        targets[actual_vpc_id] = {
            "logical_vpc_id": logical_id,
            "release_generated_eip": provided_eip == "",
            "provided_eip": provided_eip,
        }

    return targets


def cleanup_residual_nat_gateways(payload: dict, outputs: dict) -> dict:
    """Borra NAT Gateways residuales por VPC real y libera EIPs autogeneradas."""
    targets = build_nat_cleanup_targets(payload, outputs)
    region = resolve_payload_region(payload if isinstance(payload, dict) else {})

    summary = {
        "region": region,
        "checked_vpc_ids": sorted(targets.keys()),
        "deleted_nat_ids": [],
        "released_eip_ids": [],
        "remaining_nat_ids": [],
        "skipped": not bool(targets),
    }
    if not targets:
        return summary

    profile = os.getenv("AWS_PROFILE")
    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    ec2 = session.client("ec2", region_name=region)

    nat_ids = []
    generated_eip_ids = set()

    for actual_vpc_id, meta in targets.items():
        resp = ec2.describe_nat_gateways(
            Filter=[
                {"Name": "vpc-id", "Values": [actual_vpc_id]},
                {"Name": "state", "Values": ["pending", "available", "failed", "deleting"]},
            ]
        )
        for nat in resp.get("NatGateways", []) or []:
            nat_id = str(nat.get("NatGatewayId") or "").strip()
            state = str(nat.get("State") or "").strip().lower()
            if not nat_id or state == "deleted":
                continue
            if nat_id not in nat_ids and state != "deleting":
                ec2.delete_nat_gateway(NatGatewayId=nat_id)
                summary["deleted_nat_ids"].append(nat_id)
            nat_ids.append(nat_id)

            if meta["release_generated_eip"]:
                for addr in nat.get("NatGatewayAddresses", []) or []:
                    allocation_id = str(addr.get("AllocationId") or "").strip()
                    if allocation_id:
                        generated_eip_ids.add(allocation_id)

    if nat_ids:
        pending = set(nat_ids)
        for _ in range(30):
            still_pending = set()
            for nat_id in pending:
                resp = ec2.describe_nat_gateways(
                    Filter=[{"Name": "nat-gateway-id", "Values": [nat_id]}]
                )
                states = {
                    str(nat.get("State") or "").strip().lower()
                    for nat in (resp.get("NatGateways", []) or [])
                }
                if not states or states <= {"deleted"}:
                    continue
                still_pending.add(nat_id)
            if not still_pending:
                pending = set()
                break
            pending = still_pending
            time.sleep(10)
        summary["remaining_nat_ids"] = sorted(pending)

    if not summary["remaining_nat_ids"]:
        for allocation_id in sorted(generated_eip_ids):
            try:
                ec2.release_address(AllocationId=allocation_id)
                summary["released_eip_ids"].append(allocation_id)
            except ClientError:
                # Si la EIP sigue asociada o ya fue liberada por Terraform, no rompemos destroy.
                continue

    return summary


def aws_creds_diagnostics() -> dict:
    """Devuelve un diagnóstico simple sobre credenciales AWS dentro del container.

    Soporta:
    - ECS task role (AWS_EXECUTION_ENV / metadata)
    - Static creds por env vars
    - Shared config/credentials (AWS_PROFILE + ~/.aws montado)

    Nota: esto NO imprime secretos; solo estado y errores.
    """
    profile = os.getenv("AWS_PROFILE")
    region = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION")
    allow_local = os.getenv("ALLOW_LOCAL_APPLY") == "1"

    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )

    has_static_creds = bool(
        os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    )

    return {
        "running_in_ecs": running_in_ecs,
        "allow_local_apply": allow_local,
        "has_static_creds": has_static_creds,
        "aws_profile": profile or "",
        "aws_region": region or "",
    }


def can_call_aws_sts() -> tuple[bool, str]:
    """Chequeo REAL: intenta llamar STS GetCallerIdentity.

    Esto valida que boto3/botocore pueden resolver credenciales en el container.
    """
    profile = os.getenv("AWS_PROFILE")

    try:
        # Si hay profile, lo usamos. Si no, boto3 decide (env/role/etc).
        session = boto3.Session(profile_name=profile) if profile else boto3.Session()
        sts = session.client("sts")
        _ = sts.get_caller_identity()
        return True, "sts_ok"
    except ProfileNotFound as e:
        return False, f"profile_not_found: {e}"
    except NoRegionError as e:
        return False, f"no_region: {e}"
    except NoCredentialsError as e:
        return False, f"no_credentials: {e}"
    except ClientError as e:
        return False, f"client_error: {e}"
    except Exception as e:
        return False, f"unknown_error: {e}"


def payload_uses_tgw(payload: dict) -> bool:
    routers = payload.get("routers") if isinstance(payload, dict) else []
    links = payload.get("links") if isinstance(payload, dict) else []

    has_tgw_router = any(
        str((r or {}).get("type", "")).strip().lower() == "tgw" for r in (routers or [])
    )
    has_tgw_links = any(
        str((l or {}).get("type", "")).strip().lower() == "tgw-attach"
        for l in (links or [])
    )
    return bool(has_tgw_router or has_tgw_links)


def resolve_payload_region(payload: dict) -> str:
    raw = ""
    if isinstance(payload, dict):
        vlan = payload.get("vlan") or {}
        if isinstance(vlan, dict):
            raw = str(vlan.get("region") or "").strip()

        if not raw:
            vpcs = payload.get("vpcs") or []
            if isinstance(vpcs, list) and vpcs:
                raw = str((vpcs[0] or {}).get("region") or "").strip()

    raw = (raw or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1").strip().lower()

    # Si llega AZ (ej: us-east-1a), la convertimos a región (us-east-1)
    if re.match(r"^[a-z]{2}(-[a-z0-9-]+)+-\d+[a-z]$", raw):
        return raw[:-1]
    return raw


def check_tgw_quota_preflight(payload: dict) -> tuple[bool, str, dict]:
    if not payload_uses_tgw(payload):
        return True, "tgw_not_used", {"used": False}

    region = resolve_payload_region(payload)
    profile = os.getenv("AWS_PROFILE")
    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    ec2 = session.client("ec2", region_name=region)

    tgws_resp = ec2.describe_transit_gateways()
    tgws = tgws_resp.get("TransitGateways", []) or []
    active = [
        t for t in tgws if str(t.get("State", "")).lower() not in {"deleted", "deleting"}
    ]

    quota_value = 5.0
    quota_source = "default"
    quota_error = ""
    try:
        sq = session.client("service-quotas", region_name=region)
        q = sq.get_service_quota(service_code="ec2", quota_code="L-A2478D36")
        quota_value = float((q.get("Quota") or {}).get("Value") or quota_value)
        quota_source = "service-quotas"
    except Exception as e:
        quota_error = str(e)

    limit = int(quota_value)
    current = len(active)
    summary = [
        {
            "id": t.get("TransitGatewayId"),
            "state": t.get("State"),
            "name": next(
                (tag.get("Value") for tag in (t.get("Tags") or []) if tag.get("Key") == "Name"),
                "",
            ),
        }
        for t in active
    ]

    info = {
        "used": True,
        "region": region,
        "current_tgws": current,
        "limit_tgws": limit,
        "quota_source": quota_source,
        "quota_error": quota_error,
        "transit_gateways": summary,
    }

    if current >= limit:
        msg = (
            f"TGW preflight failed en {region}: límite alcanzado ({current}/{limit}). "
            f"Libera TGWs existentes o solicita aumento de cuota (EC2 quota L-A2478D36)."
        )
        return False, msg, info

    return True, "ok", info


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
                    {"used": payload_uses_tgw(payload), "preflight_error": str(e)},
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

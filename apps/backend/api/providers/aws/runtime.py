import os
import time

from botocore.exceptions import (
    ClientError,
    NoCredentialsError,
    NoRegionError,
    ProfileNotFound,
)

from api.cloud_connections import build_boto3_session_from_runtime_env

from .payload import get_network_config, get_region, get_segment_payloads, uses_tgw


def normalize_payload(payload: dict) -> dict:
    """Normaliza el payload compilado AWS para el runner Terraform actual."""
    payload = payload or {}

    payload.setdefault("vpcs", [])
    payload.setdefault("links", [])
    payload.setdefault("routers", [])

    vlan = get_network_config(payload)
    if not isinstance(vlan, dict):
        vlan = {}
    payload["vlan"] = vlan

    if not vlan.get("region"):
        segments = get_segment_payloads(payload)
        first_segment = segments[0] if segments else {}
        if isinstance(first_segment, dict) and first_segment.get("region"):
            vlan["region"] = first_segment.get("region")

    payload["simulate_only"] = bool(payload.get("simulate_only", True))
    return payload


def collect_required_key_pairs(payload: dict) -> list[str]:
    """Extrae key pairs declaradas en instancias EC2 del payload AWS."""
    payload = payload if isinstance(payload, dict) else {}
    found = set()
    for vpc in get_segment_payloads(payload):
        subnets = vpc.get("subnets") if isinstance(vpc.get("subnets"), list) else []
        for subnet in subnets:
            if not isinstance(subnet, dict):
                continue
            instances = subnet.get("instances") if isinstance(subnet.get("instances"), list) else []
            for instance in instances:
                if not isinstance(instance, dict):
                    continue
                key_name = str(instance.get("ssh_access") or "").strip()
                if key_name:
                    found.add(key_name)
    return sorted(found)


def build_nat_cleanup_targets(payload: dict, outputs: dict) -> dict[str, dict]:
    """Relaciona VPC real -> metadata de cleanup NAT a partir de payload y outputs."""
    payload = payload if isinstance(payload, dict) else {}
    outputs = outputs if isinstance(outputs, dict) else {}

    logical_to_actual = outputs.get("vpc_ids") if isinstance(outputs.get("vpc_ids"), dict) else {}
    vpcs = get_segment_payloads(payload)

    targets = {}
    for vpc in vpcs:
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


def cleanup_residual_nat_gateways(payload: dict, outputs: dict, runtime_env: dict | None = None) -> dict:
    """Borra NAT Gateways residuales por VPC real y libera EIPs autogeneradas."""
    targets = build_nat_cleanup_targets(payload, outputs)
    region = get_region(payload if isinstance(payload, dict) else {})

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

    session = build_boto3_session_from_runtime_env(runtime_env)
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
                continue

    return summary


def aws_creds_diagnostics(runtime_env: dict | None = None) -> dict:
    """Devuelve un diagnóstico simple sobre credenciales AWS dentro del container."""
    runtime_env = runtime_env or {}
    profile = runtime_env.get("AWS_PROFILE") or os.getenv("AWS_PROFILE")
    region = (
        runtime_env.get("AWS_DEFAULT_REGION")
        or runtime_env.get("AWS_REGION")
        or os.getenv("AWS_DEFAULT_REGION")
        or os.getenv("AWS_REGION")
    )
    allow_local = os.getenv("ALLOW_LOCAL_APPLY") == "1"

    running_in_ecs = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )

    has_static_creds = bool(
        (runtime_env.get("AWS_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID"))
        and (runtime_env.get("AWS_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"))
    )

    return {
        "running_in_ecs": running_in_ecs,
        "allow_local_apply": allow_local,
        "has_static_creds": has_static_creds,
        "credential_source": "cloud_connection" if runtime_env else "environment",
        "aws_profile": profile or "",
        "aws_region": region or "",
    }


def can_call_aws_sts(runtime_env: dict | None = None) -> tuple[bool, str]:
    """Chequea si el contenedor puede resolver credenciales AWS reales."""
    try:
        session = build_boto3_session_from_runtime_env(runtime_env)
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


def check_tgw_quota_preflight(payload: dict, runtime_env: dict | None = None) -> tuple[bool, str, dict]:
    """Valida cuota de Transit Gateways antes de un apply real."""
    if not uses_tgw(payload):
        return True, "tgw_not_used", {"used": False}

    region = get_region(payload)
    session = build_boto3_session_from_runtime_env(runtime_env)
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


def check_key_pairs_preflight(payload: dict, runtime_env: dict | None = None) -> tuple[bool, str, dict]:
    """Valida que las key pairs usadas por las EC2 existan en la cuenta/región objetivo."""
    region = get_region(payload if isinstance(payload, dict) else {})
    required_key_pairs = collect_required_key_pairs(payload)
    info = {
        "used": bool(required_key_pairs),
        "region": region,
        "required_key_pairs": required_key_pairs,
        "missing_key_pairs": [],
    }
    if not required_key_pairs:
        return True, "key_pairs_not_used", info

    session = build_boto3_session_from_runtime_env(runtime_env)
    ec2 = session.client("ec2", region_name=region)
    missing = []
    for key_name in required_key_pairs:
        try:
            ec2.describe_key_pairs(KeyNames=[key_name])
        except ClientError as e:
            code = str((e.response or {}).get("Error", {}).get("Code") or "")
            if code == "InvalidKeyPair.NotFound":
                missing.append(key_name)
                continue
            raise

    info["missing_key_pairs"] = sorted(set(missing))
    if info["missing_key_pairs"]:
        missing_text = ", ".join(f"'{name}'" for name in info["missing_key_pairs"])
        return (
            False,
            f"KeyPair preflight failed en {region}: {missing_text} no existe en la cuenta/región AWS efectiva.",
            info,
        )

    return True, "key_pairs_ok", info

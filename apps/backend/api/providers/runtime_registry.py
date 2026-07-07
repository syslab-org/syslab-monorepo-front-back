from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Callable

from botocore.exceptions import ClientError

from api.cloud_connections import (
    build_aws_runtime_env,
    build_boto3_session_from_runtime_env,
    get_aws_identity_from_runtime_env,
    test_aws_connection,
)
from api.models import PROVIDER_AWS, PROVIDER_AZURE, PROVIDER_GCP

from .aws.payload import get_region


def _empty_runtime_env(_connection=None) -> dict:
    return {}


def _empty_identity(_runtime_env: dict | None = None) -> dict:
    return {}


def _planned_connection_test(label: str):
    def _tester(_connection) -> tuple[bool, str, dict]:
        return False, f"{label} connection test is not implemented yet.", {}

    return _tester


def _planned_can_run_real_execution(_runtime_env: dict | None = None) -> bool:
    return False


def _planned_probe_live_resources(_plan, _runtime_env: dict | None = None):
    return None, "live_probe_not_supported"


def _aws_can_run_real_execution(runtime_env: dict | None = None) -> bool:
    runtime_env = runtime_env or {}
    running_with_task_runtime = bool(
        os.getenv("ECS_TASK_DEFINITION")
        or os.getenv("ECS_CONTAINER_METADATA_URI")
        or os.getenv("ECS_CONTAINER_METADATA_URI_V4")
        or os.getenv("AWS_EXECUTION_ENV")
    )
    allow_local = os.getenv("ALLOW_LOCAL_APPLY") == "1"
    has_static_creds = bool(
        (runtime_env.get("AWS_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID"))
        and (runtime_env.get("AWS_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY"))
    )
    has_profile = (
        bool(runtime_env.get("AWS_PROFILE") or os.getenv("AWS_PROFILE"))
        and os.getenv("AWS_SDK_LOAD_CONFIG") == "1"
    )
    if runtime_env and has_static_creds:
        return True
    return running_with_task_runtime or (allow_local and (has_static_creds or has_profile))


def _aws_probe_live_resources(plan, runtime_env: dict | None = None):
    outputs = plan.outputs or {}
    if not isinstance(outputs, dict):
        return None, "missing_outputs"

    vpc_map = outputs.get("vpc_ids")
    if not isinstance(vpc_map, dict) or not vpc_map:
        return None, "missing_vpc_ids"

    vpc_ids = sorted({str(v).strip() for v in vpc_map.values() if str(v or "").strip()})
    if not vpc_ids:
        return None, "missing_vpc_ids"

    payload = plan.payload or {}
    region = get_region(payload)
    session = build_boto3_session_from_runtime_env(runtime_env)
    ec2 = session.client("ec2", region_name=region)

    found = 0
    for vpc_id in vpc_ids:
        try:
            ec2.describe_vpcs(VpcIds=[vpc_id])
            found += 1
        except ClientError as exc:
            code = (exc.response.get("Error", {}) or {}).get("Code", "")
            if code == "InvalidVpcID.NotFound":
                continue
            return None, f"probe_error:{code}"
        except Exception as exc:
            return None, f"probe_error:{exc}"

    return found > 0, f"vpcs_found={found}/{len(vpc_ids)}"


@dataclass(frozen=True)
class ProviderRuntimeHooks:
    provider: str
    label: str
    environment_target_name: str
    region_env_keys: tuple[str, ...]
    account_id_keys: tuple[str, ...]
    arn_keys: tuple[str, ...]
    user_id_keys: tuple[str, ...]
    build_runtime_env: Callable[[object | None], dict]
    get_identity_from_runtime_env: Callable[[dict | None], dict]
    test_connection: Callable[[object], tuple[bool, str, dict]]
    can_run_real_execution: Callable[[dict | None], bool]
    probe_live_resources: Callable[[object, dict | None], tuple[bool | None, str]]

    def resolve_region(self, *, runtime_env: dict | None = None, diag: dict | None = None) -> str:
        diag = diag or {}
        for key in ("region", "aws_region", "gcp_region", "azure_region"):
            value = str(diag.get(key) or "").strip()
            if value:
                return value

        runtime_env = runtime_env or {}
        for key in self.region_env_keys:
            value = str(runtime_env.get(key) or "").strip()
            if value:
                return value
        return ""

    def summarize_identity(self, identity: dict | None) -> dict:
        identity = identity if isinstance(identity, dict) else {}
        return {
            "account_id": self._first_identity_value(identity, self.account_id_keys),
            "arn": self._first_identity_value(identity, self.arn_keys),
            "user_id": self._first_identity_value(identity, self.user_id_keys),
        }

    @staticmethod
    def _first_identity_value(identity: dict, keys: tuple[str, ...]) -> str:
        for key in keys:
            value = str(identity.get(key) or "").strip()
            if value:
                return value
        return ""


_RUNTIME_HOOKS = {
    PROVIDER_AWS: ProviderRuntimeHooks(
        provider=PROVIDER_AWS,
        label="AWS",
        environment_target_name="Environment credentials",
        region_env_keys=("AWS_DEFAULT_REGION", "AWS_REGION"),
        account_id_keys=("Account", "account_id"),
        arn_keys=("Arn", "arn"),
        user_id_keys=("UserId", "user_id"),
        build_runtime_env=build_aws_runtime_env,
        get_identity_from_runtime_env=get_aws_identity_from_runtime_env,
        test_connection=test_aws_connection,
        can_run_real_execution=_aws_can_run_real_execution,
        probe_live_resources=_aws_probe_live_resources,
    ),
    PROVIDER_GCP: ProviderRuntimeHooks(
        provider=PROVIDER_GCP,
        label="GCP",
        environment_target_name="Application Default Credentials",
        region_env_keys=("GOOGLE_CLOUD_REGION", "CLOUDSDK_COMPUTE_REGION", "GOOGLE_CLOUD_ZONE"),
        account_id_keys=("project_id", "projectId", "Account"),
        arn_keys=("principal", "principal_email", "resource_id"),
        user_id_keys=("principal_email", "client_id", "UserId"),
        build_runtime_env=_empty_runtime_env,
        get_identity_from_runtime_env=_empty_identity,
        test_connection=_planned_connection_test("GCP"),
        can_run_real_execution=_planned_can_run_real_execution,
        probe_live_resources=_planned_probe_live_resources,
    ),
    PROVIDER_AZURE: ProviderRuntimeHooks(
        provider=PROVIDER_AZURE,
        label="Azure",
        environment_target_name="Azure environment credentials",
        region_env_keys=("AZURE_LOCATION", "ARM_LOCATION"),
        account_id_keys=("subscription_id", "subscriptionId", "Account"),
        arn_keys=("principal", "resource_id", "Arn"),
        user_id_keys=("principal_email", "client_id", "UserId"),
        build_runtime_env=_empty_runtime_env,
        get_identity_from_runtime_env=_empty_identity,
        test_connection=_planned_connection_test("Azure"),
        can_run_real_execution=_planned_can_run_real_execution,
        probe_live_resources=_planned_probe_live_resources,
    ),
}


def get_provider_runtime_hooks(provider: str | None) -> ProviderRuntimeHooks:
    key = str(provider or PROVIDER_AWS).strip().lower() or PROVIDER_AWS
    if key not in _RUNTIME_HOOKS:
        raise KeyError(f"Unknown provider runtime hooks: {provider}")
    return _RUNTIME_HOOKS[key]


def build_connection_runtime_env(connection, provider: str | None = None) -> dict:
    provider_key = str(provider or getattr(connection, "provider", PROVIDER_AWS) or PROVIDER_AWS).strip().lower()
    hooks = get_provider_runtime_hooks(provider_key)
    return hooks.build_runtime_env(connection)


def get_runtime_identity(provider: str | None, runtime_env: dict | None = None) -> dict:
    hooks = get_provider_runtime_hooks(provider)
    return hooks.get_identity_from_runtime_env(runtime_env or {})


def test_cloud_connection(connection) -> tuple[bool, str, dict]:
    hooks = get_provider_runtime_hooks(getattr(connection, "provider", PROVIDER_AWS))
    return hooks.test_connection(connection)

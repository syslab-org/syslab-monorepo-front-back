from __future__ import annotations

from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, NoRegionError

from .models import (
    CLOUD_AUTH_AWS_ASSUME_ROLE,
    CLOUD_SCOPE_COURSE_SHARED,
    PROVIDER_AWS,
    CloudConnection,
    Lab,
)
from .secret_store import decrypt_secret


def get_cloud_connection_secret(connection: CloudConnection) -> str:
    return decrypt_secret(connection.aws_secret_access_key_encrypted)


def get_cloud_connection_external_id(connection: CloudConnection) -> str:
    return decrypt_secret(connection.aws_external_id_encrypted)


def build_base_aws_session(region: str = ""):
    return boto3.Session(region_name=region or None)


def _assume_role_runtime_env(connection: CloudConnection, region: str = "") -> dict:
    base_session = build_base_aws_session(region)
    sts = base_session.client("sts", region_name=region or None)
    external_id = get_cloud_connection_external_id(connection)
    params = {
        "RoleArn": str(connection.aws_role_arn or "").strip(),
        "RoleSessionName": f"syslab-{str(connection.id).split('-')[0]}",
    }
    if external_id:
        params["ExternalId"] = external_id
    resp = sts.assume_role(**params)
    creds = (resp or {}).get("Credentials") or {}
    return {
        "AWS_ACCESS_KEY_ID": str(creds.get("AccessKeyId") or "").strip(),
        "AWS_SECRET_ACCESS_KEY": str(creds.get("SecretAccessKey") or "").strip(),
        "AWS_SESSION_TOKEN": str(creds.get("SessionToken") or "").strip(),
    }


def build_aws_runtime_env(connection: CloudConnection | None) -> dict:
    if not connection or connection.provider != PROVIDER_AWS:
        return {}

    region = str(connection.default_region or "").strip()
    if connection.auth_type == CLOUD_AUTH_AWS_ASSUME_ROLE:
        env = _assume_role_runtime_env(connection, region)
    else:
        env = {
            "AWS_ACCESS_KEY_ID": str(connection.aws_access_key_id or "").strip(),
            "AWS_SECRET_ACCESS_KEY": get_cloud_connection_secret(connection),
        }
    if region:
        env["AWS_DEFAULT_REGION"] = region
        env["AWS_REGION"] = region
    return env


def build_boto3_session_from_runtime_env(runtime_env: dict | None = None):
    runtime_env = runtime_env or {}
    access_key = str(runtime_env.get("AWS_ACCESS_KEY_ID") or "").strip()
    secret_key = str(runtime_env.get("AWS_SECRET_ACCESS_KEY") or "").strip()
    session_token = str(runtime_env.get("AWS_SESSION_TOKEN") or "").strip()
    region = str(runtime_env.get("AWS_DEFAULT_REGION") or runtime_env.get("AWS_REGION") or "").strip()

    if access_key and secret_key:
        return boto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=session_token or None,
            region_name=region or None,
        )

    profile = str(runtime_env.get("AWS_PROFILE") or "").strip()
    if profile:
        return boto3.Session(profile_name=profile, region_name=region or None)
    return boto3.Session(region_name=region or None)


def get_aws_identity_from_runtime_env(runtime_env: dict | None = None) -> dict:
    session = build_boto3_session_from_runtime_env(runtime_env)
    sts = session.client("sts")
    return sts.get_caller_identity() or {}


def resolve_lab_cloud_connection_with_source(
    lab: Lab | None,
    provider: str | None = None,
) -> tuple[Optional[CloudConnection], str]:
    if not lab:
        return None, "unresolved"

    provider_key = str(provider or getattr(lab, "target_provider", PROVIDER_AWS) or PROVIDER_AWS).strip().lower()

    explicit = getattr(lab, "cloud_connection", None)
    if explicit and explicit.is_active and explicit.provider == provider_key:
        return explicit, "lab_explicit"

    owner_user_id = getattr(lab, "owner_user_id", None)
    if owner_user_id:
        personal = (
            CloudConnection.objects.filter(
                owner_user_id=owner_user_id,
                provider=provider_key,
                is_active=True,
            )
            .order_by("-updated_at")
            .first()
        )
        if personal:
            return personal, "owner_personal_auto"

    course_id = getattr(lab, "course_id", None)
    if course_id:
        shared = (
            CloudConnection.objects.filter(
                course_id=course_id,
                scope=CLOUD_SCOPE_COURSE_SHARED,
                provider=provider_key,
                is_active=True,
            )
            .order_by("-updated_at")
            .first()
        )
        if shared:
            return shared, "course_shared_auto"

    return None, "unresolved"


def resolve_lab_cloud_connection(lab: Lab | None, provider: str | None = None) -> Optional[CloudConnection]:
    connection, _source = resolve_lab_cloud_connection_with_source(lab, provider)
    return connection


def test_aws_connection(connection: CloudConnection) -> tuple[bool, str, dict]:
    runtime_env = build_aws_runtime_env(connection)
    try:
        identity = get_aws_identity_from_runtime_env(runtime_env)
        return True, "sts_ok", identity or {}
    except NoRegionError as exc:
        return False, f"no_region: {exc}", {}
    except NoCredentialsError as exc:
        return False, f"no_credentials: {exc}", {}
    except ClientError as exc:
        code = (exc.response.get("Error", {}) or {}).get("Code", "client_error")
        return False, f"{code}: {exc}", {}
    except Exception as exc:
        return False, str(exc), {}

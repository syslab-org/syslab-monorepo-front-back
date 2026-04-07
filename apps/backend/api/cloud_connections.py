from __future__ import annotations

from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, NoRegionError

from .models import CLOUD_SCOPE_COURSE_SHARED, PROVIDER_AWS, CloudConnection, Lab
from .secret_store import decrypt_secret


def get_cloud_connection_secret(connection: CloudConnection) -> str:
    return decrypt_secret(connection.aws_secret_access_key_encrypted)


def build_aws_runtime_env(connection: CloudConnection | None) -> dict:
    if not connection or connection.provider != PROVIDER_AWS:
        return {}

    env = {
        "AWS_ACCESS_KEY_ID": str(connection.aws_access_key_id or "").strip(),
        "AWS_SECRET_ACCESS_KEY": get_cloud_connection_secret(connection),
    }
    region = str(connection.default_region or "").strip()
    if region:
        env["AWS_DEFAULT_REGION"] = region
        env["AWS_REGION"] = region
    return env


def build_boto3_session_from_runtime_env(runtime_env: dict | None = None):
    runtime_env = runtime_env or {}
    access_key = str(runtime_env.get("AWS_ACCESS_KEY_ID") or "").strip()
    secret_key = str(runtime_env.get("AWS_SECRET_ACCESS_KEY") or "").strip()
    region = str(runtime_env.get("AWS_DEFAULT_REGION") or runtime_env.get("AWS_REGION") or "").strip()

    if access_key and secret_key:
        return boto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
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


def resolve_lab_cloud_connection(lab: Lab | None, provider: str | None = None) -> Optional[CloudConnection]:
    if not lab:
        return None

    provider_key = str(provider or getattr(lab, "target_provider", PROVIDER_AWS) or PROVIDER_AWS).strip().lower()

    explicit = getattr(lab, "cloud_connection", None)
    if explicit and explicit.is_active and explicit.provider == provider_key:
        return explicit

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
            return personal

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
            return shared

    return None


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

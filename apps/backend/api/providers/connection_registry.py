from __future__ import annotations

from dataclasses import dataclass

from rest_framework import serializers

from api.models import (
    CLOUD_AUTH_AWS_ASSUME_ROLE,
    CLOUD_AUTH_AWS_STATIC,
    CLOUD_SCOPE_PERSONAL,
    PROVIDER_AWS,
    PROVIDER_AZURE,
    PROVIDER_GCP,
)


def _masked_value(value: str, *, prefix: int = 4, suffix: int = 4) -> str:
    value = str(value or "").strip()
    if len(value) <= max(prefix, suffix):
        return value
    return f"{value[:prefix]}...{value[-suffix:]}"


@dataclass(frozen=True)
class ProviderConnectionSpec:
    provider: str
    label: str
    runtime_status: str
    supports_real_connections: bool
    default_auth_type: str

    def capabilities(self) -> dict:
        return {
            "provider": self.provider,
            "label": self.label,
            "runtime_status": self.runtime_status,
            "supports_real_connections": self.supports_real_connections,
            "default_auth_type": self.default_auth_type,
        }

    def validate_create(self, attrs: dict) -> dict:
        raise NotImplementedError

    def validate_update(self, attrs: dict, instance) -> dict:
        raise NotImplementedError

    def apply_to_connection(self, connection, attrs: dict) -> None:
        raise NotImplementedError

    def serialize_details(self, connection) -> dict:
        raise NotImplementedError


class AwsConnectionSpec(ProviderConnectionSpec):
    def validate_create(self, attrs: dict) -> dict:
        auth_type = attrs.get("auth_type") or CLOUD_AUTH_AWS_STATIC
        scope = attrs.get("scope")
        course_id = attrs.get("course_id")

        if scope == CLOUD_SCOPE_PERSONAL and course_id:
            raise serializers.ValidationError("Una conexion personal no debe quedar asociada a un curso.")
        if scope != CLOUD_SCOPE_PERSONAL and not course_id:
            raise serializers.ValidationError("Debes seleccionar un curso para una conexion compartida.")

        if auth_type == CLOUD_AUTH_AWS_STATIC:
            if not str(attrs.get("aws_access_key_id") or "").strip():
                raise serializers.ValidationError("Debes ingresar AWS Access Key ID.")
            if not str(attrs.get("aws_secret_access_key") or "").strip():
                raise serializers.ValidationError("Debes ingresar AWS Secret Access Key.")
        elif auth_type == CLOUD_AUTH_AWS_ASSUME_ROLE:
            if not str(attrs.get("aws_role_arn") or "").strip():
                raise serializers.ValidationError("Debes ingresar el Role ARN para AssumeRole.")
        else:
            raise serializers.ValidationError("Tipo de autenticacion AWS no soportado en este MVP.")
        return attrs

    def validate_update(self, attrs: dict, instance) -> dict:
        auth_type = attrs.get("auth_type") or getattr(instance, "auth_type", CLOUD_AUTH_AWS_STATIC)
        role_arn = attrs.get("aws_role_arn", getattr(instance, "aws_role_arn", ""))
        access_key = attrs.get("aws_access_key_id", getattr(instance, "aws_access_key_id", ""))
        secret_configured = bool(
            str(attrs.get("aws_secret_access_key") or "").strip()
            or getattr(instance, "aws_secret_access_key_encrypted", "")
        )

        if auth_type == CLOUD_AUTH_AWS_STATIC:
            if not str(access_key or "").strip():
                raise serializers.ValidationError("Debes ingresar AWS Access Key ID.")
            if not secret_configured:
                raise serializers.ValidationError("Debes ingresar AWS Secret Access Key.")
        elif auth_type == CLOUD_AUTH_AWS_ASSUME_ROLE:
            if not str(role_arn or "").strip():
                raise serializers.ValidationError("Debes ingresar el Role ARN para AssumeRole.")
        else:
            raise serializers.ValidationError("Tipo de autenticacion AWS no soportado en este MVP.")
        return attrs

    def apply_to_connection(self, connection, attrs: dict) -> None:
        if "default_region" in attrs:
            connection.default_region = attrs["default_region"]
        if "aws_access_key_id" in attrs:
            connection.aws_access_key_id = str(attrs.get("aws_access_key_id") or "").strip()
        if "aws_role_arn" in attrs:
            connection.aws_role_arn = str(attrs.get("aws_role_arn") or "").strip()
        if "aws_secret_access_key_encrypted" in attrs:
            connection.aws_secret_access_key_encrypted = attrs.get("aws_secret_access_key_encrypted") or ""
        if "aws_external_id_encrypted" in attrs:
            connection.aws_external_id_encrypted = attrs.get("aws_external_id_encrypted") or ""
        if "auth_type" in attrs:
            connection.auth_type = attrs["auth_type"]

        if connection.auth_type == CLOUD_AUTH_AWS_ASSUME_ROLE:
            connection.aws_access_key_id = ""
            connection.aws_secret_access_key_encrypted = ""
        else:
            connection.aws_role_arn = ""
            connection.aws_external_id_encrypted = ""

    def serialize_details(self, connection) -> dict:
        auth_type = str(getattr(connection, "auth_type", "") or self.default_auth_type)
        access_key = str(getattr(connection, "aws_access_key_id", "") or "").strip()
        role_arn = str(getattr(connection, "aws_role_arn", "") or "").strip()
        return {
            "provider": self.provider,
            "label": self.label,
            "runtime_status": self.runtime_status,
            "supports_real_connections": self.supports_real_connections,
            "auth_type": auth_type,
            "fields": {
                "access_key_id": {
                    "configured": bool(access_key),
                    "masked": _masked_value(access_key),
                },
                "secret_access_key": {
                    "configured": bool(getattr(connection, "aws_secret_access_key_encrypted", "")),
                },
                "role_arn": {
                    "configured": bool(role_arn),
                    "masked": _masked_value(role_arn, prefix=12, suffix=6),
                    "value": role_arn,
                },
                "external_id": {
                    "configured": bool(getattr(connection, "aws_external_id_encrypted", "")),
                },
            },
        }


class PlannedConnectionSpec(ProviderConnectionSpec):
    def _raise_not_supported(self) -> None:
        raise serializers.ValidationError(
            f"Por ahora {self.label} no soporta conexiones ejecutables reales en el backend."
        )

    def validate_create(self, attrs: dict) -> dict:
        self._raise_not_supported()

    def validate_update(self, attrs: dict, instance) -> dict:
        self._raise_not_supported()

    def apply_to_connection(self, connection, attrs: dict) -> None:
        return None

    def serialize_details(self, connection) -> dict:
        return {
            "provider": self.provider,
            "label": self.label,
            "runtime_status": self.runtime_status,
            "supports_real_connections": self.supports_real_connections,
            "auth_type": self.default_auth_type,
            "fields": {},
        }


_SPECS = {
    PROVIDER_AWS: AwsConnectionSpec(
        provider=PROVIDER_AWS,
        label="AWS",
        runtime_status="ready",
        supports_real_connections=True,
        default_auth_type=CLOUD_AUTH_AWS_STATIC,
    ),
    PROVIDER_GCP: PlannedConnectionSpec(
        provider=PROVIDER_GCP,
        label="GCP",
        runtime_status="planned",
        supports_real_connections=False,
        default_auth_type="gcp_service_account",
    ),
    PROVIDER_AZURE: PlannedConnectionSpec(
        provider=PROVIDER_AZURE,
        label="Azure",
        runtime_status="planned",
        supports_real_connections=False,
        default_auth_type="azure_service_principal",
    ),
}


def get_provider_connection_spec(provider: str | None) -> ProviderConnectionSpec:
    key = str(provider or PROVIDER_AWS).strip().lower() or PROVIDER_AWS
    if key not in _SPECS:
        raise KeyError(f"Unknown provider connection spec: {provider}")
    return _SPECS[key]

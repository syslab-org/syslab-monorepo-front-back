import json
import os

from provisioning.terraform_runner import cleanup

from ..execution_base import ProviderExecutionBundle, ProviderExecutor
from .payload import uses_tgw
from .runtime import (
    aws_creds_diagnostics,
    can_call_aws_sts,
    check_key_pairs_preflight,
    check_tgw_quota_preflight,
    cleanup_residual_nat_gateways,
    normalize_payload,
)
from .terraform import (
    ensure_apply_succeeded,
    ensure_destroy_succeeded,
    ensure_init_succeeded,
    ensure_plan_succeeded,
    read_main_preview,
    read_outputs_json,
    render_workspace,
    terraform_apply,
    terraform_destroy,
    terraform_init,
    terraform_plan,
)


class AwsProviderExecutor(ProviderExecutor):
    provider = "aws"

    def _normalize_incoming_payload(self, payload):
        if isinstance(payload, str):
            try:
                payload = json.loads(payload or "{}")
            except Exception:
                payload = {}
        return normalize_payload(payload if isinstance(payload, dict) else {})

    def build_bundle(
        self,
        plan_id: str,
        payload,
        *,
        force_simulate_only: bool | None = None,
        runtime_env: dict | None = None,
    ) -> ProviderExecutionBundle:
        normalized_payload = self._normalize_incoming_payload(payload)
        if force_simulate_only is not None:
            normalized_payload["simulate_only"] = force_simulate_only

        runtime_env = runtime_env or {}
        diag = aws_creds_diagnostics(runtime_env)
        allow_local_apply = diag["allow_local_apply"]
        sts_ok, sts_reason = can_call_aws_sts(runtime_env)
        creds_ok_for_apply = bool(runtime_env or diag["running_in_ecs"] or (allow_local_apply and sts_ok))

        return ProviderExecutionBundle(
            provider=self.provider,
            plan_id=plan_id,
            payload=normalized_payload,
            simulate_only=bool(normalized_payload["simulate_only"]),
            diag=diag,
            sts_ok=sts_ok,
            sts_reason=sts_reason,
            allow_local_apply=allow_local_apply,
            creds_ok_for_apply=creds_ok_for_apply,
            runtime_env=runtime_env,
        )

    def prepare_workspace(self, bundle: ProviderExecutionBundle, *, prefix: str, include_debug_dumps: bool) -> None:
        workdir, state_path, tf_text = render_workspace(
            plan_id=bundle.plan_id,
            payload=bundle.payload,
            simulate_only=bundle.simulate_only,
            prefix=prefix,
        )
        bundle.workdir = workdir
        bundle.state_path = state_path
        bundle.tf_text = tf_text

        bundle.append_log(f"[state] backend local path={state_path}\n")

        if include_debug_dumps:
            try:
                from .terraform import write_debug_dumps

                write_debug_dumps(workdir, bundle.payload, tf_text)
                bundle.append_log(f"[debug] dumps escritos en {workdir}\n")
            except Exception as e:
                bundle.append_log(f"[debug] no pude escribir dumps: {e}\n")

            try:
                preview = read_main_preview(workdir, lines=40)
                bundle.append_log(
                    f"\n--- main.tf (primeras líneas) ---\n{preview}\n-------------------------------\n"
                )
            except Exception:
                pass

    def append_runtime_diagnostics(self, bundle: ProviderExecutionBundle, *, action_label: str) -> None:
        bundle.append_log(f"workdir={bundle.workdir}\n")
        bundle.append_log(f"{action_label} simulate_only={bundle.simulate_only}\n")
        bundle.append_log(
            f"aws_diag={bundle.diag} sts_ok={bundle.sts_ok} "
            f"sts_reason={bundle.sts_reason} ALLOW_LOCAL_APPLY={bundle.allow_local_apply}\n\n"
        )

    def preflight_apply(self, bundle: ProviderExecutionBundle) -> tuple[bool, str, dict]:
        try:
            key_ok, key_reason, key_info = check_key_pairs_preflight(bundle.payload, bundle.runtime_env)
            if not key_ok:
                return key_ok, key_reason, {"kind": "key_pairs", **key_info}

            tgw_ok, tgw_reason, tgw_info = check_tgw_quota_preflight(bundle.payload, bundle.runtime_env)
            if not tgw_ok:
                return tgw_ok, tgw_reason, {"kind": "tgw", **tgw_info}

            return True, "ok", {
                "kind": "combined",
                "key_pairs": key_info,
                "tgw": tgw_info,
            }
        except Exception as e:
            return (
                False,
                f"AWS preflight error: {e}",
                {"used": uses_tgw(bundle.payload), "preflight_error": str(e)},
            )

    def blocked_credentials_message(self, action: str, bundle: ProviderExecutionBundle) -> str:
        return (
            f"Terraform {action} BLOQUEADO: no hay credenciales AWS resolubles en este container. "
            "En ECS se resuelve por task role. En local requiere ALLOW_LOCAL_APPLY=1 y credenciales disponibles "
            "(env vars o AWS_PROFILE + ~/.aws montado). "
            f"Diagnóstico: {bundle.diag} / sts_reason={bundle.sts_reason}"
        )

    def terraform_init(self, bundle: ProviderExecutionBundle):
        return terraform_init(bundle.workdir, env=bundle.runtime_env)

    def ensure_init_succeeded(self, result) -> None:
        ensure_init_succeeded(result)

    def terraform_plan(self, bundle: ProviderExecutionBundle):
        return terraform_plan(bundle.workdir, simulate_only=bundle.simulate_only, env=bundle.runtime_env)

    def ensure_plan_succeeded(self, result) -> None:
        ensure_plan_succeeded(result)

    def terraform_apply(self, bundle: ProviderExecutionBundle):
        return terraform_apply(bundle.workdir, env=bundle.runtime_env)

    def ensure_apply_succeeded(self, result) -> None:
        ensure_apply_succeeded(result)

    def terraform_destroy(self, bundle: ProviderExecutionBundle):
        return terraform_destroy(bundle.workdir, env=bundle.runtime_env)

    def ensure_destroy_succeeded(self, result) -> None:
        ensure_destroy_succeeded(result)

    def read_outputs(self, bundle: ProviderExecutionBundle) -> dict:
        return read_outputs_json(bundle.workdir, env=bundle.runtime_env)

    def cleanup_after_destroy(self, bundle: ProviderExecutionBundle, *, outputs: dict) -> dict:
        return cleanup_residual_nat_gateways(bundle.payload, outputs, bundle.runtime_env)

    def cleanup_workspace(self, bundle: ProviderExecutionBundle) -> None:
        if bundle.workdir:
            if os.getenv("KEEP_TF_DIRS", "0") == "1":
                bundle.append_log(f"[debug] KEEP_TF_DIRS activo, conservando {bundle.workdir}\n")
                return
            cleanup(bundle.workdir)

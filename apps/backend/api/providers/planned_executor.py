from .execution_base import ProviderExecutionBundle, ProviderExecutor


class PlannedProviderExecutor(ProviderExecutor):
    def __init__(self, provider: str, label: str):
        self.provider = provider
        self.label = label

    def _message(self) -> str:
        return f"{self.label} runtime executor is not implemented yet."

    def build_bundle(self, plan_id: str, payload, *, force_simulate_only: bool | None = None) -> ProviderExecutionBundle:
        normalized_payload = payload if isinstance(payload, dict) else {}
        simulate_only = bool(normalized_payload.get("simulate_only", True))
        if force_simulate_only is not None:
            simulate_only = bool(force_simulate_only)

        bundle = ProviderExecutionBundle(
            provider=self.provider,
            plan_id=plan_id,
            payload=normalized_payload,
            simulate_only=simulate_only,
            diag={"provider": self.provider, "status": "planned"},
            sts_ok=False,
            sts_reason="planned_executor",
            allow_local_apply=False,
            creds_ok_for_apply=False,
        )
        bundle.append_log(f"[provider] {self._message()}\n")
        return bundle

    def prepare_workspace(self, bundle: ProviderExecutionBundle, *, prefix: str, include_debug_dumps: bool) -> None:
        raise NotImplementedError(self._message())

    def append_runtime_diagnostics(self, bundle: ProviderExecutionBundle, *, action_label: str) -> None:
        bundle.append_log(
            f"[provider] {self.label} selected for {action_label}. Runtime execution is still planned.\n"
        )

    def preflight_apply(self, bundle: ProviderExecutionBundle) -> tuple[bool, str, dict]:
        return False, self._message(), {"provider": self.provider, "status": "planned"}

    def blocked_credentials_message(self, action: str, bundle: ProviderExecutionBundle) -> str:
        return f"{self.label} runtime executor is not implemented yet. Cannot run {action}."

    def terraform_init(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError(self._message())

    def ensure_init_succeeded(self, result) -> None:
        raise NotImplementedError(self._message())

    def terraform_plan(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError(self._message())

    def ensure_plan_succeeded(self, result) -> None:
        raise NotImplementedError(self._message())

    def terraform_apply(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError(self._message())

    def ensure_apply_succeeded(self, result) -> None:
        raise NotImplementedError(self._message())

    def terraform_destroy(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError(self._message())

    def ensure_destroy_succeeded(self, result) -> None:
        raise NotImplementedError(self._message())

    def read_outputs(self, bundle: ProviderExecutionBundle) -> dict:
        raise NotImplementedError(self._message())

    def cleanup_after_destroy(self, bundle: ProviderExecutionBundle, *, outputs: dict) -> dict:
        raise NotImplementedError(self._message())

    def cleanup_workspace(self, bundle: ProviderExecutionBundle) -> None:
        return None

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class ProviderExecutionBundle:
    provider: str
    plan_id: str
    payload: dict
    simulate_only: bool
    diag: dict
    sts_ok: bool
    sts_reason: str
    allow_local_apply: bool
    creds_ok_for_apply: bool
    runtime_env: dict = field(default_factory=dict)
    workdir: str | None = None
    state_path: str | None = None
    tf_text: str = ""
    full_log: str = ""
    on_log_append: Callable[["ProviderExecutionBundle"], None] | None = field(default=None, repr=False, compare=False)

    def append_log(self, text: str) -> None:
        self.full_log += text
        if self.on_log_append:
            self.on_log_append(self)


class ProviderExecutor(ABC):
    provider = ""

    @abstractmethod
    def build_bundle(
        self,
        plan_id: str,
        payload,
        *,
        force_simulate_only: bool | None = None,
        runtime_env: dict | None = None,
    ) -> ProviderExecutionBundle:
        raise NotImplementedError

    @abstractmethod
    def prepare_workspace(self, bundle: ProviderExecutionBundle, *, prefix: str, include_debug_dumps: bool) -> None:
        raise NotImplementedError

    @abstractmethod
    def append_runtime_diagnostics(self, bundle: ProviderExecutionBundle, *, action_label: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def preflight_apply(self, bundle: ProviderExecutionBundle) -> tuple[bool, str, dict]:
        raise NotImplementedError

    @abstractmethod
    def blocked_credentials_message(self, action: str, bundle: ProviderExecutionBundle) -> str:
        raise NotImplementedError

    @abstractmethod
    def terraform_init(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError

    @abstractmethod
    def ensure_init_succeeded(self, result) -> None:
        raise NotImplementedError

    @abstractmethod
    def terraform_plan(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError

    @abstractmethod
    def ensure_plan_succeeded(self, result) -> None:
        raise NotImplementedError

    @abstractmethod
    def terraform_apply(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError

    @abstractmethod
    def ensure_apply_succeeded(self, result) -> None:
        raise NotImplementedError

    @abstractmethod
    def terraform_destroy(self, bundle: ProviderExecutionBundle):
        raise NotImplementedError

    @abstractmethod
    def ensure_destroy_succeeded(self, result) -> None:
        raise NotImplementedError

    @abstractmethod
    def read_outputs(self, bundle: ProviderExecutionBundle) -> dict:
        raise NotImplementedError

    @abstractmethod
    def cleanup_after_destroy(self, bundle: ProviderExecutionBundle, *, outputs: dict) -> dict:
        raise NotImplementedError

    @abstractmethod
    def cleanup_workspace(self, bundle: ProviderExecutionBundle) -> None:
        raise NotImplementedError

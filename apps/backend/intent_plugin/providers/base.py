from __future__ import annotations

from typing import Protocol

from intent_plugin.contracts import IntentGenerationRequest, IntentGenerationResult


class IntentProvider(Protocol):
    slug: str

    def manifest(self) -> dict:
        ...

    def generate(self, request: IntentGenerationRequest) -> IntentGenerationResult:
        ...


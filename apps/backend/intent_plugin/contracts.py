from dataclasses import dataclass, field


@dataclass(frozen=True)
class IntentGenerationRequest:
    prompt: str
    target_provider: str
    region: str
    canvas_id: str = ""
    max_workloads: int = 3


@dataclass(frozen=True)
class IntentGenerationResult:
    draft_name: str
    intent: dict
    assumptions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    provider: str = ""


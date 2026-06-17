from django.conf import settings


def is_enabled() -> bool:
    return bool(getattr(settings, "INTENT_PLUGIN_ENABLED", True))


def default_region() -> str:
    return str(getattr(settings, "INTENT_PLUGIN_DEFAULT_REGION", "us-east-1") or "us-east-1").strip()


def max_workloads() -> int:
    value = getattr(settings, "INTENT_PLUGIN_MAX_WORKLOADS", 6)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 6
    return max(1, parsed)


def provider_path() -> str:
    return str(
        getattr(
            settings,
            "INTENT_PLUGIN_PROVIDER",
            "intent_plugin.providers.heuristic.HeuristicIntentProvider",
        )
        or "intent_plugin.providers.heuristic.HeuristicIntentProvider"
    ).strip()


def openai_api_key() -> str:
    return str(getattr(settings, "INTENT_PLUGIN_OPENAI_API_KEY", "") or "").strip()


def openai_model() -> str:
    return str(getattr(settings, "INTENT_PLUGIN_OPENAI_MODEL", "gpt-5.5") or "gpt-5.5").strip()


def openai_timeout_seconds() -> int:
    value = getattr(settings, "INTENT_PLUGIN_OPENAI_TIMEOUT_SECONDS", 45)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 45
    return max(5, parsed)


def openai_reasoning_effort() -> str:
    value = str(getattr(settings, "INTENT_PLUGIN_OPENAI_REASONING_EFFORT", "low") or "low").strip().lower()
    return value if value in {"none", "low", "medium", "high", "xhigh"} else "low"


def openai_text_verbosity() -> str:
    value = str(getattr(settings, "INTENT_PLUGIN_OPENAI_TEXT_VERBOSITY", "low") or "low").strip().lower()
    return value if value in {"low", "medium", "high"} else "low"

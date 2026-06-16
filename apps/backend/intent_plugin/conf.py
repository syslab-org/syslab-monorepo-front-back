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


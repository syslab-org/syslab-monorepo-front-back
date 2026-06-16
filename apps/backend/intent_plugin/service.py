from api.domain.network_intent import normalize_network_intent

from intent_plugin.conf import default_region, is_enabled, max_workloads
from intent_plugin.contracts import IntentGenerationRequest
from intent_plugin.exceptions import IntentPluginDisabled
from intent_plugin.registry import get_provider


def get_manifest() -> dict:
    provider = get_provider()
    return {
        "name": "intent-plugin",
        "enabled": is_enabled(),
        "defaults": {
            "target_provider": "aws",
            "region": default_region(),
            "max_workloads": max_workloads(),
        },
        "constraints": {
            "supported_target_providers": ["aws"],
            "max_workloads": max_workloads(),
        },
        "provider_path": provider.__class__.__module__ + "." + provider.__class__.__name__,
        "provider": provider.manifest(),
        "routes": {
            "generate": "/api/intent-plugin/generate/",
            "manifest": "/api/intent-plugin/manifest/",
        },
    }


def generate_intent(validated_data: dict) -> dict:
    if not is_enabled():
        raise IntentPluginDisabled("The intent plugin is disabled.")

    provider = get_provider()
    request = IntentGenerationRequest(**validated_data)
    result = provider.generate(request)
    normalized = normalize_network_intent(result.intent)
    return {
        "ok": True,
        "draft_name": result.draft_name,
        "provider": result.provider,
        "intent": {
            "target_provider": normalized.get("target_provider"),
            "metadata": normalized.get("metadata"),
            "topology": normalized.get("topology"),
            "capabilities": normalized.get("capabilities"),
            "provider_overrides": normalized.get("provider_overrides"),
        },
        "assumptions": list(result.assumptions),
        "warnings": list(result.warnings),
    }

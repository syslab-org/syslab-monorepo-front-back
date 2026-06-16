from django.utils.module_loading import import_string

from intent_plugin.conf import provider_path
from intent_plugin.exceptions import IntentProviderConfigurationError


def get_provider():
    path = provider_path()
    try:
        provider_cls = import_string(path)
    except Exception as exc:
        raise IntentProviderConfigurationError(f"Could not import INTENT_PLUGIN_PROVIDER '{path}'.") from exc

    provider = provider_cls()
    missing = [name for name in ("manifest", "generate") if not hasattr(provider, name)]
    if missing:
        raise IntentProviderConfigurationError(
            f"Intent provider '{path}' is missing required methods: {', '.join(missing)}."
        )
    return provider


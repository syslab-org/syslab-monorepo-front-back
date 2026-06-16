class IntentPluginError(Exception):
    pass


class IntentPluginDisabled(IntentPluginError):
    pass


class IntentProviderConfigurationError(IntentPluginError):
    pass


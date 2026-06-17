class IntentPluginError(Exception):
    pass


class IntentPluginDisabled(IntentPluginError):
    pass


class IntentProviderConfigurationError(IntentPluginError):
    pass


class IntentProviderExecutionError(IntentPluginError):
    pass

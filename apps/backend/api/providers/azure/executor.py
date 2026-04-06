from ..planned_executor import PlannedProviderExecutor


class AzureProviderExecutor(PlannedProviderExecutor):
    def __init__(self):
        super().__init__(provider="azure", label="Azure")

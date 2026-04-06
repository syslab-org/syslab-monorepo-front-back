from ..planned_executor import PlannedProviderExecutor


class GcpProviderExecutor(PlannedProviderExecutor):
    def __init__(self):
        super().__init__(provider="gcp", label="GCP")

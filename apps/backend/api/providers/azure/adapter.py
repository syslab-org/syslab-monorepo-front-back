from ..base import ProviderAdapter


class AzureProviderAdapter(ProviderAdapter):
    provider = "azure"

    def capabilities(self) -> dict:
        return {
            "provider": self.provider,
            "status": "planned",
            "features": {
                "network_segments": False,
                "subnets": False,
                "instances": False,
                "nat_gateway": False,
                "internet_gateway": False,
                "direct_connectivity": False,
                "hub_connectivity": False,
            },
        }

    def validate(self, intent: dict) -> dict:
        raise NotImplementedError("Azure adapter is not implemented yet.")

    def compile(self, intent: dict) -> dict:
        raise NotImplementedError("Azure adapter is not implemented yet.")

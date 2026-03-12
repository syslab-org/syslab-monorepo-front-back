from api.models import PROVIDER_AWS

from .aws.adapter import AwsProviderAdapter
from .azure.adapter import AzureProviderAdapter
from .gcp.adapter import GcpProviderAdapter


_ADAPTERS = {
    PROVIDER_AWS: AwsProviderAdapter(),
    "gcp": GcpProviderAdapter(),
    "azure": AzureProviderAdapter(),
}



def get_provider_adapter(provider: str):
    key = str(provider or PROVIDER_AWS).strip().lower() or PROVIDER_AWS
    if key not in _ADAPTERS:
        raise KeyError(f"Unknown provider: {provider}")
    return _ADAPTERS[key]



def list_provider_capabilities():
    return [adapter.capabilities() for adapter in _ADAPTERS.values()]

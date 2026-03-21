from api.models import PROVIDER_AWS

from .aws.adapter import AwsProviderAdapter
from .aws.executor import AwsProviderExecutor
from .azure.adapter import AzureProviderAdapter
from .azure.executor import AzureProviderExecutor
from .gcp.adapter import GcpProviderAdapter
from .gcp.executor import GcpProviderExecutor


_ADAPTERS = {
    PROVIDER_AWS: AwsProviderAdapter(),
    "gcp": GcpProviderAdapter(),
    "azure": AzureProviderAdapter(),
}

_EXECUTORS = {
    PROVIDER_AWS: AwsProviderExecutor(),
    "gcp": GcpProviderExecutor(),
    "azure": AzureProviderExecutor(),
}



def get_provider_adapter(provider: str):
    key = str(provider or PROVIDER_AWS).strip().lower() or PROVIDER_AWS
    if key not in _ADAPTERS:
        raise KeyError(f"Unknown provider: {provider}")
    return _ADAPTERS[key]


def get_provider_key(provider: str) -> str:
    return str(provider or PROVIDER_AWS).strip().lower() or PROVIDER_AWS


def get_provider_executor(provider: str):
    key = get_provider_key(provider)
    if key not in _EXECUTORS:
        raise NotImplementedError(f"Runtime executor not implemented for provider: {provider}")
    return _EXECUTORS[key]



def list_provider_capabilities():
    return [adapter.capabilities() for adapter in _ADAPTERS.values()]

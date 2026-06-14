def get_provider_adapter(provider):
    from .registry import get_provider_adapter as _impl

    return _impl(provider)


def get_provider_executor(provider):
    from .registry import get_provider_executor as _impl

    return _impl(provider)


def get_provider_key(provider):
    from .registry import get_provider_key as _impl

    return _impl(provider)


def list_provider_capabilities():
    from .registry import list_provider_capabilities as _impl

    return _impl()


def get_provider_connection_spec(provider):
    from .connection_registry import get_provider_connection_spec as _impl

    return _impl(provider)


def build_connection_runtime_env(connection, provider=None):
    from .runtime_registry import build_connection_runtime_env as _impl

    return _impl(connection, provider)


def get_provider_runtime_hooks(provider):
    from .runtime_registry import get_provider_runtime_hooks as _impl

    return _impl(provider)


def get_runtime_identity(provider, runtime_env=None):
    from .runtime_registry import get_runtime_identity as _impl

    return _impl(provider, runtime_env)


def test_cloud_connection(connection):
    from .runtime_registry import test_cloud_connection as _impl

    return _impl(connection)


__all__ = [
    "get_provider_adapter",
    "get_provider_executor",
    "get_provider_key",
    "list_provider_capabilities",
    "get_provider_connection_spec",
    "build_connection_runtime_env",
    "get_provider_runtime_hooks",
    "get_runtime_identity",
    "test_cloud_connection",
]

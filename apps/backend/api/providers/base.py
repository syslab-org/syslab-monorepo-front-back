from abc import ABC, abstractmethod


class ProviderAdapter(ABC):
    provider = ""

    @abstractmethod
    def capabilities(self) -> dict:
        raise NotImplementedError

    @abstractmethod
    def validate(self, intent: dict) -> dict:
        raise NotImplementedError

    @abstractmethod
    def compile(self, intent: dict) -> dict:
        raise NotImplementedError

    def plan(self, bundle: dict) -> dict:
        return bundle

    def apply(self, bundle: dict) -> dict:
        return bundle

    def destroy(self, bundle: dict) -> dict:
        return bundle

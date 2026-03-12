from copy import deepcopy

from api.domain.network_intent import normalize_network_intent
from api.models import PROVIDER_AWS
from api.serializers import MultiPlanSerializer

from ..base import ProviderAdapter


class AwsProviderAdapter(ProviderAdapter):
    provider = PROVIDER_AWS

    def capabilities(self) -> dict:
        return {
            "provider": self.provider,
            "status": "ready",
            "features": {
                "network_segments": True,
                "subnets": True,
                "instances": True,
                "nat_gateway": True,
                "internet_gateway": True,
                "direct_connectivity": True,
                "hub_connectivity": True,
            },
        }

    def validate(self, intent: dict) -> dict:
        normalized = normalize_network_intent(intent)
        raw = deepcopy(normalized.get("legacy_payload") or {})
        if "cloud" not in raw:
            raw["cloud"] = self.provider
        serializer = MultiPlanSerializer(data=raw)
        serializer.is_valid(raise_exception=True)
        return {
            "intent": normalized,
            "provider_payload": dict(serializer.validated_data),
        }

    def compile(self, intent: dict) -> dict:
        validated = self.validate(intent)
        payload = validated["provider_payload"]
        legacy = validated["intent"].get("legacy_payload") or {}
        if legacy.get("name"):
            payload["name"] = legacy["name"]
        for key in ("firestore_vpc_id", "vpcId", "canvas_id"):
            if legacy.get(key):
                payload[key] = legacy[key]
        vlan_raw = legacy.get("vlan") if isinstance(legacy.get("vlan"), dict) else {}
        if vlan_raw.get("id"):
            payload.setdefault("vlan", {})
            payload["vlan"]["id"] = vlan_raw["id"]
        return {
            "provider": self.provider,
            "intent": validated["intent"],
            "payload": payload,
        }

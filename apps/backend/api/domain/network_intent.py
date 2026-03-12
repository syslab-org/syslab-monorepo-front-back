from copy import deepcopy

from api.models import PROVIDER_AWS


SUPPORTED_PROVIDERS = [PROVIDER_AWS, "gcp", "azure"]


def normalize_network_intent(payload: dict) -> dict:
    raw = deepcopy(payload if isinstance(payload, dict) else {})
    target_provider = str(raw.get("target_provider") or raw.get("cloud") or PROVIDER_AWS).strip().lower() or PROVIDER_AWS
    vlan = raw.get("vlan") if isinstance(raw.get("vlan"), dict) else {}

    metadata = raw.get("metadata") if isinstance(raw.get("metadata"), dict) else {}
    if raw.get("name") and not metadata.get("name"):
        metadata["name"] = raw.get("name")

    topology = raw.get("topology") if isinstance(raw.get("topology"), dict) else {}
    if not topology:
        topology = {
            "network": {
                "id": raw.get("canvas_id") or raw.get("firestore_vpc_id") or raw.get("vpcId") or vlan.get("id") or "",
                "name": vlan.get("name") or raw.get("name") or "",
                "region": vlan.get("region") or "",
                "cidr": vlan.get("master_cidr") or "",
            },
            "segments": deepcopy(raw.get("vpcs") or []),
            "connectivity": {
                "links": deepcopy(raw.get("links") or []),
                "routers": deepcopy(raw.get("routers") or []),
            },
        }

    capabilities = raw.get("capabilities") if isinstance(raw.get("capabilities"), list) else []
    provider_overrides = raw.get("provider_overrides") if isinstance(raw.get("provider_overrides"), dict) else {}

    return {
        "target_provider": target_provider,
        "metadata": metadata,
        "topology": topology,
        "capabilities": capabilities,
        "provider_overrides": provider_overrides,
        "legacy_payload": raw,
    }

from rest_framework import serializers

from .i18n import tr
from .domain.network_intent import normalize_network_intent
from .providers import get_provider_adapter



def validate_network_plan(payload: dict, *, request=None, language=None) -> dict:
    """
    Valida el payload del front a traves del adapter del provider.
    Devuelve el payload compilado para el runner actual de Terraform.
    """
    if not isinstance(payload, dict):
        raise ValueError(tr("payload_invalid_object", request=request, language=language))

    intent = normalize_network_intent(payload)
    name = (
        (payload.get("name") or "").strip()
        or str((intent.get("metadata") or {}).get("name") or "").strip()
    )
    if not name:
        raise ValueError(tr("missing_name", request=request, language=language))

    provider = intent["target_provider"]

    try:
        adapter = get_provider_adapter(provider)
        bundle = adapter.compile(payload)
    except serializers.ValidationError as exc:
        detail = exc.detail if hasattr(exc, "detail") else exc
        raise ValueError(str(detail)) from exc
    except NotImplementedError as exc:
        raise ValueError(str(exc)) from exc
    except KeyError as exc:
        raise ValueError(str(exc)) from exc

    compiled = dict(bundle["payload"])
    compiled["name"] = name
    compiled["cloud"] = provider

    # Heredamos region por defecto desde vlan.region si alguna VPC viene vacia.
    vlan_region = ((compiled.get("vlan") or {}).get("region") or "").strip()
    if vlan_region:
        for vpc in compiled.get("vpcs", []):
            if not vpc.get("region"):
                vpc["region"] = vlan_region

    return compiled

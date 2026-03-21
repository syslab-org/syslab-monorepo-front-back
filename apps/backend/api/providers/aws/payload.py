import os
import re


def as_aws_payload(payload: dict) -> dict:
    return payload if isinstance(payload, dict) else {}


def get_network_config(payload: dict) -> dict:
    network = as_aws_payload(payload).get("vlan")
    return network if isinstance(network, dict) else {}


def get_segment_payloads(payload: dict) -> list[dict]:
    segments = as_aws_payload(payload).get("vpcs")
    if not isinstance(segments, list):
        return []
    return [segment for segment in segments if isinstance(segment, dict)]


def get_link_payloads(payload: dict) -> list[dict]:
    links = as_aws_payload(payload).get("links")
    if not isinstance(links, list):
        return []
    return [link for link in links if isinstance(link, dict)]


def get_router_payloads(payload: dict) -> list[dict]:
    routers = as_aws_payload(payload).get("routers")
    if not isinstance(routers, list):
        return []
    return [router for router in routers if isinstance(router, dict)]


def get_network_id(payload: dict) -> str:
    network = get_network_config(payload)
    return str(network.get("id") or "").strip()


def get_region(payload: dict) -> str:
    network = get_network_config(payload)
    raw = str(network.get("region") or "").strip()

    if not raw:
        segments = get_segment_payloads(payload)
        if segments:
            raw = str((segments[0] or {}).get("region") or "").strip()

    raw = (raw or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1").strip().lower()

    # Si llega una AZ (ej: us-east-1a), se normaliza a región (us-east-1).
    if re.match(r"^[a-z]{2}(-[a-z0-9-]+)+-\d+[a-z]$", raw):
        return raw[:-1]
    return raw


def uses_tgw(payload: dict) -> bool:
    has_tgw_router = any(
        str(router.get("type", "")).strip().lower() == "tgw"
        for router in get_router_payloads(payload)
    )
    has_tgw_links = any(
        str(link.get("type", "")).strip().lower() == "tgw-attach"
        for link in get_link_payloads(payload)
    )
    return bool(has_tgw_router or has_tgw_links)

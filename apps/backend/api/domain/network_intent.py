from copy import deepcopy

from api.models import PROVIDER_AWS, PROVIDER_AZURE, PROVIDER_GCP


SUPPORTED_PROVIDERS = [PROVIDER_AWS, PROVIDER_GCP, PROVIDER_AZURE]


def _canonical_provider(raw_value) -> str:
    value = str(raw_value or PROVIDER_AWS).strip().lower()
    return value if value in SUPPORTED_PROVIDERS else PROVIDER_AWS


def _segment_exposure(subnets: list) -> str:
    has_public = any(bool(s.get("map_public_ip_on_launch")) for s in subnets)
    has_private = any(not bool(s.get("map_public_ip_on_launch")) for s in subnets)
    if has_public and has_private:
        return "mixed"
    if has_public:
        return "public"
    if has_private:
        return "private"
    return "internal"


def _internet_access_model(vpc: dict) -> str:
    if bool(vpc.get("internet_gateway")):
        return "direct"
    nat_gateway = vpc.get("nat_gateway") if isinstance(vpc.get("nat_gateway"), dict) else {}
    if bool(nat_gateway.get("enabled")):
        return "egress_only"
    return "isolated"


def _normalize_workload(inst: dict, zone: dict) -> dict:
    aws_overrides = {
        "ami": inst.get("ami") or "",
        "instance_type": inst.get("instance_type") or inst.get("instanceType") or "t2.micro",
        "associate_public_ip": bool(inst.get("associate_public_ip")),
        "ssh_access": inst.get("ssh_access") or "",
    }
    return {
        "id": inst.get("id") or "",
        "name": inst.get("name") or inst.get("id") or "workload",
        "kind": "workload",
        "image": inst.get("ami") or "",
        "size": aws_overrides["instance_type"],
        "private_ip": inst.get("ip_address") or inst.get("ipAddress") or "",
        "zone_id": zone.get("name") or zone.get("id") or "",
        "access": {
            "ssh_key": aws_overrides["ssh_access"],
            "public_ip": bool(aws_overrides["associate_public_ip"]),
        },
        "provider_overrides": {"aws": aws_overrides},
    }


def _normalize_zone(subnet: dict) -> dict:
    workloads = [
        _normalize_workload(inst if isinstance(inst, dict) else {}, subnet)
        for inst in (subnet.get("instances") or [])
        if isinstance(inst, dict)
    ]
    return {
        "id": subnet.get("name") or "",
        "name": subnet.get("name") or "",
        "cidr": subnet.get("cidr_block") or "",
        "kind": subnet.get("subnet_type") or ("public" if subnet.get("map_public_ip_on_launch") else "private"),
        "availability_zone": subnet.get("availability_zone") or "",
        "map_public_ip_on_launch": bool(subnet.get("map_public_ip_on_launch")),
        "route_table": subnet.get("route_table") or "",
        "workloads": workloads,
        "provider_overrides": {
            "aws": {
                "subnet_type": subnet.get("subnet_type") or "",
                "route_table": subnet.get("route_table") or "",
            }
        },
    }


def _normalize_segment(vpc: dict) -> dict:
    subnets = [_normalize_zone(sn if isinstance(sn, dict) else {}) for sn in (vpc.get("subnets") or [])]
    workloads = [workload for subnet in subnets for workload in subnet.get("workloads", [])]
    nat_gateway = vpc.get("nat_gateway") if isinstance(vpc.get("nat_gateway"), dict) else {}
    return {
        "id": vpc.get("id") or "",
        "name": vpc.get("name") or vpc.get("id") or "",
        "region": vpc.get("region") or "",
        "cidr": vpc.get("cidr_block") or "",
        "exposure": _segment_exposure(subnets),
        "internet_access": _internet_access_model(vpc),
        "ingress": {
            "ssh_cidr": vpc.get("allowed_ssh_cidr") or "",
        },
        "zones": subnets,
        "workloads": workloads,
        "provider_overrides": {
            "aws": {
                "resource_kind": "vpc",
                "internet_gateway": bool(vpc.get("internet_gateway")),
                "nat_gateway": {
                    "enabled": bool(nat_gateway.get("enabled")),
                    "public_subnet": nat_gateway.get("public_subnet") or "",
                    "elastic_ip": nat_gateway.get("elastic_ip") or "",
                },
                "route_tables": deepcopy(vpc.get("route_tables") or []),
            }
        },
    }


def _normalize_connectivity(raw: dict) -> dict:
    legacy_links = deepcopy(raw.get("links") or [])
    legacy_routers = deepcopy(raw.get("routers") or [])
    mode = "isolated"
    if any(str(r.get("type") or "").lower() == "tgw" for r in legacy_routers):
        mode = "hub"
    elif legacy_links:
        mode = "direct"

    hubs = []
    for router in legacy_routers:
        if not isinstance(router, dict):
            continue
        router_type = str(router.get("type") or "").lower()
        hubs.append(
            {
                "id": router.get("id") or "",
                "name": router.get("name") or router.get("id") or "routing-hub",
                "kind": "routing_hub",
                "implementation": "tgw" if router_type == "tgw" else router_type or "router",
            }
        )

    links = []
    for link in legacy_links:
        if not isinstance(link, dict):
            continue
        link_type = str(link.get("type") or "").lower()
        if link_type == "tgw-attach":
            links.append(
                {
                    "type": "hub_attachment",
                    "implementation": "tgw",
                    "hub_id": link.get("router_id") or "",
                    "segment_id": link.get("vpc_id") or "",
                    "attachment_zones": deepcopy(link.get("subnet_names") or []),
                    "routes": deepcopy(((link.get("routes") or {}).get("to_router")) or []),
                    "provider_overrides": {"aws": deepcopy(link)},
                }
            )
            continue

        links.append(
            {
                "type": "direct_link",
                "implementation": "peering" if link_type == "peering" else link_type or "link",
                "segment_a_id": link.get("vpc_a_id") or "",
                "segment_b_id": link.get("vpc_b_id") or "",
                "provider_overrides": {"aws": deepcopy(link)},
            }
        )

    return {
        "mode": mode,
        "hubs": hubs,
        "links": links,
    }


def _legacy_payload_to_topology(raw: dict) -> dict:
    vlan = raw.get("vlan") if isinstance(raw.get("vlan"), dict) else {}
    return {
        "network": {
            "id": raw.get("canvas_id") or raw.get("firestore_vpc_id") or raw.get("vpcId") or vlan.get("id") or "",
            "name": vlan.get("name") or raw.get("name") or "",
            "region": vlan.get("region") or "",
            "cidr": vlan.get("master_cidr") or "",
        },
        "segments": [
            _normalize_segment(vpc if isinstance(vpc, dict) else {})
            for vpc in (raw.get("vpcs") or [])
        ],
        "connectivity": _normalize_connectivity(raw),
    }


def normalize_network_intent(payload: dict) -> dict:
    raw = deepcopy(payload if isinstance(payload, dict) else {})
    target_provider = _canonical_provider(raw.get("target_provider") or raw.get("cloud"))
    topology = raw.get("topology") if isinstance(raw.get("topology"), dict) else {}
    if not topology:
        topology = _legacy_payload_to_topology(raw)

    metadata = raw.get("metadata") if isinstance(raw.get("metadata"), dict) else {}
    metadata = {
        **metadata,
        "name": metadata.get("name") or raw.get("name") or topology.get("network", {}).get("name") or "",
        "canvas_id": (
            metadata.get("canvas_id")
            or raw.get("canvas_id")
            or raw.get("firestore_vpc_id")
            or raw.get("vpcId")
            or topology.get("network", {}).get("id")
            or ""
        ),
        "source_format": metadata.get("source_format") or ("neutral_topology" if raw.get("topology") else "legacy_aws_payload"),
        "schema_version": metadata.get("schema_version") or "2026-03-neutral-v1",
    }

    capabilities = raw.get("capabilities") if isinstance(raw.get("capabilities"), list) else []
    provider_overrides = raw.get("provider_overrides") if isinstance(raw.get("provider_overrides"), dict) else {}
    if not provider_overrides.get("aws"):
        provider_overrides["aws"] = {
            "vpcs": deepcopy(raw.get("vpcs") or []),
            "links": deepcopy(raw.get("links") or []),
            "routers": deepcopy(raw.get("routers") or []),
        }

    return {
        "target_provider": target_provider,
        "metadata": metadata,
        "topology": topology,
        "capabilities": capabilities,
        "provider_overrides": provider_overrides,
        "legacy_payload": raw,
    }

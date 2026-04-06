from copy import deepcopy

from api.domain.network_intent import normalize_network_intent
from api.models import PROVIDER_AWS
from api.serializers import MultiPlanSerializer

from ..base import ProviderAdapter


class AwsProviderAdapter(ProviderAdapter):
    provider = PROVIDER_AWS

    def _topology_to_provider_payload(self, intent: dict) -> dict:
        topology = intent.get("topology") if isinstance(intent.get("topology"), dict) else {}
        network = topology.get("network") if isinstance(topology.get("network"), dict) else {}
        segments = topology.get("segments") if isinstance(topology.get("segments"), list) else []
        connectivity = topology.get("connectivity") if isinstance(topology.get("connectivity"), dict) else {}

        vpcs = []
        for segment in segments:
            if not isinstance(segment, dict):
                continue
            aws_segment = ((segment.get("provider_overrides") or {}).get("aws") or {}) if isinstance(segment.get("provider_overrides"), dict) else {}
            zones = segment.get("zones") if isinstance(segment.get("zones"), list) else []

            subnets = []
            for zone in zones:
                if not isinstance(zone, dict):
                    continue
                aws_zone = ((zone.get("provider_overrides") or {}).get("aws") or {}) if isinstance(zone.get("provider_overrides"), dict) else {}
                workloads = zone.get("workloads") if isinstance(zone.get("workloads"), list) else []
                instances = []
                for workload in workloads:
                    if not isinstance(workload, dict):
                        continue
                    aws_workload = ((workload.get("provider_overrides") or {}).get("aws") or {}) if isinstance(workload.get("provider_overrides"), dict) else {}
                    instances.append(
                        {
                            "id": workload.get("id") or "",
                            "name": workload.get("name") or workload.get("id") or "instance",
                            "ami": workload.get("image") or aws_workload.get("ami") or "",
                            "instance_type": workload.get("size") or aws_workload.get("instance_type") or "t2.micro",
                            "ip_address": workload.get("private_ip") or "",
                            "ssh_access": ((workload.get("access") or {}).get("ssh_key") if isinstance(workload.get("access"), dict) else "") or aws_workload.get("ssh_access") or "",
                            "associate_public_ip": bool(
                                ((workload.get("access") or {}).get("public_ip") if isinstance(workload.get("access"), dict) else False)
                                if "access" in workload
                                else aws_workload.get("associate_public_ip")
                            ),
                        }
                    )

                subnet_kind = zone.get("kind") or aws_zone.get("subnet_type") or "private"
                subnets.append(
                    {
                        "name": zone.get("name") or zone.get("id") or "subnet",
                        "cidr_block": zone.get("cidr") or "",
                        "availability_zone": zone.get("availability_zone") or "",
                        "subnet_type": subnet_kind,
                        "map_public_ip_on_launch": bool(
                            zone.get("map_public_ip_on_launch")
                            if zone.get("map_public_ip_on_launch") is not None
                            else subnet_kind == "public"
                        ),
                        "route_table": zone.get("route_table") or aws_zone.get("route_table") or ("public" if subnet_kind == "public" else "private"),
                        "instances": instances,
                    }
                )

            route_tables = deepcopy(aws_segment.get("route_tables") or [])
            if not route_tables:
                has_public = any(str(sn.get("subnet_type") or "").lower() == "public" for sn in subnets)
                has_private = any(str(sn.get("subnet_type") or "").lower() == "private" for sn in subnets)
                if has_public:
                    route_tables.append(
                        {
                            "name": "public",
                            "routes": (
                                [{"name": "igw-default", "dest_cidr": "0.0.0.0/0", "target": "igw"}]
                                if bool(aws_segment.get("internet_gateway"))
                                else []
                            ),
                        }
                    )
                if has_private:
                    route_tables.append({"name": "private", "routes": []})

            vpcs.append(
                {
                    "id": segment.get("id") or "",
                    "name": segment.get("name") or segment.get("id") or "network-segment",
                    "region": segment.get("region") or network.get("region") or "",
                    "cidr_block": segment.get("cidr") or "",
                    "internet_gateway": bool(aws_segment.get("internet_gateway")),
                    "nat_gateway": deepcopy(aws_segment.get("nat_gateway") or {"enabled": False, "public_subnet": "", "elastic_ip": ""}),
                    "route_tables": route_tables,
                    "subnets": subnets,
                    "allowed_ssh_cidr": ((segment.get("ingress") or {}).get("ssh_cidr") if isinstance(segment.get("ingress"), dict) else "") or "",
                }
            )

        hubs = connectivity.get("hubs") if isinstance(connectivity.get("hubs"), list) else []
        links = connectivity.get("links") if isinstance(connectivity.get("links"), list) else []
        routers = [
            {
                "id": hub.get("id") or "",
                "name": hub.get("name") or hub.get("id") or "routing-hub",
                "type": "tgw",
            }
            for hub in hubs
            if isinstance(hub, dict) and str(hub.get("implementation") or "").lower() == "tgw"
        ]

        aws_links = []
        for link in links:
            if not isinstance(link, dict):
                continue
            aws_link = ((link.get("provider_overrides") or {}).get("aws") or {}) if isinstance(link.get("provider_overrides"), dict) else {}
            link_type = str(link.get("type") or "").lower()
            if link_type == "hub_attachment":
                aws_links.append(
                    {
                        "type": "tgw-attach",
                        "router_id": link.get("hub_id") or aws_link.get("router_id") or "",
                        "vpc_id": link.get("segment_id") or aws_link.get("vpc_id") or "",
                        "subnet_names": deepcopy(link.get("attachment_zones") or aws_link.get("subnet_names") or []),
                        "routes": {"to_router": deepcopy(link.get("routes") or ((aws_link.get("routes") or {}).get("to_router")) or [])},
                    }
                )
                continue

            aws_links.append(
                {
                    "type": "peering",
                    "vpc_a_id": link.get("segment_a_id") or aws_link.get("vpc_a_id") or "",
                    "vpc_b_id": link.get("segment_b_id") or aws_link.get("vpc_b_id") or "",
                    "via_router_id": aws_link.get("via_router_id") or "",
                }
            )

        return {
            "name": intent.get("metadata", {}).get("name") or network.get("name") or "",
            "cloud": self.provider,
            "vlan": {
                "id": network.get("id") or "",
                "name": network.get("name") or "",
                "region": network.get("region") or "",
                "master_cidr": network.get("cidr") or "",
            },
            "vpcs": vpcs,
            "links": aws_links,
            "routers": routers,
        }

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
        if not raw.get("vpcs") and normalized.get("topology"):
            raw = self._topology_to_provider_payload(normalized)
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
        metadata = validated["intent"].get("metadata") or {}
        canvas_id = (
            metadata.get("canvas_id")
            or legacy.get("canvas_id")
            or legacy.get("firestore_vpc_id")
            or legacy.get("vpcId")
        )
        if legacy.get("name") or metadata.get("name"):
            payload["name"] = legacy.get("name") or metadata.get("name")
        if canvas_id:
            payload["canvas_id"] = canvas_id
        vlan_raw = legacy.get("vlan") if isinstance(legacy.get("vlan"), dict) else {}
        if vlan_raw.get("id") or canvas_id:
            payload.setdefault("vlan", {})
            payload["vlan"]["id"] = vlan_raw.get("id") or canvas_id
        return {
            "provider": self.provider,
            "intent": validated["intent"],
            "payload": payload,
        }

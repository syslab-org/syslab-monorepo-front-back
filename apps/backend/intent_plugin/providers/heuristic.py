from __future__ import annotations

import re

from intent_plugin.conf import max_workloads
from intent_plugin.contracts import IntentGenerationRequest, IntentGenerationResult


class HeuristicIntentProvider:
    slug = "heuristic"

    def manifest(self) -> dict:
        return {
            "slug": self.slug,
            "label": "Heuristic Intent Provider",
            "kind": "deterministic",
            "features": {
                "single_vpc": True,
                "public_private_subnets": True,
                "nat_gateway": True,
                "internet_gateway": True,
                "basic_workloads": True,
                "multi_vpc": False,
                "terraform_generation": False,
            },
        }

    def generate(self, request: IntentGenerationRequest) -> IntentGenerationResult:
        prompt = request.prompt.strip()
        prompt_lower = prompt.lower()
        workload_count = self._workload_count(prompt_lower, request.max_workloads)
        include_public = any(token in prompt_lower for token in ("public", "publica", "bastion", "internet"))
        include_private = any(token in prompt_lower for token in ("private", "privada", "nat", "backend", "interna"))
        if not include_public and not include_private:
            include_public = True

        nat_enabled = "nat" in prompt_lower
        internet_gateway = include_public or "internet gateway" in prompt_lower or "igw" in prompt_lower
        draft_name = self._draft_name(prompt)

        zones = []
        workloads = []
        assumptions = []
        warnings = []

        if include_public:
            public_workloads = max(1, workload_count // 2) if include_private else workload_count
            zone = self._zone(
                zone_id="public-a",
                cidr="10.0.1.0/24",
                kind="public",
                region=request.region,
                workloads=self._workloads(
                    count=public_workloads,
                    prefix="web",
                    zone_id="public-a",
                    cidr_prefix="10.0.1.",
                    public_ip=True,
                ),
            )
            zones.append(zone)
            workloads.extend(zone["workloads"])

        if include_private:
            private_workloads = workload_count - len(workloads)
            if private_workloads <= 0:
                private_workloads = 1
                warnings.append("The prompt implies a private tier, so one private workload was added.")
            zone = self._zone(
                zone_id="private-a",
                cidr="10.0.2.0/24",
                kind="private",
                region=request.region,
                workloads=self._workloads(
                    count=private_workloads,
                    prefix="app",
                    zone_id="private-a",
                    cidr_prefix="10.0.2.",
                    public_ip=False,
                ),
            )
            zones.append(zone)
            workloads.extend(zone["workloads"])

        if "peering" in prompt_lower or "transit gateway" in prompt_lower or "tgw" in prompt_lower:
            warnings.append("Multi-VPC and hub connectivity are not supported yet by the heuristic plugin.")

        if nat_enabled and not include_private:
            warnings.append("NAT was requested without a private tier. The NAT flag is preserved, but it may not add value.")

        if "cidr" not in prompt_lower:
            assumptions.append("Default network CIDR 10.0.0.0/16 was assumed.")
        assumptions.append(f"Default region {request.region} was used." if request.region else "Default region was used.")
        assumptions.append("Default workload size t2.micro was used.")

        intent = {
            "target_provider": request.target_provider,
            "metadata": {
                "name": draft_name,
                "canvas_id": request.canvas_id or "",
                "source_format": "prompt_to_topology",
                "schema_version": "2026-03-neutral-v1",
            },
            "topology": {
                "network": {
                    "id": request.canvas_id or "",
                    "name": draft_name,
                    "region": request.region,
                    "cidr": "10.0.0.0/16",
                },
                "segments": [
                    {
                        "id": "vpc-a",
                        "name": "VPC-A",
                        "region": request.region,
                        "cidr": "10.0.0.0/16",
                        "exposure": "mixed" if include_public and include_private else "public" if include_public else "private",
                        "internet_access": "egress_only" if nat_enabled and include_private and not internet_gateway else "direct" if internet_gateway else "isolated",
                        "ingress": {
                            "ssh_cidr": "0.0.0.0/0" if include_public else "",
                        },
                        "zones": zones,
                        "workloads": workloads,
                        "provider_overrides": {
                            "aws": {
                                "resource_kind": "vpc",
                                "internet_gateway": internet_gateway,
                                "nat_gateway": {
                                    "enabled": nat_enabled,
                                    "public_subnet": "public-a" if nat_enabled and include_public else "",
                                    "elastic_ip": "",
                                },
                                "route_tables": self._route_tables(include_public, include_private, internet_gateway),
                            }
                        },
                    }
                ],
                "connectivity": {
                    "mode": "isolated",
                    "hubs": [],
                    "links": [],
                },
            },
        }

        return IntentGenerationResult(
            draft_name=draft_name,
            intent=intent,
            assumptions=assumptions,
            warnings=warnings,
            provider=self.slug,
        )

    def _draft_name(self, prompt: str) -> str:
        words = [chunk for chunk in re.split(r"\s+", prompt.strip()) if chunk]
        if not words:
            return "Generated Lab"
        return " ".join(words[:6]).strip().capitalize()

    def _workload_count(self, prompt_lower: str, request_max: int) -> int:
        matches = re.findall(
            r"(\d+)\s+(?:instancias|instancia|maquinas|maquina|servers|server|workloads|workload|vms|vm)",
            prompt_lower,
        )
        if matches:
            requested = int(matches[0])
            return max(1, min(requested, min(request_max, max_workloads())))
        return min(2, min(request_max, max_workloads()))

    def _workloads(
        self,
        *,
        count: int,
        prefix: str,
        zone_id: str,
        cidr_prefix: str,
        public_ip: bool,
    ) -> list[dict]:
        out = []
        for index in range(count):
            number = index + 1
            out.append(
                {
                    "id": f"{prefix}-{number}",
                    "name": f"{prefix}-{number}",
                    "kind": "workload",
                    "image": "ami-amazon-linux-latest",
                    "size": "t2.micro",
                    "private_ip": f"{cidr_prefix}{10 + index}",
                    "zone_id": zone_id,
                    "access": {
                        "ssh_key": "",
                        "public_ip": public_ip,
                    },
                    "provider_overrides": {
                        "aws": {
                            "ami": "ami-amazon-linux-latest",
                            "instance_type": "t2.micro",
                            "associate_public_ip": public_ip,
                            "ssh_access": "",
                        }
                    },
                }
            )
        return out

    def _zone(
        self,
        *,
        zone_id: str,
        cidr: str,
        kind: str,
        region: str,
        workloads: list[dict],
    ) -> dict:
        route_table = "public" if kind == "public" else "private"
        return {
            "id": zone_id,
            "name": zone_id,
            "cidr": cidr,
            "kind": kind,
            "availability_zone": f"{region}a",
            "map_public_ip_on_launch": kind == "public",
            "route_table": route_table,
            "workloads": workloads,
            "provider_overrides": {
                "aws": {
                    "subnet_type": kind,
                    "route_table": route_table,
                }
            },
        }

    def _route_tables(self, include_public: bool, include_private: bool, internet_gateway: bool) -> list[dict]:
        route_tables = []
        if include_public:
            route_tables.append(
                {
                    "name": "public",
                    "routes": [
                        {
                            "name": "igw-default",
                            "dest_cidr": "0.0.0.0/0",
                            "target": "igw",
                        }
                    ]
                    if internet_gateway
                    else [],
                }
            )
        if include_private:
            route_tables.append({"name": "private", "routes": []})
        return route_tables


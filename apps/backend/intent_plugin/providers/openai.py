from __future__ import annotations

import json
import re
from typing import Any

from intent_plugin.conf import (
    default_region,
    max_workloads,
    openai_api_key,
    openai_model,
    openai_reasoning_effort,
    openai_text_verbosity,
    openai_timeout_seconds,
)
from intent_plugin.contracts import IntentGenerationRequest, IntentGenerationResult
from intent_plugin.exceptions import (
    IntentProviderConfigurationError,
    IntentProviderExecutionError,
)


class OpenAIIntentProvider:
    slug = "openai"

    def __init__(self, client=None):
        self._client = client

    def manifest(self) -> dict:
        return {
            "slug": self.slug,
            "label": "OpenAI Intent Assistant",
            "kind": "llm",
            "model": openai_model(),
            "features": {
                "single_vpc": True,
                "public_private_subnets": True,
                "nat_gateway": True,
                "internet_gateway": True,
                "basic_workloads": True,
                "multi_vpc": True,
                "terraform_generation": False,
            },
        }

    def generate(self, request: IntentGenerationRequest) -> IntentGenerationResult:
        payload = self._generate_payload(request)
        topology = self._finalize_topology(payload.get("topology") or {}, request)
        draft_name = str(payload.get("draft_name") or self._draft_name(request.prompt)).strip() or "Generated Lab"

        intent = {
            "target_provider": request.target_provider,
            "metadata": {
                "name": draft_name,
                "canvas_id": request.canvas_id or "",
                "source_format": "prompt_to_topology",
                "schema_version": "2026-03-neutral-v1",
                "generator": {
                    "provider": self.slug,
                    "model": openai_model(),
                },
            },
            "topology": topology,
            "capabilities": ["prompt_generation", "structured_output"],
            "provider_overrides": payload.get("provider_overrides") or {},
        }

        assumptions = [str(item).strip() for item in (payload.get("assumptions") or []) if str(item).strip()]
        warnings = [str(item).strip() for item in (payload.get("warnings") or []) if str(item).strip()]
        if topology.get("connectivity", {}).get("mode") != "isolated":
            warnings.append("Review inter-VPC connectivity carefully before applying the generated topology.")

        return IntentGenerationResult(
            draft_name=draft_name,
            intent=intent,
            assumptions=assumptions,
            warnings=warnings,
            provider=self.slug,
        )

    def _generate_payload(self, request: IntentGenerationRequest) -> dict[str, Any]:
        client = self._get_client()

        try:
            response = client.responses.create(
                model=openai_model(),
                store=False,
                reasoning={"effort": openai_reasoning_effort()},
                text={
                    "verbosity": openai_text_verbosity(),
                    "format": self._response_format(),
                },
                input=[
                    {"role": "developer", "content": self._developer_prompt(request)},
                    {"role": "user", "content": request.prompt.strip()},
                ],
            )
        except Exception as exc:
            raise IntentProviderExecutionError(f"OpenAI intent generation failed: {exc}") from exc

        output_text = str(getattr(response, "output_text", "") or "").strip()
        if not output_text:
            raise IntentProviderExecutionError("OpenAI intent generation returned an empty structured response.")

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise IntentProviderExecutionError("OpenAI intent generation returned invalid JSON.") from exc

        if not isinstance(parsed, dict):
            raise IntentProviderExecutionError("OpenAI intent generation returned an invalid payload shape.")
        return parsed

    def _get_client(self):
        if self._client is not None:
            return self._client

        api_key = openai_api_key()
        if not api_key:
            raise IntentProviderConfigurationError(
                "INTENT_PLUGIN_OPENAI_API_KEY is required when using OpenAIIntentProvider."
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise IntentProviderConfigurationError(
                "The 'openai' package is required for OpenAIIntentProvider. Install backend requirements first."
            ) from exc

        self._client = OpenAI(api_key=api_key, timeout=openai_timeout_seconds())
        return self._client

    def _developer_prompt(self, request: IntentGenerationRequest) -> str:
        return (
            "You convert infrastructure intent into a neutral JSON topology for an educational lab canvas.\n"
            "Return only data that fits the provided JSON schema.\n"
            f"Target provider: {request.target_provider}.\n"
            f"Default region: {request.region or default_region()}.\n"
            f"Maximum workloads allowed across the whole topology: {min(request.max_workloads, max_workloads())}.\n"
            "Use concise kebab-case ids.\n"
            "If the prompt does not specify CIDRs, use 10.0.0.0/16 for the network and /24 subnets.\n"
            "If the prompt requests NAT, ensure there is at least one public subnet and one private subnet.\n"
            "If the prompt is ambiguous, make minimal safe assumptions and record them in assumptions.\n"
            "If the prompt asks for unsupported or high-complexity patterns, keep the topology valid and record warnings.\n"
            "Populate AWS-oriented provider_overrides for segments, zones, and workloads when relevant.\n"
            "Do not exceed the workload limit."
        )

    def _draft_name(self, prompt: str) -> str:
        words = [chunk for chunk in re.split(r"\s+", prompt.strip()) if chunk]
        if not words:
            return "Generated Lab"
        return " ".join(words[:6]).strip().capitalize()

    def _response_format(self) -> dict[str, Any]:
        return {
            "type": "json_schema",
            "name": "intent_topology",
            "strict": True,
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "draft_name": {"type": "string"},
                    "assumptions": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "warnings": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "provider_overrides": {
                        "type": "object",
                        "additionalProperties": True,
                    },
                    "topology": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "network": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "region": {"type": "string"},
                                    "cidr": {"type": "string"},
                                },
                                "required": ["id", "name", "region", "cidr"],
                            },
                            "segments": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "id": {"type": "string"},
                                        "name": {"type": "string"},
                                        "region": {"type": "string"},
                                        "cidr": {"type": "string"},
                                        "exposure": {"type": "string"},
                                        "internet_access": {"type": "string"},
                                        "ingress": {
                                            "type": "object",
                                            "additionalProperties": False,
                                            "properties": {
                                                "ssh_cidr": {"type": "string"},
                                            },
                                            "required": ["ssh_cidr"],
                                        },
                                        "zones": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "additionalProperties": False,
                                                "properties": {
                                                    "id": {"type": "string"},
                                                    "name": {"type": "string"},
                                                    "cidr": {"type": "string"},
                                                    "kind": {"type": "string"},
                                                    "availability_zone": {"type": "string"},
                                                    "map_public_ip_on_launch": {"type": "boolean"},
                                                    "route_table": {"type": "string"},
                                                    "workloads": {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "additionalProperties": False,
                                                            "properties": {
                                                                "id": {"type": "string"},
                                                                "name": {"type": "string"},
                                                                "kind": {"type": "string"},
                                                                "image": {"type": "string"},
                                                                "size": {"type": "string"},
                                                                "private_ip": {"type": "string"},
                                                                "zone_id": {"type": "string"},
                                                                "access": {
                                                                    "type": "object",
                                                                    "additionalProperties": False,
                                                                    "properties": {
                                                                        "ssh_key": {"type": "string"},
                                                                        "public_ip": {"type": "boolean"},
                                                                    },
                                                                    "required": ["ssh_key", "public_ip"],
                                                                },
                                                                "provider_overrides": {
                                                                    "type": "object",
                                                                    "additionalProperties": True,
                                                                },
                                                            },
                                                            "required": [
                                                                "id",
                                                                "name",
                                                                "kind",
                                                                "image",
                                                                "size",
                                                                "private_ip",
                                                                "zone_id",
                                                                "access",
                                                                "provider_overrides",
                                                            ],
                                                        },
                                                    },
                                                    "provider_overrides": {
                                                        "type": "object",
                                                        "additionalProperties": True,
                                                    },
                                                },
                                                "required": [
                                                    "id",
                                                    "name",
                                                    "cidr",
                                                    "kind",
                                                    "availability_zone",
                                                    "map_public_ip_on_launch",
                                                    "route_table",
                                                    "workloads",
                                                    "provider_overrides",
                                                ],
                                            },
                                        },
                                        "workloads": {
                                            "type": "array",
                                            "items": {"type": "object", "additionalProperties": True},
                                        },
                                        "provider_overrides": {
                                            "type": "object",
                                            "additionalProperties": True,
                                        },
                                    },
                                    "required": [
                                        "id",
                                        "name",
                                        "region",
                                        "cidr",
                                        "exposure",
                                        "internet_access",
                                        "ingress",
                                        "zones",
                                        "workloads",
                                        "provider_overrides",
                                    ],
                                },
                            },
                            "connectivity": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "mode": {"type": "string"},
                                    "hubs": {
                                        "type": "array",
                                        "items": {"type": "object", "additionalProperties": True},
                                    },
                                    "links": {
                                        "type": "array",
                                        "items": {"type": "object", "additionalProperties": True},
                                    },
                                },
                                "required": ["mode", "hubs", "links"],
                            },
                        },
                        "required": ["network", "segments", "connectivity"],
                    },
                },
                "required": ["draft_name", "assumptions", "warnings", "provider_overrides", "topology"],
            },
        }

    def _finalize_topology(self, topology: dict[str, Any], request: IntentGenerationRequest) -> dict[str, Any]:
        network = topology.get("network") if isinstance(topology.get("network"), dict) else {}
        segments = topology.get("segments") if isinstance(topology.get("segments"), list) else []
        connectivity = topology.get("connectivity") if isinstance(topology.get("connectivity"), dict) else {}

        finalized_segments = [self._finalize_segment(segment, request, index) for index, segment in enumerate(segments)]
        finalized_segments = self._enforce_workload_limit(finalized_segments, min(request.max_workloads, max_workloads()))
        return {
            "network": {
                "id": str(network.get("id") or request.canvas_id or "").strip(),
                "name": str(network.get("name") or self._draft_name(request.prompt)).strip(),
                "region": str(network.get("region") or request.region or default_region()).strip(),
                "cidr": str(network.get("cidr") or "10.0.0.0/16").strip(),
            },
            "segments": finalized_segments,
            "connectivity": {
                "mode": str(connectivity.get("mode") or ("isolated" if len(finalized_segments) <= 1 else "direct")).strip(),
                "hubs": connectivity.get("hubs") if isinstance(connectivity.get("hubs"), list) else [],
                "links": connectivity.get("links") if isinstance(connectivity.get("links"), list) else [],
            },
        }

    def _finalize_segment(self, segment: dict[str, Any], request: IntentGenerationRequest, index: int) -> dict[str, Any]:
        zone_items = segment.get("zones") if isinstance(segment.get("zones"), list) else []
        finalized_zones = [self._finalize_zone(zone, request, zone_index) for zone_index, zone in enumerate(zone_items)]

        segment_overrides = segment.get("provider_overrides") if isinstance(segment.get("provider_overrides"), dict) else {}
        aws_overrides = segment_overrides.get("aws") if isinstance(segment_overrides.get("aws"), dict) else {}
        nat_gateway = aws_overrides.get("nat_gateway") if isinstance(aws_overrides.get("nat_gateway"), dict) else {}

        workloads = [workload for zone in finalized_zones for workload in zone.get("workloads", [])]
        return {
            "id": str(segment.get("id") or f"vpc-{index + 1}").strip(),
            "name": str(segment.get("name") or f"VPC-{index + 1}").strip(),
            "region": str(segment.get("region") or request.region or default_region()).strip(),
            "cidr": str(segment.get("cidr") or "10.0.0.0/16").strip(),
            "exposure": str(segment.get("exposure") or self._guess_exposure(finalized_zones)).strip(),
            "internet_access": str(segment.get("internet_access") or self._guess_internet_access(aws_overrides)).strip(),
            "ingress": {
                "ssh_cidr": str(((segment.get("ingress") or {}).get("ssh_cidr")) or "").strip(),
            },
            "zones": finalized_zones,
            "workloads": workloads,
            "provider_overrides": {
                "aws": {
                    "resource_kind": "vpc",
                    "internet_gateway": bool(aws_overrides.get("internet_gateway")),
                    "nat_gateway": {
                        "enabled": bool(nat_gateway.get("enabled")),
                        "public_subnet": str(nat_gateway.get("public_subnet") or "").strip(),
                        "elastic_ip": str(nat_gateway.get("elastic_ip") or "").strip(),
                    },
                    "route_tables": aws_overrides.get("route_tables") if isinstance(aws_overrides.get("route_tables"), list) else [],
                }
            },
        }

    def _finalize_zone(self, zone: dict[str, Any], request: IntentGenerationRequest, index: int) -> dict[str, Any]:
        zone_overrides = zone.get("provider_overrides") if isinstance(zone.get("provider_overrides"), dict) else {}
        aws_overrides = zone_overrides.get("aws") if isinstance(zone_overrides.get("aws"), dict) else {}
        kind = str(zone.get("kind") or aws_overrides.get("subnet_type") or "private").strip().lower()
        workloads = zone.get("workloads") if isinstance(zone.get("workloads"), list) else []

        finalized_workloads = [
            self._finalize_workload(workload, zone, workload_index)
            for workload_index, workload in enumerate(workloads[: max_workloads()])
        ]
        route_table = str(zone.get("route_table") or aws_overrides.get("route_table") or ("public" if kind == "public" else "private")).strip()
        zone_id = str(zone.get("id") or f"{kind}-{index + 1}").strip()
        return {
            "id": zone_id,
            "name": str(zone.get("name") or zone_id).strip(),
            "cidr": str(zone.get("cidr") or f"10.0.{index + 1}.0/24").strip(),
            "kind": kind,
            "availability_zone": str(zone.get("availability_zone") or f"{request.region or default_region()}a").strip(),
            "map_public_ip_on_launch": bool(zone.get("map_public_ip_on_launch") if "map_public_ip_on_launch" in zone else kind == "public"),
            "route_table": route_table,
            "workloads": finalized_workloads,
            "provider_overrides": {
                "aws": {
                    "subnet_type": kind,
                    "route_table": route_table,
                }
            },
        }

    def _finalize_workload(self, workload: dict[str, Any], zone: dict[str, Any], index: int) -> dict[str, Any]:
        workload_overrides = workload.get("provider_overrides") if isinstance(workload.get("provider_overrides"), dict) else {}
        aws_overrides = workload_overrides.get("aws") if isinstance(workload_overrides.get("aws"), dict) else {}
        access = workload.get("access") if isinstance(workload.get("access"), dict) else {}
        zone_id = str(zone.get("id") or zone.get("name") or "").strip()
        name = str(workload.get("name") or workload.get("id") or f"workload-{index + 1}").strip()
        size = str(workload.get("size") or aws_overrides.get("instance_type") or "t2.micro").strip()
        image = str(workload.get("image") or aws_overrides.get("ami") or "ami-amazon-linux-latest").strip()
        public_ip = bool(access.get("public_ip") if "public_ip" in access else aws_overrides.get("associate_public_ip"))
        return {
            "id": str(workload.get("id") or name).strip(),
            "name": name,
            "kind": str(workload.get("kind") or "workload").strip(),
            "image": image,
            "size": size,
            "private_ip": str(workload.get("private_ip") or "").strip(),
            "zone_id": zone_id,
            "access": {
                "ssh_key": str(access.get("ssh_key") or aws_overrides.get("ssh_access") or "").strip(),
                "public_ip": public_ip,
            },
            "provider_overrides": {
                "aws": {
                    "ami": image,
                    "instance_type": size,
                    "associate_public_ip": public_ip,
                    "ssh_access": str(access.get("ssh_key") or aws_overrides.get("ssh_access") or "").strip(),
                }
            },
        }

    def _guess_exposure(self, zones: list[dict[str, Any]]) -> str:
        kinds = {str(zone.get("kind") or "").lower() for zone in zones}
        if "public" in kinds and "private" in kinds:
            return "mixed"
        if "public" in kinds:
            return "public"
        if "private" in kinds:
            return "private"
        return "internal"

    def _guess_internet_access(self, aws_overrides: dict[str, Any]) -> str:
        if bool(aws_overrides.get("internet_gateway")):
            return "direct"
        nat_gateway = aws_overrides.get("nat_gateway") if isinstance(aws_overrides.get("nat_gateway"), dict) else {}
        if bool(nat_gateway.get("enabled")):
            return "egress_only"
        return "isolated"

    def _enforce_workload_limit(self, segments: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
        remaining = max(1, limit)
        finalized = []
        for segment in segments:
            next_segment = dict(segment)
            next_zones = []
            next_workloads = []
            for zone in segment.get("zones", []):
                next_zone = dict(zone)
                zone_workloads = list(zone.get("workloads", []))[:remaining]
                next_zone["workloads"] = zone_workloads
                next_zones.append(next_zone)
                next_workloads.extend(zone_workloads)
                remaining -= len(zone_workloads)
                if remaining <= 0:
                    remaining = 0
            next_segment["zones"] = next_zones
            next_segment["workloads"] = next_workloads
            finalized.append(next_segment)
        return finalized

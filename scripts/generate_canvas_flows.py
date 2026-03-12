#!/usr/bin/env python3
"""Generate React Flow canvas JSONs from network scenario payloads.

This script converts files from:
  apps/frontend/examples/network-scenarios/*.json
into canvas flow files (nodes/edges/viewport) compatible with the frontend
restore format.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Dict, List, Optional, Set, Tuple

TYPE_VPC_NODE = "vpc"
TYPE_SUBNETWORK_NODE = "subnetwork"
TYPE_ROUTER_NODE = "router"
TYPE_SERVER_NODE = "server"

VPC_DEFAULT_W = 640
VPC_DEFAULT_H = 560
SUBNET_DEFAULT_W = 400
SUBNET_DEFAULT_H = 320
INSTANCE_DEFAULT_W = 212
INSTANCE_DEFAULT_H = 168
ROUTER_DEFAULT_W = 188
ROUTER_DEFAULT_H = 228

VPC_INSET_LEFT = 24
VPC_INSET_TOP = 182
SUBNET_INSET_LEFT = 16
SUBNET_INSET_TOP = 126

SUBNET_VERTICAL_GAP = 24
INSTANCE_HORIZONTAL_GAP = 220


@dataclass
class RouterDef:
    router_id: str
    name: str
    mode: str  # peering | tgw
    connected_vpcs: Set[str]
    route_rows: List[dict]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate canvas flow files from network scenarios.",
    )
    parser.add_argument(
        "--source-dir",
        default="apps/frontend/examples/network-scenarios",
        help="Directory containing source scenario json files.",
    )
    parser.add_argument(
        "--output-dir",
        default="apps/frontend/examples/network-scenarios/generated-canvas",
        help="Directory where generated canvas json files will be written.",
    )
    parser.add_argument(
        "--pattern",
        default="[0-9][0-9]-*.json",
        help="Glob pattern for scenario files.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing generated files.",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip())
    return s.strip("-") or "item"


def parse_cidr(cidr: Optional[str]) -> Tuple[str, int]:
    if not cidr or "/" not in cidr:
        return (str(cidr or "10.0.0.0"), 16)
    base, prefix = cidr.split("/", 1)
    try:
        pref = int(prefix)
    except ValueError:
        pref = 16
    return (base.strip(), pref)


def detect_instance_type(name: str) -> str:
    # Current canvas validations support computer/printer/server.
    # We map everything to server for compatibility.
    _ = name
    return TYPE_SERVER_NODE


def normalize_router_mode(raw: Optional[str]) -> str:
    v = str(raw or "").strip().lower()
    if v in {"tgw", "transit", "transit_gateway", "transit-gateway"}:
        return "tgw"
    return "peering"


def ensure_router(
    routers: Dict[str, RouterDef],
    router_id: str,
    name: Optional[str] = None,
    mode: Optional[str] = None,
) -> RouterDef:
    rid = router_id or "router-auto"
    if rid not in routers:
        routers[rid] = RouterDef(
            router_id=rid,
            name=name or rid,
            mode=normalize_router_mode(mode),
            connected_vpcs=set(),
            route_rows=[],
        )
    r = routers[rid]
    if name and (not r.name or r.name == r.router_id):
        r.name = name
    if mode:
        r.mode = normalize_router_mode(mode)
    return r


def dedupe_routes(rows: List[dict]) -> List[dict]:
    seen = set()
    out = []
    for row in rows:
        key = (
            row.get("sourceVpcId"),
            row.get("destVpcId"),
            row.get("destCidr"),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def build_router_defs(scenario: dict, vpc_cidr_by_id: Dict[str, str]) -> Dict[str, RouterDef]:
    routers: Dict[str, RouterDef] = {}

    for r in scenario.get("routers", []):
        router_type = str(r.get("type", "")).strip().lower()
        mode = "tgw" if router_type == "tgw" else normalize_router_mode(r.get("mode"))
        ensure_router(
            routers,
            router_id=str(r.get("id") or "router-auto"),
            name=r.get("name"),
            mode=mode,
        )

    for idx, link in enumerate(scenario.get("links", [])):
        ltype = str(link.get("type", "")).strip().lower()

        if ltype == "peering":
            router_id = str(link.get("via_router_id") or f"router-peering-{idx + 1}")
            r = ensure_router(routers, router_id=router_id, mode="peering")

            a = str(link.get("vpc_a_id") or "")
            b = str(link.get("vpc_b_id") or "")
            if not a or not b:
                continue

            r.connected_vpcs.add(a)
            r.connected_vpcs.add(b)

            cidr_a = vpc_cidr_by_id.get(a, "")
            cidr_b = vpc_cidr_by_id.get(b, "")

            if cidr_b:
                r.route_rows.append(
                    {
                        "sourceVpcId": a,
                        "destVpcId": b,
                        "destCidr": cidr_b,
                    }
                )
            if cidr_a:
                r.route_rows.append(
                    {
                        "sourceVpcId": b,
                        "destVpcId": a,
                        "destCidr": cidr_a,
                    }
                )

        elif ltype == "tgw-attach":
            router_id = str(link.get("router_id") or f"router-tgw-{idx + 1}")
            r = ensure_router(routers, router_id=router_id, mode="tgw")

            vpc_id = str(link.get("vpc_id") or "")
            if not vpc_id:
                continue
            r.connected_vpcs.add(vpc_id)

            to_router = (
                (link.get("routes") or {}).get("to_router")
                if isinstance(link.get("routes"), dict)
                else []
            )
            if not isinstance(to_router, list):
                to_router = []

            for route in to_router:
                dest_cidr = str(route.get("dest_cidr") or route.get("destCidr") or "").strip()
                if not dest_cidr:
                    continue
                dest_vpc_id = None
                for candidate_vpc_id, candidate_cidr in vpc_cidr_by_id.items():
                    if candidate_cidr == dest_cidr:
                        dest_vpc_id = candidate_vpc_id
                        break

                row = {
                    "sourceVpcId": vpc_id,
                    "destCidr": dest_cidr,
                }
                if dest_vpc_id:
                    row["destVpcId"] = dest_vpc_id
                r.route_rows.append(row)

    for r in routers.values():
        r.route_rows = dedupe_routes(r.route_rows)

    return routers


def make_edge_id(source: str, target: str, index: int) -> str:
    return f"e-{index}-{slugify(source)}-{slugify(target)}"


def build_flow(scenario: dict, source_name: str) -> dict:
    nodes: List[dict] = []
    edges: List[dict] = []
    edge_count = 0

    vpcs = scenario.get("vpcs", [])

    # Build a CIDR index for router route resolution.
    vpc_cidr_by_id: Dict[str, str] = {}
    for vpc in vpcs:
        vpc_id = str(vpc.get("id") or slugify(vpc.get("name", "vpc")))
        vpc_cidr_by_id[vpc_id] = str(vpc.get("cidr_block") or "")

    router_defs = build_router_defs(scenario, vpc_cidr_by_id)

    # VPC layouts and lookup for router placement.
    vpc_layout: Dict[str, dict] = {}

    for idx, vpc in enumerate(vpcs):
        vpc_id = str(vpc.get("id") or slugify(vpc.get("name", f"vpc-{idx + 1}")))
        vpc_name = str(vpc.get("name") or vpc_id)
        vpc_region = str(vpc.get("region") or (scenario.get("vlan") or {}).get("region") or "us-east-1")

        cidr_base, cidr_prefix = parse_cidr(vpc.get("cidr_block"))

        subnets = vpc.get("subnets", [])

        subnet_widths = []
        subnet_heights = []
        for subnet in subnets:
            instances = subnet.get("instances", [])
            inst_count = max(1, len(instances))
            sn_w = max(SUBNET_DEFAULT_W, SUBNET_INSET_LEFT * 2 + inst_count * INSTANCE_HORIZONTAL_GAP)
            sn_h = SUBNET_DEFAULT_H
            subnet_widths.append(sn_w)
            subnet_heights.append(sn_h)

        max_subnet_w = max(subnet_widths, default=SUBNET_DEFAULT_W)
        vpc_w = max(VPC_DEFAULT_W, max_subnet_w + VPC_INSET_LEFT * 2)

        subnet_stack_h = 0
        if subnet_heights:
            subnet_stack_h = sum(subnet_heights) + SUBNET_VERTICAL_GAP * max(0, len(subnet_heights) - 1)
        vpc_h = max(VPC_DEFAULT_H, VPC_INSET_TOP + subnet_stack_h + 28)

        col = idx % 3
        row = idx // 3
        vpc_x = 80 + col * 960
        vpc_y = 80 + row * 980

        vpc_layout[vpc_id] = {
            "x": vpc_x,
            "y": vpc_y,
            "w": vpc_w,
            "h": vpc_h,
        }

        nat_cfg = vpc.get("nat_gateway") or {}
        vpc_node = {
            "id": vpc_id,
            "type": TYPE_VPC_NODE,
            "position": {"x": vpc_x, "y": vpc_y},
            "width": vpc_w,
            "height": vpc_h,
            "data": {
                "label": f"vpc-{vpc_id}",
                "title": "VPC",
                "vpcName": vpc_name,
                "name": vpc_name,
                "region": vpc_region,
                "cidrBlock": cidr_base,
                "prefixLength": cidr_prefix,
                "cloudProvider": "AWS",
                "internetGateway": bool(vpc.get("internet_gateway", False)),
                "enableNatGateway": bool(nat_cfg.get("enabled", False)),
                "natGatewayPublicSubnet": str(nat_cfg.get("public_subnet") or ""),
                "natGatewayElasticIp": str(nat_cfg.get("elastic_ip") or ""),
                "nat_gateway": {
                    "enabled": bool(nat_cfg.get("enabled", False)),
                    "public_subnet": str(nat_cfg.get("public_subnet") or ""),
                    "elastic_ip": str(nat_cfg.get("elastic_ip") or ""),
                },
                "allowedSshCidr": str(vpc.get("allowed_ssh_cidr") or ""),
            },
        }
        nodes.append(vpc_node)

        for sidx, subnet in enumerate(subnets):
            subnet_name = str(subnet.get("name") or f"subnet-{sidx + 1}")
            subnet_id = str(
                subnet.get("id")
                or f"{vpc_id}--subnet--{slugify(subnet_name)}"
            )
            subnet_cidr = str(subnet.get("cidr_block") or "")
            subnet_type = str(subnet.get("subnet_type") or "public").lower()
            subnet_az = str(subnet.get("availability_zone") or f"{vpc_region}a")
            route_table = str(subnet.get("route_table") or ("public" if subnet_type == "public" else "private"))
            map_public_ip = bool(subnet.get("map_public_ip_on_launch", subnet_type == "public"))

            sn_w = subnet_widths[sidx] if sidx < len(subnet_widths) else SUBNET_DEFAULT_W
            sn_h = subnet_heights[sidx] if sidx < len(subnet_heights) else SUBNET_DEFAULT_H
            sn_x = VPC_INSET_LEFT
            sn_y = VPC_INSET_TOP + sidx * (SUBNET_DEFAULT_H + SUBNET_VERTICAL_GAP)

            subnet_node = {
                "id": subnet_id,
                "type": TYPE_SUBNETWORK_NODE,
                "parentId": vpc_id,
                "parentNode": vpc_id,
                "extent": "parent",
                "position": {"x": sn_x, "y": sn_y},
                "width": sn_w,
                "height": sn_h,
                "data": {
                    "label": f"subnet-{subnet_name}",
                    "title": "SUBNETWORK",
                    "subnetName": subnet_name,
                    "name": subnet_name,
                    "cidrBlock": subnet_cidr,
                    "availabilityZone": subnet_az,
                    "availability_zone": subnet_az,
                    "subnetType": subnet_type,
                    "subnet_type": subnet_type,
                    "map_public_ip_on_launch": map_public_ip,
                    "route_table": route_table,
                },
            }
            nodes.append(subnet_node)

            edge_count += 1
            edges.append(
                {
                    "id": make_edge_id(vpc_id, subnet_id, edge_count),
                    "source": vpc_id,
                    "target": subnet_id,
                }
            )

            instances = subnet.get("instances", [])
            for iidx, inst in enumerate(instances):
                inst_name = str(inst.get("name") or f"instance-{iidx + 1}")
                inst_id = str(inst.get("id") or f"{subnet_id}--inst--{slugify(inst_name)}")
                inst_type = detect_instance_type(inst_name)

                inst_node = {
                    "id": inst_id,
                    "type": inst_type,
                    "parentId": subnet_id,
                    "parentNode": subnet_id,
                    "extent": "parent",
                    "position": {
                        "x": SUBNET_INSET_LEFT + iidx * INSTANCE_HORIZONTAL_GAP,
                        "y": SUBNET_INSET_TOP,
                    },
                    "width": INSTANCE_DEFAULT_W,
                    "height": INSTANCE_DEFAULT_H,
                    "data": {
                        "label": f"instance-{inst_name}",
                        "title": "SERVER",
                        "name": inst_name,
                        "ipAddress": str(inst.get("ip_address") or ""),
                        "ip_address": str(inst.get("ip_address") or ""),
                        "ami": str(inst.get("ami") or ""),
                        "instanceType": str(inst.get("instance_type") or "t2.micro"),
                        "instance_type": str(inst.get("instance_type") or "t2.micro"),
                        "sshAccess": str(inst.get("ssh_access") or ""),
                        "ssh_access": str(inst.get("ssh_access") or ""),
                        "associate_public_ip": bool(inst.get("associate_public_ip", subnet_type == "public")),
                    },
                }
                nodes.append(inst_node)

                edge_count += 1
                edges.append(
                    {
                        "id": make_edge_id(subnet_id, inst_id, edge_count),
                        "source": subnet_id,
                        "target": inst_id,
                    }
                )

    # Router nodes + edges to connected VPCs.
    seen_router_vpc_pairs = set()
    for ridx, router in enumerate(router_defs.values()):
        connected_ids = sorted(router.connected_vpcs)

        if connected_ids:
            centers = []
            bottoms = []
            for vpc_id in connected_ids:
                lay = vpc_layout.get(vpc_id)
                if not lay:
                    continue
                centers.append((lay["x"] + lay["w"] / 2.0, lay["y"] + lay["h"] / 2.0))
                bottoms.append(lay["y"] + lay["h"])
            if centers:
                avg_x = sum(x for x, _ in centers) / len(centers)
                max_bottom = max(bottoms)
                router_x = int(avg_x - ROUTER_DEFAULT_W / 2)
                router_y = int(max_bottom + 80)
            else:
                router_x = 120 + ridx * 260
                router_y = 120
        else:
            router_x = 120 + ridx * 260
            router_y = 120

        router_node = {
            "id": router.router_id,
            "type": TYPE_ROUTER_NODE,
            "position": {"x": router_x, "y": router_y},
            "width": ROUTER_DEFAULT_W,
            "height": ROUTER_DEFAULT_H,
            "data": {
                "label": f"router-{router.router_id}",
                "title": "ROUTER",
                "identifier": router.name or router.router_id,
                "name": router.name or router.router_id,
                "mode": router.mode,
                "region": str((scenario.get("vlan") or {}).get("region") or "us-east-1"),
                "routeTable": router.route_rows,
            },
        }
        nodes.append(router_node)

        for vpc_id in connected_ids:
            key = tuple(sorted((router.router_id, vpc_id)))
            if key in seen_router_vpc_pairs:
                continue
            seen_router_vpc_pairs.add(key)
            edge_count += 1
            edges.append(
                {
                    "id": make_edge_id(vpc_id, router.router_id, edge_count),
                    "source": vpc_id,
                    "target": router.router_id,
                }
            )

    # Build summary metadata.
    meta = {
        "generated_from": source_name,
        "scenario_name": scenario.get("name"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "nodes": len(nodes),
            "edges": len(edges),
            "vpcs": len(vpcs),
            "routers": len(router_defs),
        },
    }

    return {
        "nodes": nodes,
        "edges": edges,
        "viewport": {"x": 0, "y": 0, "zoom": 0.7},
        "meta": meta,
    }


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main() -> int:
    args = parse_args()

    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)

    if not source_dir.exists() or not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist: {source_dir}")

    scenario_files = sorted(source_dir.glob(args.pattern))
    if not scenario_files:
        raise SystemExit(
            f"No scenario files matched pattern '{args.pattern}' under {source_dir}"
        )

    index = []
    skipped = []

    for scenario_path in scenario_files:
        scenario = load_json(scenario_path)
        out_name = f"{scenario_path.stem}.canvas.json"
        out_path = output_dir / out_name

        if out_path.exists() and not args.overwrite:
            skipped.append(str(out_path))
            continue

        flow = build_flow(scenario, scenario_path.name)
        write_json(out_path, flow)

        index.append(
            {
                "source": scenario_path.name,
                "scenario": scenario.get("name", scenario_path.stem),
                "output": out_name,
                "nodes": len(flow.get("nodes", [])),
                "edges": len(flow.get("edges", [])),
            }
        )

    index_path = output_dir / "index.canvas.json"
    write_json(index_path, {"generated": index})

    print(f"Generated {len(index)} canvas flow file(s) in: {output_dir}")
    if skipped:
        print(f"Skipped {len(skipped)} existing file(s) (use --overwrite):")
        for item in skipped:
            print(f"  - {item}")
    print(f"Index: {index_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

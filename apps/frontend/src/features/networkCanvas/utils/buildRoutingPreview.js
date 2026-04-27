// apps/frontend/src/components/flow/utils/buildRoutingPreview.js
import {
  TYPE_ROUTER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE,
} from "@/features/networkCanvas/utils/constants";

const normalizeRouterMode = (rawMode) => {
  const raw = String(rawMode || "")
    .trim()
    .toLowerCase();
  if (
    raw === "tgw" ||
    raw === "transit" ||
    raw === "transit_gateway" ||
    raw === "transit-gateway"
  ) {
    return "tgw";
  }
  return "peering";
};

const normalizeCidr = (value) => String(value || "").trim();

const getVpcCidr = (vpcNode) => {
  if (vpcNode?.data?.cidrBlock && vpcNode?.data?.prefixLength) {
    return `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}`;
  }
  return vpcNode?.data?.cidr || "0.0.0.0/16";
};

const pairKey = (a, b) => (a < b ? `${a}::${b}` : `${b}::${a}`);
export function buildRoutingPreview(nodes, edges) {
  if (!Array.isArray(nodes) || !nodes.length) {
    return { vpcs: [], routers: [], warnings: [], connectivityPairs: [] };
  }

  const vpcs = nodes.filter((n) => n.type === TYPE_VPC_NODE);
  const routers = nodes.filter((n) => n.type === TYPE_ROUTER_NODE);
  const subnets = nodes.filter((n) => n.type === TYPE_SUBNETWORK_NODE);

  const routerLinks = new Map();
  edges.forEach((e) => {
    const source = nodes.find((n) => n.id === e.source);
    const target = nodes.find((n) => n.id === e.target);
    if (!source || !target) return;

    if (
      (source.type === TYPE_ROUTER_NODE && target.type === TYPE_VPC_NODE) ||
      (target.type === TYPE_ROUTER_NODE && source.type === TYPE_VPC_NODE)
    ) {
      const routerId = source.type === TYPE_ROUTER_NODE ? source.id : target.id;
      const vpcId = source.type === TYPE_VPC_NODE ? source.id : target.id;
      if (!routerLinks.has(routerId)) routerLinks.set(routerId, new Set());
      routerLinks.get(routerId).add(vpcId);
    }
  });

  const vpcById = new Map(vpcs.map((v) => [v.id, v]));
  const vpcCidrsById = new Map(vpcs.map((v) => [v.id, normalizeCidr(getVpcCidr(v))]));
  const vpcIdByCidr = new Map(
    vpcs.map((v) => [normalizeCidr(getVpcCidr(v)), v.id]),
  );
  const routerById = new Map(routers.map((r) => [r.id, r]));

  const vpcPreviews = vpcs.map((vpc) => {
    const vpcId = vpc.id;
    const vpcName = vpc.data?.vpcName || vpc.id;
    const region = vpc.data?.region || "us-east-1";
    const cidr = getVpcCidr(vpc);

    const igw = !!vpc.data?.internetGateway;
    const nat = !!vpc.data?.enableNatGateway;

    const vpcSubnets = subnets.filter((s) => s.parentId === vpcId);
    const privateSubnets = vpcSubnets.filter(
      (s) => (s.data?.subnetType || "").toLowerCase() === "private",
    );

    const routes = [
      {
        dest_cidr: cidr,
        target: "local",
        provider_target: "local",
        neutral_target: "segment_local",
        via_router_id: null,
        directionality: "n/a",
      },
    ];

    if (igw) {
      routes.push({
        dest_cidr: "0.0.0.0/0",
        target: "igw",
        provider_target: "igw",
        neutral_target: "internet_edge",
        via_router_id: null,
        directionality: "n/a",
      });
    }

    if (nat && privateSubnets.length > 0) {
      routes.push({
        dest_cidr: "0.0.0.0/0",
        target: "nat-gw",
        provider_target: "nat-gw",
        neutral_target: "egress_gateway",
        via_router_id: null,
        directionality: "n/a",
      });
    }

    const connectedRouters = Array.from(routerLinks.entries())
      .filter(([, vpcSet]) => vpcSet.has(vpcId))
      .map(([routerId]) => routerId);

    connectedRouters.forEach((routerId) => {
      const routerNode = routerById.get(routerId);
      if (!routerNode) return;

      const routerMode = normalizeRouterMode(routerNode.data?.mode);
      const routeTable = Array.isArray(routerNode.data?.routeTable)
        ? routerNode.data.routeTable
        : [];

      routeTable
        .filter(
          (rt) =>
            rt.sourceVpcId === vpcId &&
            rt.destCidr &&
            typeof rt.destCidr === "string",
        )
        .forEach((rt) => {
          const destCidr = normalizeCidr(rt.destCidr);
          const destVpcId = rt.destVpcId || vpcIdByCidr.get(destCidr) || null;
          const sourceVpcCidr = vpcCidrsById.get(vpcId) || "";

          let reverseExists = false;
          if (destVpcId && sourceVpcCidr) {
            reverseExists = routeTable.some((candidate) => {
              if (candidate.sourceVpcId !== destVpcId) return false;
              if (candidate.destVpcId === vpcId) return true;
              return normalizeCidr(candidate.destCidr) === sourceVpcCidr;
            });
          }

          routes.push({
            dest_cidr: destCidr,
            target: routerMode === "tgw" ? "tgw" : "peering",
            provider_target: routerMode === "tgw" ? "tgw" : "peering",
            neutral_target:
              routerMode === "tgw" ? "routing_hub" : "direct_link",
            via_router_id: routerId,
            via_mode: routerMode,
            dest_vpc_id: destVpcId,
            directionality: destVpcId
              ? reverseExists
                ? "bidirectional"
                : "missing-return"
              : "manual-cidr",
          });
        });
    });

    return {
      id: vpcId,
      name: vpcName,
      region,
      cidr,
      connectedRouters,
      main_route_table: routes,
    };
  });

  const warnings = [];

  vpcPreviews.forEach((vpc) => {
    (vpc.main_route_table || [])
      .filter(
        (route) =>
          (route.target === "peering" || route.target === "tgw") &&
          route.directionality === "missing-return",
      )
      .forEach((route) => {
        const toVpc = vpcById.get(route.dest_vpc_id);
        if (!toVpc) return;
        warnings.push({
          type: "ASYMMETRIC_ROUTE",
          router_id: route.via_router_id,
          from_vpc: vpc.name,
          to_vpc: toVpc.data?.vpcName || toVpc.id,
          mode: route.target,
          message: `Ruta ${vpc.name} → ${toVpc.data?.vpcName || toVpc.id} sin retorno.`,
        });
      });
  });

  const routersPreview = routers.map((routerNode) => {
    const connectedVpcIds = Array.from(routerLinks.get(routerNode.id) || []);
    const connectedVpcNames = connectedVpcIds.map(
      (id) => vpcById.get(id)?.data?.vpcName || id,
    );
    const mode = normalizeRouterMode(routerNode.data?.mode);
    const routeTable = Array.isArray(routerNode.data?.routeTable)
      ? routerNode.data.routeTable
      : [];

    const routePairs = new Map();
    routeTable.forEach((route) => {
      const sourceVpcId = route.sourceVpcId;
      const destVpcId = route.destVpcId || vpcIdByCidr.get(normalizeCidr(route.destCidr));
      if (!sourceVpcId || !destVpcId || sourceVpcId === destVpcId) return;
      if (!connectedVpcIds.includes(sourceVpcId) || !connectedVpcIds.includes(destVpcId)) {
        return;
      }
      const key = pairKey(sourceVpcId, destVpcId);
      if (!routePairs.has(key)) {
        routePairs.set(key, {
          a: sourceVpcId < destVpcId ? sourceVpcId : destVpcId,
          b: sourceVpcId < destVpcId ? destVpcId : sourceVpcId,
          aToB: false,
          bToA: false,
        });
      }
      const state = routePairs.get(key);
      if (sourceVpcId === state.a && destVpcId === state.b) state.aToB = true;
      if (sourceVpcId === state.b && destVpcId === state.a) state.bToA = true;
    });

    let bidirectionalPairs = 0;
    let oneWayPairs = 0;
    routePairs.forEach((p) => {
      if (p.aToB && p.bToA) bidirectionalPairs += 1;
      else oneWayPairs += 1;
    });

    const connectedCount = connectedVpcIds.length;
    const potentialPairs =
      connectedCount >= 2 ? (connectedCount * (connectedCount - 1)) / 2 : 0;

    return {
      id: routerNode.id,
      name: routerNode.data?.identifier || routerNode.data?.name || routerNode.id,
      mode,
      neutralMode: mode === "tgw" ? "hub_routing" : "direct_links",
      providerMode: mode,
      connectedVpcIds,
      connectedVpcNames,
      connectedCount,
      explicitRoutes: routeTable.length,
      potentialPairs,
      bidirectionalPairs,
      oneWayPairs,
      awsResources:
        mode === "tgw"
          ? { tgw: connectedCount > 0 ? 1 : 0, attachments: connectedCount }
          : { peerings: bidirectionalPairs },
    };
  });

  const connectivityPairs = [];
  for (let i = 0; i < vpcPreviews.length; i += 1) {
    for (let j = i + 1; j < vpcPreviews.length; j += 1) {
      const a = vpcPreviews[i];
      const b = vpcPreviews[j];
      const routeAToB = (a.main_route_table || []).find(
        (route) =>
          (route.target === "peering" || route.target === "tgw") &&
          normalizeCidr(route.dest_cidr) === normalizeCidr(b.cidr),
      );
      const routeBToA = (b.main_route_table || []).find(
        (route) =>
          (route.target === "peering" || route.target === "tgw") &&
          normalizeCidr(route.dest_cidr) === normalizeCidr(a.cidr),
      );
      const sharedRouters = Array.from(
        new Set(
          (a.connectedRouters || []).filter((routerId) =>
            (b.connectedRouters || []).includes(routerId),
          ),
        ),
      );

      let status = "isolated";
      if (routeAToB && routeBToA) status = "reachable";
      else if (routeAToB || routeBToA) status = "partial";

      connectivityPairs.push({
        aId: a.id,
        aName: a.name,
        aCidr: a.cidr,
        bId: b.id,
        bName: b.name,
        bCidr: b.cidr,
        mode: routeAToB?.target || routeBToA?.target || null,
        providerMode:
          routeAToB?.provider_target || routeBToA?.provider_target || null,
        neutralMode:
          routeAToB?.neutral_target || routeBToA?.neutral_target || null,
        status,
        sharedRouters,
        reason:
          status === "reachable"
            ? "Hay rutas en ambos sentidos."
            : status === "partial"
              ? "Solo hay ruta en un sentido."
              : sharedRouters.length > 0
                ? "Comparten router, pero faltan rutas declaradas."
                : "No comparten router ni rutas.",
      });
    }
  }

  return {
    vpcs: vpcPreviews,
    warnings,
    routers: routersPreview,
    connectivityPairs,
  };
}

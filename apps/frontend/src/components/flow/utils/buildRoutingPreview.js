// apps/frontend/src/components/flow/utils/buildRoutingPreview.js
import { TYPE_ROUTER_NODE, TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE } from "./constants";

/**
 * Genera la tabla de rutas principal ("main") por VPC
 * con soporte para:
 *  - rutas locales
 *  - Internet Gateway
 *  - NAT Gateway
 *  - rutas entre VPCs conectadas por router
 */
export function buildRoutingPreview(nodes, edges) {
  if (!Array.isArray(nodes) || !nodes.length) {
    return { vpcs: [] };
  }

  // --- Indexar nodos por tipo ---
  const vpcs = nodes.filter((n) => n.type === TYPE_VPC_NODE);
  const routers = nodes.filter((n) => n.type === TYPE_ROUTER_NODE);
  const subnets = nodes.filter((n) => n.type === TYPE_SUBNETWORK_NODE);

  // --- Map de conexiones Router <-> VPC ---
  const routerLinks = {};
  edges.forEach((e) => {
    const source = nodes.find((n) => n.id === e.source);
    const target = nodes.find((n) => n.id === e.target);
    if (!source || !target) return;

    // Solo consideramos conexiones Router <-> VPC
    if (
      (source.type === TYPE_ROUTER_NODE && target.type === TYPE_VPC_NODE) ||
      (target.type === TYPE_ROUTER_NODE && source.type === TYPE_VPC_NODE)
    ) {
      const routerId =
        source.type === TYPE_ROUTER_NODE ? source.id : target.id;
      const vpcId = source.type === TYPE_VPC_NODE ? source.id : target.id;
      if (!routerLinks[routerId]) routerLinks[routerId] = new Set();
      routerLinks[routerId].add(vpcId);
    }
  });

  // --- Construcción de rutas por VPC ---
  const vpcPreviews = vpcs.map((vpc) => {
    const vpcId = vpc.id;
    const vpcName = vpc.data?.vpcName || vpc.id;
    const region = vpc.data?.region || "us-east-1";
    const cidr =
      vpc.data?.cidrBlock && vpc.data?.prefixLength
        ? `${vpc.data.cidrBlock}/${vpc.data.prefixLength}`
        : vpc.data?.cidr || "0.0.0.0/16";

    const igw = !!vpc.data?.internetGateway;
    const nat = !!vpc.data?.enableNatGateway;
    const publicSubnetName = vpc.data?.natGatewayPublicSubnet || "";

    // Subnets dentro de esta VPC
    const vpcSubnets = subnets.filter((s) => s.parentNode === vpcId);
    const privateSubnets = vpcSubnets.filter(
      (s) => (s.data?.subnetType || "").toLowerCase() === "private"
    );

    // --- Rutas base ---
    const routes = [
      {
        dest_cidr: cidr,
        target: "local",
        via_router_id: null,
      },
    ];

    // --- Internet Gateway (salida pública) ---
    if (igw) {
      routes.push({
        dest_cidr: "0.0.0.0/0",
        target: "igw",
        via_router_id: null,
      });
    }

    // --- NAT Gateway (para subredes privadas) ---
    if (nat && privateSubnets.length > 0) {
      privateSubnets.forEach((subnet) => {
        routes.push({
          dest_cidr: subnet.data?.cidrBlock || "",
          target: "nat-gw",
          via_router_id: null,
        });
      });
    }

    // --- Peering entre VPCs conectadas por router ---
    const connectedRouters = Object.entries(routerLinks)
      .filter(([_, vpcSet]) => vpcSet.has(vpcId))
      .map(([routerId, vpcSet]) => ({ routerId, vpcSet }));

    connectedRouters.forEach(({ routerId, vpcSet }) => {
      vpcSet.forEach((otherVpcId) => {
        if (otherVpcId === vpcId) return;
        const otherVpc = vpcs.find((v) => v.id === otherVpcId);
        if (!otherVpc) return;

        const otherCidr =
          otherVpc.data?.cidrBlock && otherVpc.data?.prefixLength
            ? `${otherVpc.data.cidrBlock}/${otherVpc.data.prefixLength}`
            : otherVpc.data?.cidr || "";

        routes.push({
          dest_cidr: otherCidr,
          target: "peering",
          via_router_id: routerId,
        });
      });
    });

    return {
      id: vpcId,
      name: vpcName,
      region,
      cidr,
      connectedRouters: connectedRouters.map((r) => r.routerId),
      main_route_table: routes,
    };
  });

  return { vpcs: vpcPreviews };
}

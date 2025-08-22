// src/components/flow/utils/buildRoutingPreview.js
import {
  TYPE_VPC_NODE,
  TYPE_ROUTER_NODE,
} from "../utils/constants";

// Utilidad simple para saber si un CIDR A pertenece (o es igual) a CIDR B.
// Aquí comparamos por prefijo textual; para algo más estricto puedes
// usar 'netmask' o 'ip-cidr' si lo necesitas.
const cidrEqual = (a, b) => (a || "").trim() === (b || "").trim();

/**
 * Construye un "preview" de rutas VPC↔VPC para TODOS los routers del canvas.
 * Reglas clave:
 *  - Cada VPC siempre tiene ruta local a su propio CIDR.
 *  - Para cada router, SOLO se generan rutas entre VPCs conectadas a ESE router.
 *  - No hay transitividad: un router NUNCA “hace puente” hacia VPCs colgando de otro router.
 *  - Los destinos toman lo que esté definido en el RouterNodeForm (destCidr).
 *
 * Devuelve:
 * {
 *   vpcs: [{
 *     id, name, region, cidr,
 *     connectedRouters: [routerIds...],
 *     main_route_table: [{ dest_cidr, target, via_router_id }]
 *   }],
 *   warnings: [strings...]
 * }
 */
export function buildRoutingPreview(nodes, edges) {
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const vpcNodes   = nodes.filter(n => n.type === TYPE_VPC_NODE);
  const routerNodes= nodes.filter(n => n.type === TYPE_ROUTER_NODE);

  // vpcInfo: id -> {id, name, region, cidr}
  const vpcInfo = new Map(
    vpcNodes.map(v => {
      const name   = v.data?.vpcName || v.data?.title || v.id;
      const region = v.data?.region || "us-east-1";
      const cidr   = (v.data?.cidrBlock && v.data?.prefixLength)
          ? `${v.data.cidrBlock}/${v.data.prefixLength}`
          : null;
      return [v.id, { id: v.id, name, region, cidr }];
    })
  );

  // routerConnections: routerId -> Set<VPC ids>
  const routerConnections = new Map();
  edges.forEach(e => {
    const s = idToNode.get(e.source);
    const t = idToNode.get(e.target);
    if (!s || !t) return;
    const isVpcRouter =
      (s.type === TYPE_VPC_NODE && t.type === TYPE_ROUTER_NODE) ||
      (s.type === TYPE_ROUTER_NODE && t.type === TYPE_VPC_NODE);
    if (!isVpcRouter) return;

    const routerId = (s.type === TYPE_ROUTER_NODE ? s.id : t.id);
    const vpcId    = (s.type === TYPE_VPC_NODE   ? s.id : t.id);
    if (!routerConnections.has(routerId)) routerConnections.set(routerId, new Set());
    routerConnections.get(routerId).add(vpcId);
  });

  // Para cada VPC, lista de routers conectados
  const vpcToRouters = new Map();
  for (const [rid, set] of routerConnections.entries()) {
    for (const vid of set) {
      if (!vpcToRouters.has(vid)) vpcToRouters.set(vid, new Set());
      vpcToRouters.get(vid).add(rid);
    }
  }

  // warnings acumulados
  const warnings = [];

  // Rutas por VPC (unión de lo que digan TODOS los routers DIRECTAMENTE conectados)
  const vpcRouteMap = new Map(); // vpcId -> [{dest_cidr, target, via_router_id}]
  for (const v of vpcNodes) {
    const info = vpcInfo.get(v.id);
    const routes = [];

    // Local
    if (info?.cidr) {
      routes.push({ dest_cidr: info.cidr, target: "local" });
    } else {
      warnings.push(`VPC ${info?.name || v.id} no tiene CIDR.`);
    }

    // Por cada router conectado a ESTA VPC, toma sus routeTable
    const rids = Array.from(vpcToRouters.get(v.id) || []);
    rids.forEach(rid => {
      const routerNode = idToNode.get(rid);
      const rTable = Array.isArray(routerNode?.data?.routeTable) ? routerNode.data.routeTable : [];

      rTable.forEach(entry => {
        // Solo las rutas donde sourceVpcId sea ESTA VPC
        if (entry.sourceVpcId !== v.id) return;

        const destCidr = (entry.destCidr || "").trim();
        if (!destCidr) {
          warnings.push(`Router ${rid}: ruta sin destCidr (source=${v.id}).`);
          return;
        }

        // validación ligera: si especificaron destVpcId, debe estar colgada del mismo router
        if (entry.destVpcId) {
          const set = routerConnections.get(rid) || new Set();
          if (!set.has(entry.destVpcId)) {
            warnings.push(`Router ${rid}: destino ${entry.destVpcId} no está conectado a este router (source=${v.id}).`);
            return;
          }
        }

        // Si hay destVpcId y conocemos el CIDR de esa VPC, alerta si no coincide
        if (entry.destVpcId) {
          const destVpc = vpcInfo.get(entry.destVpcId);
          if (destVpc?.cidr && !cidrEqual(destVpc.cidr, destCidr)) {
            warnings.push(`Router ${rid}: destCIDR (${destCidr}) difiere del CIDR de ${destVpc.name} (${destVpc.cidr}).`);
          }
        }

        routes.push({
          dest_cidr: destCidr,
          target: `router-${rid}`,
          via_router_id: rid,
        });
      });
    });

    vpcRouteMap.set(v.id, routes);
  }

  // Construir payload preview
  const preview = {
    vpcs: vpcNodes.map(v => {
      const info = vpcInfo.get(v.id);
      return {
        id: v.id,
        name: info?.name,
        region: info?.region,
        cidr: info?.cidr,
        connectedRouters: Array.from(vpcToRouters.get(v.id) || []),
        main_route_table: vpcRouteMap.get(v.id) || [],
      };
    }),
    warnings,
  };

  return preview;
}

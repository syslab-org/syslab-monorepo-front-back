// apps/frontend/src/components/flow/utils/topologyValidation.js
import { Netmask } from "netmask";
import {
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE,
} from "@/features/networkCanvas/utils/constants";

/* ---------- helpers CIDR ---------- */
const isValidCidr = (cidr) => {
  try {
    new Netmask(cidr);
    return true;
  } catch {
    return false;
  }
};
const parseCidr = (cidr) => {
  try {
    return new Netmask(cidr);
  } catch {
    return null;
  }
};

const within = (childCidr, parentCidr) => {
  const child = parseCidr(childCidr);
  const parent = parseCidr(parentCidr);
  if (!child || !parent) return false;
  if (child.base === undefined || child.broadcast === undefined) return false;
  return parent.contains(child.base) && parent.contains(child.broadcast);
};

const vpcFullCidr = (vpcNode) => {
  if (!vpcNode?.data?.cidrBlock || !vpcNode?.data?.prefixLength) return null;
  return `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}`;
};

const findVpcByCidr = (vpcNodes, cidr) => {
  if (!cidr) return null;
  const exact = vpcNodes.find((v) => vpcFullCidr(v) === cidr);
  if (exact) return exact;
  // acepta "estar dentro de" (por si el usuario escribe /24 que cae dentro de /20)
  return vpcNodes.find((v) => within(cidr, vpcFullCidr(v)));
};

const indexById = (arr) => {
  const m = new Map();
  arr.forEach((x) => m.set(x.id, x));
  return m;
};
const normalizeMode = (value) => {
  const raw = String(value || "")
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
const pairKey = (a, b) => (a < b ? `${a}::${b}` : `${b}::${a}`);
const INSTANCE_TYPES = new Set([
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_SERVER_NODE,
]);

/**
 * Valida segmentos, zonas, nodos de conectividad e instancias.
 * Devuelve { errors: string[], warnings: string[] }
 */
export function validateTopology(nodes, edges) {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const errors = [];
  const warnings = [];

  const vpcs = safeNodes.filter((n) => n.type === TYPE_VPC_NODE);
  const subnets = safeNodes.filter((n) => n.type === TYPE_SUBNETWORK_NODE);
  const routers = safeNodes.filter((n) => n.type === TYPE_ROUTER_NODE);
  const instances = safeNodes.filter((n) => INSTANCE_TYPES.has(n.type));

  const idToNode = indexById(safeNodes);
  const idToType = new Map(safeNodes.map((n) => [n.id, n.type]));

  /* --- VPC -> routers y Router -> VPCs (a partir de edges) --- */
  const vpcToRouters = new Map();
  const routerToVpcs = new Map();

  safeEdges.forEach((e) => {
    const sType = idToType.get(e.source);
    const tType = idToType.get(e.target);
    const isVpcRouter =
      (sType === TYPE_VPC_NODE && tType === TYPE_ROUTER_NODE) ||
      (sType === TYPE_ROUTER_NODE && tType === TYPE_VPC_NODE);
    if (!isVpcRouter) return;

    const vpcId = sType === TYPE_VPC_NODE ? e.source : e.target;
    const routerId = sType === TYPE_ROUTER_NODE ? e.source : e.target;

    if (!vpcToRouters.has(vpcId)) vpcToRouters.set(vpcId, new Set());
    vpcToRouters.get(vpcId).add(routerId);

    if (!routerToVpcs.has(routerId)) routerToVpcs.set(routerId, new Set());
    routerToVpcs.get(routerId).add(vpcId);
  });

  /* --- VPCs --- */
  vpcs.forEach((v) => {
    const name = v.data?.vpcName || v.data?.title || v.id;
    const cidr = vpcFullCidr(v);
    if (!cidr)
      errors.push(`Segment "${name}": falta CIDR (cidrBlock/prefixLength).`);
    else if (!isValidCidr(cidr))
      errors.push(`Segment "${name}": CIDR invalido (${cidr}).`);
  });

  /* --- Subnets: datos + pertenencia + containment --- */
  subnets.forEach((s) => {
    const sName = s.data?.subnetName || s.id;
    const vpcParent = idToNode.get(s.parentId);
    if (!vpcParent || vpcParent.type !== TYPE_VPC_NODE) {
      errors.push(`Zone "${sName}": no tiene segmento padre (parentId invalido).`);
      return;
    }

    const vpcName = vpcParent.data?.vpcName || vpcParent.id;
    const vpcCidr = vpcFullCidr(vpcParent);

    if (!s.data?.cidrBlock) {
      errors.push(`Zone "${sName}" en segmento "${vpcName}": falta CIDR.`);
      return;
    }
    if (!isValidCidr(s.data.cidrBlock)) {
      errors.push(
        `Zone "${sName}" en segmento "${vpcName}": CIDR invalido (${s.data.cidrBlock}).`,
      );
      return;
    }
    if (vpcCidr && !within(s.data.cidrBlock, vpcCidr)) {
      errors.push(
        `Zone "${sName}" (${s.data.cidrBlock}) no esta contenida en el segmento "${vpcName}" (${vpcCidr}).`,
      );
    }
  });

  /* --- Subnets: solapes por VPC --- */
  const subnetsByVpc = new Map();
  subnets.forEach((s) => {
    if (!subnetsByVpc.has(s.parentId)) subnetsByVpc.set(s.parentId, []);
    subnetsByVpc.get(s.parentId).push(s);
  });
  subnetsByVpc.forEach((list, vpcId) => {
    const vpcName = idToNode.get(vpcId)?.data?.vpcName || vpcId;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        const ca = parseCidr(a.data?.cidrBlock);
        const cb = parseCidr(b.data?.cidrBlock);
        if (!ca || !cb) continue;
        const overlap = ca.contains(cb.base) || cb.contains(ca.base);
        if (overlap) {
          errors.push(
            `Zonas solapadas en segmento "${vpcName}": ` +
              `"${a.data?.subnetName || a.id}" (${a.data?.cidrBlock}) ↔ ` +
              `"${b.data?.subnetName || b.id}" (${b.data?.cidrBlock}).`,
          );
        }
      }
    }
  });

  /* --- Routers / rutas + regla "no transitiva" --- */
  routers.forEach((r) => {
    const rName = r.data?.identifier || r.id;
    const routes = Array.isArray(r.data?.routeTable) ? r.data.routeTable : [];
    const vpcsOnThisRouter = routerToVpcs.get(r.id) || new Set();
    const routerMode = normalizeMode(r.data?.mode);
    const pairDirections = new Map();

    routes.forEach((rt, idx) => {
      const row = `Router "${rName}" ruta #${idx + 1}`;

      // source
      if (!rt.sourceVpcId) {
        errors.push(`${row}: falta sourceVpcId.`);
        return;
      }
      const srcVpc = idToNode.get(rt.sourceVpcId);
      if (!srcVpc || srcVpc.type !== TYPE_VPC_NODE) {
        errors.push(
          `${row}: sourceVpcId "${rt.sourceVpcId}" no corresponde a un segmento del canvas.`,
        );
        return;
      }
      if (!vpcsOnThisRouter.has(srcVpc.id)) {
        errors.push(
          `${row}: el segmento origen "${srcVpc.data?.vpcName || srcVpc.id}" no esta conectado a este nodo.`,
        );
      }

      // destino (por destVpcId o destCidr)
      let dstVpc = null;
      if (rt.destVpcId) {
        const node = idToNode.get(rt.destVpcId);
        if (!node || node.type !== TYPE_VPC_NODE) {
          errors.push(
            `${row}: destVpcId "${rt.destVpcId}" no corresponde a un segmento del canvas.`,
          );
        } else {
          dstVpc = node;
        }
      }

      if (!rt.destCidr || !isValidCidr(rt.destCidr)) {
        errors.push(
          `${row}: destCidr ausente o inválido (${rt.destCidr || "n/a"}).`,
        );
      } else if (!dstVpc) {
        // intenta resolver la VPC destino por el CIDR
        const byCidr = findVpcByCidr(vpcs, rt.destCidr);
        if (byCidr) dstVpc = byCidr;
      }

      // No transitiva: si identificamos VPC destino, ambas deben colgar del MISMO router (este)
      if (dstVpc) {
        if (dstVpc.id === srcVpc.id) {
          errors.push(
            `${row}: source y destination segment no pueden ser el mismo.`,
          );
        }
        const srcOk = vpcsOnThisRouter.has(srcVpc.id);
        const dstOk = vpcsOnThisRouter.has(dstVpc.id);
        if (!srcOk || !dstOk) {
          errors.push(
            `Segment ${dstVpc.data?.vpcName || dstVpc.id}: ruta a ${vpcFullCidr(srcVpc) || "(CIDR origen)"} ` +
              `(segmento ${srcVpc.data?.vpcName || srcVpc.id}) no cuelga del nodo ${r.id}. ` +
              `No se permiten saltos transitivos.`,
          );
        }
      }

      if (
        srcVpc &&
        dstVpc &&
        srcVpc.id !== dstVpc.id &&
        vpcsOnThisRouter.has(srcVpc.id) &&
        vpcsOnThisRouter.has(dstVpc.id)
      ) {
        const key = pairKey(srcVpc.id, dstVpc.id);
        if (!pairDirections.has(key)) {
          pairDirections.set(key, {
            a: srcVpc.id < dstVpc.id ? srcVpc.id : dstVpc.id,
            b: srcVpc.id < dstVpc.id ? dstVpc.id : srcVpc.id,
            aToB: false,
            bToA: false,
          });
        }
        const pair = pairDirections.get(key);
        if (srcVpc.id === pair.a && dstVpc.id === pair.b) pair.aToB = true;
        if (srcVpc.id === pair.b && dstVpc.id === pair.a) pair.bToA = true;
      }
    });

    pairDirections.forEach((pair) => {
      const aName = idToNode.get(pair.a)?.data?.vpcName || pair.a;
      const bName = idToNode.get(pair.b)?.data?.vpcName || pair.b;
      const hasBothDirections = pair.aToB && pair.bToA;

      if (routerMode === "peering" && !hasBothDirections) {
        errors.push(
          `Connectivity "${rName}": en modo direct links, ${aName} ↔ ${bName} requiere policies en ambos sentidos.`,
        );
      }

      if (routerMode === "tgw" && !hasBothDirections) {
        warnings.push(
          `Connectivity "${rName}": ${aName} ↔ ${bName} tiene policy solo de ida en hub routing; el ping de retorno fallara.`,
        );
      }
    });

    if (routerMode === "peering" && vpcsOnThisRouter.size > 2) {
      warnings.push(
        `Connectivity "${rName}": direct links con ${vpcsOnThisRouter.size} segmentos puede ser dificil de mantener por cantidad de pares.`,
      );
    }

    if (routerMode === "tgw" && vpcsOnThisRouter.size > 0 && vpcsOnThisRouter.size < 3) {
      warnings.push(
        `Connectivity "${rName}": hub routing con ${vpcsOnThisRouter.size} segmentos puede ser sobredimensionado para este laboratorio.`,
      );
    }
  });

  /* --- Instancias: IP ∈ subnet (opcional) --- */
  instances.forEach((inst) => {
    const subnet = idToNode.get(inst.parentId);
    if (!subnet || subnet.type !== TYPE_SUBNETWORK_NODE) return;
    const ip = inst.data?.ipAddress;
    const sCidr = subnet.data?.cidrBlock;
    if (!ip || !sCidr) return;
    const block = parseCidr(sCidr);
    if (block && !block.contains(ip)) {
      errors.push(
        `Instancia "${inst.data?.name || inst.id}": IP ${ip} no pertenece a la subnet ${sCidr}.`,
      );
    }
  });

  return { errors, warnings };
}

/* --------- Utils para preparar payload --------- */
export const groupSubnetsByVpc = (nodes, vpcId) =>
  nodes.filter((n) => n.type === TYPE_SUBNETWORK_NODE && n.parentId === vpcId);

export const groupInstancesBySubnet = (nodes, subnetId) =>
  nodes.filter((n) => n.parentId === subnetId);

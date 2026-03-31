import { buildRoutingPreview } from "./buildRoutingPreview";
import {
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE,
} from "@/features/networkCanvas/utils/constants";

// Stable stringify para que el hash sea determinista (ordena keys recursivamente)
export const stableStringify = (value) => {
  const seen = new WeakSet();

  const norm = (v) => {
    if (v === undefined) return null;
    if (v === null) return null;

    const t = typeof v;
    if (t === "number" || t === "boolean" || t === "string") return v;

    if (Array.isArray(v)) return v.map(norm);

    if (t === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);

      const out = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = norm(v[k]);
      }
      return out;
    }

    return String(v);
  };

  return JSON.stringify(norm(value));
};

const fnv1a64 = (input) => {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, "0");
};

const HASH_VERSION_PREFIX = "v2:";

const normalizeRouteTable = (routeTable) =>
  (Array.isArray(routeTable) ? routeTable : [])
    .map((route) => ({
      sourceVpcId: String(route?.sourceVpcId || ""),
      destVpcId: String(route?.destVpcId || ""),
      destCidr: String(route?.destCidr || "").trim(),
    }))
    .sort((a, b) =>
      `${a.sourceVpcId}|${a.destVpcId}|${a.destCidr}`.localeCompare(
        `${b.sourceVpcId}|${b.destVpcId}|${b.destCidr}`,
      ),
    );

const buildNodeSignature = (nodesArr) =>
  (Array.isArray(nodesArr) ? nodesArr : [])
    .map((node) => {
      const data = node?.data || {};
      const base = {
        id: String(node?.id || ""),
        type: String(node?.type || ""),
        parentId: String(node?.parentId || node?.parentNode || ""),
      };

      if (node?.type === TYPE_VPC_NODE) {
        return {
          ...base,
          vpcName: String(data?.vpcName || data?.name || data?.title || ""),
          region: String(data?.region || ""),
          cidrBlock: String(data?.cidrBlock || data?.cidr_block || ""),
          prefixLength: Number(data?.prefixLength ?? data?.prefix_length ?? 0),
          internetGateway: Boolean(data?.internetGateway ?? data?.internet_gateway),
          enableNatGateway: Boolean(
            data?.enableNatGateway ?? data?.nat_gateway?.enabled,
          ),
          natGatewayPublicSubnet: String(
            data?.natGatewayPublicSubnet || data?.nat_gateway?.public_subnet || "",
          ),
          natGatewayElasticIp: String(
            data?.natGatewayElasticIp || data?.nat_gateway?.elastic_ip || "",
          ),
          allowedSshCidr: String(
            data?.allowedSshCidr || data?.allowed_ssh_cidr || "",
          ),
        };
      }

      if (node?.type === TYPE_SUBNETWORK_NODE) {
        return {
          ...base,
          subnetName: String(data?.subnetName || data?.name || ""),
          cidrBlock: String(data?.cidrBlock || data?.cidr_block || ""),
          availabilityZone: String(
            data?.availabilityZone || data?.availability_zone || "",
          ),
          subnetType: String(data?.subnetType || data?.subnet_type || ""),
          routeTable: String(data?.routeTable || data?.route_table || ""),
          mapPublicIpOnLaunch: Boolean(data?.map_public_ip_on_launch),
        };
      }

      if (
        node?.type === TYPE_COMPUTER_NODE ||
        node?.type === TYPE_SERVER_NODE ||
        node?.type === TYPE_PRINTER_NODE
      ) {
        return {
          ...base,
          name: String(data?.name || ""),
          ami: String(data?.ami || ""),
          instanceType: String(
            data?.instanceType || data?.instance_type || "",
          ),
          ipAddress: String(data?.ipAddress || data?.ip_address || ""),
          sshAccess: String(data?.sshAccess || data?.ssh_access || ""),
          associatePublicIp: Boolean(
            data?.associatePublicIp ?? data?.associate_public_ip,
          ),
        };
      }

      if (node?.type === TYPE_ROUTER_NODE) {
        return {
          ...base,
          identifier: String(data?.identifier || data?.name || ""),
          mode: String(data?.mode || ""),
          routeTable: normalizeRouteTable(data?.routeTable),
        };
      }

      return base;
    })
    .sort((a, b) => `${a.type}|${a.id}`.localeCompare(`${b.type}|${b.id}`));

const buildEdgeSignature = (edgesArr) =>
  (Array.isArray(edgesArr) ? edgesArr : [])
    .map((edge) => ({
      id: String(edge?.id || ""),
      source: String(edge?.source || ""),
      target: String(edge?.target || ""),
      sourceHandle: String(edge?.sourceHandle || ""),
      targetHandle: String(edge?.targetHandle || ""),
    }))
    .sort((a, b) =>
      `${a.source}|${a.target}|${a.sourceHandle}|${a.targetHandle}|${a.id}`.localeCompare(
        `${b.source}|${b.target}|${b.sourceHandle}|${b.targetHandle}|${b.id}`,
      ),
    );

export const computeLegacyInfraHash = (nodesArr, edgesArr) => {
  try {
    const preview = buildRoutingPreview(nodesArr || [], edgesArr || []);

    const payloadLite = {
      vpcs: preview?.vpcs || [],
    };

    return fnv1a64(stableStringify(payloadLite));
  } catch (err) {
    console.warn("computeLegacyInfraHash fallback:", err);
    return fnv1a64(`infra:n${(nodesArr || []).length}-e${(edgesArr || []).length}`);
  }
};

export const isLegacyInfraHash = (hash) =>
  Boolean(hash) && !String(hash).startsWith(HASH_VERSION_PREFIX);

// Genera un hash basado en la infraestructura real representada en el canvas
export const computeInfraHash = (nodesArr, edgesArr) => {
  try {
    const preview = buildRoutingPreview(nodesArr || [], edgesArr || []);

    const payloadLite = {
      vpcs: preview?.vpcs || [],
      routers: preview?.routers || [],
      nodes: buildNodeSignature(nodesArr),
      edges: buildEdgeSignature(edgesArr),
    };

    return `${HASH_VERSION_PREFIX}${fnv1a64(stableStringify(payloadLite))}`;
  } catch (err) {
    console.warn("computeInfraHash fallback:", err);
    return `${HASH_VERSION_PREFIX}${fnv1a64(`infra:n${(nodesArr || []).length}-e${(edgesArr || []).length}`)}`;
  }
};

import { useEffect } from "react";
import {
  TYPE_ROUTER_NODE,
  TYPE_VPC_NODE,
} from "@/features/networkCanvas/utils/constants";

/**
 * Keeps VPC nodes updated with the list of routers connected to them.
 * This logic was previously inside MainFlow and was extracted to reduce
 * component complexity and isolate network graph synchronization logic.
 */
export function useVpcRouterSync({ nodes, edges, setNodes }) {
  // helper to compare simple arrays (order independent)
  const shallowArrEq = (a = [], b = []) =>
    a.length === b.length && a.every((x) => b.includes(x));

  useEffect(() => {
    if (!nodes?.length) return;

    // 1) Map nodeId -> type (read-only lookup)
    const idToType = new Map(nodes.map((n) => [n.id, n.type]));

    // 2) Build map VPC -> routers
    const vpcToRouters = new Map();

    edges.forEach((e) => {
      const sType = idToType.get(e.source);
      const tType = idToType.get(e.target);

      const isVpcRouter =
        (sType === TYPE_VPC_NODE && tType === TYPE_ROUTER_NODE) ||
        (sType === TYPE_ROUTER_NODE && tType === TYPE_VPC_NODE);

      if (!isVpcRouter) return;

      const vpcId = sType === TYPE_VPC_NODE ? e.source : e.target;
      const routerId = sType === TYPE_ROUTER_NODE ? e.source : e.target;

      if (!vpcToRouters.has(vpcId)) {
        vpcToRouters.set(vpcId, new Set());
      }

      vpcToRouters.get(vpcId).add(routerId);
    });

    // 3) Detect real changes
    const updates = [];

    for (const n of nodes) {
      if (n.type !== TYPE_VPC_NODE) continue;

      const newList = Array.from(vpcToRouters.get(n.id) || []);
      const prevList = Array.isArray(n.data?.connectedRouters)
        ? n.data.connectedRouters
        : [];

      if (!shallowArrEq(newList, prevList)) {
        updates.push({ id: n.id, newList });
      }
    }

    // 4) No updates → avoid unnecessary render
    if (updates.length === 0) return;

    setNodes((curr) =>
      curr.map((n) => {
        const u = updates.find((x) => x.id === n.id);

        return u
          ? { ...n, data: { ...n.data, connectedRouters: u.newList } }
          : n;
      }),
    );
  }, [nodes, edges, setNodes]);
}

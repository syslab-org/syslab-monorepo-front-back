import { useRef, useCallback } from "react";
import { addEdge } from "@xyflow/react";
import {
  TYPE_VPC_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_ROUTER_NODE,
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_SERVER_NODE,
} from "@/features/networkCanvas/utils/constants";

// Si tienes otros tipos de instancia, añádelos aquí
const INSTANCE_TYPES = [
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_SERVER_NODE,
];

export function useFlowState() {
  const connectionCreated = useRef(false);

  const isAllowedByType = useCallback((sourceNode, targetNode) => {
    if (!sourceNode || !targetNode) return false;

    const sType = sourceNode.type;
    const tType = targetNode.type;

    // helper: relación sin dirección
    const allow = (a, b) =>
      (sType === a && tType === b) || (sType === b && tType === a);

    // 1) VPC <-> Router
    if (allow(TYPE_VPC_NODE, TYPE_ROUTER_NODE)) return true;

    // 2) Subnet <-> VPC
    if (allow(TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE)) return true;

    // 3) Instance <-> Subnet
    if (
      (INSTANCE_TYPES.includes(sType) && tType === TYPE_SUBNETWORK_NODE) ||
      (INSTANCE_TYPES.includes(tType) && sType === TYPE_SUBNETWORK_NODE)
    ) {
      return true;
    }

    return false;
  }, []);

  const isValidConnection = useCallback((connection, nodes) => {
    const { source, target } = connection;
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode) {
      connectionCreated.current = false;
      return false;
    }

    // no self-loop
    if (sourceNode.id === targetNode.id) {
      connectionCreated.current = false;
      return false;
    }

    // respeta disabled
    if (sourceNode.disabled || targetNode.disabled) {
      connectionCreated.current = false;
      return false;
    }

    const allowed = isAllowedByType(sourceNode, targetNode);
    connectionCreated.current = allowed;
    return allowed;
  }, [isAllowedByType]);

  const onConnectStart = useCallback(() => {
    connectionCreated.current = false;
  }, []);

  // 👉 Añadimos getEdges para evitar duplicados (A->B y B->A)
  const onConnect = useCallback((params, setEdges, getEdges) => {
    if (!params?.source || !params?.target) return;

    // Se marca aquí para evitar falsos "inválida" por cambios intermedios durante el drag.
    connectionCreated.current = true;

    const edges = getEdges?.() || [];
    const exists = edges.some((e) => {
      const same = e.source === params.source && e.target === params.target;
      const opposite = e.source === params.target && e.target === params.source;
      return same || opposite;
    });
    if (exists) return;

    setEdges((eds) => addEdge(params, eds));
  }, []);

  const onConnectEnd = useCallback(() => {
    if (!connectionCreated.current) {
      // Mensaje claro de reglas:
      alert(
        "Conexión inválida. Reglas:\n" +
          " - Network Segment ↔ Connectivity Policy\n" +
          " - Zone Segment ↔ Network Segment\n" +
          " - Workload ↔ Zone Segment",
      );
    }
    connectionCreated.current = false;
  }, []);

  return {
    isValidConnection,
    onConnectStart,
    onConnect,
    onConnectEnd,
  };
}

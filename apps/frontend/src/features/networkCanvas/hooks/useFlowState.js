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

function buildRulesMessage(extraTip = "") {
  const rules =
    "Reglas de conexión:\n" +
    " - Network Segment ↔ Connectivity Policy\n" +
    " - Zone Segment ↔ Network Segment\n" +
    " - Workload ↔ Zone Segment";

  return extraTip ? `${extraTip}\n\n${rules}` : rules;
}

export function useFlowState(setCanvasUiError) {
  const connectionCreated = useRef(false);
  const invalidReason = useRef("");

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
      invalidReason.current = buildRulesMessage(
        "No se pudo reconocer uno de los nodos que estabas intentando conectar."
      );
      return false;
    }

    // no self-loop
    if (sourceNode.id === targetNode.id) {
      connectionCreated.current = false;
      invalidReason.current = "No puedes conectar un nodo consigo mismo.";
      return false;
    }

    // respeta disabled
    if (sourceNode.disabled || targetNode.disabled) {
      connectionCreated.current = false;
      invalidReason.current =
        "Hay un plan en ejecución o un nodo bloqueado. Espera a que termine antes de editar conexiones.";
      return false;
    }

    const allowed = isAllowedByType(sourceNode, targetNode);
    invalidReason.current = allowed
      ? ""
      : buildRulesMessage(
          "Conexión inválida. Si quieres unir un Network Segment con el router, arrastra desde cualquiera de los puntos azules del borde del segmento hacia un puerto del nodo de conectividad."
        );
    connectionCreated.current = allowed;
    return allowed;
  }, [isAllowedByType]);

  const onConnectStart = useCallback(() => {
    connectionCreated.current = false;
    invalidReason.current = "";
  }, []);

  // 👉 Añadimos getEdges para evitar duplicados (A->B y B->A)
  const onConnect = useCallback((params, setEdges, getEdges) => {
    if (!params?.source || !params?.target) return;

    // Se marca aquí para evitar falsos "inválida" por cambios intermedios durante el drag.
    connectionCreated.current = true;
    invalidReason.current = "";

    const edges = getEdges?.() || [];
    const exists = edges.some((e) => {
      const same = e.source === params.source && e.target === params.target;
      const opposite = e.source === params.target && e.target === params.source;
      return same || opposite;
    });
    if (exists) {
      const msg = "Ese enlace ya existe entre ambos nodos. No hace falta crearlo otra vez.";
      invalidReason.current = msg;
      setCanvasUiError?.(msg);
      return;
    }

    setEdges((eds) => addEdge(params, eds));
  }, [setCanvasUiError]);

  const onConnectEnd = useCallback(() => {
    if (!connectionCreated.current) {
      setCanvasUiError?.(
        invalidReason.current ||
          buildRulesMessage(
            "Conexión inválida. Revisa qué tipos de nodos estás intentando unir."
          )
      );
    }
    connectionCreated.current = false;
    invalidReason.current = "";
  }, [setCanvasUiError]);

  return {
    isValidConnection,
    onConnectStart,
    onConnect,
    onConnectEnd,
  };
}

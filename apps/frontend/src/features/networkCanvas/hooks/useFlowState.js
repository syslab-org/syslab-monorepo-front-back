import { useRef, useCallback } from "react";
import { addEdge } from "@xyflow/react";
import {
    TYPE_VPC_NODE,
    TYPE_SUBNETWORK_NODE,
    TYPE_ROUTER_NODE,
    TYPE_COMPUTER_NODE,
    TYPE_PRINTER_NODE,
    TYPE_SERVER_NODE,
} from "../utils/constants";

// Si tienes otros tipos de instancia, añádelos aquí
const INSTANCE_TYPES = [TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_SERVER_NODE];

export function useFlowState() {
    const connectionCreated = useRef(false);

    const isValidConnection = useCallback((connection, nodes) => {
        const { source, target } = connection;
        const sourceNode = nodes.find((n) => n.id === source);
        const targetNode = nodes.find((n) => n.id === target);
        if (!sourceNode || !targetNode) return false;

        // ⬇️ Logger opcional para depuración
        console.log("🔌 Intento de conexión:");
        console.log(" - Source:", sourceNode.id, sourceNode.type);
        console.log(" - Target:", targetNode.id, targetNode.type);

        // no self-loop
        if (sourceNode.id === targetNode.id) {
            console.warn("❌ Conexión rechazada: mismo nodo");
            return false;
        }

        // respeta disabled
        if (sourceNode.disabled || targetNode.disabled) {
            console.warn("❌ Conexión rechazada: nodo(s) deshabilitado(s)");
            return false;
        }

        const sType = sourceNode.type;
        const tType = targetNode.type;

        // helper: relación sin dirección
        const allow = (a, b) => (sType === a && tType === b) || (sType === b && tType === a);

        // 1) VPC <-> Router
        if (allow(TYPE_VPC_NODE, TYPE_ROUTER_NODE)) {
            console.log("✅ Conexión válida: VPC ↔ Router");
            connectionCreated.current = true;
            return true;
        }

        // 2) Subnet <-> VPC
        if (allow(TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE)) {
            console.log("✅ Conexión válida: Subnet ↔ VPC");
            connectionCreated.current = true;
            return true;
        }

        // 3) Instance <-> Subnet
        if (
            (INSTANCE_TYPES.includes(sType) && tType === TYPE_SUBNETWORK_NODE) ||
            (INSTANCE_TYPES.includes(tType) && sType === TYPE_SUBNETWORK_NODE)
        ) {
            console.log("✅ Conexión válida: Instancia ↔ Subnet");
            connectionCreated.current = true;
            return true;
        }

        // (OPCIONAL) Si quisieras Subnet <-> Router, descomenta:
        // if (allow(TYPE_SUBNETWORK_NODE, TYPE_ROUTER_NODE)) {
        //   connectionCreated.current = true;
        //   return true;
        // }

        // Bloquea todo lo demás
        console.warn("❌ Conexión rechazada: tipos no permitidos");
        connectionCreated.current = false;
        return false;
    }, []);

    const onConnectStart = useCallback(() => {
        connectionCreated.current = false;
    }, []);

    // 👉 Añadimos getEdges para evitar duplicados (A->B y B->A)
    const onConnect = useCallback((params, setEdges, getEdges) => {
        if (!connectionCreated.current) return;

        const edges = (getEdges?.() || []);
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
                " - VPC ↔ Router\n" +
                " - Subnet ↔ VPC\n" +
                " - Instancia ↔ Subnet"
            );
        }
    }, []);

    return {
        isValidConnection,
        onConnectStart,
        onConnect,
        onConnectEnd,
    };
}

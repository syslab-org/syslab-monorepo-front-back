import {
  TYPE_VPC_NODE,
  TYPE_SUBNETWORK_NODE,
} from "@/features/networkCanvas/utils/constants";

export function useNodeActions({
  nodes,
  setNodes,
  selectedNode,
  clickedNodeId,
  closeModal,
  onSaveFlow,
}) {
  const saveNodeData = (data) => {
    // 🧩 Normaliza nombres si el nodo es una VPC
    let normalized = { ...data };
    if (selectedNode?.type === TYPE_VPC_NODE) {
      normalized = {
        ...data,
        // Nombres posibles
        vpcName: data.vpcName || data.name || data.title,
        // CIDR (acepta camelCase o snake_case)
        cidrBlock: data.cidrBlock || data.cidr_block,
        prefixLength: data.prefixLength ?? data.prefix_length,
        // Booleans correctos
        internetGateway: data.internetGateway ?? data.internet_gateway,
        enableNatGateway:
          data.enableNatGateway ??
          (data.nat_gateway && data.nat_gateway.enabled),
        // Mantén objetos si vienen anidados
        nat_gateway: data.nat_gateway,
        allowedSshCidr: data.allowedSshCidr || data.allowed_ssh_cidr,
        // Genera el título visible
        title: data.vpcName || data.name || "VPC",
      };

      // Si vino CIDR completo (ej: 10.0.0.0/16), sepáralo
      if (
        typeof normalized.cidrBlock === "string" &&
        normalized.cidrBlock.includes("/")
      ) {
        const [base, pref] = normalized.cidrBlock.split("/");
        normalized.cidrBlock = base.trim();
        normalized.prefixLength = Number(pref);
      }
    }

    // 🔹 Mezcla en el nodo correspondiente
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== selectedNode.id) return node;

        return {
          ...node,
          data: {
            ...node.data,
            ...normalized,
          },
        };
      }),
    );

    // 🔸 Guarda y cierra modal
    onSaveFlow();
    closeModal();
  };

  const deleteNodeInstance = () => {
    setNodes((nds) => {
      const nodeToDelete = nds.find((node) => node.id === clickedNodeId);
      // console.log("nodeToDelete: ", nodeToDelete.type);

      if (!nodeToDelete) {
        // console.log("Node not found");
        return nds;
      }

      // ---- Borrado recursivo desde nodo tipo VPC ----
      if (nodeToDelete.type === TYPE_VPC_NODE) {
        //1. Encontrar todo los nodos subnets de la VPC
        const subnetworksToDelete = nds.filter(
          (node) =>
            node.parentNode === nodeToDelete.id &&
            node.type === TYPE_SUBNETWORK_NODE,
        );

        //2. Encuentra todas las Instancias e hijos de las subnets
        const subnetIds = subnetworksToDelete.map((subnet) => subnet.id);
        const instancesToDelete = nds.filter((node) =>
          subnetIds.includes(node.parentNode),
        );

        //3. Filtrar fuera: la VPC, sus Subnets y todas las Instancias hijas
        return nds.filter(
          (n) =>
            n.id !== nodeToDelete.id && // Quita la VPC
            !subnetIds.includes(n.id) && // Quita las subnets hijas
            !instancesToDelete.some((inst) => inst.id === n.id), // Quita instancias hijas de las subnets
        );
      }

      // ---- Borrado recursivo desde nodo tipo Subnet ----
      if (nodeToDelete.type === TYPE_SUBNETWORK_NODE) {
        // 1. Encuentra todas las Instancias dentro de la Subnet
        const instancesToDelete = nds.filter(
          (n) => n.parentNode === nodeToDelete.id,
        );
        // 2. Filtra fuera la Subnet y sus hijos
        return nds.filter(
          (n) =>
            n.id !== nodeToDelete.id &&
            !instancesToDelete.some((inst) => inst.id === n.id),
        );
      }

      return nds.filter((node) => node.id !== clickedNodeId);
    });

    closeModal();
  };

  return {
    saveNodeData,
    deleteNodeInstance,
  };
}

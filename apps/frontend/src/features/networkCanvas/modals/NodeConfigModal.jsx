import { Modal, Box } from "@mui/material";

import InstanceNodeForm from "@/features/networkCanvas/forms/InstanceNodeForm";
import RouterNodeForm from "@/features/networkCanvas/forms/RouterNodeForm";
import SubNetworkNodeForm from "@/features/networkCanvas/forms/SubNetworkNodeForm";
import VPCNodeForm from "@/features/networkCanvas/forms/VPCNodeForm";

import {
    TYPE_COMPUTER_NODE,
    TYPE_DEFAULT_NODE,
    TYPE_PRINTER_NODE,
    TYPE_ROUTER_NODE,
    TYPE_SERVER_NODE,
    TYPE_SUBNETWORK_NODE,
    TYPE_VPC_NODE
} from "@/features/networkCanvas/utils/constants";

const restrictedNodes = [
    TYPE_DEFAULT_NODE,
    TYPE_COMPUTER_NODE,
    TYPE_PRINTER_NODE,
    TYPE_SERVER_NODE
];

const styleModal = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 880,
    maxWidth: "95vw",
    maxHeight: "85vh",
    overflowY: "auto",
    bgcolor: "background.paper",
    border: "2px solid #000",
    borderRadius: 2,
    boxShadow: 24,
    p: 4
};

function getInstanceNodeProps(selectedNode, nodes, restrictedNodes) {
    const parentSubnet = nodes.find(n => n.id === selectedNode.parentId);
    const parentSubnetCidr = parentSubnet?.data?.cidrBlock || "";

    const siblingIpsInSameSubnet = nodes
        .filter(n =>
            restrictedNodes.includes(n.type) &&
            n.parentId === parentSubnet?.id &&
            n.id !== selectedNode.id
        )
        .map(n => n.data?.ipAddress)
        .filter(Boolean);

    return { parentSubnetCidr, siblingIpsInSameSubnet };
}

function getSubnetNodeProps(selectedNode, nodes) {
    const parentVpcNode = nodes.find(n => n.id === selectedNode.parentId);
    const parentVpcData = parentVpcNode?.data || {};

    const hasParentCidr =
        typeof parentVpcData.cidrBlock === "string" &&
        String(parentVpcData.prefixLength || "") !== "" &&
        /^\d+$/.test(String(parentVpcData.prefixLength));

    const parentVpcCidr = hasParentCidr
        ? `${parentVpcData.cidrBlock}/${parentVpcData.prefixLength}`
        : "";

    const siblingSubnetCidrsInSameVpc = nodes
        .filter(n =>
            n.type === TYPE_SUBNETWORK_NODE &&
            n.parentId === parentVpcNode?.id &&
            n.id !== selectedNode.id
        )
        .map(n => n.data?.cidrBlock)
        .filter(Boolean);

    return { parentVpcCidr, siblingSubnetCidrsInSameVpc };
}

function getRouterNodeProps(selectedNode, nodes, edges) {
    const idToNode = new Map(nodes.map(n => [n.id, n]));
    const connectedVpcsSet = new Set();

    edges.forEach(e => {
        const touchesRouter =
            e.source === selectedNode.id || e.target === selectedNode.id;

        if (!touchesRouter) return;

        const otherId = e.source === selectedNode.id ? e.target : e.source;
        const other = idToNode.get(otherId);

        if (other?.type === TYPE_VPC_NODE) {
            const base = other.data?.cidrBlock;
            const pref = other.data?.prefixLength;

            const cidr = base && pref ? `${base}/${pref}` : null;

            connectedVpcsSet.add(JSON.stringify({
                id: other.id,
                name: other.data?.vpcName || other.data?.title || other.id,
                cidr
            }));
        }
    });

    const connectedVpcs = Array.from(connectedVpcsSet).map(JSON.parse);

    const allVpcCidrs = nodes
        .filter(n => n.type === TYPE_VPC_NODE)
        .map(n => {
            const base = n.data?.cidrBlock;
            const pref = n.data?.prefixLength;
            return {
                id: n.id,
                name: n.data?.vpcName || n.data?.title || n.id,
                cidr: base && pref ? `${base}/${pref}` : null
            };
        });

    return { connectedVpcs, allVpcCidrs };
}

function getVpcNodeProps(selectedNode, nodes, cidrBlockVPC, prefixLength) {
    const vlanCidr =
        cidrBlockVPC && prefixLength
            ? `${cidrBlockVPC}/${prefixLength}`
            : "";

    const siblingVpcCidrs = nodes
        .filter(n => n.type === TYPE_VPC_NODE && n.id !== selectedNode.id)
        .map(n => {
            const base = n.data?.cidrBlock;
            const pref = n.data?.prefixLength;
            return base && pref ? `${base}/${pref}` : null;
        })
        .filter(Boolean);

    const publicSubnetNames = nodes
        .filter(n =>
            n.type === TYPE_SUBNETWORK_NODE &&
            n.parentId === selectedNode.id &&
            String(n.data?.subnetType || "").toLowerCase() === "public"
        )
        .map(n => n.data?.subnetName)
        .filter(Boolean);

    return { vlanCidr, siblingVpcCidrs, publicSubnetNames };
}



function NodeConfigModal({
    modalIsOpen,
    closeModal,
    selectedNode,
    nodes,
    edges,
    amiList,
    saveNodeData,
    deleteNodeInstance,
    cidrBlockVPC,
    prefixLength
}) {

    if (!selectedNode) return null;

    return (
        <Modal
            open={modalIsOpen}
            onClose={closeModal}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
        >
            <Box sx={{ ...styleModal, width: selectedNode && selectedNode.type === TYPE_ROUTER_NODE ? 800 : 400 }}>

                {/* If selected node is restricted, show warning */}
                {selectedNode && restrictedNodes.includes(selectedNode.type) && (() => {
                    const { parentSubnetCidr, siblingIpsInSameSubnet } =
                        getInstanceNodeProps(selectedNode, nodes, restrictedNodes);
                    return (
                        <InstanceNodeForm
                            nodeData={selectedNode.data}
                            onSave={saveNodeData}
                            deleteNode={deleteNodeInstance}
                            parentSubnetCidr={parentSubnetCidr}
                            siblingIpsInSameSubnet={siblingIpsInSameSubnet}
                            amiList={amiList}
                        />
                    );
                })()}


                {/* If node type is Subnetwork, show SubNetworkNodeForm */}
                {selectedNode && selectedNode.type === TYPE_SUBNETWORK_NODE && (() => {
                    const { parentVpcCidr, siblingSubnetCidrsInSameVpc } =
                        getSubnetNodeProps(selectedNode, nodes);
                    return (
                        <SubNetworkNodeForm
                            nodeData={selectedNode.data}
                            onSave={saveNodeData}
                            deleteNode={deleteNodeInstance}
                            parentVpcCidr={parentVpcCidr}
                            siblingSubnetCidrsInSameVpc={siblingSubnetCidrsInSameVpc}
                        />
                    )
                })()}


                {/* If node type is Router, show RouterNodeForm */}
                {selectedNode && selectedNode.type === TYPE_ROUTER_NODE && (() => {
                    const { connectedVpcs, allVpcCidrs } =
                        getRouterNodeProps(selectedNode, nodes, edges);
                    const vlanRegion = "us-east-1";
                    return (
                        <RouterNodeForm
                            node={selectedNode}
                            nodeData={selectedNode.data}
                            onSave={saveNodeData}
                            deleteNode={deleteNodeInstance}
                            connectedVpcs={connectedVpcs}
                            allVpcCidrs={allVpcCidrs}
                            vlanRegion={vlanRegion}
                        />);
                })()}


                {/* If node type is VPC, show VPCNodeForm */}
                {selectedNode && selectedNode.type === TYPE_VPC_NODE && (() => {
                    const { vlanCidr, siblingVpcCidrs, publicSubnetNames } =
                        getVpcNodeProps(selectedNode, nodes, cidrBlockVPC, prefixLength);
                    return (
                        <VPCNodeForm
                            nodeData={selectedNode.data}
                            onSave={saveNodeData}
                            deleteNode={deleteNodeInstance}
                            vlanCidr={vlanCidr}
                            siblingVpcCidrs={siblingVpcCidrs}
                            publicSubnetNames={publicSubnetNames}
                        />
                    );
                })()}


            </Box>
        </Modal>
    );
}

export default NodeConfigModal;
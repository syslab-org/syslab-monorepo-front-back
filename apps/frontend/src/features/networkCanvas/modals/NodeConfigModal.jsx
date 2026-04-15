import { Modal, Box, Typography } from "@mui/material";

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

const styleModal = (theme) => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 880,
    maxWidth: "95vw",
    maxHeight: "85vh",
    overflowY: "auto",
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 3,
    boxShadow:
        theme.palette.mode === "light"
            ? "0 26px 56px rgba(15,23,42,0.18)"
            : "0 30px 60px rgba(0,0,0,0.45)",
    p: { xs: 2, md: 2.5 },
    background:
        theme.palette.mode === "light"
            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.98) 100%)"
            : "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)",
    "& .pt-node-form": {
        display: "flex",
        flexDirection: "column",
        gap: 1.4,
    },
    "& .pt-node-form__header": {
        mb: 0.5,
        pb: 1.2,
        borderBottom: "1px solid",
        borderColor: "divider",
    },
    "& .pt-node-form__eyebrow": {
        display: "block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
        opacity: 0.7,
    },
    "& .pt-node-form__title": {
        fontSize: 19,
        fontWeight: 700,
        lineHeight: 1.15,
    },
    "& .pt-node-form__subtitle": {
        fontSize: 12,
        color: "text.secondary",
        mt: 0.25,
    },
    "& .pt-node-form .MuiFormControl-root, & .pt-node-form .MuiTextField-root": {
        mb: 0.35,
    },
    "& .pt-node-form .MuiInputBase-root": {
        borderRadius: 2,
        background:
            theme.palette.mode === "light"
                ? "rgba(255,255,255,0.84)"
                : "rgba(15,23,42,0.45)",
    },
    "& .pt-node-form .MuiAlert-root": {
        borderRadius: 2,
    },
    "& .pt-node-form__actions": {
        display: "flex",
        alignItems: "center",
        gap: 1,
        pt: 0.8,
        mt: 0.4,
        borderTop: "1px solid",
        borderColor: "divider",
        flexWrap: "wrap",
    },
    "& .pt-node-form .MuiButton-root": {
        borderRadius: 2,
        fontWeight: 700,
        px: 1.8,
    },
});

const NODE_FORM_META = {
    [TYPE_VPC_NODE]: { label: "Network Node", title: "Network Segment Configuration" },
    [TYPE_SUBNETWORK_NODE]: { label: "Network Node", title: "Zone Configuration" },
    [TYPE_ROUTER_NODE]: { label: "Connectivity Node", title: "Connectivity Policy" },
    [TYPE_DEFAULT_NODE]: { label: "Workload Node", title: "Instance Configuration" },
    [TYPE_COMPUTER_NODE]: { label: "Workload Node", title: "Instance Configuration" },
    [TYPE_PRINTER_NODE]: { label: "Workload Node", title: "Instance Configuration" },
    [TYPE_SERVER_NODE]: { label: "Workload Node", title: "Instance Configuration" },
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

    const privateSubnetNames = nodes
        .filter(n =>
            n.type === TYPE_SUBNETWORK_NODE &&
            n.parentId === selectedNode.id &&
            String(n.data?.subnetType || "").toLowerCase() === "private"
        )
        .map(n => n.data?.subnetName)
        .filter(Boolean);

    return { vlanCidr, siblingVpcCidrs, publicSubnetNames, privateSubnetNames };
}



function NodeConfigModal({
    modalIsOpen,
    closeModal,
    selectedNode,
    nodes,
    edges,
    amiList,
    keyPairList,
    executionTarget,
    saveNodeData,
    deleteNodeInstance,
    cidrBlockVPC,
    prefixLength
}) {

    if (!selectedNode) return null;
    const formMeta = NODE_FORM_META[selectedNode.type] || {
        label: "Node",
        title: "Node Configuration",
    };
    const nodeName =
        selectedNode.data?.vpcName ||
        selectedNode.data?.subnetName ||
        selectedNode.data?.name ||
        selectedNode.data?.identifier ||
        selectedNode.data?.title ||
        selectedNode.id;

    return (
        <Modal
            open={modalIsOpen}
            onClose={closeModal}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
        >
            <Box
                sx={(theme) => ({
                    ...styleModal(theme),
                    width: selectedNode && selectedNode.type === TYPE_ROUTER_NODE ? 840 : 460
                })}
            >
                <Box sx={{ mb: 1.2, pb: 1.2, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.1, opacity: 0.7 }}>
                        {formMeta.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {formMeta.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Editing: {nodeName}
                    </Typography>
                </Box>

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
                            keyPairList={keyPairList}
                            executionTarget={executionTarget}
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
                    const { vlanCidr, siblingVpcCidrs, publicSubnetNames, privateSubnetNames } =
                        getVpcNodeProps(selectedNode, nodes, cidrBlockVPC, prefixLength);
                    return (
                        <VPCNodeForm
                            nodeData={selectedNode.data}
                            onSave={saveNodeData}
                            deleteNode={deleteNodeInstance}
                            vlanCidr={vlanCidr}
                            siblingVpcCidrs={siblingVpcCidrs}
                            publicSubnetNames={publicSubnetNames}
                            privateSubnetNames={privateSubnetNames}
                        />
                    );
                })()}


            </Box>
        </Modal>
    );
}

export default NodeConfigModal;

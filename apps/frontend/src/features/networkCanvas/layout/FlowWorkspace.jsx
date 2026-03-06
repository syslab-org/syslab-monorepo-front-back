import { Box, Typography } from "@mui/material";
import SidebarFlow from "@/features/networkCanvas/panels/SidebarFlow";
import ReactFlowCanvas from "@/features/networkCanvas/canvas/ReactFlowCanvas";
import PacketToolbar from "@/features/networkCanvas/panels/PacketToolbar";
import CanvasFeedbackLayer from "@/features/networkCanvas/ui/CanvasFeedbackLayer";

export default function FlowWorkspace({
    reactFlowWrapper,
    nodes,
    edges,
    nodeTypes,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onConnect,
    onInit,
    onDrop,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    onDragOver,
    onConnectStart,
    onConnectEnd,
    isValidConnection,
    connectionLineStyle,
    setNodes,
    reactFlowInstance,
    theme,
    toolbarProps,
    feedbackProps
}) {

    return (
        <Box
            ref={reactFlowWrapper}
            sx={{
                height: "100%",
                display: "flex",
                borderRadius: 1,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                backgroundColor: "background.paper",
            }}
        >
            <Box
                sx={{
                    width: { xs: 220, md: 260 },
                    borderRight: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <SidebarFlow />
            </Box>

            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                }}
            >

                <PacketToolbar {...toolbarProps} />

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        position: "relative",
                        backgroundColor: (t) =>
                            t.palette.mode === "light" ? "#f4f6fa" : "#0f172a",
                    }}
                >

                    {nodes.length === 0 && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "none",
                                zIndex: 10,
                            }}
                        >
                            <Typography variant="h6">
                                Comienza creando tu red
                            </Typography>
                        </Box>
                    )}

                    <ReactFlowCanvas
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        onConnect={onConnect}
                        onInit={onInit}
                        onDrop={onDrop}
                        onNodeDragStart={onNodeDragStart}
                        onNodeDrag={onNodeDrag}
                        onNodeDragStop={onNodeDragStop}
                        onDragOver={onDragOver}
                        onConnectStart={onConnectStart}
                        onConnectEnd={onConnectEnd}
                        isValidConnection={isValidConnection}
                        connectionLineStyle={connectionLineStyle}
                        setNodes={setNodes}
                        reactFlowInstance={reactFlowInstance}
                        theme={theme}
                    />

                </Box>

                <CanvasFeedbackLayer {...feedbackProps} />

            </Box>
        </Box>
    );
}
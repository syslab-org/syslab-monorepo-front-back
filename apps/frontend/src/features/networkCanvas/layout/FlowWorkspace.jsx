import { Box, Typography } from "@mui/material";
import { useState } from "react";
import SidebarFlow from "@/features/networkCanvas/panels/SidebarFlow";
import ReactFlowCanvas from "@/features/networkCanvas/canvas/ReactFlowCanvas";
import PacketToolbar from "@/features/networkCanvas/panels/PacketToolbar";
import CanvasFeedbackLayer from "@/features/networkCanvas/ui/CanvasFeedbackLayer";
import LearningGuidePanel from "@/features/networkCanvas/panels/LearningGuidePanel";

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
    feedbackProps,
    learningGuideProps
}) {
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

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
                    width: isPaletteOpen ? { xs: 220, md: 260 } : 0,
                    minWidth: isPaletteOpen ? { xs: 220, md: 260 } : 0,
                    borderRight: isPaletteOpen ? "1px solid" : "none",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    transition: "width .22s ease, min-width .22s ease",
                }}
            >
                {isPaletteOpen && <SidebarFlow />}
            </Box>

            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                }}
            >

                <PacketToolbar
                    {...toolbarProps}
                    paletteOpen={isPaletteOpen}
                    guideOpen={isGuideOpen}
                    onTogglePalette={() => setIsPaletteOpen((prev) => !prev)}
                    onToggleGuide={() => setIsGuideOpen((prev) => !prev)}
                />

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
                                textAlign: "center",
                                px: 2,
                            }}
                        >
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Diseña tu laboratorio de topologías
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Simula una VLAN para aprendizaje o prepara una orquestación real en AWS.
                                </Typography>
                                {!isPaletteOpen && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: "block" }}>
                                        Tip: abre Tool Palette desde la barra superior para comenzar a arrastrar componentes.
                                    </Typography>
                                )}
                            </Box>
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

            <Box
                sx={{
                    width: isGuideOpen ? { xs: 0, lg: 320 } : 0,
                    minWidth: isGuideOpen ? { xs: 0, lg: 320 } : 0,
                    display: { xs: "none", lg: "block" },
                    borderLeft: isGuideOpen ? "1px solid" : "none",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                    overflow: "hidden",
                    transition: "width .22s ease, min-width .22s ease",
                }}
            >
                {isGuideOpen && <LearningGuidePanel {...learningGuideProps} />}
            </Box>
        </Box>
    );
}

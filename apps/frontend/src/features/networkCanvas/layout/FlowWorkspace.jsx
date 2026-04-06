import { Box, Chip, Stack, Typography } from "@mui/material";
import { useState } from "react";
import SidebarFlow from "@/features/networkCanvas/panels/SidebarFlow";
import ReactFlowCanvas from "@/features/networkCanvas/canvas/ReactFlowCanvas";
import PacketToolbar from "@/features/networkCanvas/panels/PacketToolbar";
import CanvasFeedbackLayer from "@/features/networkCanvas/ui/CanvasFeedbackLayer";
import LearningGuidePanel from "@/features/networkCanvas/panels/LearningGuidePanel";
import { computePlanActionState } from "@/features/networkCanvas/utils/planActionUi";

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
    const workspaceActionState = computePlanActionState(
        toolbarProps?.planStatus,
        toolbarProps?.canvasState,
        toolbarProps?.validationState,
    );
    const isExpandedWorkspaceState =
        toolbarProps?.canvasState === "PLAN_OUTDATED" ||
        toolbarProps?.canvasState === "PLAN_RUNNING" ||
        workspaceActionState.workspaceSeverity === "warning";

    return (
        <Box
            ref={reactFlowWrapper}
            sx={{
                height: "100%",
                display: "flex",
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: (theme) =>
                    theme.palette.mode === "light"
                        ? "0 16px 40px rgba(15,23,42,0.08)"
                        : "0 18px 44px rgba(0,0,0,0.32)",
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
                        px: { xs: 1.5, md: 2 },
                        py: isExpandedWorkspaceState ? 1 : 0.75,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        backgroundColor: (t) =>
                            t.palette.mode === "light" ? "rgba(248,250,252,0.94)" : "rgba(15,23,42,0.7)",
                    }}
                >
                    {isExpandedWorkspaceState ? (
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={1.25}
                            alignItems={{ xs: "flex-start", md: "center" }}
                            justifyContent="space-between"
                        >
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                                    {workspaceActionState.workspaceTitle}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {workspaceActionState.workspaceDetail}
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {workspaceActionState.chips.map((chip) => (
                                    <Chip
                                        key={chip.label}
                                        size="small"
                                        label={chip.label}
                                        color={chip.color}
                                        variant={chip.variant}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={1}
                            alignItems={{ xs: "flex-start", md: "center" }}
                            justifyContent="space-between"
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
                                <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                                    {workspaceActionState.workspaceTitle}
                                </Box>
                                {" · "}
                                {workspaceActionState.workspaceDetail}
                            </Typography>
                            <Chip
                                size="small"
                                label={workspaceActionState.chips?.[0]?.label || workspaceActionState.actionLabel}
                                color={workspaceActionState.chips?.[0]?.color || "default"}
                                variant={workspaceActionState.chips?.[0]?.variant || "outlined"}
                            />
                        </Stack>
                    )}
                </Box>

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
                                    Diseña tu laboratorio de red
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Modela la topología en lenguaje neutral, valida su traducción a AWS y decide si corresponde un deploy o un redeploy.
                                </Typography>
                                {!isPaletteOpen && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: "block" }}>
                                        Tip: abre la paleta de herramientas desde la barra superior para comenzar a arrastrar componentes.
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

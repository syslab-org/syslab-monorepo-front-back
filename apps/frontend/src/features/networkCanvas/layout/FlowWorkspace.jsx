import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import SchoolIcon from "@mui/icons-material/School";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
    const hasAutoOpenedPalette = useRef(false);
    const workspaceActionState = computePlanActionState(
        toolbarProps?.planStatus,
        toolbarProps?.canvasState,
        toolbarProps?.validationState,
    );
    const isExpandedWorkspaceState =
        toolbarProps?.canvasState === "PLAN_OUTDATED" ||
        toolbarProps?.canvasState === "PLAN_RUNNING" ||
        workspaceActionState.workspaceSeverity === "warning";

    useEffect(() => {
        if (nodes.length === 0 && !hasAutoOpenedPalette.current) {
            setIsPaletteOpen(true);
            hasAutoOpenedPalette.current = true;
        }
    }, [nodes.length]);

    const getFloatingToggleSx = (side, isOpen, tone = "primary") => {
        const isSecondary = tone === "secondary";
        const accent = isSecondary
            ? (theme.palette.mode === "light" ? "#0f766e" : "#67e8f9")
            : (theme.palette.mode === "light" ? "#1d4ed8" : "#93c5fd");
        const border = isSecondary
            ? (theme.palette.mode === "light" ? "rgba(15,118,110,0.24)" : "rgba(103,232,249,0.34)")
            : (theme.palette.mode === "light" ? "rgba(29,78,216,0.2)" : "rgba(147,197,253,0.34)");
        const bg = isOpen
            ? isSecondary
                ? (theme.palette.mode === "light" ? "rgba(20,184,166,0.16)" : "rgba(20,184,166,0.24)")
                : (theme.palette.mode === "light" ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.24)")
            : (theme.palette.mode === "light" ? "rgba(255,255,255,0.95)" : "rgba(15,23,42,0.9)");

        return {
            position: "absolute",
            top: 16,
            [side]: 16,
            zIndex: 18,
            pointerEvents: "auto",
            borderRadius: 999,
            px: 1.6,
            py: 1,
            minWidth: 0,
            color: accent,
            border: "1px solid",
            borderColor: border,
            backgroundColor: bg,
            backdropFilter: "blur(10px)",
            boxShadow: theme.palette.mode === "light"
                ? "0 14px 32px rgba(15,23,42,0.12)"
                : "0 16px 36px rgba(2,6,23,0.4)",
            fontWeight: 700,
            letterSpacing: 0.2,
            "&:hover": {
                borderColor: accent,
                backgroundColor: isOpen
                    ? isSecondary
                        ? (theme.palette.mode === "light" ? "rgba(20,184,166,0.2)" : "rgba(20,184,166,0.3)")
                        : (theme.palette.mode === "light" ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.3)")
                    : (theme.palette.mode === "light" ? "#ffffff" : "rgba(30,41,59,0.95)"),
            },
            "& .MuiButton-startIcon, & .MuiButton-endIcon": {
                color: accent,
            },
        };
    };

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
                id="tool-palette-panel"
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
                    showPanelToggles={false}
                />

                <Box
                    data-tour="canvas-state-summary"
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
                    data-tour="canvas-drop-area"
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        position: "relative",
                        backgroundColor: (t) =>
                            t.palette.mode === "light" ? "#f4f6fa" : "#0f172a",
                    }}
                >
                    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 18 }}>
                        <Tooltip title={isPaletteOpen ? "Ocultar herramientas para modelar" : "Abrir herramientas para modelar"} placement="right">
                            <Button
                                variant="outlined"
                                onClick={() => setIsPaletteOpen((prev) => !prev)}
                                aria-expanded={isPaletteOpen}
                                aria-controls="tool-palette-panel"
                                aria-label={isPaletteOpen ? "Ocultar herramientas para modelar" : "Abrir herramientas para modelar"}
                                data-tour="canvas-tools-toggle"
                                sx={getFloatingToggleSx("left", isPaletteOpen, "primary")}
                                startIcon={<ViewSidebarIcon fontSize="small" />}
                                endIcon={isPaletteOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                            >
                                Herramientas
                            </Button>
                        </Tooltip>

                        <Tooltip title={isGuideOpen ? "Ocultar guía de modelado" : "Abrir guía de modelado"} placement="left">
                            <Button
                                variant="outlined"
                                onClick={() => setIsGuideOpen((prev) => !prev)}
                                aria-expanded={isGuideOpen}
                                aria-controls="learning-guide-panel"
                                aria-label={isGuideOpen ? "Ocultar guía de modelado" : "Abrir guía de modelado"}
                                data-tour="canvas-guide-toggle"
                                sx={{
                                    ...getFloatingToggleSx("right", isGuideOpen, "secondary"),
                                    display: { xs: "none", lg: "inline-flex" },
                                }}
                                startIcon={<SchoolIcon fontSize="small" />}
                                endIcon={isGuideOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                            >
                                Guía
                            </Button>
                        </Tooltip>
                    </Box>

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
                            <Box sx={{ pointerEvents: "auto" }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Diseña tu laboratorio de red
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Modela la topología en lenguaje neutral, valida su traducción a AWS y decide si corresponde un deploy o un redeploy.
                                </Typography>
                                {!isPaletteOpen && (
                                    <Stack spacing={1} alignItems="center" sx={{ mt: 1.25 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Usa el boton flotante Herramientas para abrir la paleta y comenzar a arrastrar componentes.
                                        </Typography>
                                    </Stack>
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
                id="learning-guide-panel"
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

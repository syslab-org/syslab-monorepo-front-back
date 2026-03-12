import { ReactFlow, Background, Controls, ConnectionMode } from "@xyflow/react";
import { useMemo } from "react";

function ReactFlowCanvas({
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
    theme
}) {
    const memoNodeTypes = useMemo(() => nodeTypes, [nodeTypes]);

    const memoEdges = useMemo(
        () => edges.map(e => ({ ...e, style: connectionLineStyle, animated: false })),
        [edges, connectionLineStyle]
    );

    return (
        <ReactFlow
            className="pt-canvas"
            nodes={nodes}
            edges={memoEdges}
            onlyRenderVisibleElements
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
            snapToGrid
            snapGrid={[24, 24]}
            selectionOnDrag={false}
            elevateNodesOnSelect
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            fitViewOptions={{ padding: 0.2 }}
            isValidConnection={isValidConnection}
            connectionMode={ConnectionMode.Loose}
            connectionRadius={22}
            nodeTypes={memoNodeTypes}
            nodeOrigin={[0, 0]}
            style={{
                background: theme.palette.mode === "light"
                    ? "linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)"
                    : "radial-gradient(circle at 20% 20%, #0f172a 0%, #0b1220 50%, #070c16 100%)",
                width: "100%",
                height: "100%"
            }}
            connectionLineStyle={connectionLineStyle}
            onPaneClick={() => setNodes(nds => nds.map(n => ({ ...n, selected: false })))}
        >
            <Controls />
            <Background
                variant="lines"
                gap={96}
                size={1}
                color={theme.palette.mode === "light"
                    ? "rgba(148,163,184,0.08)"
                    : "rgba(148,163,184,0.10)"}
            />
            <Background
                variant="dots"
                gap={32}
                size={0.8}
                color="rgba(100,116,139,0.08)"
            />
        </ReactFlow>
    );
}

export default ReactFlowCanvas;

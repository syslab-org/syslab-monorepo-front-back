import { ReactFlow, Background, Controls } from "@xyflow/react";

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

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges.map(e => ({ ...e, style: connectionLineStyle, animated: false }))}
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
            nodeTypes={nodeTypes}
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
                variant="dots"
                gap={32}
                size={0.8}
                color="rgba(100,116,139,0.08)"
            />
        </ReactFlow>
    );
}

export default ReactFlowCanvas;
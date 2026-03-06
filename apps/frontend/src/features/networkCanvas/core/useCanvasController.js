import { useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";

export function useCanvasController(initialNodes) {
  const initialEdges = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const rf = useReactFlow();

  const handleZoomIn = () => rf.zoomIn();
  const handleZoomOut = () => rf.zoomOut();
  const handleFitView = () => rf.fitView({ padding: 0.2 });

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
  };
}

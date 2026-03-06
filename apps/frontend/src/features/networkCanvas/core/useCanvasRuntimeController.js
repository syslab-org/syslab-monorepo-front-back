import { useReactFlow } from "@xyflow/react";
import { useCanvasController } from "./useCanvasController";
import { useFlowState } from "../hooks/useFlowState";
import useNodeDrag from "../hooks/useNodeDrag";
import useHandleDrop from "../hooks/useHandleDrop";
import useRestrictMovement from "../hooks/useRestrictMovement";
import { useNodeSelection } from "../domain/useNodeSelection";
import { useNodeActions } from "../domain/useNodeActions";

export function useCanvasRuntimeController({ initialNodes, setCanvasUiError }) {
  const reactFlow = useReactFlow();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
  } = useCanvasController(initialNodes);

  const flowState = useFlowState();

  const nodeSelection = useNodeSelection();

  const nodeDrag = useNodeDrag({
    nodes,
    setNodes,
  });

  const movement = useRestrictMovement(reactFlow, setNodes);

  const drop = useHandleDrop(null, setNodes, setCanvasUiError);

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
    ...flowState,
    ...nodeSelection,
    ...nodeDrag,
    ...movement,
    ...drop,
  };
}

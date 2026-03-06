import { useReactFlow } from "@xyflow/react";
import { useCanvasController } from "./useCanvasController";
import { useFlowState } from "../hooks/useFlowState";
import useNodeDrag from "../hooks/useNodeDrag";
import useHandleDrop from "../hooks/useHandleDrop";
import useRestrictMovement from "../hooks/useRestrictMovement";
import { useNodeSelection } from "../domain/useNodeSelection";
import { useNodeActions } from "../domain/useNodeActions";

export function useCanvasRuntimeController({
  initialNodes,
  setCanvasUiError,
  reactFlowInstance,
  setTarget,
  TYPE_SUBNETWORK_NODE,
}) {
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

  const { isValidConnection, onConnectStart, onConnect, onConnectEnd } =
    useFlowState();

  const nodeSelection = useNodeSelection();

  const nodeDrag = useNodeDrag({
    nodes,
    setTarget,
    TYPE_SUBNETWORK_NODE,
  });

  const movement = useRestrictMovement(
    reactFlowInstance || reactFlow,
    setNodes,
  );

  const drop = useHandleDrop(reactFlowInstance, setNodes, setCanvasUiError);

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
    isValidConnection,
    onConnectStart,
    onConnect,
    onConnectEnd,
    ...nodeSelection,
    ...nodeDrag,
    ...movement,
    ...drop,
  };
}

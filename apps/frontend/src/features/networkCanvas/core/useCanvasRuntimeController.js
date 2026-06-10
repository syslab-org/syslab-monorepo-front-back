import { useReactFlow } from "@xyflow/react";
import { useCanvasController } from "./useCanvasController";
import { useFlowState } from "../hooks/useFlowState";
import useNodeDrag from "../hooks/useNodeDrag";
import useHandleDrop from "../hooks/useHandleDrop";
import useRestrictMovement from "../hooks/useRestrictMovement";
import { useNodeSelection } from "../domain/useNodeSelection";
import { useNodeActions } from "../domain/useNodeActions";
import { useVpcRouterSync } from "../core/useVpcRouterSync";
import { useRestrictSubnetsInsideVPC } from "../hooks/useRestrictSubnetsInsideVPC";

export function useCanvasRuntimeController({
  initialNodes,
  setCanvasUiError,
  reactFlowInstance,
  setTarget,
  TYPE_SUBNETWORK_NODE,
  provider = "aws",
  defaultRegion,
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
    useFlowState(setCanvasUiError);

  const nodeSelection = useNodeSelection();

  const nodeDrag = useNodeDrag({
    nodes,
    setTarget,
    TYPE_SUBNETWORK_NODE,
  });

  const movement = useRestrictMovement(
    reactFlowInstance || reactFlow,
    setNodes,
    nodes,
  );

  const drop = useHandleDrop(reactFlowInstance, setNodes, setCanvasUiError, {
    provider,
    defaultRegion,
  });

  // Ensure subnets remain inside their VPC boundaries
  useRestrictSubnetsInsideVPC();

  // Keep router/subnet relationships synchronized
  useVpcRouterSync({
    nodes,
    edges,
    setNodes,
  });

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

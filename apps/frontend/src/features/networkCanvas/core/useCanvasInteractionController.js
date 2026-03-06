import { useCallback } from "react";

export function useCanvasInteractionController({ setNodes, initialNodes }) {
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeDragStart = useCallback(
    (_, node) => {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
    },
    [setNodes],
  );

  const restoreInitialNodes = useCallback(() => {
    setNodes(initialNodes);
  }, [setNodes, initialNodes]);

  return {
    onDragOver,
    onNodeDragStart,
    restoreInitialNodes,
  };
}

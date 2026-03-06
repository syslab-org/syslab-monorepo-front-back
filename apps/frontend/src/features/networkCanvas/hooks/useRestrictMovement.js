// useRestrictMovement.js
import { useCallback } from 'react';

export default function useRestrictMovement(reactFlowInstance, setNodes) {
  const onNodeDragStop = useCallback((_, node) => {
    if (!reactFlowInstance) return;
    const parentId = node.parentNode || node.parentId;
    if (!parentId) return;

    const parent = reactFlowInstance.getNode(parentId);
    if (!parent) return;

      const nodeAbs = reactFlowInstance.getInternalNode(node.id);
      const parentAbs = reactFlowInstance.getInternalNode(parentId);
      if (!nodeAbs?.positionAbsolute || !parentAbs?.positionAbsolute) return;

      const { x: nx, y: ny } = nodeAbs.positionAbsolute;
      const nw = node.width || node.style?.width; const nh = node.height || node.style?.height;
      const { x: px, y: py } = parentAbs.positionAbsolute;
      const pw = parent.width || parent.style?.width; const ph = parent.height || parent.style?.height;

    let clampedX = node.position.x;
    let clampedY = node.position.y;

    if (nx < px) clampedX = 0;
    if (ny < py) clampedY = 0;
    if (nx + nw > px + pw) clampedX = pw - nw;
    if (ny + nh > py + ph) clampedY = ph - nh;

    if (clampedX !== node.position.x || clampedY !== node.position.y) {
      setNodes(nds => nds.map(n => n.id === node.id ? { ...n, position: { x: clampedX, y: clampedY } } : n));
    }
  }, [reactFlowInstance, setNodes]);

  return { onNodeDragStop };
}

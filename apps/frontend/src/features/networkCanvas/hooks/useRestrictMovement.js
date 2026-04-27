// useRestrictMovement.js
import { useCallback, useEffect } from 'react';
import {
  clampToParentContent,
  getNodeDefaultSize,
  toNumber,
} from '@/features/networkCanvas/utils/nodeGeometry';

const clampNodeToParentContent = (node, parent) => {
  const childDefault = getNodeDefaultSize(node.type);
  const parentDefault = getNodeDefaultSize(parent.type);

  return clampToParentContent({
    childPosition: node.position,
    childSize: {
      width: toNumber(node.width ?? node.style?.width, childDefault.width),
      height: toNumber(node.height ?? node.style?.height, childDefault.height),
    },
    parentSize: {
      width: toNumber(parent.width ?? parent.style?.width, parentDefault.width),
      height: toNumber(parent.height ?? parent.style?.height, parentDefault.height),
    },
    parentType: parent.type,
  });
};

export default function useRestrictMovement(reactFlowInstance, setNodes, nodes) {
  useEffect(() => {
    if (!Array.isArray(nodes) || nodes.length === 0) return;

    setNodes((nds) => {
      let changed = false;
      const nextNodes = nds.map((node) => {
        const nodeDefault = getNodeDefaultSize(node.type);
        const currentWidth = toNumber(
          node.width ?? node.style?.width,
          nodeDefault.width,
        );
        const currentHeight = toNumber(
          node.height ?? node.style?.height,
          nodeDefault.height,
        );
        const enforcedWidth = Math.max(currentWidth, nodeDefault.width);
        const enforcedHeight = Math.max(currentHeight, nodeDefault.height);

        let nextNode = node;
        if (enforcedWidth !== currentWidth || enforcedHeight !== currentHeight) {
          changed = true;
          nextNode = {
            ...node,
            width: enforcedWidth,
            height: enforcedHeight,
            style: {
              ...node.style,
              width: enforcedWidth,
              height: enforcedHeight,
            },
          };
        }

        const parentId = node.parentNode || node.parentId;
        if (!parentId) return nextNode;

        const parent = nds.find((candidate) => candidate.id === parentId);
        if (!parent) return nextNode;

        const clampedPosition = clampNodeToParentContent(nextNode, parent);
        if (
          clampedPosition.x === nextNode.position.x &&
          clampedPosition.y === nextNode.position.y
        ) {
          return nextNode;
        }

        changed = true;
        return {
          ...nextNode,
          position: clampedPosition,
        };
      });

      return changed ? nextNodes : nds;
    });
  }, [nodes, setNodes]);

  const onNodeDragStop = useCallback((_, node) => {
    if (!reactFlowInstance) return;
    const parentId = node.parentNode || node.parentId;
    if (!parentId) return;

    const parent = reactFlowInstance.getNode(parentId);
    if (!parent) return;

    const clampedPosition = clampNodeToParentContent(node, parent);

    if (
      clampedPosition.x !== node.position.x ||
      clampedPosition.y !== node.position.y
    ) {
      setNodes((nds) =>
        nds.map((candidate) =>
          candidate.id === node.id
            ? { ...candidate, position: clampedPosition }
            : candidate,
        ),
      );
    }
  }, [reactFlowInstance, setNodes]);

  return { onNodeDragStop };
}

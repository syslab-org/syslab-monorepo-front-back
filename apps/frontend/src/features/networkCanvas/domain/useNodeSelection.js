import { useState, useCallback } from "react";

/**
 * Encapsula la selección de nodos y el estado del modal
 */
export function useNodeSelection() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const openNodeModal = useCallback((node) => {
    setSelectedNode(node);
    setModalIsOpen(true);
  }, []);

  const closeNodeModal = useCallback(() => {
    setModalIsOpen(false);
    setSelectedNode(null);
  }, []);

  return {
    modalIsOpen,
    selectedNode,
    openNodeModal,
    closeNodeModal,
    setSelectedNode,
    setModalIsOpen,
  };
}

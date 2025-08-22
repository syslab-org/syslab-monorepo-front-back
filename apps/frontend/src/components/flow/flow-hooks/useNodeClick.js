// src/components/flow/flow-hooks/useNodeClick.js
export default function useNodeClick(setSelectedNode, setModalIsOpen) {
  return (event, node) => {
    setSelectedNode(node);
    setModalIsOpen(true);
  };
}

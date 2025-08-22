const useNodeDragStart = (dragRef) => {
    return (evt, node) => {
        dragRef.current = node;
    };
};

export default useNodeDragStart;
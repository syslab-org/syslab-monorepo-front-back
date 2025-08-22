const useNodeDrag = ({nodes, setTarget, TYPE_SUBNETWORK_NODE}) => {
    return (evt, node) => {
        const centerX = node.position.x + node.width / 2;
        const centerY = node.position.y + node.height / 2;

        const targetNode = nodes.find(
            (n) =>
                centerX > n.position.x &&
                centerX < n.position.x + n.width &&
                centerY > n.position.y &&
                centerY < n.position.y + n.height &&
                n.type === TYPE_SUBNETWORK_NODE &&
                n.id !== node.id
        );

        setTarget(targetNode);
    };
};

export default useNodeDrag;

import { useCallback } from 'react';
import { TYPE_VPC_NODE, TYPE_SUBNETWORK_NODE, restrictedNodes } from '../utils/constants';

// Calcula posición absoluta acumulando padres
function getAbsolutePosition(node, nodes) {
    let absX = node.positionAbsolute?.x ?? node.position?.x ?? 0;
    let absY = node.positionAbsolute?.y ?? node.position?.y ?? 0;
    let parentId = node.parentNode;
    while (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (!parent) break;
        absX += parent.positionAbsolute?.x ?? parent.position?.x ?? 0;
        absY += parent.positionAbsolute?.y ?? parent.position?.y ?? 0;
        parentId = parent.parentNode;
    }
    return { x: absX, y: absY };
}

// Verifica que el hijo quede completamente dentro del padre
function isCompletelyInsideParent(childNode, parentNode, nodes) {
    const childAbs = getAbsolutePosition(childNode, nodes);
    const parentAbs = getAbsolutePosition(parentNode, nodes);

    const parentW = parentNode.style?.width ?? parentNode.width ?? 0;
    const parentH = parentNode.style?.height ?? parentNode.height ?? 0;
    const childW = childNode.style?.width ?? childNode.width ?? 0;
    const childH = childNode.style?.height ?? childNode.height ?? 0;

    // Bordes
    const px1 = parentAbs.x;
    const px2 = parentAbs.x + parentW;
    const py1 = parentAbs.y;
    const py2 = parentAbs.y + parentH;

    const cx1 = childAbs.x;
    const cx2 = childAbs.x + childW;
    const cy1 = childAbs.y;
    const cy2 = childAbs.y + childH;

    // Verifica que TODO el nodo hijo esté dentro del padre
    return (cx1 >= px1 && cx2 <= px2 && cy1 >= py1 && cy2 <= py2);
}

const useNodeDragStop = ({ nodes, setNodes }) => {
    return useCallback((evt, node) => {
        // SUBNET solo puede estar completamente dentro de un VPC
        if (node.type === TYPE_SUBNETWORK_NODE) {
            const vpcTarget = nodes.find((nd) =>
                nd.type === TYPE_VPC_NODE &&
                nd.position &&
                isCompletelyInsideParent(node, nd, nodes)
            );
            if (vpcTarget && vpcTarget.position) {
                const vpcAbs = getAbsolutePosition(vpcTarget, nodes);
                const xOffset = node.positionAbsolute.x - vpcAbs.x;
                const yOffset = node.positionAbsolute.y - vpcAbs.y;
                setNodes((prevNodes) =>
                    prevNodes.map((n) =>
                        n.id === node.id
                            ? {
                                ...n,
                                parentNode: vpcTarget.id,
                                extent: 'parent',
                                position: { x: xOffset, y: yOffset }
                            }
                            : n
                    )
                );
            } else {
                alert('Las Subnets solo pueden estar completamente dentro de una VPC');
            }
            return;
        }

        // Instancias solo pueden estar completamente dentro de una Subnet
        if (restrictedNodes.includes(node.type)) {
            const subnetTarget = nodes.find((nd) =>
                nd.type === TYPE_SUBNETWORK_NODE &&
                nd.position &&
                isCompletelyInsideParent(node, nd, nodes)
            );
            if (subnetTarget && subnetTarget.position) {
                const subnetAbs = getAbsolutePosition(subnetTarget, nodes);
                const xOffset = node.positionAbsolute.x - subnetAbs.x;
                const yOffset = node.positionAbsolute.y - subnetAbs.y;
                setNodes((prevNodes) =>
                    prevNodes.map((n) =>
                        n.id === node.id
                            ? {
                                ...n,
                                parentNode: subnetTarget.id,
                                extent: 'parent',
                                position: { x: xOffset, y: yOffset }
                            }
                            : n
                    )
                );
            } else {
                alert('Las instancias solo pueden estar completamente dentro de una Subnet');
            }
            return;
        }

        // Otros nodos pueden quedar libres
    }, [nodes, setNodes]);
};

export default useNodeDragStop;

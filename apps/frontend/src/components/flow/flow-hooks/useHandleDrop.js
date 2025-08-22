// src/components/flow/flow-hooks/useHandleDrop.js
import { useCallback } from 'react';
import {
  TYPE_VPC_NODE,
  TYPE_SUBNETWORK_NODE,
  restrictedNodes,
  widthDefaultVPCNode, heightDefaultVPCNode,
  widthDefaultSubNetworkNode, heightDefaultSubNetworkNode,
  widthDefaultInstanceNode, heightDefaultInstanceNode,
  colorBgInstanceNode, colorsBgSubnetworksNodes,
  TYPE_ROUTER_NODE
} from '../utils/constants';
import getNodeTitle from '../utils/getNodeTitle';

const getRandomColor = () =>
  colorsBgSubnetworksNodes[Math.floor(Math.random() * colorsBgSubnetworksNodes.length)];

const makeId = () => Math.random().toString(36).substring(2, 10);

// Convierte posibles tamaños en number (pueden venir como string en style)
const toNumber = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace('px', ''));
  return Number.isFinite(n) ? n : fallback;
};

export default function useHandleDrop(reactFlowInstance, setNodes) {
  return {
    onDrop: useCallback((event) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const pos = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      // tamaño por defecto según tipo
      let width = widthDefaultInstanceNode;
      let height = heightDefaultInstanceNode;
      if (type === TYPE_VPC_NODE) {
        width = widthDefaultVPCNode; height = heightDefaultVPCNode;
      } else if (type === TYPE_SUBNETWORK_NODE) {
        width = widthDefaultSubNetworkNode; height = heightDefaultSubNetworkNode;
      }

      const bg = restrictedNodes.includes(type) ? colorBgInstanceNode : getRandomColor();
      const center = { x: pos.x + width / 2, y: pos.y + height / 2 };
      const id = makeId();

      const baseData = { label: `${type}-${id}`, title: getNodeTitle({ type }), bgNode: bg };

      // Nota: evitamos leer `all = getNodes()` y luego `setNodes(...)` para casos de carrera.
      setNodes((nds) => {
        const all = nds;
        let newNode = {
          id, type, position: pos, width, height, data: { ...baseData }
        };

        // 1) VPC se suelta libremente
        if (type === TYPE_VPC_NODE) {
          return [...nds, newNode];
        }

        // 2) SUBNET debe caer DENTRO de una VPC (extent: 'parent')
        if (type === TYPE_SUBNETWORK_NODE) {
          const parent = all.find((n) => {
            if (n.type !== TYPE_VPC_NODE) return false;
            const pw = toNumber(n.width ?? n.style?.width, widthDefaultVPCNode);
            const ph = toNumber(n.height ?? n.style?.height, heightDefaultVPCNode);
            const { x: px, y: py } = n.position;
            return center.x > px && center.x < px + pw && center.y > py && center.y < py + ph;
          });
          if (!parent) return nds; // fuera de cualquier VPC → ignorar drop

          const { x: px, y: py } = parent.position;
          newNode = {
            ...newNode,
            parentId: parent.id,
            parentNode: parent.id,
            position: { x: pos.x - px, y: pos.y - py },
            extent: 'parent',
          };
          return [...nds, newNode];
        }

        // 3) ROUTER: solo 1 por lienzo (chequeo atómico sobre nds)
        if (type === TYPE_ROUTER_NODE) {
          //valores por defecto útiles para el form de router

          newNode = {
            ...newNode,
            data: {
              ...newNode.data,
              identifier: `router-${id}`,
              region: 'us-east-1',
              routeTable: [] //lista vacía de rutas 
            }
          }

          // const exists = all.some((n) => n.type === TYPE_ROUTER_NODE);
          // if (exists) {
          //   alert('Only one router node is allowed in the flow.');
          //   return nds;
          // }
          return [...nds, newNode];
        }

        // 4) INSTANCIAS/RESTRICTED: deben caer dentro de una SUBNET (extent: 'parent')
        if (restrictedNodes.includes(type)) {
          const subnet = all.find((n) => {
            if (n.type !== TYPE_SUBNETWORK_NODE) return false;

            const parent = all.find((p) => p.id === (n.parentNode || n.parentId));
            if (!parent) return false;

            const pw = toNumber(parent.width ?? parent.style?.width, widthDefaultVPCNode);
            const ph = toNumber(parent.height ?? parent.style?.height, heightDefaultVPCNode);

            const sw = toNumber(n.width ?? n.style?.width, widthDefaultSubNetworkNode);
            const sh = toNumber(n.height ?? n.style?.height, heightDefaultSubNetworkNode);

            // posición absoluta de la subnet (parent + offset)
            const absX = parent.position.x + (n.position?.x ?? 0);
            const absY = parent.position.y + (n.position?.y ?? 0);

            return center.x > absX && center.x < absX + sw && center.y > absY && center.y < absY + sh;
          });

          if (!subnet) return nds; // fuera de cualquier subnet → ignorar drop

          const parent = all.find((p) => p.id === (subnet.parentNode || subnet.parentId));
          if (!parent) return nds;

          const absX = parent.position.x + (subnet.position?.x ?? 0);
          const absY = parent.position.y + (subnet.position?.y ?? 0);

          newNode = {
            ...newNode,
            parentId: subnet.id,
            parentNode: subnet.id,
            position: { x: pos.x - absX, y: pos.y - absY },
            extent: 'parent',
          };
          return [...nds, newNode];
        }

        // 5) tipo no contemplado → ignora
        return nds;
      });
    }, [reactFlowInstance, setNodes])
  };
}

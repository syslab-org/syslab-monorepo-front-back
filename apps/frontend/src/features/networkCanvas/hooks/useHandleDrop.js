// src/components/flow/flow-hooks/useHandleDrop.js
import { useCallback } from "react";
import {
  TYPE_VPC_NODE,
  TYPE_SUBNETWORK_NODE,
  restrictedNodes,
  colorBgInstanceNode,
  colorsBgSubnetworksNodes,
  TYPE_ROUTER_NODE,
} from "@/features/networkCanvas/utils/constants";
import getNodeTitle from "@/features/networkCanvas/utils/getNodeTitle";
import {
  clampToParentContent,
  getNodeDefaultSize,
  toNumber,
} from "@/features/networkCanvas/utils/nodeGeometry";

const getRandomColor = () =>
  colorsBgSubnetworksNodes[
    Math.floor(Math.random() * colorsBgSubnetworksNodes.length)
  ];

const makeId = () => Math.random().toString(36).substring(2, 10);

export default function useHandleDrop(
  reactFlowInstance,
  setNodes,
  setCanvasUiError,
) {
  return {
    onDrop: useCallback(
      (event) => {
        event.preventDefault();
        if (!reactFlowInstance) return;

        const type = event.dataTransfer.getData("application/reactflow");
        if (!type) return;

        // === VALIDACIÓN DE ORDEN LÓGICO (VPC -> SUBNET -> INSTANCIA) ===
        const hasVpc = (nodes) => nodes.some((n) => n.type === TYPE_VPC_NODE);
        const hasSubnet = (nodes) =>
          nodes.some((n) => n.type === TYPE_SUBNETWORK_NODE);

        const pos = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const { width, height } = getNodeDefaultSize(type);

        const bg = restrictedNodes.includes(type)
          ? colorBgInstanceNode
          : getRandomColor();
        const center = { x: pos.x + width / 2, y: pos.y + height / 2 };
        const id = makeId();

        const baseData = {
          label: `${type}-${id}`,
          title: getNodeTitle({ type }),
          bgNode: bg,
        };

        // Nota: evitamos leer `all = getNodes()` y luego `setNodes(...)` para casos de carrera.
        setNodes((nds) => {
          const all = nds;
          // Validación estructural mínima antes de posicionamiento
          if (type === TYPE_SUBNETWORK_NODE && !hasVpc(all)) {
            setCanvasUiError?.(
              "Debes crear una VPC antes de agregar una Subnet.",
            );
            return nds;
          }

          if (restrictedNodes.includes(type) && !hasSubnet(all)) {
            setCanvasUiError?.(
              "Debes crear una Subnet dentro de una VPC antes de agregar una instancia.",
            );
            return nds;
          }
          let newNode = {
            id,
            type,
            position: pos,
            width,
            height,
            data: { ...baseData },
          };

          // 1) VPC se suelta libremente
          if (type === TYPE_VPC_NODE) {
            return [...nds, newNode];
          }

          // 2) SUBNET debe caer DENTRO de una VPC (extent: 'parent')
          if (type === TYPE_SUBNETWORK_NODE) {
            const parent = all.find((n) => {
              if (n.type !== TYPE_VPC_NODE) return false;
              const parentDefault = getNodeDefaultSize(n.type);
              const pw = toNumber(
                n.width ?? n.style?.width,
                parentDefault.width,
              );
              const ph = toNumber(
                n.height ?? n.style?.height,
                parentDefault.height,
              );
              const { x: px, y: py } = n.position;
              return (
                center.x > px &&
                center.x < px + pw &&
                center.y > py &&
                center.y < py + ph
              );
            });
            if (!parent) {
              setCanvasUiError?.("La Subnet debe colocarse dentro de una VPC.");
              return nds;
            }

            const { x: px, y: py } = parent.position;
            const parentDefault = getNodeDefaultSize(parent.type);
            const relativePosition = clampToParentContent({
              childPosition: { x: pos.x - px, y: pos.y - py },
              childSize: { width, height },
              parentSize: {
                width: toNumber(
                  parent.width ?? parent.style?.width,
                  parentDefault.width,
                ),
                height: toNumber(
                  parent.height ?? parent.style?.height,
                  parentDefault.height,
                ),
              },
              parentType: parent.type,
            });
            newNode = {
              ...newNode,
              parentId: parent.id,
              parentNode: parent.id,
              position: relativePosition,
              extent: "parent",
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
                region: "us-east-1",
                routeTable: [], //lista vacía de rutas
              },
            };

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

              const parent = all.find(
                (p) => p.id === (n.parentNode || n.parentId),
              );
              if (!parent) return false;

              const subnetDefault = getNodeDefaultSize(n.type);
              const sw = toNumber(
                n.width ?? n.style?.width,
                subnetDefault.width,
              );
              const sh = toNumber(
                n.height ?? n.style?.height,
                subnetDefault.height,
              );

              // posición absoluta de la subnet (parent + offset)
              const absX = parent.position.x + (n.position?.x ?? 0);
              const absY = parent.position.y + (n.position?.y ?? 0);

              return (
                center.x > absX &&
                center.x < absX + sw &&
                center.y > absY &&
                center.y < absY + sh
              );
            });
            if (!subnet) {
              setCanvasUiError?.(
                "La instancia debe colocarse dentro de una Subnet.",
              );
              return nds;
            }

            const parent = all.find(
              (p) => p.id === (subnet.parentNode || subnet.parentId),
            );
            if (!parent) return nds;

            const absX = parent.position.x + (subnet.position?.x ?? 0);
            const absY = parent.position.y + (subnet.position?.y ?? 0);
            const subnetDefault = getNodeDefaultSize(subnet.type);
            const relativePosition = clampToParentContent({
              childPosition: { x: pos.x - absX, y: pos.y - absY },
              childSize: { width, height },
              parentSize: {
                width: toNumber(
                  subnet.width ?? subnet.style?.width,
                  subnetDefault.width,
                ),
                height: toNumber(
                  subnet.height ?? subnet.style?.height,
                  subnetDefault.height,
                ),
              },
              parentType: subnet.type,
            });

            newNode = {
              ...newNode,
              parentId: subnet.id,
              parentNode: subnet.id,
              position: relativePosition,
              extent: "parent",
            };
            return [...nds, newNode];
          }

          // 5) tipo no contemplado → ignora
          return nds;
        });
      },
      [reactFlowInstance, setNodes, setCanvasUiError],
    ),
  };
}

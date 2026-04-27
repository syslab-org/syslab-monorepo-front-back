import {
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE,
  heightDefaultInstanceNode,
  heightDefaultInstanceRouter,
  heightDefaultSubNetworkNode,
  heightDefaultVPCNode,
  widthDefaultInstanceNode,
  widthDefaultInstanceRouter,
  widthDefaultSubNetworkNode,
  widthDefaultVPCNode,
} from "./constants";

const DEFAULT_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

const NODE_CONTENT_INSETS = {
  [TYPE_VPC_NODE]: { top: 182, right: 24, bottom: 28, left: 24 },
  [TYPE_SUBNETWORK_NODE]: { top: 126, right: 16, bottom: 18, left: 16 },
};

const INSTANCE_TYPES = new Set([
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_SERVER_NODE,
]);

export const toNumber = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace("px", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getNodeDefaultSize = (type) => {
  if (type === TYPE_VPC_NODE) {
    return { width: widthDefaultVPCNode, height: heightDefaultVPCNode };
  }

  if (type === TYPE_SUBNETWORK_NODE) {
    return {
      width: widthDefaultSubNetworkNode,
      height: heightDefaultSubNetworkNode,
    };
  }

  if (type === TYPE_ROUTER_NODE) {
    return {
      width: widthDefaultInstanceRouter,
      height: heightDefaultInstanceRouter,
    };
  }

  if (INSTANCE_TYPES.has(type)) {
    return {
      width: widthDefaultInstanceNode,
      height: heightDefaultInstanceNode,
    };
  }

  return {
    width: widthDefaultInstanceNode,
    height: heightDefaultInstanceNode,
  };
};

export const getNodeContentInsets = (type) =>
  NODE_CONTENT_INSETS[type] || DEFAULT_INSETS;

export const clampToParentContent = ({
  childPosition,
  childSize,
  parentSize,
  parentType,
}) => {
  const insets = getNodeContentInsets(parentType);
  const minX = insets.left;
  const minY = insets.top;
  const maxX = Math.max(minX, parentSize.width - insets.right - childSize.width);
  const maxY = Math.max(minY, parentSize.height - insets.bottom - childSize.height);

  return {
    x: Math.min(Math.max(childPosition.x, minX), maxX),
    y: Math.min(Math.max(childPosition.y, minY), maxY),
  };
};

const rectsOverlap = (a, b, gap = 12) =>
  !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );

export const findFreePositionInParent = ({
  preferredPosition,
  childSize,
  parentSize,
  parentType,
  siblings = [],
  step = 24,
  gap = 12,
}) => {
  const candidate = clampToParentContent({
    childPosition: preferredPosition,
    childSize,
    parentSize,
    parentType,
  });

  const normalizedSiblings = siblings.map((sibling) => {
    const fallback = getNodeDefaultSize(sibling.type);
    return {
      x: sibling.position?.x ?? 0,
      y: sibling.position?.y ?? 0,
      width: toNumber(sibling.width ?? sibling.style?.width, fallback.width),
      height: toNumber(sibling.height ?? sibling.style?.height, fallback.height),
    };
  });

  const fits = (position) =>
    normalizedSiblings.every((sibling) => !rectsOverlap({
      x: position.x,
      y: position.y,
      width: childSize.width,
      height: childSize.height,
    }, sibling, gap));

  if (fits(candidate)) return candidate;

  const insets = getNodeContentInsets(parentType);
  const maxX = Math.max(insets.left, parentSize.width - insets.right - childSize.width);
  const maxY = Math.max(insets.top, parentSize.height - insets.bottom - childSize.height);

  for (let y = insets.top; y <= maxY; y += step) {
    for (let x = insets.left; x <= maxX; x += step) {
      const position = { x, y };
      if (fits(position)) return position;
    }
  }

  return candidate;
};

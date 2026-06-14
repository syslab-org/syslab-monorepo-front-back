export function getNodeProviderOverride(nodeData, provider) {
  const key = String(provider || "").trim().toLowerCase();
  const overrides =
    nodeData && typeof nodeData.provider_overrides === "object" && nodeData.provider_overrides
      ? nodeData.provider_overrides
      : {};
  return overrides[key] && typeof overrides[key] === "object" ? overrides[key] : {};
}

export function mergeNodeProviderOverrides(nodeData, provider, patch = {}) {
  const key = String(provider || "").trim().toLowerCase();
  const previous =
    nodeData && typeof nodeData.provider_overrides === "object" && nodeData.provider_overrides
      ? nodeData.provider_overrides
      : {};

  if (!key) return previous;

  return {
    ...previous,
    [key]: {
      ...(previous[key] || {}),
      ...patch,
    },
  };
}

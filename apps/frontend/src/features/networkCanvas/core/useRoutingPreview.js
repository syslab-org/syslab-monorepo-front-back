import { useState } from "react";
import { buildRoutingPreview } from "@/features/networkCanvas/utils/buildRoutingPreview";

/**
 * Maneja el estado y generación del Routing Preview
 */
export function useRoutingPreview(nodes, edges) {
  const [routesPreviewOpen, setRoutesPreviewOpen] = useState(false);
  const [routesPreviewData, setRoutesPreviewData] = useState(null);

  const openRoutesPreview = () => {
    const preview = buildRoutingPreview(nodes, edges);
    setRoutesPreviewData(preview);
    setRoutesPreviewOpen(true);
  };

  const closeRoutesPreview = () => {
    setRoutesPreviewOpen(false);
  };

  return {
    routesPreviewOpen,
    routesPreviewData,
    openRoutesPreview,
    closeRoutesPreview,
  };
}

import { useState, useCallback } from "react";
import { buildRoutingPreview } from "@/features/networkCanvas/utils/buildRoutingPreview";

/**
 * Maneja el estado y generación del Routing Preview
 */
export function useRoutingPreview(nodes, edges) {
  const [routesPreviewOpen, setRoutesPreviewOpen] = useState(false);
  const [routesPreviewData, setRoutesPreviewData] = useState(null);

  const openRoutesPreview = useCallback(() => {
    const preview = buildRoutingPreview(nodes, edges);
    setRoutesPreviewData(preview);
    setRoutesPreviewOpen(true);
  }, [nodes, edges]);

  const closeRoutesPreview = useCallback(() => {
    setRoutesPreviewOpen(false);
  }, []);

  return {
    routesPreviewOpen,
    routesPreviewData,
    openRoutesPreview,
    closeRoutesPreview,
  };
}

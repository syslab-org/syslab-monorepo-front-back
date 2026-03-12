import { useEffect } from "react";

import { api } from "@/infrastructure/http/api";

export const usePlanMeta = ({
  vpcid,
  setCanvasPlanId,
  setValidatedPlanHash,
}) => {
  useEffect(() => {
    let alive = true;

    const loadPlanMeta = async () => {
      try {
        if (!vpcid) return;
        const lab = await api.getLab(vpcid);
        if (!alive) return;
        setCanvasPlanId(lab?.metadata?.planId || null);
        setValidatedPlanHash(lab?.plan_canvas_hash || "");
      } catch (error) {
        if (!alive) return;
        console.warn("Error loading plan meta:", error);
        setValidatedPlanHash(null);
      }
    };

    loadPlanMeta();
    return () => {
      alive = false;
    };
  }, [vpcid, setCanvasPlanId, setValidatedPlanHash]);
};

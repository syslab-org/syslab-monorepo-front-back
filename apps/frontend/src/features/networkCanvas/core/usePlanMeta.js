import { useEffect } from "react";

import { api } from "@/infrastructure/http/api";

export const usePlanMeta = ({
  labId,
  vpcid,
  setCanvasPlanId,
  setValidatedPlanHash,
}) => {
  useEffect(() => {
    let alive = true;
    const resolvedLabId = labId || vpcid;

    const loadPlanMeta = async () => {
      try {
        if (!resolvedLabId) return;
        const lab = await api.getLab(resolvedLabId);
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
  }, [labId, vpcid, setCanvasPlanId, setValidatedPlanHash]);
};

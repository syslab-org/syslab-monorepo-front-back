import { useEffect } from "react";

import { computeInfraHash } from "../utils/infraHash";
import { api } from "@/infrastructure/http/api";

export const usePlanValidationSync = ({
  validationState,
  validationResult,
  nodes,
  edges,
  vpcid,
  setCanvasPlanId,
  setValidatedPlanHash,
  setIsCanvasDirty,
  setHasValidatedInSession,
}) => {
  useEffect(() => {
    if (validationState !== "SUCCESS" || !validationResult?.plan_id) return;

    const pid = validationResult.plan_id;
    setCanvasPlanId(pid);

    const okHash = computeInfraHash(nodes, edges);
    setValidatedPlanHash(okHash);

    const persist = async () => {
      try {
        const existing = await api.getLab(vpcid);
        const metadata = { ...(existing?.metadata || {}), planId: pid };
        await api.updateLab(vpcid, {
          metadata,
          plan_canvas_hash: okHash,
        });
      } catch (e) {
        console.warn("No se pudo persistir planCanvasHash:", e);
      }
    };

    persist();

    setIsCanvasDirty(false);
    setHasValidatedInSession(true);
  }, [validationState, validationResult?.plan_id]);
};

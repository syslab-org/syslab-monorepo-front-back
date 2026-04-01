import { useEffect, useRef } from "react";

import { computeInfraHash } from "../utils/infraHash";
import { api } from "@/infrastructure/http/api";

export const usePlanValidationSync = ({
  validationState,
  validationResult,
  nodes,
  edges,
  labId,
  vpcid,
  setCanvasPlanId,
  setValidatedPlanHash,
  setIsCanvasDirty,
  setHasValidatedInSession,
}) => {
  const lastSyncedValidationRef = useRef(null);

  useEffect(() => {
    if (validationState !== "SUCCESS" || !validationResult?.plan_id) return;

    const pid = validationResult.plan_id;
    const syncKey = validationResult;

    if (lastSyncedValidationRef.current === syncKey) return;
    lastSyncedValidationRef.current = syncKey;

    setCanvasPlanId(pid);
    const resolvedLabId = labId || vpcid;

    const okHash = computeInfraHash(nodes, edges);
    setValidatedPlanHash(okHash);

    const persist = async () => {
      try {
        const existing = await api.getLab(resolvedLabId);
        const metadata = { ...(existing?.metadata || {}), planId: pid };
        await api.updateLab(resolvedLabId, {
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
  }, [validationState, validationResult, nodes, edges, labId, vpcid, setCanvasPlanId, setValidatedPlanHash, setIsCanvasDirty, setHasValidatedInSession]);
};

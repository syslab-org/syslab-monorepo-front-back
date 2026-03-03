// features/networkCanvas/core/usePlanValidationSync.js

import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { computeInfraHash } from "../utils/infraHash";
import { db } from "../../../infrastructure/firebase/firebaseConfig";
import { DB_FIRESTORE_VPCS } from "@/shared/constants";

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
        const ref = doc(db, DB_FIRESTORE_VPCS, vpcid);
        await setDoc(
          ref,
          {
            planId: pid,
            planCanvasHash: okHash,
          },
          { merge: true },
        );
      } catch (e) {
        console.warn("No se pudo persistir planCanvasHash:", e);
      }
    };

    persist();

    setIsCanvasDirty(false);
    setHasValidatedInSession(true);
  }, [validationState, validationResult?.plan_id]);
};

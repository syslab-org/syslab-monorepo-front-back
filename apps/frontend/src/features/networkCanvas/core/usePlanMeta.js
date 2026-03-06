// apps/frontend/src/features/networkCanvas/core/usePlanMeta.js
import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/infrastructure/firebase/firebaseConfig";
import { DB_FIRESTORE_VPCS } from "@/shared/constants";

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

        const ref = doc(db, DB_FIRESTORE_VPCS, vpcid);
        const snap = await getDoc(ref);

        if (!alive) return;

        const data = snap.exists() ? snap.data() : null;
        setCanvasPlanId(data?.planId || null);
        setValidatedPlanHash(data?.planCanvasHash || null);
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

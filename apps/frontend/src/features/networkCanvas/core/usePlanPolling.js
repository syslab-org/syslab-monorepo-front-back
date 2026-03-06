// apps/frontend/src/features/networkCanvas/core/usePlanPolling.js

import { useEffect, useRef } from "react";
import { api } from "@/infrastructure/http/api";

export const usePlanPolling = ({
  canvasPlanId,
  setCanvasPlanInfo,
  setIsCanvasLocked,
  isPlanRunning,
}) => {
  const timerRef = useRef(null);

  useEffect(() => {
    let alive = true;

    const startPolling = async () => {
      if (!canvasPlanId) {
        setCanvasPlanInfo(null);
        setIsCanvasLocked(false);
        return;
      }

      try {
        const plan = await api.getPlan(canvasPlanId);
        if (!alive) return;

        setCanvasPlanInfo(plan || null);
        setIsCanvasLocked(isPlanRunning(plan?.status));

        if (isPlanRunning(plan?.status)) {
          timerRef.current = window.setInterval(async () => {
            try {
              const nextPlan = await api.getPlan(canvasPlanId);
              if (!alive) return;
              setCanvasPlanInfo(nextPlan || null);
              const running = isPlanRunning(nextPlan?.status);
              setIsCanvasLocked(running);
              if (!running && timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
            } catch {
              if (!alive) return;
              setIsCanvasLocked(false);
            }
          }, 1500);
        }
      } catch {
        if (!alive) return;
        setCanvasPlanInfo(null);
        setIsCanvasLocked(false);
      }
    };

    startPolling();

    return () => {
      alive = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [canvasPlanId, setCanvasPlanInfo, setIsCanvasLocked, isPlanRunning]);
};

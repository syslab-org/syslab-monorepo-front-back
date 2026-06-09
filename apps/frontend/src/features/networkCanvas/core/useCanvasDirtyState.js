import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  computeInfraHash,
  computeLegacyInfraHash,
  isLegacyInfraHash,
} from "@/features/networkCanvas/utils/infraHash";

/**
 * Encapsulates canvas "dirty" detection and edit guard logic.
 * Extracted from CanvasFlowPage to reduce component complexity.
 */
export function useCanvasDirtyState({
  nodes,
  edges,
  canvasPlanId,
  validatedPlanHash,
  setValidatedPlanHash,
  restorationDone,
  hasValidatedInSession,
  isCanvasLocked,
  setCanvasUiError,
}) {
  const { t } = useTranslation();
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);
  const [editGuardOpen, setEditGuardOpen] = useState(false);
  const [ignoreDirtyGuard, setIgnoreDirtyGuard] = useState(false);

  const dirtyInitializedRef = useRef(false);
  const editGuardRef = useRef({ fn: null, args: null });

  useEffect(() => {
    if (!canvasPlanId) {
      dirtyInitializedRef.current = false;
    }
  }, [canvasPlanId]);

  useEffect(() => {
    if (!restorationDone) return;

    if (!canvasPlanId) {
      setIsCanvasDirty(false);
      return;
    }

    if (!dirtyInitializedRef.current) {
      dirtyInitializedRef.current = true;

      if (!validatedPlanHash) {
        setValidatedPlanHash?.(computeInfraHash(nodes, edges));
        setIsCanvasDirty(false);
        return;
      }

      let baselineHash = validatedPlanHash;

      if (isLegacyInfraHash(validatedPlanHash)) {
        const legacyCurrent = computeLegacyInfraHash(nodes, edges);
        if (legacyCurrent === validatedPlanHash) {
          baselineHash = computeInfraHash(nodes, edges);
          setValidatedPlanHash?.(baselineHash);
          setIsCanvasDirty(false);
          return;
        }
      }

      const current = computeInfraHash(nodes, edges);
      setIsCanvasDirty(current !== baselineHash);
      return;
    }

    const current = isLegacyInfraHash(validatedPlanHash)
      ? computeLegacyInfraHash(nodes, edges)
      : computeInfraHash(nodes, edges);

    if (!validatedPlanHash) {
      setIsCanvasDirty(false);
      return;
    }

    const dirty = current !== validatedPlanHash;
    setIsCanvasDirty(dirty);

    if (!dirty) {
      setIgnoreDirtyGuard(false);
    }
  }, [
    nodes,
    edges,
    validatedPlanHash,
    setValidatedPlanHash,
    canvasPlanId,
    restorationDone,
    hasValidatedInSession,
  ]);

  const guardBeforeEdit = (
    fn,
    msgLocked = t("canvas.feedback.planRunningLock"),
  ) => {
    return (...args) => {
      if (isCanvasLocked) {
        setCanvasUiError?.(msgLocked);
        return;
      }

      if (
        canvasPlanId &&
        validatedPlanHash &&
        isCanvasDirty &&
        !ignoreDirtyGuard
      ) {
        editGuardRef.current = { fn, args };
        setEditGuardOpen(true);
        return;
      }

      return fn?.(...args);
    };
  };

  return {
    isCanvasDirty,
    setIsCanvasDirty,
    editGuardOpen,
    setEditGuardOpen,
    guardBeforeEdit,
    ignoreDirtyGuard,
    setIgnoreDirtyGuard,
    editGuardRef,
  };
}

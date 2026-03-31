import { useEffect, useRef, useState } from "react";
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
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);
  const [editGuardOpen, setEditGuardOpen] = useState(false);
  const [ignoreDirtyGuard, setIgnoreDirtyGuard] = useState(false);

  const dirtyInitializedRef = useRef(false);
  const editGuardRef = useRef({ fn: null, args: null });

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

      if (isLegacyInfraHash(validatedPlanHash)) {
        const legacyCurrent = computeLegacyInfraHash(nodes, edges);
        if (legacyCurrent === validatedPlanHash) {
          setValidatedPlanHash?.(computeInfraHash(nodes, edges));
        }
      }

      setIsCanvasDirty(false);
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
    msgLocked = "Hay un plan ejecutándose. Revisa el plan antes de editar el canvas.",
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

import { useEffect, useRef, useState } from "react";
import { computeInfraHash } from "@/features/networkCanvas/utils/infraHash";

/**
 * Encapsulates canvas "dirty" detection and edit guard logic.
 * Extracted from CanvasFlowPage to reduce component complexity.
 */
export function useCanvasDirtyState({
  nodes,
  edges,
  canvasPlanId,
  validatedPlanHash,
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

    if (!canvasPlanId || !validatedPlanHash) {
      setIsCanvasDirty(false);
      return;
    }

    if (!dirtyInitializedRef.current) {
      dirtyInitializedRef.current = true;
      setIsCanvasDirty(false);
      return;
    }

    const current = computeInfraHash(nodes, edges);

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

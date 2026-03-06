// apps/frontend/src/features/networkCanvas/core/useCanvasPlanState.js
import { usePlanValidationSync } from "@/features/networkCanvas/core/usePlanValidationSync";
import { computeCanvasState } from "@/features/networkCanvas/domain/canvasStateMachine";

export function useCanvasPlanState({
  canvasPlanId,
  validatedPlanHash,
  isCanvasDirty,
  validationState,
  validationResult,
  nodes,
  edges,
  vpcid,
  setCanvasPlanId,
  setValidatedPlanHash,
  setIsCanvasDirty,
  setHasValidatedInSession,
  isCanvasLocked,
}) {
  // Estado de validación SOLO para UI (chip "PLAN: VALIDADO" tras refresh)
  const validationStateForToolbar = (() => {
    // Si existe un plan asociado + hash persistido y el canvas NO está dirty,
    // mostramos "SUCCESS" para reflejar que el plan sigue representando el canvas.
    if (canvasPlanId && validatedPlanHash && !isCanvasDirty) {
      return "SUCCESS";
    }
    return validationState;
  })();

  // =========================
  // Canvas State Machine (derivado, simplificado y consistente)
  // =========================

  const canvasState = computeCanvasState({
    canvasPlanId,
    isCanvasLocked,
    isCanvasDirty,
    validationState,
  });
  // Mantener el canvas sincronizado con el último plan validado, sin recargar
  usePlanValidationSync({
    validationState,
    validationResult,
    nodes,
    edges,
    vpcid,
    setCanvasPlanId,
    setValidatedPlanHash,
    setIsCanvasDirty,
    setHasValidatedInSession,
  });

  return {
    canvasState,
    validationStateForToolbar,
  };
}

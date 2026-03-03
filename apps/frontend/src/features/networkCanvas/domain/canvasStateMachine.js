// features/networkCanvas/domain/canvasStateMachine.js

export const computeCanvasState = ({
  canvasPlanId,
  isCanvasLocked,
  isCanvasDirty,
  validationState,
}) => {
  if (!canvasPlanId) return "NO_PLAN";
  if (isCanvasLocked) return "PLAN_RUNNING";
  // Si existe plan asociado y el hash actual no coincide con el validado,
  // el canvas está desactualizado, independientemente del validationState actual.
  if (isCanvasDirty) return "PLAN_OUTDATED";
  // Si ya hubo validación exitosa en esta sesión y no está dirty,
  // lo marcamos como validado.
  if (validationState === "SUCCESS") return "PLAN_VALIDATED";
  return "PLAN_SYNCED";
};

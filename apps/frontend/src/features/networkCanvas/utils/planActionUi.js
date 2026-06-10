import { translate as tr } from "@/shared/i18n";
import { getCanvasProviderDefinition } from "@/features/networkCanvas/providers/providerCatalog";

export function computePlanActionState(planStatus, canvasState, validationState, provider = "aws") {
  const status = String(planStatus?.status || "").toUpperCase();
  const lastAction = String(
    planStatus?.last_action || planStatus?.lastAction || "",
  ).toLowerCase();
  const providerKey = String(provider || "aws").trim().toLowerCase() || "aws";
  const providerDefinition = getCanvasProviderDefinition(providerKey);
  const providerLabel = providerDefinition.label || providerKey.toUpperCase();
  const applied = planStatus?.applied === true;
  const canDestroy = Boolean(planStatus?.can_destroy ?? (applied && lastAction !== "destroy"));
  const isRunning =
    status === "RUNNING" || status === "PENDING" || canvasState === "PLAN_RUNNING";
  const normalizedValidation = String(validationState || "").toUpperCase();

  if (isRunning) {
    return {
      actionLabel: tr("canvas.planAction.running.actionLabel"),
      actionTooltip: tr("canvas.planAction.running.actionTooltip"),
      actionColor: "inherit",
      helper: tr("canvas.planAction.running.helper"),
      helperSeverity: "warning",
      workspaceTitle: tr("canvas.planAction.running.workspaceTitle"),
      workspaceDetail: tr("canvas.planAction.running.workspaceDetail"),
      workspaceSeverity: "warning",
      chips: [{ label: tr("canvas.planAction.running.chip"), color: "warning", variant: "filled" }],
    };
  }

  if (applied) {
    return {
      actionLabel: tr("canvas.planAction.applied.actionLabel"),
      actionTooltip: tr("canvas.planAction.applied.actionTooltip"),
      actionColor: "warning",
      helper:
        canvasState === "PLAN_OUTDATED"
          ? tr("canvas.planAction.applied.helperOutdated", { provider: providerLabel })
          : tr("canvas.planAction.applied.helper", { provider: providerLabel }),
      helperSeverity: canvasState === "PLAN_OUTDATED" ? "warning" : "info",
      workspaceTitle:
        canvasState === "PLAN_OUTDATED"
          ? tr("canvas.planAction.applied.workspaceTitleOutdated")
          : tr("canvas.planAction.applied.workspaceTitle", { provider: providerLabel }),
      workspaceDetail:
        canvasState === "PLAN_OUTDATED"
          ? tr("canvas.planAction.applied.workspaceDetailOutdated", { provider: providerLabel })
          : tr("canvas.planAction.applied.workspaceDetail", { provider: providerLabel }),
      workspaceSeverity: canvasState === "PLAN_OUTDATED" ? "warning" : "info",
      chips: [
        { label: tr("canvas.planAction.applied.chipRedeploy"), color: "warning", variant: "filled" },
        {
          label: canDestroy ? tr("canvas.planAction.applied.chipDestroyAvailable") : tr("canvas.planAction.applied.chipDestroyUnavailable"),
          color: canDestroy ? "error" : "default",
          variant: "outlined",
        },
      ],
    };
  }

  if (normalizedValidation === "SUCCESS" || canvasState === "PLAN_VALIDATED") {
    return {
      actionLabel: tr("canvas.planAction.validated.actionLabel"),
      actionTooltip: tr("canvas.planAction.validated.actionTooltip", { provider: providerLabel }),
      actionColor: "success",
      helper: tr("canvas.planAction.validated.helper", { provider: providerLabel }),
      helperSeverity: "success",
      workspaceTitle: tr("canvas.planAction.validated.workspaceTitle"),
      workspaceDetail: tr("canvas.planAction.validated.workspaceDetail", { provider: providerLabel }),
      workspaceSeverity: "success",
      chips: [
        { label: tr("canvas.planAction.validated.chipDeploy"), color: "primary", variant: "filled" },
        {
          label: tr("canvas.planAction.validated.chipDestroyUnavailable"),
          color: "default",
          variant: "outlined",
        },
      ],
    };
  }

  if (canvasState === "PLAN_OUTDATED") {
    return {
      actionLabel: tr("canvas.planAction.outdated.actionLabel"),
      actionTooltip: tr("canvas.planAction.outdated.actionTooltip"),
      actionColor: "warning",
      helper: tr("canvas.planAction.outdated.helper"),
      helperSeverity: "warning",
      workspaceTitle: tr("canvas.planAction.outdated.workspaceTitle"),
      workspaceDetail: tr("canvas.planAction.outdated.workspaceDetail"),
      workspaceSeverity: "warning",
      chips: [{ label: tr("canvas.planAction.outdated.chip"), color: "warning", variant: "filled" }],
    };
  }

  return {
    actionLabel: tr("canvas.planAction.default.actionLabel"),
    actionTooltip: tr("canvas.planAction.default.actionTooltip", { provider: providerLabel }),
    actionColor: "success",
    helper: tr("canvas.planAction.default.helper"),
    helperSeverity: "info",
    workspaceTitle: tr("canvas.planAction.default.workspaceTitle"),
    workspaceDetail: tr("canvas.planAction.default.workspaceDetail", { provider: providerLabel }),
    workspaceSeverity: "info",
    chips: [{ label: tr("canvas.planAction.default.chip"), color: "info", variant: "filled" }],
  };
}

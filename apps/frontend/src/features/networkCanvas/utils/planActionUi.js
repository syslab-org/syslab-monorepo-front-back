export function computePlanActionState(planStatus, canvasState, validationState) {
  const status = String(planStatus?.status || "").toUpperCase();
  const lastAction = String(
    planStatus?.last_action || planStatus?.lastAction || "",
  ).toLowerCase();
  const applied = planStatus?.applied === true;
  const canDestroy = Boolean(planStatus?.can_destroy ?? (applied && lastAction !== "destroy"));
  const isRunning =
    status === "RUNNING" || status === "PENDING" || canvasState === "PLAN_RUNNING";
  const normalizedValidation = String(validationState || "").toUpperCase();

  if (isRunning) {
    return {
      actionLabel: "Plan en ejecución",
      actionTooltip: "Hay una ejecución en curso. Espera a que termine para seguir trabajando.",
      actionColor: "inherit",
      helper:
        "Hay una ejecución en curso. El canvas queda bloqueado hasta que termine.",
      helperSeverity: "warning",
      workspaceTitle: "Ejecución en curso",
      workspaceDetail:
        "Mientras Terraform está trabajando, el canvas queda en modo lectura para evitar que el plan se desalineé.",
      workspaceSeverity: "warning",
      chips: [{ label: "Acción principal: ESPERAR", color: "warning", variant: "filled" }],
    };
  }

  if (applied) {
    return {
      actionLabel: "Preparar redeploy",
      actionTooltip:
        "Abrir la validación del redeploy para revisar cambios sobre la infraestructura ya activa.",
      actionColor: "warning",
      helper:
        canvasState === "PLAN_OUTDATED"
          ? "Hay infraestructura activa y el canvas cambió. Revalida para preparar un redeploy sobre el mismo stack."
          : "Hay infraestructura activa. Desde aquí prepararás un redeploy sobre el mismo stack.",
      helperSeverity: canvasState === "PLAN_OUTDATED" ? "warning" : "info",
      workspaceTitle:
        canvasState === "PLAN_OUTDATED" ? "Canvas desactualizado frente al stack activo" : "Infraestructura activa en AWS",
      workspaceDetail:
        canvasState === "PLAN_OUTDATED"
          ? "El canvas ya no coincide con la última validación. Revalida antes de intentar actualizar el stack."
          : "Puedes revisar el plan, validar cambios y luego aplicar un redeploy sobre la infraestructura existente.",
      workspaceSeverity: canvasState === "PLAN_OUTDATED" ? "warning" : "info",
      chips: [
        { label: "Acción principal: REDEPLOY", color: "warning", variant: "filled" },
        {
          label: canDestroy ? "Destroy disponible" : "Destroy no disponible",
          color: canDestroy ? "error" : "default",
          variant: "outlined",
        },
      ],
    };
  }

  if (normalizedValidation === "SUCCESS" || canvasState === "PLAN_VALIDATED") {
    return {
      actionLabel: "Preparar deploy",
      actionTooltip:
        "Abrir la validación final antes del primer deploy sobre AWS.",
      actionColor: "success",
      helper:
        "El canvas ya fue validado y no hay infraestructura activa. El siguiente paso es el primer deploy.",
      helperSeverity: "success",
      workspaceTitle: "Canvas validado y listo para deploy",
      workspaceDetail:
        "La topología ya pasó por validación. Si estás conforme con el plan, el siguiente paso es crear la infraestructura real.",
      workspaceSeverity: "success",
      chips: [
        { label: "Acción principal: DEPLOY", color: "primary", variant: "filled" },
        {
          label: "Destroy no aplica todavía",
          color: "default",
          variant: "outlined",
        },
      ],
    };
  }

  if (canvasState === "PLAN_OUTDATED") {
    return {
      actionLabel: "Revalidar canvas",
      actionTooltip:
        "Regenerar el plan para que vuelva a coincidir con el estado actual del canvas.",
      actionColor: "warning",
      helper:
        "El canvas cambió desde la última validación. Antes de desplegar, revalida para actualizar el plan.",
      helperSeverity: "warning",
      workspaceTitle: "Canvas modificado desde la última validación",
      workspaceDetail:
        "Tienes cambios locales pendientes de validar. Revalida para que el plan vuelva a representar exactamente lo que ves.",
      workspaceSeverity: "warning",
      chips: [{ label: "Acción principal: REVALIDAR", color: "warning", variant: "filled" }],
    };
  }

  return {
    actionLabel: "Validar canvas",
    actionTooltip:
      "Validar la topología actual para ver su traducción a AWS antes de crear recursos.",
    actionColor: "success",
    helper:
      "Todavía no hay un plan validado ni infraestructura activa. Empieza validando el canvas.",
    helperSeverity: "info",
    workspaceTitle: "Canvas listo para validar",
    workspaceDetail:
      "Empieza validando la topología para ver su traducción a AWS antes de crear recursos reales.",
    workspaceSeverity: "info",
    chips: [{ label: "Acción principal: VALIDAR", color: "info", variant: "filled" }],
  };
}

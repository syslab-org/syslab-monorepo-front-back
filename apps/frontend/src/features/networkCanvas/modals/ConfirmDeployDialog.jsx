// apps/frontend/src/components/flow/ConfirmDeployDialog.jsx
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

function normalizePlanSummary(transformedData) {
  const topology =
    transformedData?.topology && typeof transformedData.topology === "object"
      ? transformedData.topology
      : null;

  if (!topology) {
    const legacyVpcs = Array.isArray(transformedData?.vpcs) ? transformedData.vpcs : [];
    const legacyLinks = Array.isArray(transformedData?.links) ? transformedData.links : [];
    const legacyRouters = Array.isArray(transformedData?.routers) ? transformedData.routers : [];
    return {
      provider: transformedData?.target_provider || transformedData?.cloud || "aws",
      networkName: transformedData?.name || "plan",
      segments: legacyVpcs,
      links: legacyLinks,
      hubs: legacyRouters,
      totalZones: legacyVpcs.reduce((acc, vpc) => acc + (vpc.subnets?.length || 0), 0),
      totalWorkloads: legacyVpcs.reduce(
        (acc, vpc) =>
          acc + (vpc.subnets || []).reduce((subAcc, subnet) => subAcc + (subnet.instances?.length || 0), 0),
        0,
      ),
    };
  }

  const segments = Array.isArray(topology?.segments) ? topology.segments : [];
  const connectivity = topology?.connectivity || {};
  const links = Array.isArray(connectivity?.links) ? connectivity.links : [];
  const hubs = Array.isArray(connectivity?.hubs) ? connectivity.hubs : [];
  const totalZones = segments.reduce((acc, segment) => acc + ((segment?.zones || []).length || 0), 0);
  const totalWorkloads = segments.reduce(
    (acc, segment) => acc + ((segment?.workloads || []).length || 0),
    0,
  );

  return {
    provider: transformedData?.target_provider || transformedData?.cloud || "aws",
    networkName: topology?.network?.name || transformedData?.name || "plan",
    segments,
    links,
    hubs,
    totalZones,
    totalWorkloads,
  };
}

/**
 * Exporta el plan actual (transformedData) a un archivo JSON descargable.
 */
function exportPlanToJson(transformedData, planName = "plan-export") {
  try {
    const blob = new Blob([JSON.stringify(transformedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = `${planName.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exportando el plan:", error);
    alert("No se pudo exportar el plan. Revisa la consola.");
  }
}

const ConfirmDeployDialog = ({
  open,
  onClose,
  validationState,
  canvasState,
  planStatus,
  validationResult,
  transformedData,
  onValidate,
  onDeploy,
  onViewPlan,
  loadingFlow,
}) => {
  const hasActiveInfra = planStatus?.applied === true;
  const hasReusablePlanId = Boolean(validationResult?.plan_id || planStatus?.id);
  const hasSuccessfulPlanSnapshot =
    String(planStatus?.status || "").toUpperCase() === "SUCCESS";
  const isValidated =
    validationState === "SUCCESS" ||
    (
      hasReusablePlanId &&
      hasSuccessfulPlanSnapshot &&
      (canvasState === "PLAN_VALIDATED" || canvasState === "PLAN_SYNCED")
    );
  const hasError = validationState === "ERROR";
  const isSyncing =
    validationState === "SYNCING" ||
    validationState === "PLANNING";

  const summary = normalizePlanSummary(transformedData);
  const segments = summary.segments;
  const links = summary.links;
  const hubs = summary.hubs;
  const directLinks = links.filter((link) => {
    const type = String(link?.type || "").toLowerCase();
    return type === "direct_link" || type === "peering";
  }).length;
  const hubAttachments = links.filter((link) => {
    const type = String(link?.type || "").toLowerCase();
    return type === "hub_attachment" || type === "tgw-attach";
  }).length;
  const hubRouters = hubs.filter((hub) => {
    const impl = String(hub?.implementation || hub?.type || "").toLowerCase();
    return impl === "tgw";
  }).length;
  const isRedeployPreview = Boolean(
    validationResult?.is_redeploy_preview ?? hasActiveInfra,
  );
  const planRiskSummary = validationResult?.plan_risk_summary || null;
  const riskSeverity = planRiskSummary?.severity || 'none';
  const primaryActionLabel = isRedeployPreview ? "Redeploy en AWS" : "Deploy en AWS";
  const secondaryActionLabel = isRedeployPreview ? "Revalidar redeploy" : "Validar deploy";
  const isBusy = Boolean(loadingFlow || isSyncing);

  const riskAlertSeverity =
    riskSeverity === 'destructive'
      ? 'error'
      : riskSeverity === 'caution'
        ? 'warning'
        : 'info';

  const renderBanner = () => {
    if (isSyncing) {
      return <Alert severity="info">Validando infraestructura...</Alert>;
    }

    if (isValidated) {
      return (
        <Alert severity="success">
          Infraestructura validada correctamente. Puedes desplegar o revisar el plan.
        </Alert>
      );
    }

    if (hasError) {
      return (
        <Alert severity="error">
          Error durante la validación. Revisa los detalles antes de continuar.
        </Alert>
      );
    }

    // ⚠️ Mostrar advertencia SOLO si el canvas realmente está desactualizado
    if (canvasState === "PLAN_OUTDATED") {
      return (
        <Alert severity="warning">
          El canvas cambió desde la última validación. Debes validar nuevamente.
        </Alert>
      );
    }

    // En cualquier otro caso no mostramos banner
    return null;
  };

  const vpcsWithIgw = segments.filter(
    (segment) => Boolean(segment?.provider_overrides?.aws?.internet_gateway),
  ).length;
  const vpcsWithNat = segments.filter(
    (segment) => Boolean(segment?.provider_overrides?.aws?.nat_gateway?.enabled),
  ).length;
  const vpcsWithSsh = segments.filter((segment) => Boolean(segment?.ingress?.ssh_cidr)).length;
  const publicSubnets = segments.reduce(
    (acc, segment) =>
      acc +
      (segment.zones || []).filter(
        (zone) => String(zone.kind || "").toLowerCase() === "public",
      ).length,
    0,
  );
  const privateSubnets = Math.max(summary.totalZones - publicSubnets, 0);
  const mixedExposure = segments.filter(
    (segment) => String(segment?.exposure || "").toLowerCase() === "mixed",
  ).length;
  const publicExposure = segments.filter(
    (segment) => String(segment?.exposure || "").toLowerCase() === "public",
  ).length;
  const privateExposure = segments.filter(
    (segment) => String(segment?.exposure || "").toLowerCase() === "private",
  ).length;
  const isolatedExposure = segments.filter(
    (segment) => String(segment?.internet_access || "").toLowerCase() === "isolated",
  ).length;
  const neutralInterpretation = [
    `La red base contiene ${segments.length} segmento(s), ${summary.totalZones} zona(s) y ${summary.totalWorkloads} workload(s).`,
    `Exposición del diseño: ${publicExposure} segmento(s) públicos, ${privateExposure} privados y ${mixedExposure} mixtos.`,
    hubRouters > 0
      ? `Conectividad modelada como ${hubRouters} hub(s) central(es) con ${hubAttachments} attachment(s).`
      : `Conectividad modelada con ${directLinks} enlace(s) directo(s) entre pares de segmentos.`,
    `Acceso y salida: SSH externo definido en ${vpcsWithSsh} segmento(s) y ${isolatedExposure} segmento(s) sin salida a internet declarada.`,
  ];
  const awsInterpretation = [
    `AWS creará ${segments.length} VPC(s), ${summary.totalZones} subnet(s) y ${summary.totalWorkloads} instancia(s).`,
    `Exposición pública: IGW en ${vpcsWithIgw} VPC(s), ${publicSubnets} subnet(s) pública(s) y SSH externo definido en ${vpcsWithSsh} VPC(s).`,
    `Salida privada: NAT Gateway en ${vpcsWithNat} VPC(s) para ${privateSubnets} subnet(s) potencialmente privadas.`,
    hubRouters > 0
      ? `Enrutamiento central: ${hubRouters} hub(s) y ${hubAttachments} attachment(s).`
      : `Enrutamiento por enlaces directos: ${directLinks} enlace(s) declarados.`,
  ];

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (isBusy && (reason === "backdropClick" || reason === "escapeKeyDown")) return;
        if (isBusy) return;
        onClose?.();
      }}
      disableEscapeKeyDown={isBusy}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Confirmar infraestructura</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ position: "relative" }}>
          {isBusy && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                bgcolor: "rgba(255,255,255,0.64)",
                backdropFilter: "blur(1px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1,
              }}
            >
              <Stack
                spacing={1.5}
                alignItems="center"
                sx={{
                  px: 3,
                  py: 2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  boxShadow: 3,
                }}
              >
                <CircularProgress size={28} />
                <Typography variant="subtitle2">
                  {isSyncing
                    ? "Validando infraestructura. Espera un momento..."
                    : "Procesando la operación. No cierres este modal todavía."}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Mientras corre esta acción, se ha bloqueamos el modal para evitar estados inconsistentes.
                </Typography>
              </Stack>
            </Box>
          )}
          {renderBanner()}

          {isRedeployPreview && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta validación se hizo sobre infraestructura ya activa. Si despliegas ahora, Terraform actualizará el stack existente en AWS y algunos cambios podrían reemplazar o eliminar recursos.
            </Alert>
          )}

          <Box mt={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={isRedeployPreview ? "Acción principal: REDEPLOY" : "Acción principal: DEPLOY"}
                color={isRedeployPreview ? "warning" : "primary"}
                variant="filled"
              />
              <Chip
                label={isRedeployPreview ? "Destroy disponible si el plan sigue activo" : "Destroy no aplica hasta crear recursos"}
                color={isRedeployPreview ? "error" : "default"}
                variant={isRedeployPreview ? "outlined" : "outlined"}
              />
            </Stack>
          </Box>

          {planRiskSummary?.hasChanges && (
            <Box mt={2}>
              <Alert severity={riskAlertSeverity}>
                {riskSeverity === 'destructive'
                  ? 'Terraform detectó cambios potencialmente destructivos o con reemplazo de recursos.'
                  : riskSeverity === 'caution'
                    ? 'Terraform detectó actualizaciones sobre recursos existentes.'
                    : 'Terraform detectó cambios aditivos sobre la infraestructura.'}
              </Alert>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                <Chip label={`Add: ${planRiskSummary.add}`} size="small" />
                <Chip label={`Change: ${planRiskSummary.change}`} size="small" />
                <Chip label={`Destroy: ${planRiskSummary.destroy}`} size="small" color={planRiskSummary.destroy > 0 ? 'error' : 'default'} />
                <Chip label={`Replace: ${planRiskSummary.replace}`} size="small" color={planRiskSummary.replace > 0 ? 'error' : 'default'} />
              </Stack>
              {Array.isArray(planRiskSummary.examples) && planRiskSummary.examples.length > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Recursos sensibles detectados:
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                    {planRiskSummary.examples.map((item) => (
                      <Typography key={`${item.action}-${item.resource}`} variant="caption" color="text.secondary">
                        {item.action.toUpperCase()}: {item.resource}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Resumen
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Provider: ${String(summary.provider || "aws").toUpperCase()}`} />
              <Chip label={`Segments: ${segments.length}`} />
              <Chip label={`Zones: ${summary.totalZones}`} />
              <Chip label={`Workloads: ${summary.totalWorkloads}`} />
              <Chip
                label={`Direct links: ${directLinks}`}
                color={directLinks > 0 ? "secondary" : "default"}
                variant={directLinks > 0 ? "filled" : "outlined"}
              />
              <Chip
                label={`Hubs: ${hubRouters}`}
                color={hubRouters > 0 ? "primary" : "default"}
                variant={hubRouters > 0 ? "filled" : "outlined"}
              />
              <Chip
                label={`Hub attachments: ${hubAttachments}`}
                color={hubAttachments > 0 ? "primary" : "default"}
                variant={hubAttachments > 0 ? "filled" : "outlined"}
              />
            </Stack>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            Después del deploy, valida conectividad en <b>Plan Detail → Pruebas</b> con comandos de ping guiados entre segmentos.
          </Alert>

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Intención neutral del laboratorio
            </Typography>
            <Stack spacing={1}>
              {neutralInterpretation.map((line) => (
                <Alert key={line} severity="info" variant="outlined">
                  {line}
                </Alert>
              ))}
            </Stack>
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Traducción AWS
            </Typography>
            <Stack spacing={1}>
              {awsInterpretation.map((line) => (
                <Alert key={line} severity="info" variant="outlined">
                  {line}
                </Alert>
              ))}
            </Stack>
          </Box>

          <Box mt={4}>
            {segments.map((segment) => {
              const aws = segment?.provider_overrides?.aws || {};
              return (
                <Box
                  key={segment.id}
                  mb={2}
                  p={2}
                  border="1px solid #eee"
                  borderRadius={2}
                >
                  <Typography variant="subtitle2">{segment.name}</Typography>
                  <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                    <Chip label={`CIDR: ${segment.cidr || segment.cidr_block}`} size="small" />
                    <Chip label={`Región: ${segment.region}`} size="small" />
                    <Chip
                      label={`Modelo: ${String(segment.exposure || "internal").replace(/_/g, " ")}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`AWS: VPC`}
                      size="small"
                      variant="outlined"
                    />
                    {aws.internet_gateway && (
                      <Chip label="IGW" size="small" color="primary" />
                    )}
                    {aws.nat_gateway?.enabled && (
                      <Chip label="NAT" size="small" color="secondary" />
                    )}
                    {aws.nat_gateway?.enabled && aws.nat_gateway?.elastic_ip && (
                      <Chip
                        label={`NAT EIP: ${aws.nat_gateway.elastic_ip}`}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Stack>
                  {aws.nat_gateway?.enabled && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Si defines una EIP para el NAT, debe ser un Allocation ID real de AWS (`eipalloc-...`), no una IP pública.
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isBusy}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={onValidate}
          disabled={isBusy}
        >
          {secondaryActionLabel}
        </Button>
        <Button
          variant="outlined"
          onClick={() => exportPlanToJson(transformedData, transformedData?.name || "plan")}
          disabled={!transformedData || isBusy}
        >
          Exportar JSON
        </Button>
        <Button
          variant="outlined"
          onClick={onViewPlan}
          disabled={!hasReusablePlanId || isBusy}
        >
          Ver plan
        </Button>
        <Button
          variant="contained"
          color={isRedeployPreview ? "warning" : "success"}
          onClick={onDeploy}
          disabled={!isValidated || !hasReusablePlanId || isBusy}
        >
          {isRedeployPreview ? 'Aplicar redeploy' : 'Desplegar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeployDialog;

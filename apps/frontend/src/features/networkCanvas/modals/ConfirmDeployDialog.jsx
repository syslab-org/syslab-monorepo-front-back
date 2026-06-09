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
import { useTranslation } from 'react-i18next';

import { translate as tr } from '@/shared/i18n';

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
    console.error("Error exporting the plan:", error);
    alert(tr('canvas.deployDialog.exportError'));
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
  const { t } = useTranslation();
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
  const primaryActionLabel = isRedeployPreview
    ? t('canvas.deployDialog.primaryRedeploy')
    : t('canvas.deployDialog.primaryDeploy');
  const secondaryActionLabel = isRedeployPreview
    ? t('canvas.deployDialog.revalidateRedeploy')
    : t('canvas.deployDialog.validateDeploy');
  const isBusy = Boolean(loadingFlow || isSyncing);

  const riskAlertSeverity =
    riskSeverity === 'destructive'
      ? 'error'
      : riskSeverity === 'caution'
        ? 'warning'
        : 'info';

  const renderBanner = () => {
    if (isSyncing) {
      return <Alert severity="info">{t('canvas.deployDialog.validatingInfra')}</Alert>;
    }

    if (isValidated) {
      return (
        <Alert severity="success">
          {t('canvas.deployDialog.validatedSuccess')}
        </Alert>
      );
    }

    if (hasError) {
      return (
        <Alert severity="error">
          {t('canvas.deployDialog.validationError')}
        </Alert>
      );
    }

    // ⚠️ Mostrar advertencia SOLO si el canvas realmente está desactualizado
    if (canvasState === "PLAN_OUTDATED") {
      return (
        <Alert severity="warning">
          {t('canvas.deployDialog.canvasOutdated')}
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
  const segmentZoneStats = segments.map((segment) => {
    const zones = Array.isArray(segment?.zones) ? segment.zones : [];
    const publicZoneCount = zones.filter(
      (zone) => String(zone?.kind || "").toLowerCase() === "public",
    ).length;
    const privateZoneCount = zones.filter(
      (zone) => String(zone?.kind || "").toLowerCase() === "private",
    ).length;
    return {
      id: segment?.id,
      hasSshCidr: Boolean(segment?.ingress?.ssh_cidr),
      publicZoneCount,
      privateZoneCount,
    };
  });
  const vpcsWithEffectivePublicSsh = segmentZoneStats.filter(
    (segment) => segment.hasSshCidr && segment.publicZoneCount > 0,
  ).length;
  const vpcsWithSshButNoPublicZones = segmentZoneStats.filter(
    (segment) => segment.hasSshCidr && segment.publicZoneCount === 0,
  ).length;
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
    t('canvas.deployDialog.neutral.baseNetwork', {
      segments: segments.length,
      zones: summary.totalZones,
      workloads: summary.totalWorkloads,
    }),
    t('canvas.deployDialog.neutral.exposure', {
      publicExposure,
      privateExposure,
      mixedExposure,
    }),
    hubRouters > 0
      ? t('canvas.deployDialog.neutral.hubs', {
        hubs: hubRouters,
        attachments: hubAttachments,
      })
      : t('canvas.deployDialog.neutral.directLinks', {
        directLinks,
      }),
    vpcsWithSshButNoPublicZones > 0
      ? t('canvas.deployDialog.neutral.sshWarning', {
        vpcsWithSsh,
        vpcsWithSshButNoPublicZones,
        isolatedExposure,
      })
      : t('canvas.deployDialog.neutral.sshReady', {
        vpcsWithEffectivePublicSsh,
        isolatedExposure,
      }),
  ];
  const awsInterpretation = [
    t('canvas.deployDialog.aws.created', {
      segments: segments.length,
      zones: summary.totalZones,
      workloads: summary.totalWorkloads,
    }),
    publicSubnets > 0
      ? t('canvas.deployDialog.aws.publicExposure', {
        vpcsWithIgw,
        publicSubnets,
        vpcsWithEffectivePublicSsh,
      })
      : t('canvas.deployDialog.aws.noPublicSubnets', {
        vpcsWithIgw,
      }),
    t('canvas.deployDialog.aws.privateEgress', {
      vpcsWithNat,
      privateSubnets,
    }),
    hubRouters > 0
      ? t('canvas.deployDialog.aws.centralRouting', {
        hubRouters,
        hubAttachments,
      })
      : t('canvas.deployDialog.aws.directRouting', {
        directLinks,
      }),
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
      <DialogTitle>{t('canvas.deployDialog.title')}</DialogTitle>
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
                    ? t('canvas.deployDialog.busyValidating')
                    : t('canvas.deployDialog.busyProcessing')}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {t('canvas.deployDialog.busyDescription')}
                </Typography>
              </Stack>
            </Box>
          )}
          {renderBanner()}

          {isRedeployPreview && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t('canvas.deployDialog.redeployWarning')}
            </Alert>
          )}

          <Box mt={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={isRedeployPreview ? t('canvas.deployDialog.chips.mainRedeploy') : t('canvas.deployDialog.chips.mainDeploy')}
                color={isRedeployPreview ? "warning" : "primary"}
                variant="filled"
              />
              <Chip
                label={isRedeployPreview ? t('canvas.deployDialog.chips.destroyAvailable') : t('canvas.deployDialog.chips.destroyUnavailable')}
                color={isRedeployPreview ? "error" : "default"}
                variant={isRedeployPreview ? "outlined" : "outlined"}
              />
            </Stack>
          </Box>

          {planRiskSummary?.hasChanges && (
            <Box mt={2}>
              <Alert severity={riskAlertSeverity}>
                {riskSeverity === 'destructive'
                  ? t('canvas.deployDialog.risk.destructive')
                  : riskSeverity === 'caution'
                    ? t('canvas.deployDialog.risk.caution')
                    : t('canvas.deployDialog.risk.safe')}
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
                    {t('canvas.deployDialog.risk.sensitiveResources')}
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
              {t('canvas.deployDialog.summaryTitle')}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={t('canvas.deployDialog.summary.provider', { value: String(summary.provider || "aws").toUpperCase() })} />
              <Chip label={t('canvas.deployDialog.summary.segments', { count: segments.length })} />
              <Chip label={t('canvas.deployDialog.summary.zones', { count: summary.totalZones })} />
              <Chip label={t('canvas.deployDialog.summary.workloads', { count: summary.totalWorkloads })} />
              <Chip
                label={t('canvas.deployDialog.summary.directLinks', { count: directLinks })}
                color={directLinks > 0 ? "secondary" : "default"}
                variant={directLinks > 0 ? "filled" : "outlined"}
              />
              <Chip
                label={t('canvas.deployDialog.summary.hubs', { count: hubRouters })}
                color={hubRouters > 0 ? "primary" : "default"}
                variant={hubRouters > 0 ? "filled" : "outlined"}
              />
              <Chip
                label={t('canvas.deployDialog.summary.attachments', { count: hubAttachments })}
                color={hubAttachments > 0 ? "primary" : "default"}
                variant={hubAttachments > 0 ? "filled" : "outlined"}
              />
            </Stack>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            {t('canvas.deployDialog.postDeployHint')}
          </Alert>

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              {t('canvas.deployDialog.neutralTitle')}
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
              {t('canvas.deployDialog.awsTitle')}
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
                    <Chip label={t('canvas.deployDialog.segment.cidr', { value: segment.cidr || segment.cidr_block })} size="small" />
                    <Chip label={t('canvas.deployDialog.segment.region', { value: segment.region })} size="small" />
                    <Chip
                      label={t('canvas.deployDialog.segment.model', {
                        value: String(segment.exposure || "internal").replace(/_/g, " "),
                      })}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={t('canvas.deployDialog.segment.awsVpc')}
                      size="small"
                      variant="outlined"
                    />
                    {aws.internet_gateway && (
                      <Chip label={t('canvas.deployDialog.segment.igw')} size="small" color="primary" />
                    )}
                    {aws.nat_gateway?.enabled && (
                      <Chip label={t('canvas.deployDialog.segment.nat')} size="small" color="secondary" />
                    )}
                    {aws.nat_gateway?.enabled && aws.nat_gateway?.elastic_ip && (
                      <Chip
                        label={t('canvas.deployDialog.segment.natEip', {
                          value: aws.nat_gateway.elastic_ip,
                        })}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Stack>
                  {aws.nat_gateway?.enabled && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      {t('canvas.deployDialog.segment.natHelp')}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isBusy}>{t('actions.cancel')}</Button>
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
          {t('canvas.deployDialog.exportJson')}
        </Button>
        <Button
          variant="outlined"
          onClick={onViewPlan}
          disabled={!hasReusablePlanId || isBusy}
        >
          {t('canvas.deployDialog.viewPlan')}
        </Button>
        <Button
          variant="contained"
          color={isRedeployPreview ? "warning" : "success"}
          onClick={onDeploy}
          disabled={!isValidated || !hasReusablePlanId || isBusy}
        >
          {isRedeployPreview ? t('canvas.deployDialog.applyRedeploy') : t('canvas.deployDialog.deploy')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeployDialog;

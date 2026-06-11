// apps/frontend/src/components/flow/forms/InstanceNodeForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import CidrLearningGuideButton from '@/features/networkCanvas/ui/CidrLearningGuideButton';
import { getCanvasProviderDefinition } from '@/features/networkCanvas/providers/providerCatalog';
import { getNodeProviderOverride, mergeNodeProviderOverrides } from '@/features/networkCanvas/providers/providerOverrides';
import { TYPE_INSTANCE_NODE } from "../utils/constants";
import { useFormValidationSchema } from './validations/useFormValidations';

/**
 * Props:
 *  - nodeData
 *  - onSave(payloadSnakeCase)   // ← enviamos snake_case para TF
 *  - deleteNode
 *  - parentSubnetCidr           // p.ej. "10.10.0.0/24" (valida IPs)
 *  - siblingIpsInSameSubnet     // evita duplicados
 *  - amiList
 *  - defaultAssociatePublicIp   // boolean (opcional). Si omites, por defecto true
 */
const InstanceNodeForm = ({
  provider = "aws",
  nodeData = {},
  onSave,
  deleteNode,
  parentSubnetCidr,
  siblingIpsInSameSubnet = [],
  amiList = [],
  keyPairList = [],
  executionTarget = null,
  defaultAssociatePublicIp = true,
}) => {
  const { t, i18n } = useTranslation();
  const providerDefinition = getCanvasProviderDefinition(provider);
  const providerOverride = getNodeProviderOverride(nodeData, provider);
  const providerLabel = providerDefinition.label || String(provider || "aws").toUpperCase();
  const instanceFormConfig = providerDefinition.instance?.form || {};
  const imageFieldConfig = instanceFormConfig.imageField || {};
  const providerOverrideRules = instanceFormConfig.providerOverrides || [];
  const sshSectionConfig = instanceFormConfig.sshSection || {};
  const sshFieldConfig = instanceFormConfig.sshField || {};
  const sshManualField = instanceFormConfig.sshManualField || null;
  const imageProjectField = instanceFormConfig.imageProjectField || null;
  const systemValidationConfig = instanceFormConfig.systemValidation || {};
  const usesCatalogImage = imageFieldConfig.control === "catalog-select";
  const usesSshCatalog = sshFieldConfig.control === "catalog-autocomplete";
  const [mismatchSnackbarOpen, setMismatchSnackbarOpen] = useState(false);
  const formatScopeLabel = (scope) => {
    if (scope === "course_shared") return t("canvas.instanceForm.scope.courseShared");
    if (scope === "personal") return t("canvas.instanceForm.scope.personal");
    return t("canvas.instanceForm.scope.unknown");
  };
  const validationSchema = useFormValidationSchema(
    TYPE_INSTANCE_NODE,
    parentSubnetCidr,
    null,
    {
      existingIps: siblingIpsInSameSubnet,
      instanceTypeOptions: providerDefinition.instance.instanceTypeOptions,
    },
    false
  );

  const amiOptions = useMemo(
    () =>
      (Array.isArray(amiList) ? amiList : [])
        .map((entry) => {
          const code = entry?.code || entry?.metadata?.amiCode || "";
          if (!code) return null;
          return {
            key: entry?.id || code,
            value: code,
            label: entry?.label || code,
            region: entry?.region || entry?.metadata?.region || "",
          };
        })
        .filter(Boolean),
    [amiList]
  );
  const keyPairOptions = useMemo(
    () =>
      (Array.isArray(keyPairList) ? keyPairList : [])
        .map((entry) => {
          const name = String(entry?.name || "").trim();
          if (!name) return null;
          const label = String(entry?.label || "").trim();
          const scopeLabel = formatScopeLabel(String(entry?.scope || "").trim());
          const region = String(entry?.region || "").trim();
          const connectionName = String(entry?.cloud_connection?.name || "").trim();
          const courseName = String(entry?.course?.name || "").trim();
          return {
            id: entry?.id || name,
            value: name,
            label: label || name,
            scope: String(entry?.scope || "").trim(),
            region,
            connectionId: String(entry?.cloud_connection?.id || "").trim(),
            subtitle: [scopeLabel, region || null, connectionName || courseName || null]
              .filter(Boolean)
              .join(" • "),
          };
        })
        .filter(Boolean),
    [i18n.resolvedLanguage, keyPairList, t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: nodeData.name || "",
      ipAddress: nodeData.ipAddress || "",
      ami: nodeData.ami || providerOverride.image_family || "",
      gcpImageProject: providerOverride.image_project || "",
      instanceType: nodeData.instanceType || providerDefinition.instance.instanceTypeOptions?.[0]?.value || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
      // UI: permitir al usuario forzar/quitar IP pública
      associatePublicIp:
        typeof nodeData.associatePublicIp === "boolean"
          ? nodeData.associatePublicIp
          : defaultAssociatePublicIp,
    }
  });
  const watchedSshAccess = watch("sshAccess");
  const executionRegion = String(executionTarget?.region || "").trim().toLowerCase();
  const selectedKeyPairMeta = useMemo(() => {
    const current = String(watchedSshAccess || "").trim();
    if (!current) return null;
    return keyPairOptions.find((option) => option.value === current) || null;
  }, [keyPairOptions, watchedSshAccess]);
  const executionScope = String(executionTarget?.scope || "").trim();
  const executionConnectionId = String(executionTarget?.id || "").trim();
  const selectedKeyPairScope = String(
    keyPairList.find((entry) => entry?.name === selectedKeyPairMeta?.value)?.scope || ""
  ).trim();
  const selectedKeyPairScopeLabel = formatScopeLabel(selectedKeyPairScope);
  const executionScopeLabel = formatScopeLabel(executionScope);
  const selectedKeyPairConnectionId = String(
    keyPairList.find((entry) => entry?.name === selectedKeyPairMeta?.value)?.cloud_connection?.id || ""
  ).trim();
  const hasScopeMismatch =
    !!selectedKeyPairMeta && !!executionScope && !!selectedKeyPairScope && executionScope !== selectedKeyPairScope;
  const hasConnectionMismatch =
    !!selectedKeyPairMeta &&
    !!executionConnectionId &&
    !!selectedKeyPairConnectionId &&
    executionConnectionId !== selectedKeyPairConnectionId;
  const mismatchSnackbarMessage = hasScopeMismatch
    ? t("canvas.instanceForm.snackbar.scopeMismatch", {
      scope: selectedKeyPairScopeLabel || selectedKeyPairScope,
      executionScope: executionScopeLabel,
    })
    : hasConnectionMismatch
      ? t("canvas.instanceForm.snackbar.connectionMismatch")
      : "";
  const keyPairOptionsWithMatch = useMemo(
    () =>
      keyPairOptions.map((option) => {
        const scopeMatches = !executionScope || !option.scope || option.scope === executionScope;
        const regionMatches =
          !executionRegion || !option.region || option.region.toLowerCase() === executionRegion;
        const connectionMatches =
          !executionConnectionId || !option.connectionId || option.connectionId === executionConnectionId;
        const isCompatible = scopeMatches && regionMatches && connectionMatches;
        const reasons = [];
        if (!scopeMatches) reasons.push(t("canvas.instanceForm.compatibility.scopeReason", { value: formatScopeLabel(option.scope) }));
        if (!regionMatches) reasons.push(t("canvas.instanceForm.compatibility.regionReason", { value: option.region || t("canvas.instanceForm.scope.unknown") }));
        if (!connectionMatches) reasons.push(t("canvas.instanceForm.compatibility.otherConnection"));
        return {
          ...option,
          isCompatible,
          compatibilityHint: reasons.length > 0
            ? t("canvas.instanceForm.compatibility.mismatch", { reasons: reasons.join(" · ") })
            : t("canvas.instanceForm.compatibility.match"),
        };
      }),
    [executionConnectionId, executionRegion, executionScope, keyPairOptions, t]
  );
  const compatibleKeyPairOptions = useMemo(
    () => keyPairOptionsWithMatch.filter((option) => option.isCompatible),
    [keyPairOptionsWithMatch]
  );
  const visibleKeyPairOptions = useMemo(() => {
    if (!executionScope && !executionRegion && !executionConnectionId) {
      return keyPairOptionsWithMatch;
    }
    const current = String(watchedSshAccess || "").trim();
    const compatibleIds = new Set(compatibleKeyPairOptions.map((option) => option.id));
    const selectedFallback = keyPairOptionsWithMatch.find((option) => option.value === current && !compatibleIds.has(option.id));
    return selectedFallback
      ? [...compatibleKeyPairOptions, selectedFallback]
      : compatibleKeyPairOptions;
  }, [
    keyPairOptionsWithMatch,
    compatibleKeyPairOptions,
    executionScope,
    executionRegion,
    executionConnectionId,
    watchedSshAccess,
  ]);
  const hiddenKeyPairCount = Math.max(keyPairOptionsWithMatch.length - visibleKeyPairOptions.length, 0);

  useEffect(() => {
    reset({
      name: nodeData.name || "",
      ipAddress: nodeData.ipAddress || "",
      ami: nodeData.ami || providerOverride.image_family || "",
      gcpImageProject: providerOverride.image_project || "",
      instanceType: nodeData.instanceType || providerDefinition.instance.instanceTypeOptions?.[0]?.value || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
      associatePublicIp:
        typeof nodeData.associatePublicIp === "boolean"
          ? nodeData.associatePublicIp
          : defaultAssociatePublicIp,
    });
  }, [nodeData, reset, defaultAssociatePublicIp, providerDefinition.instance.instanceTypeOptions, providerOverride.image_family, providerOverride.image_project]);

  useEffect(() => {
    if (hasScopeMismatch || hasConnectionMismatch) {
      setMismatchSnackbarOpen(true);
    } else {
      setMismatchSnackbarOpen(false);
    }
  }, [hasScopeMismatch, hasConnectionMismatch, mismatchSnackbarMessage]);

  const resolveProviderOverrideValue = (rule, data) => {
    if (!rule || !rule.target) return undefined;
    const rawValue = data?.[rule.source];
    if (rule.transform === "boolean") return !!rawValue;
    return rawValue || undefined;
  };

  const buildProviderOverrides = (data) => providerOverrideRules.reduce((acc, rule) => {
    const value = resolveProviderOverrideValue(rule, data);
    if (typeof value === "undefined") return acc;
    acc[rule.target] = value;
    return acc;
  }, {});

  const onSubmit = (data) => {
    const ipRaw = (data.ipAddress || '').trim();
    const amiRaw = (data.ami || '').trim();
    const gcpImageProject = String(data.gcpImageProject || '').trim();
    const sshRaw = (data.sshAccess || '').trim();
    const type = (data.instanceType || 't2.micro').trim();
    const name = (data.name || '').trim();

    const ip = !ipRaw || ipRaw.toLowerCase() === 'auto' ? undefined : ipRaw;

    onSave({
      // meta
      type: "instance",

      // nombres
      name,

      // AMI
      ami: amiRaw || undefined,

      // tipo (camel & snake)
      instanceType: type,
      instance_type: type,

      // IP (camel & snake)
      ipAddress: ip,
      ip_address: ip,

      // SSH (camel & snake)
      sshAccess: sshRaw || undefined,
      ssh_access: sshRaw || undefined,
      associatePublicIp: !!data.associatePublicIp,
      associate_public_ip: !!data.associatePublicIp,
      provider_overrides: mergeNodeProviderOverrides(nodeData, provider, buildProviderOverrides({
        ...data,
        ami: amiRaw || undefined,
        gcpImageProject,
        instanceType: type,
        sshAccess: sshRaw || undefined,
      })),
    });
  };

  const renderSectionHeader = (eyebrow, title, helper) => (
    <Box className="pt-node-form__sectionHeader">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip label={eyebrow} size="small" className="pt-node-form__sectionChip" />
        <Typography className="pt-node-form__sectionTitle">{title}</Typography>
      </Stack>
      {helper && (
        <Typography className="pt-node-form__sectionHint">
          {helper}
        </Typography>
      )}
    </Box>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">{t("canvas.instanceForm.headerEyebrow")}</Typography>
        <Typography className="pt-node-form__title">{t("canvas.instanceForm.headerTitle")}</Typography>
        <Typography className="pt-node-form__subtitle">
          {t("canvas.instanceForm.headerSubtitle")}
        </Typography>
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          t("canvas.instanceForm.sections.identity.eyebrow"),
          t("canvas.instanceForm.sections.identity.title"),
          t("canvas.instanceForm.sections.identity.helper")
        )}

        <Box className="pt-node-form__grid pt-node-form__grid--two">
          <TextField
            label={t("canvas.instanceForm.fields.name")}
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            margin="normal"
          />

          <TextField
            label={t("canvas.instanceForm.fields.privateIp", { subnet: parentSubnetCidr || t("canvas.instanceForm.subnetFallback") })}
            {...register("ipAddress")}
            error={!!errors.ipAddress}
            helperText={errors.ipAddress?.message || t("canvas.instanceForm.fields.privateIpHelp")}
            placeholder={t("canvas.instanceForm.fields.privateIpPlaceholder")}
            fullWidth
            margin="normal"
          />
        </Box>

        <FormControl fullWidth margin="normal">
          <InputLabel id="associate-public-ip-label">{providerDefinition.instance.publicIpLabel}</InputLabel>
          <Controller
            control={control}
            name="associatePublicIp"
            render={({ field }) => (
              <Select
                labelId="associate-public-ip-label"
                label={providerDefinition.instance.publicIpLabel}
                value={field.value === true ? "yes" : "no"}
                onChange={(event) => field.onChange(event.target.value === "yes")}
              >
                <MenuItem value="yes">{t("canvas.vpcForm.fields.enabled")}</MenuItem>
                <MenuItem value="no">{t("canvas.vpcForm.fields.disabled")}</MenuItem>
              </Select>
            )}
          />
        </FormControl>

        <Box className="pt-node-form__noteCard">
          <Typography className="pt-node-form__noteTitle">{t("canvas.instanceForm.quickTips.title")}</Typography>
          <Typography className="pt-node-form__noteText">
            {t("canvas.instanceForm.quickTips.privateIp")}
          </Typography>
          <Typography className="pt-node-form__noteText">
            {t("canvas.instanceForm.quickTips.publicIp")}
          </Typography>
          <Box sx={{ mt: 1.2 }}>
            <CidrLearningGuideButton buttonLabel={t("canvas.cidrGuide.button")} />
          </Box>
        </Box>
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          t("canvas.instanceForm.sections.runtime.eyebrow"),
          t("canvas.instanceForm.sections.runtime.title"),
          instanceFormConfig.runtimeHelperMode === "provider"
            ? t("canvas.instanceForm.sections.runtime.helperProvider", {
              provider: providerLabel,
              imageLabel: providerDefinition.instance.imageLabel || "image",
              instanceTypeLabel: providerDefinition.instance.instanceTypeLabel || "machine type",
            })
            : t("canvas.instanceForm.sections.runtime.helper")
        )}

        <Box className="pt-node-form__grid pt-node-form__grid--two">
          {usesCatalogImage ? (
            <FormControl fullWidth margin="normal" error={!!errors.ami}>
              <InputLabel id="ami-label">{providerDefinition.instance.imageLabel}</InputLabel>
              <Select
                labelId="ami-label"
                {...register("ami")}
                label={providerDefinition.instance.imageLabel}
                defaultValue={nodeData.ami || ""}
                displayEmpty
              >
                <MenuItem value="">
                  <em>{t(imageFieldConfig.emptyOptionKey || "canvas.instanceForm.fields.useDefaultAmi")}</em>
                </MenuItem>
                {amiOptions.map((ami) => (
                  <MenuItem key={ami.key} value={ami.value}>
                    {ami.region ? `${ami.label} (${ami.region})` : ami.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.ami && <FormHelperText>{errors.ami.message}</FormHelperText>}
              {!errors.ami && amiOptions.length === 0 && (
                <FormHelperText>
                  {t(imageFieldConfig.fallbackHelpKey || "canvas.instanceForm.fields.amiFallback")}
                </FormHelperText>
              )}
            </FormControl>
          ) : (
            <TextField
              label={providerDefinition.instance.imageLabel}
              {...register("ami")}
              error={!!errors.ami}
              helperText={errors.ami?.message || t(instanceFormConfig.imageFieldHelpKey || "canvas.instanceForm.gcpFields.imageFamilyHelp")}
              placeholder={imageFieldConfig.placeholder || "debian-12"}
              fullWidth
              margin="normal"
            />
          )}

          <FormControl fullWidth margin="normal" error={!!errors.instanceType}>
            <InputLabel id="instance-type-label">{providerDefinition.instance.instanceTypeLabel}</InputLabel>
            <Select
              labelId="instance-type-label"
              label={providerDefinition.instance.instanceTypeLabel}
              {...register("instanceType")}
              defaultValue={nodeData.instanceType || providerDefinition.instance.instanceTypeOptions?.[0]?.value || "t2.micro"}
            >
              {providerDefinition.instance.instanceTypeOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            {errors.instanceType && (
              <FormHelperText>{errors.instanceType.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        {imageProjectField && (
          <TextField
            label={t(imageProjectField.labelKey)}
            {...register("gcpImageProject")}
            helperText={t(imageProjectField.helpKey)}
            placeholder={imageProjectField.placeholder || ""}
            fullWidth
            margin="normal"
          />
        )}

        {watch("instanceType")?.startsWith("t4g") && (
          <Alert severity="info" variant="outlined" sx={{ mt: 0.6 }}>
            {t("canvas.instanceForm.alerts.arm64")}
          </Alert>
        )}
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          t("canvas.instanceForm.sections.ssh.eyebrow"),
          sshSectionConfig.titleMode === "provider"
            ? t("canvas.instanceForm.sections.ssh.titleProvider", { provider: providerLabel })
            : t("canvas.instanceForm.sections.ssh.title"),
          sshSectionConfig.helperMode === "provider"
            ? t("canvas.instanceForm.sections.ssh.helperProvider", {
              provider: providerLabel,
              sshField: providerDefinition.instance.sshFieldLabel || "SSH access",
            })
            : t("canvas.instanceForm.sections.ssh.helper")
        )}

        {usesSshCatalog ? (
          <Controller
            control={control}
            name="sshAccess"
            render={({ field }) => (
              <Autocomplete
                freeSolo
                options={visibleKeyPairOptions}
                value={
                  keyPairOptionsWithMatch.find((option) => option.value === (field.value || "")) ||
                  field.value ||
                  null
                }
                onChange={(_event, newValue) => {
                  if (typeof newValue === "string") {
                    field.onChange(newValue);
                    return;
                  }
                  field.onChange(newValue?.value || "");
                }}
                onInputChange={(_event, newInputValue, reason) => {
                  if (reason === "input" || reason === "clear") {
                    field.onChange(newInputValue || "");
                  }
                }}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option;
                  return option?.value || "";
                }}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id} sx={{ py: 1 }}>
                    <Box sx={{ width: "100%" }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                            {option.label}
                          </Typography>
                          {option.subtitle && (
                            <Typography variant="caption" color="text.secondary">
                              {option.subtitle}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          icon={
                            option.isCompatible ? (
                              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <WarningAmberRoundedIcon sx={{ fontSize: 16 }} />
                            )
                          }
                          label={option.isCompatible ? t("canvas.instanceForm.compatibility.compatible") : t("canvas.instanceForm.compatibility.review")}
                          size="small"
                          color={option.isCompatible ? "success" : "warning"}
                          variant={option.isCompatible ? "filled" : "outlined"}
                          sx={{ flexShrink: 0, fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.4,
                          color: option.isCompatible ? "success.main" : "warning.main",
                          fontWeight: 600,
                        }}
                      >
                        {option.compatibilityHint}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("canvas.instanceForm.fields.sshAccess")}
                    error={!!errors.sshAccess}
                    helperText={
                      errors.sshAccess?.message ||
                      (visibleKeyPairOptions.length > 0
                        ? t("canvas.instanceForm.fields.sshAccessHelp")
                        : t("canvas.instanceForm.fields.sshAccessManualHelp"))
                    }
                    placeholder={t("canvas.instanceForm.fields.sshAccessPlaceholder")}
                    fullWidth
                    margin="normal"
                  />
                )}
              />
            )}
          />
        ) : (
          <>
            <TextField
              label={t(sshManualField?.labelKey || "canvas.instanceForm.gcpFields.sshUser")}
              {...register("sshAccess")}
              error={!!errors.sshAccess}
              helperText={errors.sshAccess?.message || t(sshManualField?.helpKey || "canvas.instanceForm.gcpFields.sshUserHelp")}
              placeholder={sshManualField?.placeholder || "syslab"}
              fullWidth
              margin="normal"
            />
            {sshManualField?.alertKey && (
              <Alert severity="info" variant="outlined" sx={{ mt: 0.4 }}>
                {t(sshManualField.alertKey)}
              </Alert>
            )}
          </>
        )}

        {usesSshCatalog && visibleKeyPairOptions.length > 0 && (
          <Box className="pt-node-form__microCopy">
            <Typography className="pt-node-form__microCopyText">
              {t("canvas.instanceForm.catalogHint")}
            </Typography>
          </Box>
        )}
        {usesSshCatalog && selectedKeyPairMeta && !hasScopeMismatch && !hasConnectionMismatch && (
          <Box className="pt-node-form__microCopy" sx={{ mt: 0.2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                label={t("canvas.instanceForm.compatibility.selectedCompatible")}
                size="small"
                color="success"
                variant="filled"
                sx={{ fontWeight: 700 }}
              />
              {executionRegion && (
                <Typography className="pt-node-form__microCopyText">
                  {t("canvas.instanceForm.executionRegion", { value: executionRegion })}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
        {usesSshCatalog && hiddenKeyPairCount > 0 && (
          <Alert severity="info" variant="outlined" sx={{ mt: 0.6 }}>
            {t("canvas.instanceForm.hiddenOptions", { count: hiddenKeyPairCount })}
          </Alert>
        )}

        <Stack spacing={1.1} sx={{ mt: 0.8 }}>
          {usesSshCatalog && hasScopeMismatch && (
            <Alert severity="warning" variant="outlined">
              {t("canvas.instanceForm.alerts.scopeMismatch.before")} <b>{selectedKeyPairScopeLabel}</b>, {t("canvas.instanceForm.alerts.scopeMismatch.middle")} <b>{executionScopeLabel}</b>. {t("canvas.instanceForm.alerts.scopeMismatch.after")}
            </Alert>
          )}
          {usesSshCatalog && !hasScopeMismatch && hasConnectionMismatch && (
            <Alert severity="warning" variant="outlined">
              {t("canvas.instanceForm.alerts.connectionMismatch")}
            </Alert>
          )}

          <Box className="pt-node-form__noteCard pt-node-form__noteCard--soft">
            <Typography className="pt-node-form__noteTitle">{t("canvas.instanceForm.systemValidation.title")}</Typography>
            <Typography className="pt-node-form__noteText">
              {t(
                systemValidationConfig.deployKey || "canvas.instanceForm.systemValidation.deploy",
                systemValidationConfig.interpolateProvider ? { provider: providerLabel } : undefined
              )}
            </Typography>
            <Divider flexItem sx={{ my: 0.9 }} />
            <Typography className="pt-node-form__noteText">
              {t(
                systemValidationConfig.sshKey || "canvas.instanceForm.systemValidation.ssh",
                systemValidationConfig.interpolateProvider ? { provider: providerLabel } : undefined
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>


      <Box className="pt-node-form__actions">
        <Button type="submit" variant="contained" color="primary">
          {t("canvas.instanceForm.actions.save")}
        </Button>
        <Button onClick={deleteNode} color="error">
          {t("canvas.instanceForm.actions.delete")}
        </Button>
      </Box>

      <Snackbar
        open={mismatchSnackbarOpen}
        autoHideDuration={5000}
        onClose={() => setMismatchSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setMismatchSnackbarOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {mismatchSnackbarMessage}
        </Alert>
      </Snackbar>
    </form>
  );
};

export default InstanceNodeForm;

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
import { TYPE_INSTANCE_NODE } from "../utils/constants";
import { INSTANCE_TYPE_OPTIONS } from './options/instanceTypes';
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
    { existingIps: siblingIpsInSameSubnet },
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
      ami: nodeData.ami || "",
      instanceType: nodeData.instanceType || "t2.micro",
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
      ami: nodeData.ami || "",
      instanceType: nodeData.instanceType || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
      associatePublicIp:
        typeof nodeData.associatePublicIp === "boolean"
          ? nodeData.associatePublicIp
          : defaultAssociatePublicIp,
    });
  }, [nodeData, reset, defaultAssociatePublicIp]);

  useEffect(() => {
    if (hasScopeMismatch || hasConnectionMismatch) {
      setMismatchSnackbarOpen(true);
    } else {
      setMismatchSnackbarOpen(false);
    }
  }, [hasScopeMismatch, hasConnectionMismatch, mismatchSnackbarMessage]);

  const onSubmit = (data) => {
    const ipRaw = (data.ipAddress || '').trim();
    const amiRaw = (data.ami || '').trim();
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
          t("canvas.instanceForm.sections.runtime.helper")
        )}

        <Box className="pt-node-form__grid pt-node-form__grid--two">
          <FormControl fullWidth margin="normal" error={!!errors.ami}>
            <InputLabel id="ami-label">{t("canvas.instanceForm.fields.ami")}</InputLabel>
            <Select
              labelId="ami-label"
              {...register("ami")}
              label={t("canvas.instanceForm.fields.ami")}
              defaultValue={nodeData.ami || ""}
              displayEmpty
            >
              <MenuItem value="">
                <em>{t("canvas.instanceForm.fields.useDefaultAmi")}</em>
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
                {t("canvas.instanceForm.fields.amiFallback")}
              </FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth margin="normal" error={!!errors.instanceType}>
            <InputLabel id="instance-type-label">{t("canvas.instanceForm.fields.instanceType")}</InputLabel>
            <Select
              labelId="instance-type-label"
              label={t("canvas.instanceForm.fields.instanceType")}
              {...register("instanceType")}
              defaultValue={nodeData.instanceType || "t2.micro"}
            >
              {INSTANCE_TYPE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            {errors.instanceType && (
              <FormHelperText>{errors.instanceType.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        {watch("instanceType")?.startsWith("t4g") && (
          <Alert severity="info" variant="outlined" sx={{ mt: 0.6 }}>
            {t("canvas.instanceForm.alerts.arm64")}
          </Alert>
        )}
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          t("canvas.instanceForm.sections.ssh.eyebrow"),
          t("canvas.instanceForm.sections.ssh.title"),
          t("canvas.instanceForm.sections.ssh.helper")
        )}

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

        {visibleKeyPairOptions.length > 0 && (
          <Box className="pt-node-form__microCopy">
            <Typography className="pt-node-form__microCopyText">
              {t("canvas.instanceForm.catalogHint")}
            </Typography>
          </Box>
        )}
        {selectedKeyPairMeta && !hasScopeMismatch && !hasConnectionMismatch && (
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
        {hiddenKeyPairCount > 0 && (
          <Alert severity="info" variant="outlined" sx={{ mt: 0.6 }}>
            {t("canvas.instanceForm.hiddenOptions", { count: hiddenKeyPairCount })}
          </Alert>
        )}

        <Stack spacing={1.1} sx={{ mt: 0.8 }}>
          {hasScopeMismatch && (
            <Alert severity="warning" variant="outlined">
              {t("canvas.instanceForm.alerts.scopeMismatch.before")} <b>{selectedKeyPairScopeLabel}</b>, {t("canvas.instanceForm.alerts.scopeMismatch.middle")} <b>{executionScopeLabel}</b>. {t("canvas.instanceForm.alerts.scopeMismatch.after")}
            </Alert>
          )}
          {!hasScopeMismatch && hasConnectionMismatch && (
            <Alert severity="warning" variant="outlined">
              {t("canvas.instanceForm.alerts.connectionMismatch")}
            </Alert>
          )}

          <Box className="pt-node-form__noteCard pt-node-form__noteCard--soft">
            <Typography className="pt-node-form__noteTitle">{t("canvas.instanceForm.systemValidation.title")}</Typography>
            <Typography className="pt-node-form__noteText">
              {t("canvas.instanceForm.systemValidation.deploy")}
            </Typography>
            <Divider flexItem sx={{ my: 0.9 }} />
            <Typography className="pt-node-form__noteText">
              {t("canvas.instanceForm.systemValidation.ssh")}
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

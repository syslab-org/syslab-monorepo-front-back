// apps/frontend/src/components/flow/forms/VPCNodeForm.jsx
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { getCanvasProviderDefinition } from "@/features/networkCanvas/providers/providerCatalog";
import { mergeNodeProviderOverrides } from "@/features/networkCanvas/providers/providerOverrides";
import { VPC_CHILD_FORM, } from "@/features/networkCanvas/utils/constants";
import CidrLearningGuideButton from '@/features/networkCanvas/ui/CidrLearningGuideButton';
import { useFormValidationSchema } from "./validations/useFormValidations";

const VPCNodeForm = ({
  provider = "aws",
  nodeData,
  onSave,
  deleteNode,
  vlanCidr, // "10.0.0.0/16"
  siblingVpcCidrs = [], // ["10.0.1.0/24", ...]
  defaultRegion = "us-east-1",
  publicSubnetNames = [], // nombres de subnets públicas en esta VPC
  privateSubnetNames = [], // nombres de subnets privadas en esta VPC
}) => {
  const { t } = useTranslation();
  const providerDefinition = getCanvasProviderDefinition(provider);
  const isGcp = provider === "gcp";
  const providerLabel = providerDefinition.label || String(provider || "aws").toUpperCase();
  const validationSchema = useFormValidationSchema(
    VPC_CHILD_FORM,
    null,
    null,
    { vlanCidr, siblingVpcCidrs, providerNetwork: providerDefinition.segment },
    true
  );

  const hasPublicSubnets = useMemo(
    () => Array.isArray(publicSubnetNames) && publicSubnetNames.length > 0,
    [publicSubnetNames]
  );
  const hasPrivateSubnets = useMemo(
    () => Array.isArray(privateSubnetNames) && privateSubnetNames.length > 0,
    [privateSubnetNames]
  );

  // ⚙️ FEATURE FLAG (por si algún día quieres permitir encender el switch aunque no haya subnets públicas)
  // Si pones esta constante en true, el switch no se bloqueará al encenderse; solo mostrará warnings.
  const ALLOW_ENABLE_NAT_WITHOUT_PUBLIC_SUBNETS = false;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      vpcName: nodeData?.vpcName || "",
      region: nodeData?.region || defaultRegion, // ej: "us-east-1"
      cidrBlock:
        nodeData?.cidrBlock && nodeData?.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData?.internetGateway ?? false,
      allowedSshCidr: nodeData?.allowedSshCidr || "",

      // NAT
      enableNatGateway: nodeData?.enableNatGateway ?? false,
      natGatewayPublicSubnet: nodeData?.natGatewayPublicSubnet || "",
      natGatewayElasticIp: nodeData?.natGatewayElasticIp || "",
    },
  });

  // Snackbar llamativo
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("info"); // "success" | "info" | "warning" | "error"

  const enableNat = watch("enableNatGateway");
  const natSubnet = watch("natGatewayPublicSubnet");
  const internetGatewayEnabled = watch("internetGateway");
  const allowedSshCidr = watch("allowedSshCidr");
  const natRequiresPublicZone = providerDefinition.segment.natRequiresPublicZone !== false;

  // Cuando cambia el nodeData (o props clave), refresca el form SIN perder NAT fields
  useEffect(() => {
    reset({
      vpcName: nodeData?.vpcName || "",
      region: nodeData?.region || defaultRegion,
      cidrBlock:
        nodeData?.cidrBlock && nodeData?.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData?.internetGateway ?? false,
      allowedSshCidr: nodeData?.allowedSshCidr || "",

      // Preserva NAT del nodo
      enableNatGateway: nodeData?.enableNatGateway ?? false,
      natGatewayPublicSubnet: nodeData?.natGatewayPublicSubnet || "",
      natGatewayElasticIp: nodeData?.natGatewayElasticIp || "",
    });
  }, [nodeData, reset, defaultRegion]);

  // Al cambiar el estado de NAT o la disponibilidad de subnets públicas:
  // - Si NAT está activo y hay subnets públicas pero no hay seleccionada → autoselecciona la primera + snackbar
  // - Si NAT está activo y NO hay subnets públicas → snackbar de advertencia
  useEffect(() => {
    if (natRequiresPublicZone && enableNat && hasPublicSubnets && !natSubnet) {
      const auto = publicSubnetNames[0];
      setValue("natGatewayPublicSubnet", auto, { shouldValidate: true });
      setSnackMsg(
        t("canvas.vpcForm.snackbar.autoSelectNatSubnet", { value: auto })
      );
      setSnackSeverity("info");
      setSnackOpen(true);
    }

    if (natRequiresPublicZone && enableNat && !hasPublicSubnets) {
      setSnackMsg(t("canvas.vpcForm.snackbar.noPublicSubnetsForNat"));
      setSnackSeverity("warning");
      setSnackOpen(true);
    }

    if (enableNat && hasPublicSubnets && !hasPrivateSubnets) {
      setSnackMsg(t("canvas.vpcForm.snackbar.natWithoutPrivateZones"));
      setSnackSeverity("info");
      setSnackOpen(true);
    }
  }, [
    enableNat,
    hasPublicSubnets,
    hasPrivateSubnets,
    natRequiresPublicZone,
    natSubnet,
    publicSubnetNames,
    setValue,
    t,
  ]);

  const onSubmit = (data) => {
    // Bloqueo extra por UX: si NAT está activo, exige subnet pública
    if (natRequiresPublicZone && data.enableNatGateway && (!hasPublicSubnets || !data.natGatewayPublicSubnet)) {
      setSnackMsg(t("canvas.vpcForm.snackbar.selectNatPublicZoneBeforeSave"));
      setSnackSeverity("warning");
      setSnackOpen(true);
      return;
    }

    const [base, prefix] = (data.cidrBlock || "").split("/");

    const payload = {
      // existentes
      vpcName: data.vpcName,
      region: data.region,
      cidrBlock: base,
      prefixLength: Number(prefix),
      internetGateway: natRequiresPublicZone ? data.internetGateway : false,
      allowedSshCidr: data.allowedSshCidr || "",

      // NAT (camelCase para el builder)
      enableNatGateway: !!data.enableNatGateway,
      natGatewayPublicSubnet: natRequiresPublicZone ? (data.natGatewayPublicSubnet || "") : "",
      natGatewayElasticIp: providerDefinition.segment.supportsElasticIp ? (data.natGatewayElasticIp || "").trim() : "",

      // snake_case (opcional)
      nat_gateway: {
        enabled: !!data.enableNatGateway,
        public_subnet: natRequiresPublicZone ? (data.natGatewayPublicSubnet || "") : "",
        elastic_ip: providerDefinition.segment.supportsElasticIp ? (data.natGatewayElasticIp || "").trim() : "",
      },
      provider_overrides: mergeNodeProviderOverrides(nodeData, provider, isGcp
        ? {
          resource_kind: "vpc_network",
          cloud_nat: {
            enabled: !!data.enableNatGateway,
          },
          firewall: {
            ssh_source_ranges: data.allowedSshCidr ? [data.allowedSshCidr] : [],
          },
        }
        : {
          resource_kind: "vpc",
          internet_gateway: !!data.internetGateway,
          nat_gateway: {
            enabled: !!data.enableNatGateway,
            public_subnet: data.natGatewayPublicSubnet || "",
            elastic_ip: (data.natGatewayElasticIp || "").trim(),
          },
        }),
    };

    onSave(payload);
  };

  const disableSubmitForNat =
    natRequiresPublicZone && enableNat && (!hasPublicSubnets || !natSubnet || natSubnet === "");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">{t("canvas.vpcForm.headerEyebrow")}</Typography>
        <Typography className="pt-node-form__title">{t("canvas.vpcForm.headerTitle")}</Typography>
        <Typography className="pt-node-form__subtitle">
          {t("canvas.vpcForm.headerSubtitleProvider", {
            provider: providerLabel,
            kind: providerDefinition.segment?.kindLabel || "network",
          })}
        </Typography>
      </Box>
      {/* Snackbar vistoso */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={5000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>

      {/* Segment Name */}
      <TextField
        label={t("canvas.vpcForm.fields.segmentName")}
        {...register("vpcName")}
        error={!!errors.vpcName}
        helperText={errors.vpcName?.message}
        fullWidth
        margin="normal"
      />

      {/* Segment CIDR */}
      <TextField
        label={t("canvas.vpcForm.fields.segmentCidr", { parent: vlanCidr || t("canvas.vpcForm.networkFallback") })}
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message}
        placeholder={t("canvas.vpcForm.fields.segmentCidrPlaceholder")}
        fullWidth
        margin="normal"
      />

      {/* Region */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="vpc-region-label">{t("canvas.vpcForm.fields.region")}</InputLabel>
        <Select
          labelId="vpc-region-label"
          {...register("region")}
          label={t("canvas.vpcForm.fields.region")}
          defaultValue={defaultRegion}
        >
          <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
          <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
          <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
        </Select>
        {errors.region && (
          <FormHelperText error>{errors.region.message}</FormHelperText>
        )}
      </FormControl>

      {/* Internet Edge */}
      {natRequiresPublicZone ? (
        <FormControl fullWidth margin="normal">
          <InputLabel id="igw-label">{t("canvas.vpcForm.fields.internetEdge")}</InputLabel>
          <Select
            labelId="igw-label"
            label={t("canvas.vpcForm.fields.internetEdge")}
            {...register("internetGateway")}
            defaultValue={nodeData?.internetGateway ?? false}
          >
            <MenuItem value={true}>{t("canvas.vpcForm.fields.enabled")}</MenuItem>
            <MenuItem value={false}>{t("canvas.vpcForm.fields.disabled")}</MenuItem>
          </Select>
          {errors.internetGateway && (
            <FormHelperText error>
              {errors.internetGateway.message}
            </FormHelperText>
          )}
        </FormControl>
      ) : (
        <Alert severity="info" variant="outlined" sx={{ mt: 1, mb: 1 }}>
          {t("canvas.vpcForm.gcpInternetHint")}
        </Alert>
      )}

      <Alert severity="info" variant="outlined" sx={{ mt: 1, mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t("canvas.vpcForm.info.title")}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.4 }}>
          {t("canvas.vpcForm.info.cidr")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.vpcForm.info.internetEdge")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.vpcForm.info.managedEgress")}
        </Typography>
        <Typography variant="caption" display="block">
          {isGcp ? t("canvas.vpcForm.info.providerInternetModel") : t("canvas.vpcForm.info.elasticIp")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.vpcForm.info.allowedSsh")}
        </Typography>
        <Box sx={{ mt: 1.25 }}>
          <CidrLearningGuideButton buttonLabel={t("canvas.cidrGuide.button")} />
        </Box>
      </Alert>

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip
          size="small"
          label={
            isGcp
              ? t("canvas.vpcForm.gcpChips.internetModel")
              : internetGatewayEnabled
                ? t("canvas.vpcForm.chips.igwEnabled")
                : t("canvas.vpcForm.chips.igwDisabled")
          }
          color={internetGatewayEnabled ? "primary" : "default"}
          variant={internetGatewayEnabled ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          label={enableNat
            ? (isGcp ? t("canvas.vpcForm.gcpChips.natEnabled") : t("canvas.vpcForm.chips.natEnabled"))
            : (isGcp ? t("canvas.vpcForm.gcpChips.natDisabled") : t("canvas.vpcForm.chips.natDisabled"))}
          color={enableNat ? "warning" : "default"}
          variant={enableNat ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          label={t("canvas.vpcForm.chips.privateZones", { count: privateSubnetNames.length })}
          color={hasPrivateSubnets ? "success" : "default"}
          variant={hasPrivateSubnets ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          label={allowedSshCidr ? t("canvas.vpcForm.chips.sshExposed") : t("canvas.vpcForm.chips.sshHidden")}
          color={allowedSshCidr ? "info" : "default"}
          variant={allowedSshCidr ? "filled" : "outlined"}
        />
      </Stack>

      {/* ---- NAT Gateway ---- */}
      <Box sx={{ mt: 1.5, mb: 0.5 }}>
        {natRequiresPublicZone && !hasPublicSubnets && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {t("canvas.vpcForm.alerts.noPublicZones")}
          </Alert>
        )}

        {!enableNat && (hasPublicSubnets || !natRequiresPublicZone) && hasPrivateSubnets && (
          <Alert severity="info" sx={{ mb: 1 }}>
            {t("canvas.vpcForm.alerts.topologyReady")}<b> {isGcp ? t("canvas.vpcForm.gcpSwitchLabel") : t("canvas.vpcForm.switchLabel")}</b>.
          </Alert>
        )}

        {enableNat && (hasPublicSubnets || !natRequiresPublicZone) && !hasPrivateSubnets && (
          <Alert severity="info" sx={{ mb: 1 }}>
            {t("canvas.vpcForm.alerts.natWithoutPrivateZones")}
          </Alert>
        )}

        {enableNat && (hasPublicSubnets || !natRequiresPublicZone) && hasPrivateSubnets && (
          <Alert severity="success" sx={{ mb: 1 }}>
            {isGcp ? t("canvas.vpcForm.gcpAlerts.demoCase") : t("canvas.vpcForm.alerts.demoCase")}
          </Alert>
        )}

        <Controller
          name="enableNatGateway"
          control={control}
          render={({ field: { value, onChange } }) => {
            const willBlockTurnOn =
              natRequiresPublicZone &&
              !ALLOW_ENABLE_NAT_WITHOUT_PUBLIC_SUBNETS &&
              !hasPublicSubnets &&
              !value;

            return (
              <Tooltip
                arrow
                placement="top"
                title={
                  willBlockTurnOn
                    ? t("canvas.vpcForm.tooltip.enableNatBlocked")
                    : ""
                }
              >
                <span>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!value}
                        onChange={(_, checked) => {
                          // Bloquea encendido si no hay públicas (salvo feature flag)
                          if (willBlockTurnOn && checked) {
                            setSnackMsg(t("canvas.vpcForm.snackbar.createPublicZoneFirst"));
                            setSnackSeverity("warning");
                            setSnackOpen(true);
                            return;
                          }
                          onChange(checked);
                        }}
                        disabled={willBlockTurnOn}
                      />
                    }
                    label={isGcp ? t("canvas.vpcForm.gcpSwitchLabel") : t("canvas.vpcForm.switchLabel")}
                  />
                </span>
              </Tooltip>
            );
          }}
        />
      </Box>

      {/* Select de Public Zone para egress */}
      {natRequiresPublicZone && (
        <FormControl
          fullWidth
          margin="normal"
          disabled={!enableNat || !hasPublicSubnets}
          error={!!errors.natGatewayPublicSubnet}
        >
          <InputLabel id="nat-subnet-label">{t("canvas.vpcForm.fields.publicZoneForEgress")}</InputLabel>
          <Controller
            name="natGatewayPublicSubnet"
            control={control}
            render={({ field }) => (
              <Select
                labelId="nat-subnet-label"
                label={t("canvas.vpcForm.fields.publicZoneForEgress")}
                {...field}
                value={field.value || ""}
              >
                <MenuItem value="">
                  <em>{t("canvas.vpcForm.fields.selectPublicZone")}</em>
                </MenuItem>
                {publicSubnetNames.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {!hasPublicSubnets && (
            <FormHelperText>
              {t("canvas.vpcForm.fields.publicZoneHelp")}
            </FormHelperText>
          )}
          {errors.natGatewayPublicSubnet && (
            <FormHelperText>{errors.natGatewayPublicSubnet.message}</FormHelperText>
          )}
        </FormControl>
      )}

      {/* EIP opcional */}
      {providerDefinition.segment.supportsElasticIp && (
        <TextField
          label={t("canvas.vpcForm.fields.natEip")}
          {...register("natGatewayElasticIp")}
          placeholder={t("canvas.vpcForm.fields.natEipPlaceholder")}
          helperText={
            enableNat
              ? t("canvas.vpcForm.fields.natEipHelpEnabled")
              : t("canvas.vpcForm.fields.natEipHelpDisabled")
          }
          fullWidth
          margin="normal"
          disabled={!enableNat}
        />
      )}

      {/* Allowed SSH */}
      <TextField
        label={isGcp ? t("canvas.vpcForm.gcpFields.allowedSsh") : t("canvas.vpcForm.fields.allowedSsh")}
        {...register("allowedSshCidr")}
        error={!!errors.allowedSshCidr}
        helperText={
          errors.allowedSshCidr?.message ||
          (isGcp ? t("canvas.vpcForm.gcpFields.allowedSshHelp") : t("canvas.vpcForm.fields.allowedSshHelp"))
        }
        placeholder={isGcp ? t("canvas.vpcForm.gcpFields.allowedSshPlaceholder") : t("canvas.vpcForm.fields.allowedSshPlaceholder")}
        fullWidth
        margin="normal"
      />

      {/* Botones */}
      <Box className="pt-node-form__actions">
        <Tooltip
          arrow
          disableHoverListener={!disableSubmitForNat}
          title={
            disableSubmitForNat
              ? t("canvas.vpcForm.tooltip.saveBlocked")
              : ""
          }
        >
          <span>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={disableSubmitForNat}
            >
              {t("canvas.vpcForm.actions.save")}
            </Button>
          </span>
        </Tooltip>

        <Button onClick={deleteNode} color="error">
          {t("canvas.vpcForm.actions.delete")}
        </Button>

        {/* Pista visual pequeña cuando el botón está deshabilitado */}
        {disableSubmitForNat && (
          <Typography variant="caption" sx={{ color: "warning.main", ml: 1.5 }}>
            {t("canvas.vpcForm.actions.saveHint")}
          </Typography>
        )}
      </Box>
    </form>
  );
};

export default VPCNodeForm;

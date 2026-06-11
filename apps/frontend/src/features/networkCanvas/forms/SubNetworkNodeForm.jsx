// apps/frontend/src/components/flow/forms/SubNetworkNodeForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import CidrLearningGuideButton from '@/features/networkCanvas/ui/CidrLearningGuideButton';
import { getCanvasProviderDefinition } from '@/features/networkCanvas/providers/providerCatalog';
import { getNodeProviderOverride, mergeNodeProviderOverrides } from '@/features/networkCanvas/providers/providerOverrides';
import { TYPE_SUBNETWORK_NODE } from "../utils/constants";
import { useFormValidationSchema } from './validations/useFormValidations';

const SUBNET_TYPE_OPTIONS = [
  { value: 'public', labelKey: 'canvas.subnetForm.type.public' },
  { value: 'private', labelKey: 'canvas.subnetForm.type.private' },
];

const SubNetworkNodeForm = ({
  provider = "aws",
  nodeData = {},
  onSave,
  deleteNode,
  parentVpcCidr,                    // p.ej. "10.10.0.0/20"
  siblingSubnetCidrsInSameVpc = [], // para evitar solapes
  siblingSubnetNames = [],          // (opcional) para nombre único
  region = "us-east-1",
}) => {
  const { t } = useTranslation();
  const providerDefinition = getCanvasProviderDefinition(provider);
  const providerOverride = getNodeProviderOverride(nodeData, provider);
  const isGcp = provider === "gcp";
  const providerLabel = providerDefinition.label || String(provider || "aws").toUpperCase();
  const effectiveRegion =
    String(region || providerDefinition.lab?.defaultRegion || "us-east-1").trim()
    || providerDefinition.lab?.defaultRegion
    || "us-east-1";
  // Descomponer CIDR de la VPC para el schema
  let vpcBase = null, vpcPrefix = null;
  if (/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(parentVpcCidr || '')) {
    const [b, p] = parentVpcCidr.split('/');
    vpcBase = b;
    vpcPrefix = Number(p);
  }

  const validationSchema = useFormValidationSchema(
    TYPE_SUBNETWORK_NODE,
    vpcBase,
    vpcPrefix,
    {
      existingCidrs: siblingSubnetCidrsInSameVpc,
      existingSubnetNames: siblingSubnetNames,
      providerSubnet: providerDefinition.subnet,
    },
    true
  );

  const incomingSubnetType = typeof nodeData.subnetType === "string"
    ? nodeData.subnetType.toLowerCase()
    : "public";

  // Opciones de AZ derivadas de region (us-east-1 → us-east-1a..f)
  const azOptions = useMemo(() => {
    const base = effectiveRegion.replace(/[a-z]$/i, ""); // si te llega us-east-1a
    return ["a", "b", "c", "d", "e", "f"].map(sfx => `${base}${sfx}`);
  }, [effectiveRegion]);

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
      subnetName: nodeData.subnetName || "",
      cidrBlock: nodeData.cidrBlock || "",
      availabilityZone: nodeData.availabilityZone || (azOptions[0] || `${effectiveRegion}a`),
      subnetType: incomingSubnetType,
      // por defecto, públicas con IP pública; privadas sin ella
      map_public_ip_on_launch:
        nodeData.map_public_ip_on_launch ?? (incomingSubnetType === "public"),
      privateGoogleAccess: Boolean(providerOverride.private_google_access),
      flowLogs: Boolean(providerOverride.flow_logs),
    },
  });

  // Si cambia el tipo de subnet, sincroniza el flag de IP pública
  const subnetType = watch("subnetType");
  useEffect(() => {
    if (subnetType === "public") setValue("map_public_ip_on_launch", true);
    if (subnetType === "private") setValue("map_public_ip_on_launch", false);
  }, [subnetType, setValue]);

  useEffect(() => {
    reset({
      subnetName: nodeData.subnetName || "",
      cidrBlock: nodeData.cidrBlock || "",
      availabilityZone: nodeData.availabilityZone || (azOptions[0] || `${effectiveRegion}a`),
      subnetType: incomingSubnetType,
      map_public_ip_on_launch:
        nodeData.map_public_ip_on_launch ?? (incomingSubnetType === "public"),
      privateGoogleAccess: Boolean(providerOverride.private_google_access),
      flowLogs: Boolean(providerOverride.flow_logs),
    });
  }, [nodeData, reset, azOptions, effectiveRegion, incomingSubnetType, providerOverride.flow_logs, providerOverride.private_google_access]);

  const onSubmit = (data) => {
    const name = data.subnetName.trim();
    const cidr = data.cidrBlock.trim();
    const az = isGcp ? effectiveRegion : (data.availabilityZone || `${effectiveRegion}a`).trim();
    const type = String(data.subnetType || "public").toLowerCase();
    const mapPublic = isGcp ? false : !!data.map_public_ip_on_launch;

    // ✅ Guardamos camelCase (lo que renderiza el canvas y usa el builder)
    // ✅ y snake_case (lo que espera Terraform al transformar el payload)
    onSave({
      // meta
      type: TYPE_SUBNETWORK_NODE,
      route_table: "main",

      // nombres y CIDR
      subnetName: name,
      name,                         // por si algún nodo usa `data.name`
      cidrBlock: cidr,
      cidr_block: cidr,

      // AZ
      availabilityZone: az,
      availability_zone: az,

      // tipo / flags
      subnetType: type,
      subnet_type: type,
      map_public_ip_on_launch: mapPublic,
      privateGoogleAccess: !!data.privateGoogleAccess,
      flowLogs: !!data.flowLogs,
      provider_overrides: mergeNodeProviderOverrides(nodeData, provider, isGcp
        ? {
          subnet_type: type,
          private_google_access: !!data.privateGoogleAccess,
          flow_logs: !!data.flowLogs,
          region: effectiveRegion,
        }
        : {
          subnet_type: type,
          route_table: "main",
        }),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">{t("canvas.subnetForm.headerEyebrow")}</Typography>
        <Typography className="pt-node-form__title">{t("canvas.subnetForm.headerTitle")}</Typography>
        <Typography className="pt-node-form__subtitle">
          {t("canvas.subnetForm.headerSubtitleProvider", {
            provider: providerLabel,
            kind: providerDefinition.subnet?.kindLabel || "subnet",
          })}
        </Typography>
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.35 }}>
          {t("canvas.subnetForm.info.title")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.subnetForm.info.parentCidr")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.subnetForm.info.noOverlap")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.subnetForm.info.publicVsPrivate")}
        </Typography>
        {isGcp && (
          <>
            <Typography variant="caption" display="block">
              {t("canvas.subnetForm.gcpInfo.regional")}
            </Typography>
            <Typography variant="caption" display="block">
              {t("canvas.subnetForm.gcpInfo.externalIp")}
            </Typography>
          </>
        )}
        <Box sx={{ mt: 1.25 }}>
          <CidrLearningGuideButton buttonLabel={t("canvas.cidrGuide.button")} />
        </Box>
      </Alert>

      {watch("subnetType") === "private" && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t("canvas.subnetForm.alerts.privateZoneBefore")} <b>{t("canvas.subnetForm.alerts.managedEgressLabel")}</b> {t("canvas.subnetForm.alerts.privateZoneAfter")} <b>{t("canvas.subnetForm.alerts.parentSegmentLabel")}</b>.
        </Alert>
      )}

      <TextField
        label={t("canvas.subnetForm.fields.name")}
        {...register("subnetName")}
        error={!!errors.subnetName}
        helperText={errors.subnetName?.message}
        fullWidth
        margin="normal"
      />

      <TextField
        label={t("canvas.subnetForm.fields.cidr", { parent: parentVpcCidr || t("canvas.subnetForm.segmentFallback") })}
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message}
        placeholder={t("canvas.subnetForm.fields.cidrPlaceholder")}
        fullWidth
        margin="normal"
      />

      {providerDefinition.subnet.showAvailabilityZone && (
        <FormControl fullWidth margin="normal" error={!!errors.availabilityZone}>
          <InputLabel id="az-label">{t("canvas.subnetForm.fields.availabilityZone")}</InputLabel>
          <Controller
            name="availabilityZone"
            control={control}
            render={({ field }) => (
              <Select
                labelId="az-label"
                label={t("canvas.subnetForm.fields.availabilityZone")}
                {...field}
                value={field.value || (azOptions[0] || `${effectiveRegion}a`)}
              >
                {azOptions.map(az => (
                  <MenuItem key={az} value={az}>{az}</MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.availabilityZone && (
            <FormHelperText>{errors.availabilityZone.message}</FormHelperText>
          )}
        </FormControl>
      )}

      <FormControl fullWidth margin="normal" error={!!errors.subnetType}>
        <InputLabel id="subnet-type-label">{t("canvas.subnetForm.fields.type")}</InputLabel>
        <Controller
          name="subnetType"
          control={control}
          render={({ field }) => (
            <Select
              labelId="subnet-type-label"
              label={t("canvas.subnetForm.fields.type")}
              {...field}
              value={field.value || "public"}
            >
              {SUBNET_TYPE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </MenuItem>
              ))}
            </Select>
          )}
        />
        {errors.subnetType && (
          <FormHelperText>{errors.subnetType.message}</FormHelperText>
        )}
      </FormControl>

      {providerDefinition.subnet.showAutoAssignPublicIp && (
        <>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Controller
                name="map_public_ip_on_launch"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    {...field}
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={watch("subnetType") === "private"}
                  />
                )}
              />
            }
            label={t("canvas.subnetForm.fields.autoAssignPublicIp")}
          />
          {errors.map_public_ip_on_launch && (
            <FormHelperText error>{errors.map_public_ip_on_launch.message}</FormHelperText>
          )}
        </>
      )}

      {providerDefinition.subnet.showPrivateGoogleAccess && (
        <FormControlLabel
          sx={{ mt: 0.5 }}
          control={
            <Controller
              name="privateGoogleAccess"
              control={control}
              render={({ field }) => (
                <Checkbox
                  {...field}
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          }
          label={t("canvas.subnetForm.gcpFields.privateGoogleAccess")}
        />
      )}

      {providerDefinition.subnet.showFlowLogs && (
        <FormControlLabel
          sx={{ mt: 0.5 }}
          control={
            <Controller
              name="flowLogs"
              control={control}
              render={({ field }) => (
                <Checkbox
                  {...field}
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          }
          label={t("canvas.subnetForm.gcpFields.flowLogs")}
        />
      )}

      <Box className="pt-node-form__actions">
        <Button type="submit" variant="contained" color="primary">
          {t("canvas.subnetForm.actions.save")}
        </Button>
        <Button onClick={deleteNode} color="error">
          {t("canvas.subnetForm.actions.delete")}
        </Button>
      </Box>
    </form>
  );
};

export default SubNetworkNodeForm;

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
import { TYPE_SUBNETWORK_NODE } from "../utils/constants";
import { useFormValidationSchema } from './validations/useFormValidations';

const SUBNET_TYPE_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

const SubNetworkNodeForm = ({
  nodeData = {},
  onSave,
  deleteNode,
  parentVpcCidr,                    // p.ej. "10.10.0.0/20"
  siblingSubnetCidrsInSameVpc = [], // para evitar solapes
  siblingSubnetNames = [],          // (opcional) para nombre único
  region = "us-east-1",
}) => {
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
    { existingCidrs: siblingSubnetCidrsInSameVpc, existingSubnetNames: siblingSubnetNames },
    true
  );

  const incomingSubnetType = typeof nodeData.subnetType === "string"
    ? nodeData.subnetType.toLowerCase()
    : "public";

  // Opciones de AZ derivadas de region (us-east-1 → us-east-1a..f)
  const azOptions = useMemo(() => {
    const base = (region || "us-east-1").replace(/[a-z]$/i, ""); // si te llega us-east-1a
    return ["a", "b", "c", "d", "e", "f"].map(sfx => `${base}${sfx}`);
  }, [region]);

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
      availabilityZone: nodeData.availabilityZone || (azOptions[0] || `${region}a`),
      subnetType: incomingSubnetType,
      // por defecto, públicas con IP pública; privadas sin ella
      map_public_ip_on_launch:
        nodeData.map_public_ip_on_launch ?? (incomingSubnetType === "public"),
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
      availabilityZone: nodeData.availabilityZone || (azOptions[0] || `${region}a`),
      subnetType: incomingSubnetType,
      map_public_ip_on_launch:
        nodeData.map_public_ip_on_launch ?? (incomingSubnetType === "public"),
    });
  }, [nodeData, reset, azOptions, region, incomingSubnetType]);

  const onSubmit = (data) => {
    const name = data.subnetName.trim();
    const cidr = data.cidrBlock.trim();
    const az = (data.availabilityZone || `${region}a`).trim();
    const type = String(data.subnetType || "public").toLowerCase();
    const mapPublic = !!data.map_public_ip_on_launch;

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
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">network zone</Typography>
        <Typography className="pt-node-form__title">Zone Segment</Typography>
        <Typography className="pt-node-form__subtitle">
          Define traffic behavior and addressing inside the parent network segment. AWS translation: subnet.
        </Typography>
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 0.5 }}>
        Public subnet allows ingress/egress by route policy. Private subnet keeps traffic internal.
      </Alert>

      <TextField
        label="Subnet Name"
        {...register("subnetName")}
        error={!!errors.subnetName}
        helperText={errors.subnetName?.message}
        fullWidth
        margin="normal"
      />

      <TextField
        label={`Subnet's CIDR Block (inside ${parentVpcCidr || 'VPC'})`}
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message}
        placeholder="10.10.0.0/24"
        fullWidth
        margin="normal"
      />

      <FormControl fullWidth margin="normal" error={!!errors.availabilityZone}>
        <InputLabel id="az-label">Availability Zone</InputLabel>
        <Controller
          name="availabilityZone"
          control={control}
          render={({ field }) => (
            <Select
              labelId="az-label"
              label="Availability Zone"
              {...field}
              value={field.value || (azOptions[0] || `${region}a`)}
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

      <FormControl fullWidth margin="normal" error={!!errors.subnetType}>
        <InputLabel id="subnet-type-label">Subnet Type</InputLabel>
        <Controller
          name="subnetType"
          control={control}
          render={({ field }) => (
            <Select
              labelId="subnet-type-label"
              label="Subnet Type"
              {...field}
              value={field.value || "public"}
            >
              {SUBNET_TYPE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          )}
        />
        {errors.subnetType && (
          <FormHelperText>{errors.subnetType.message}</FormHelperText>
        )}
      </FormControl>

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
        label="Auto-assign public IPv4 (recomendado en subnets públicas)"
      />
      {errors.map_public_ip_on_launch && (
        <FormHelperText error>{errors.map_public_ip_on_launch.message}</FormHelperText>
      )}

      <Box className="pt-node-form__actions">
        <Button type="submit" variant="contained" color="primary">
          Registrar Configuración
        </Button>
        <Button onClick={deleteNode} color="error">
          Delete Node
        </Button>
      </Box>
    </form>
  );
};

export default SubNetworkNodeForm;

/* eslint-disable react/prop-types */
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useEffect } from 'react';
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
  const [vpcBase, vpcPrefixStr] = (parentVpcCidr || "").split("/");
  const vpcPrefix = vpcPrefixStr ? Number(vpcPrefixStr) : null;

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
      availabilityZone: nodeData.availabilityZone || "",
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
      availabilityZone: nodeData.availabilityZone || "",
      subnetType: incomingSubnetType,
      map_public_ip_on_launch:
        nodeData.map_public_ip_on_launch ?? (incomingSubnetType === "public"),
    });
  }, [nodeData, reset]);

  const onSubmit = (data) => {
    onSave({
      subnetName: data.subnetName.trim(),
      cidrBlock: data.cidrBlock.trim(),
      availabilityZone: (data.availabilityZone || `${region}a`).trim(),
      subnetType: String(data.subnetType || "public").toLowerCase(),
      map_public_ip_on_launch: !!data.map_public_ip_on_launch,
      // la RT es siempre "main" a nivel de backend/TF
      route_table: "main",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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

      <TextField
        label="Availability Zone"
        {...register("availabilityZone")}
        error={!!errors.availabilityZone}
        helperText={errors.availabilityZone?.message || "Ej: us-east-1a"}
        placeholder={`${region}a`}
        fullWidth
        margin="normal"
      />

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
        <p style={{ color: 'red', marginTop: 4 }}>{errors.map_public_ip_on_launch.message}</p>
      )}

      <div style={{ marginTop: 12 }}>
        <Button type="submit" variant="contained" color="primary">
          Registrar Configuración
        </Button>
        <Button onClick={deleteNode} sx={{ ml: 1 }}>
          Delete Node
        </Button>
      </div>
    </form>
  );
};

export default SubNetworkNodeForm;

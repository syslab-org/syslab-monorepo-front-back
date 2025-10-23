// apps/frontend/src/components/flow/forms/VPCNodeForm.jsx
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, FormControl, FormControlLabel, FormHelperText, InputLabel, MenuItem, Select, Switch, TextField } from "@mui/material";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE, VPC_CHILD_FORM } from "../utils/constants";
import { useFormValidationSchema } from "./validations/useFormValidations";

const VPCNodeForm = ({
  nodeData,
  onSave,
  deleteNode,
  vlanCidr,               // "10.0.0.0/16"
  siblingVpcCidrs = [],   // ["10.0.1.0/24", ...]
  defaultRegion = "us-east-1", // ← región (no AZ)
  publicSubnetNames = [], // nombres de subnets públicas en esta VPC
}) => {
  const validationSchema = useFormValidationSchema(
    VPC_CHILD_FORM,
    null,
    null,
    { vlanCidr, siblingVpcCidrs },
    true
  );

  const { register, handleSubmit, formState: { errors }, reset, setError, watch, control } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      cloudProvider: nodeData.cloudProvider || CLOUD_AWS_VALUE,
      vpcName: nodeData.vpcName || "",
      region: nodeData.region || defaultRegion, // ej: "us-east-1"
      cidrBlock:
        nodeData.cidrBlock && nodeData.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData.internetGateway ?? false,
      allowedSshCidr: nodeData.allowedSshCidr || "",
      enableNatGateway: nodeData.enableNatGateway ?? false,
      natGatewayPublicSubnet: nodeData.natGatewayPublicSubnet || "",
      natGatewayElasticIp: nodeData.natGatewayElasticIp || "",
    }
  });

  useEffect(() => {
    reset({
      cloudProvider: nodeData.cloudProvider || CLOUD_AWS_VALUE,
      vpcName: nodeData.vpcName || "",
      region: nodeData.region || defaultRegion,
      cidrBlock:
        nodeData.cidrBlock && nodeData.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData.internetGateway ?? false,
      allowedSshCidr: nodeData.allowedSshCidr || "",
      enableNatGateway: nodeData.enableNatGateway ?? false,
      natGatewayPublicSubnet: nodeData.natGatewayPublicSubnet || "",
      natGatewayElasticIp: nodeData.natGatewayElasticIp || "",

    });
  }, [nodeData, reset, defaultRegion]);

  const onSubmit = (data) => {
    const [base, prefix] = data.cidrBlock.split("/");

    const payload = {
      // existentes
      vpcName: data.vpcName,
      region: data.region,
      cidrBlock: base,
      prefixLength: Number(prefix),
      internetGateway: data.internetGateway,
      allowedSshCidr: data.allowedSshCidr || "",

      // NAT (camelCase para el builder)
      enableNatGateway: !!data.enableNatGateway,
      natGatewayPublicSubnet: data.natGatewayPublicSubnet || "",
      natGatewayElasticIp: (data.natGatewayElasticIp || "").trim(),

      // (opcional) snake_case directo, por si lo quieres usar más adelante:
      nat_gateway: {
        enabled: !!data.enableNatGateway,
        public_subnet: data.natGatewayPublicSubnet || "",
        elastic_ip: (data.natGatewayElasticIp || "").trim(),
      },
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl fullWidth>
        <InputLabel id="vpc-cloud-label">Cloud Provider</InputLabel>
        <Select
          labelId="vpc-cloud-label"
          {...register("cloudProvider")}
          label="Cloud Provider"
          defaultValue={CLOUD_AWS_VALUE}
        >
          <MenuItem value={CLOUD_AWS_VALUE}>{CLOUD_AWS_LABEL}</MenuItem>
        </Select>
        {errors.cloudProvider && <p>{errors.cloudProvider.message}</p>}
      </FormControl>

      <TextField
        label="VPC Name"
        {...register("vpcName")}
        error={!!errors.vpcName}
        helperText={errors.vpcName?.message}
        fullWidth
        margin="normal"
      />

      <TextField
        label={`VPC's CIDR Block (inside of ${vlanCidr || 'VLAN'})`}
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message}
        placeholder="10.30.0.0/20"
        fullWidth
        margin="normal"
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="vpc-region-label">Region</InputLabel>
        <Select
          labelId="vpc-region-label"
          {...register("region")}
          label="Region"
          defaultValue={defaultRegion}
        >
          <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
          <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
          <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
        </Select>
        {errors.region && <p>{errors.region.message}</p>}
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="igw-label">Internet Gateway</InputLabel>
        <Select
          labelId="igw-label"
          label="Internet Gateway"
          {...register("internetGateway")}
          defaultValue={nodeData.internetGateway ?? false}
        >
          <MenuItem value={true}>Enabled</MenuItem>
          <MenuItem value={false}>Disabled</MenuItem>
        </Select>
        {errors.internetGateway && (
          <p style={{ color: "red", marginTop: 4 }}>{errors.internetGateway.message}</p>
        )}
      </FormControl>

      {/* ---- NAT Gateway ---- */}
      <FormControlLabel
        control={
          <Controller
            name="enableNatGateway"
            control={control}
            render={({ field }) => (
              <Switch
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        }
        label="Enable NAT Gateway"
      />

      <FormControl fullWidth margin="normal" disabled={!watch("enableNatGateway")}>
        <InputLabel id="nat-subnet-label">Public Subnet for NAT</InputLabel>
        <Select
          labelId="nat-subnet-label"
          label="Public Subnet for NAT"
          {...register("natGatewayPublicSubnet")}
          defaultValue={nodeData.natGatewayPublicSubnet || ""}
        >
          <MenuItem value="">
            <em>Selecciona una subnet pública</em>
          </MenuItem>
          {publicSubnetNames.map(name => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </Select>
        {!publicSubnetNames.length && (
          <FormHelperText>
            Crea primero una Subnet pública en este VPC para alojar el NAT.
          </FormHelperText>
        )}
      </FormControl>

      <TextField
        label="Elastic IP (opcional)"
        {...register("natGatewayElasticIp")}
        placeholder="(auto)"
        fullWidth
        margin="normal"
        disabled={!watch("enableNatGateway")}
      />

      <TextField
        label="Allowed SSH CIDR (opcional)"
        {...register("allowedSshCidr")}
        error={!!errors.allowedSshCidr}
        helperText={errors.allowedSshCidr?.message || 'Ej: 203.0.113.5/32 (tu IP pública)'}
        placeholder="203.0.113.5/32"
        fullWidth
        margin="normal"
      />

      <Button type="submit" variant="contained" color="primary">
        Registrar Configuración
      </Button>
      <Button onClick={deleteNode} sx={{ ml: 1 }}>
        Delete Node
      </Button>
    </form>
  );
};

export default VPCNodeForm;

/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE, VPC_CHILD_FORM } from "../utils/constants";
import { useFormValidationSchema } from "./validations/useFormValidations";

// eslint-disable-next-line react/prop-types
const VPCNodeForm = ({
  nodeData,
  onSave,
  deleteNode,
  vlanCidr,               // "10.0.0.0/16"
  siblingVpcCidrs = [],   // ["10.0.1.0/24", ...]
  defaultRegion = "us-east-1a"
}) => {

  const validationSchema = useFormValidationSchema(
    VPC_CHILD_FORM,
    null,
    null,
    { vlanCidr, siblingVpcCidrs },
    true
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      cloudProvider: nodeData.cloudProvider || CLOUD_AWS_VALUE,
      vpcName: nodeData.vpcName || "",
      region: nodeData.region || defaultRegion,
      cidrBlock:
        nodeData.cidrBlock && nodeData.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData.internetGateway ?? false,
      allowedSshCidr: nodeData.allowedSshCidr || "",   // 👈 NUEVO
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
    });
  }, [nodeData, reset, defaultRegion]);

  const onSubmit = (data) => {
    const [base, prefix] = data.cidrBlock.split("/");
    onSave({
      ...data,
      cidrBlock: base,
      prefixLength: Number(prefix),
      // region: defaultRegion (si quieres forzarlo)
    });
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
        placeholder="10.10.0.0/20"
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
          <MenuItem value="us-east-1a">US East (N. Virginia)</MenuItem>
          <MenuItem value="us-west-1">US West (N. California)</MenuItem>
          <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
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

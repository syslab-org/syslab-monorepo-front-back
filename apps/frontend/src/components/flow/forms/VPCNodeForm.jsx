/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useFormValidationSchema } from "./validations/useFormValidations";
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE, VPC_CHILD_FORM, VPC_FORM } from "../utils/constants";
import { useEffect } from "react";

// eslint-disable-next-line react/prop-types
const VPCNodeForm = ({
  // eslint-disable-next-line react/prop-types
  nodeData,
  onSave,
  deleteNode,
  vlanCidr, // <-- NUEVO: "10.0.0.0/16"
  siblingVpcCidrs = [], // <-- NUEVO: ["10.0.1.0/24", "10.0.2.0/24", ...]
  defaultRegion = "us-east-1" // opcional si luego quieres agregar región aquí
}) => {

  const validationSchema = useFormValidationSchema(
    VPC_CHILD_FORM,
    null, // cidrBlockVPC NO se usa en este form
    null,
    { vlanCidr, siblingVpcCidrs },// <-- clave para validaciones
    true // activa validación CIDR
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      cloudProvider: nodeData.cloudProvider || CLOUD_AWS_VALUE,
      vpcName: nodeData.vpcName || "",
      region: nodeData.region || defaultRegion,
      // si ya tienes separado base+prefix se vuelve a juntar para el input
      cidrBlock:
        nodeData.cidrBlock && nodeData.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
    }
  });

  console.log("VPCNodeForm defaultValues:", {
    cloudProvider: nodeData.cloudProvider || CLOUD_AWS_VALUE,
    vpcName: nodeData.vpcName || "",
    cidrBlock:
      nodeData.cidrBlock && nodeData.prefixLength
        ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
        : "",
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
    });
  }, [nodeData, reset, defaultRegion]);


  const onSubmit = (data) => {
    const [base, prefix] = data.cidrBlock.split("/");
    console.log("OnSubmit  vpcNode data:", data);

    onSave({
      ...data,
      cidrBlock: base,
      prefixLength: Number(prefix)
      // opcional: region: defaultRegion
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
        placeholder="10.0.1.0/24"
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
          <MenuItem value="us-west-1">US West (N. California)</MenuItem>
          <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
        </Select>
        {errors.region && <p>{errors.region.message}</p>}
      </FormControl>

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

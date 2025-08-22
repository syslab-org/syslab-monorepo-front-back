import { useFormValidationSchema } from './validations/useFormValidations';
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE, VLAN_FORM } from '../utils/constants';
import { useForm } from 'react-hook-form';
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';


// eslint-disable-next-line react/prop-types
const NewVLANForm = ({ onSave }) => {
  const validationSchema = useFormValidationSchema(VLAN_FORM, null, null, {}, true);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      cloudProvider: CLOUD_AWS_VALUE, // 'AWS'
      vlanName: "",
      cidrBlock: "",
      region: "us-east-1",
    }
  });

  const onSubmit = (data) => {
    const [base, prefix] = data.cidrBlock.split('/');
    console.log("OnSubmit  newVLAN data:", data);
    
    onSave({
      cloudProvider: data.cloudProvider,
      vpcName: data.vlanName,//TODO: borrar en el futuro.
      vlanName: data.vlanName,
      cidrBlock: base,
      prefixLength: Number(prefix),
      region: data.region,
      type: "vlan"

    });
  }



  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl fullWidth>
        <InputLabel id="select-cloud-label">Cloud Provider</InputLabel>
        <Select
          labelId="select-cloud-label"
          id="select-cloud"
          {...register("cloudProvider")}
          label=" Cloud Provider"
          defaultValue={CLOUD_AWS_VALUE}
        >
          <MenuItem value={CLOUD_AWS_VALUE}>{CLOUD_AWS_LABEL}</MenuItem>
        </Select>
        {errors.cloudProvider && <p>{errors.cloudProvider.message}</p>}
      </FormControl>

      <TextField
        label="VLAN Name"
        {...register("vlanName")}
        error={!!errors.vlanName}
        helperText={errors.vlanName?.message}
        fullWidth
        margin="normal"
      />

      <TextField
        label="VLAN master CIDR (e.g. 10.0.0.0/16)"
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message}
        placeholder="10.0.0.0/16"
        fullWidth
        margin="normal"
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="select-region-label">Region</InputLabel>
        <Select
          labelId="select-region-label"
          id="select-region"
          {...register("region")}
          label="Region"
          defaultValue="us-east-1"
        >
          <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
          <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
          <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
        </Select>
        {errors.region && <p>{errors.region.message}</p>}
      </FormControl>

      <Button type="submit" variant="contained" color="primary">
        Create VLAN
      </Button>
    </form>
  )
}

export default NewVLANForm
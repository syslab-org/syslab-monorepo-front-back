// apps/frontend/src/components/flow/forms/NewVLANForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE, VLAN_FORM } from '../utils/constants';
import { useFormValidationSchema } from './validations/useFormValidations';

const NewVLANForm = ({ onSave }) => {
  const validationSchema = useFormValidationSchema(VLAN_FORM, null, null, {}, true);

  const { register, handleSubmit, formState: { errors }, setError, watch } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      cloudProvider: CLOUD_AWS_VALUE, // por ahora fijo en AWS
      vlanName: "",
      cidrBlock: "",
      region: "us-east-1",
    }
  });

  const onSubmit = (data) => {
    const raw = String(data.cidrBlock || '').trim();
    if (!raw.includes('/')) {
      setError('cidrBlock', { type: 'manual', message: 'Usa formato CIDR, ej: 10.0.0.0/16' });
      return;
    }
    const [base, prefixStr] = raw.split('/');
    const prefix = Number(prefixStr);
    if (Number.isNaN(prefix) || prefix < 8 || prefix > 30) {
      setError('cidrBlock', { type: 'manual', message: 'Prefijo inválido (esperado /8 a /30)' });
      return;
    }

    // Payload “amigable” y compatible con lo existente
    onSave({
      type: "vlan",

      // compat con lo que ya guarda el canvas
      cloudProvider: data.cloudProvider,
      vlanName: data.vlanName,
      cidrBlock: base,
      prefixLength: prefix,
      region: data.region,

      // aliases útiles para el backend futuro (payload.vlan.*)
      name: data.vlanName,
      cidr: `${base}/${prefix}`,

      // opcionalmente dejamos ambas partes por conveniencia
      cidr_base: base,
    });
  };

  const region = watch('region');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>

      {/* Si más adelante soportas GCP/Azure, vuelve a mostrar este selector.
          Por ahora lo dejamos visible pero fijo a AWS para no romper UX. */}
      <FormControl fullWidth>
        <InputLabel id="select-cloud-label">Cloud Provider</InputLabel>
        <Select
          labelId="select-cloud-label"
          id="select-cloud"
          {...register("cloudProvider")}
          label="Cloud Provider"
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
        autoComplete="off"
      />

      <TextField
        label="VLAN master CIDR (e.g. 10.0.0.0/16)"
        placeholder="10.30.0.0/20"
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message || 'Rango padre del que se derivarán las VPC/subnets'}
        fullWidth
        margin="normal"
        autoComplete="off"
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
  );
};

export default NewVLANForm;

// apps/frontend/src/components/flow/forms/NewVLANForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { VLAN_FORM } from "@/features/networkCanvas/utils/constants";
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE } from '@/shared/constants';
import { useFormValidationSchema } from './validations/useFormValidations';

const LAB_TEMPLATES = [
  {
    value: 'mvp1-single-vpc-bastion-private',
    title: 'MVP 1 — 1 VPC (Bastion + App privada)',
    desc: 'Topología simple para demostrar deploy, SSH vía bastion y validaciones de ruteo.',
    recommendedCidr: '10.20.0.0/16',
  },
  {
    value: 'case3-3vpcs-router-peering',
    title: 'Caso 3 — 3 VPC conectadas por router',
    desc: 'Pensado para demostrar conectividad controlada (ping entre VPCs conectadas).',
    recommendedCidr: '10.30.0.0/16',
  },
];

const parseAndValidateCidr = (raw) => {
  const value = String(raw || '').trim();
  if (!value.includes('/')) {
    return { ok: false, message: 'Usa formato CIDR, ej: 10.0.0.0/16' };
  }
  const [base, prefixStr] = value.split('/');
  const prefix = Number(prefixStr);

  if (Number.isNaN(prefix) || prefix < 8 || prefix > 30) {
    return { ok: false, message: 'Prefijo inválido (esperado /8 a /30)' };
  }

  return { ok: true, base: base.trim(), prefix };
};

// eslint-disable-next-line react/prop-types
const NewVLANForm = ({ onSave, wizardMode = false }) => {
  const validationSchema = useFormValidationSchema(VLAN_FORM, null, null, {}, true);

  const defaultCidr = useMemo(() => {
    // default “bonito” cuando wizard está activo
    return wizardMode ? '10.20.0.0/16' : '';
  }, [wizardMode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      cloudProvider: CLOUD_AWS_VALUE,
      vlanName: '',
      cidrBlock: defaultCidr,
      region: 'us-east-1',
      labTemplate: 'mvp1-single-vpc-bastion-private', // solo se usa si wizardMode=true
    },
  });

  const region = watch('region');
  const labTemplate = watch('labTemplate');
  const selectedTemplate = LAB_TEMPLATES.find(t => t.value === labTemplate);

  const onSubmit = (data) => {
    const cidrCheck = parseAndValidateCidr(data.cidrBlock);
    if (!cidrCheck.ok) {
      setError('cidrBlock', { type: 'manual', message: cidrCheck.message });
      return;
    }

    const { base, prefix } = cidrCheck;

    onSave({
      type: 'vlan',

      // compat con lo que ya guarda el canvas
      cloudProvider: data.cloudProvider,
      vlanName: data.vlanName,
      cidrBlock: base,
      prefixLength: prefix,
      region: data.region,

      // aliases útiles (payload.vlan.*)
      name: data.vlanName,
      cidr: `${base}/${prefix}`,
      cidr_base: base,

      // wizard-only metadata (no rompe backend si lo ignoran)
      ...(wizardMode
        ? {
          labTemplate: data.labTemplate,
          narrative: 'wizard',
        }
        : {}),
    });
  };

  const applyTemplateCidr = () => {
    if (!selectedTemplate?.recommendedCidr) return;
    setValue('cidrBlock', selectedTemplate.recommendedCidr, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2.2}>
        {wizardMode && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Paso 1: Configura el laboratorio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define el nombre, la región y el rango padre (CIDR). Con esto podremos guiar el resto del flujo
              (VPCs, subredes, instancias y pruebas).
            </Typography>
          </Box>
        )}

        {wizardMode && (
          <Alert severity="info" sx={{ alignItems: 'center' }}>
            Consejo: usa un rango /16 para que tengas espacio cómodo para subredes (/24) sin pelearte con el IP plan.
          </Alert>
        )}

        {/* Cloud Provider */}
        <FormControl fullWidth>
          <InputLabel id="select-cloud-label">Cloud Provider</InputLabel>
          <Select
            labelId="select-cloud-label"
            id="select-cloud"
            {...register('cloudProvider')}
            label="Cloud Provider"
            defaultValue={CLOUD_AWS_VALUE}
          >
            <MenuItem value={CLOUD_AWS_VALUE}>{CLOUD_AWS_LABEL}</MenuItem>
          </Select>
          <FormHelperText>
            Inicialmente trabajamos con AWS, tanto para simulación educativa de topologías como para orquestación real.
          </FormHelperText>
        </FormControl>

        {/* Template only in wizard */}
        {wizardMode && (
          <FormControl fullWidth>
            <InputLabel id="lab-template-label">Plantilla de laboratorio</InputLabel>
            <Select
              labelId="lab-template-label"
              id="lab-template"
              {...register('labTemplate')}
              label="Plantilla de laboratorio"
              defaultValue="mvp1-single-vpc-bastion-private"
            >
              {LAB_TEMPLATES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.title}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {selectedTemplate?.desc || 'Elige el caso de uso que quieres construir paso a paso.'}
            </FormHelperText>

            {selectedTemplate?.recommendedCidr && (
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={applyTemplateCidr}>
                  Usar CIDR recomendado ({selectedTemplate.recommendedCidr})
                </Button>
              </Box>
            )}
          </FormControl>
        )}

        {/* VLAN Name */}
        <TextField
          label={wizardMode ? 'Nombre del laboratorio' : 'VLAN Name'}
          placeholder={wizardMode ? 'Ej: Lab-Ruteo-1' : ''}
          {...register('vlanName')}
          error={!!errors.vlanName}
          helperText={
            errors.vlanName?.message ||
            (wizardMode
              ? 'Este nombre se verá en la lista y será la “historia” principal del flujo.'
              : '')
          }
          fullWidth
          autoComplete="off"
        />

        {/* CIDR */}
        <TextField
          label={wizardMode ? 'Rango maestro (CIDR)' : 'VLAN master CIDR (e.g. 10.0.0.0/16)'}
          placeholder={wizardMode ? 'Ej: 10.20.0.0/16' : '10.30.0.0/20'}
          {...register('cidrBlock')}
          error={!!errors.cidrBlock}
          helperText={
            errors.cidrBlock?.message ||
            (wizardMode
              ? 'Este será el bloque padre. Luego derivaremos VPCs/subnets desde aquí.'
              : 'Rango padre del que se derivarán las VPC/subnets')
          }
          fullWidth
          autoComplete="off"
        />

        {/* Region */}
        <FormControl fullWidth>
          <InputLabel id="select-region-label">Region</InputLabel>
          <Select
            labelId="select-region-label"
            id="select-region"
            {...register('region')}
            label="Region"
            defaultValue="us-east-1"
          >
            <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
            <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
            <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
          </Select>
          <FormHelperText>
            Región seleccionada: <b>{region}</b>
          </FormHelperText>
        </FormControl>

        <Button type="submit" variant="contained" color="primary">
          {wizardMode ? 'Continuar' : 'Create VLAN'}
        </Button>
      </Stack>
    </form>
  );
};

export default NewVLANForm;

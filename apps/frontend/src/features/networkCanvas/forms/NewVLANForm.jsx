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
    title: 'MVP 1 — 1 segmento (Bastion + App privada)',
    desc: 'Topología simple para demostrar deploy, SSH vía bastion y validaciones de ruteo.',
    recommendedCidr: '10.20.0.0/16',
  },
  {
    value: 'case3-3vpcs-router-peering',
    title: 'Caso 3 — 3 segmentos conectados por nodo de conectividad',
    desc: 'Pensado para demostrar conectividad controlada (ping entre segmentos conectados).',
    recommendedCidr: '10.30.0.0/16',
  },
];

const normalizeProviderValue = (raw) => {
  if (Array.isArray(raw)) {
    return normalizeProviderValue(raw[0]);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        return normalizeProviderValue(JSON.parse(trimmed));
      } catch {
        return trimmed.replace(/[[\]"]/g, '').trim().toLowerCase();
      }
    }
    return trimmed.replace(/^"+|"+$/g, '').toLowerCase();
  }

  return String(raw || '').trim().toLowerCase();
};

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
const NewVLANForm = ({ onSave, wizardMode = false, availableCourses = [], requireCourseSelection = false }) => {
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
      courseId: '',
    },
  });

  const region = watch('region');
  const labTemplate = watch('labTemplate');
  const selectedTemplate = LAB_TEMPLATES.find(t => t.value === labTemplate);

  const onSubmit = (data) => {
    if (requireCourseSelection && !data.courseId) {
      setError('courseId', { type: 'manual', message: 'Debes seleccionar un curso.' });
      return;
    }
    const cidrCheck = parseAndValidateCidr(data.cidrBlock);
    if (!cidrCheck.ok) {
      setError('cidrBlock', { type: 'manual', message: cidrCheck.message });
      return;
    }

    const { base, prefix } = cidrCheck;
    const provider = normalizeProviderValue(data.cloudProvider) || CLOUD_AWS_VALUE;

    onSave({
      type: 'vlan',

      // compat con lo que ya guarda el canvas
      cloudProvider: provider,
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
      course_id: data.courseId || null,
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
              (segmentos, zonas, workloads y pruebas).
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

        <TextField
          label="Nombre del laboratorio"
          placeholder={wizardMode ? 'Ej: Lab-Ruteo-1' : 'Ej: Laboratorio-Peering-1'}
          {...register('vlanName')}
          error={!!errors.vlanName}
          helperText={
            errors.vlanName?.message ||
            'Este nombre se verá en la lista y será la referencia principal del laboratorio.'
          }
          fullWidth
          autoComplete="off"
        />

        {availableCourses.length > 0 && (
          <FormControl fullWidth error={requireCourseSelection && !watch('courseId')}>
            <InputLabel id="course-select-label">Curso</InputLabel>
            <Select
              labelId="course-select-label"
              id="course-select"
              {...register('courseId')}
              label="Curso"
              defaultValue=""
            >
              {!requireCourseSelection && <MenuItem value="">Sin curso</MenuItem>}
              {availableCourses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {requireCourseSelection
                ? 'Selecciona el curso al que se compartirá el laboratorio.'
                : 'Opcional para administradores.'}
            </FormHelperText>
          </FormControl>
        )}

        <TextField
          label="Rango maestro (CIDR)"
          placeholder={wizardMode ? 'Ej: 10.20.0.0/16' : '10.30.0.0/20'}
          {...register('cidrBlock')}
          error={!!errors.cidrBlock}
          helperText={
            errors.cidrBlock?.message ||
            (wizardMode
              ? 'Este será el bloque padre. Luego derivaremos segmentos y zonas desde aquí.'
              : 'Rango padre del que se derivarán los segmentos y zonas')
          }
          fullWidth
          autoComplete="off"
        />

        {/* Region */}
        <FormControl fullWidth>
          <InputLabel id="select-region-label">Región</InputLabel>
          <Select
            labelId="select-region-label"
            id="select-region"
            {...register('region')}
            label="Región"
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
          {wizardMode ? 'Continuar' : 'Crear laboratorio'}
        </Button>
      </Stack>
    </form>
  );
};

export default NewVLANForm;

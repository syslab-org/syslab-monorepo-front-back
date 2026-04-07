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
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { VLAN_FORM } from "@/features/networkCanvas/utils/constants";
import { LAB_TEMPLATES } from '@/features/networkCanvas/utils/labTemplates';
import { CLOUD_AWS_VALUE } from '@/shared/constants';
import CidrLearningGuideButton from '@/features/networkCanvas/ui/CidrLearningGuideButton';
import { useFormValidationSchema } from './validations/useFormValidations';

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
const providerLabels = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
}

const providerStatusLabels = {
  ready: 'Listo para validación y deploy',
  planned: 'Próximamente',
  unknown: 'Disponibilidad no confirmada',
}

// eslint-disable-next-line react/prop-types
const NewVLANForm = ({
  onSave,
  wizardMode = false,
  availableCourses = [],
  availableCloudConnections = [],
  requireCourseSelection = false,
  providerCapabilities = [],
  defaultProvider = CLOUD_AWS_VALUE,
}) => {
  const validationSchema = useFormValidationSchema(VLAN_FORM, null, null, {}, true);

  const defaultCidr = useMemo(() => {
    // default “bonito” cuando wizard está activo
    return wizardMode ? (LAB_TEMPLATES[0]?.recommendedCidr || '10.30.0.0/16') : '';
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
      cloudConnectionId: '',
    },
  });

  const normalizedProviderCapabilities = useMemo(() => {
    if (!Array.isArray(providerCapabilities) || providerCapabilities.length === 0) {
      return [{ provider: CLOUD_AWS_VALUE, status: 'ready', features: {} }];
    }

    return providerCapabilities
      .map((item) => ({
        provider: String(item?.provider || '').trim().toLowerCase(),
        status: item?.status || 'unknown',
        features: item?.features || {},
      }))
      .filter((item) => item.provider);
  }, [providerCapabilities]);

  const selectedProvider = normalizeProviderValue(watch('cloudProvider')) || defaultProvider;
  const selectedProviderCapability = useMemo(
    () =>
      normalizedProviderCapabilities.find((item) => item.provider === selectedProvider)
      || normalizedProviderCapabilities.find((item) => item.status === 'ready')
      || normalizedProviderCapabilities[0]
      || { provider: defaultProvider, status: 'unknown', features: {} },
    [defaultProvider, normalizedProviderCapabilities, selectedProvider],
  );

  useEffect(() => {
    const current = normalizeProviderValue(watch('cloudProvider'));
    if (!current && defaultProvider) {
      setValue('cloudProvider', defaultProvider, { shouldValidate: true });
    }
  }, [defaultProvider, setValue, watch]);

  const region = watch('region');
  const labTemplate = watch('labTemplate');
  const cidrBlockValue = watch('cidrBlock');
  const selectedTemplate = LAB_TEMPLATES.find(t => t.value === labTemplate);
  const hasCustomTemplateCidr = Boolean(
    wizardMode
    && selectedTemplate?.recommendedCidr
    && String(cidrBlockValue || '').trim()
    && String(cidrBlockValue || '').trim() !== selectedTemplate.recommendedCidr,
  );

  useEffect(() => {
    if (!wizardMode || !selectedTemplate?.recommendedCidr) return;
    setValue('cidrBlock', selectedTemplate.recommendedCidr, { shouldValidate: true });
  }, [selectedTemplate?.recommendedCidr, setValue, wizardMode]);

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
      cloud_connection_id: data.cloudConnectionId || null,
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
          <Alert
            severity="info"
            sx={{ alignItems: 'center' }}
            action={(
              <CidrLearningGuideButton buttonSx={{ whiteSpace: 'nowrap' }} />
            )}
          >
            Consejo: usa un rango /16 para que tengas espacio cómodo para subredes (/24) sin pelearte con el IP plan.
          </Alert>
        )}

        {wizardMode && (
          <Alert severity="info" sx={{ alignItems: 'center' }}>
            En este MVP el deploy real está habilitado para
            {' '}
            <b>AWS</b>
            . Otros providers se muestran como referencia de roadmap, pero aún no están disponibles para ejecución.
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
            {normalizedProviderCapabilities.map((providerCapability) => (
              <MenuItem
                key={providerCapability.provider}
                value={providerCapability.provider}
                disabled={providerCapability.status !== 'ready'}
              >
                {providerLabels[providerCapability.provider] || providerCapability.provider.toUpperCase()}
                {' '}
                {providerCapability.status !== 'ready' ? `(Próximamente)` : ''}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {selectedProviderCapability.status === 'ready'
              ? `${providerLabels[selectedProviderCapability.provider] || selectedProviderCapability.provider.toUpperCase()}: ${providerStatusLabels[selectedProviderCapability.status]}.`
              : `${providerLabels[selectedProviderCapability.provider] || selectedProviderCapability.provider.toUpperCase()}: ${providerStatusLabels[selectedProviderCapability.status]}. Para este MVP usa AWS si quieres desplegar infraestructura real.`}
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Al crear el laboratorio, esta plantilla cargará un canvas inicial coherente con el caso elegido.
                </Typography>
              </Box>
            )}

            {hasCustomTemplateCidr && (
              <Alert severity="warning" sx={{ mt: 1.25 }}>
                Esta plantilla fue preparada sobre el CIDR sugerido
                {' '}
                <b>{selectedTemplate.recommendedCidr}</b>
                . Si cambias el rango maestro, luego revisa en el canvas los CIDR de segmentos,
                subredes e IPs fijas para ajustarlos manualmente si hace falta.
              </Alert>
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

        {availableCloudConnections.length > 0 && (
          <FormControl fullWidth>
            <InputLabel id="cloud-connection-label">Conexión cloud</InputLabel>
            <Select
              labelId="cloud-connection-label"
              id="cloud-connection"
              {...register('cloudConnectionId')}
              label="Conexión cloud"
              defaultValue=""
            >
              <MenuItem value="">Auto-seleccionar por owner/curso</MenuItem>
              {availableCloudConnections.map((connection) => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name} · {connection.scope === 'course_shared' ? 'curso' : 'personal'}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Puedes fijar una conexión AWS específica o dejar que el backend resuelva la personal del owner y luego la compartida del curso.
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
              ? 'Este será el bloque padre. Si usas plantilla y lo cambias, revisa luego el direccionamiento precargado en el canvas.'
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

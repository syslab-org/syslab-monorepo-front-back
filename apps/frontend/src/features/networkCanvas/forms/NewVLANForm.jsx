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
import { useTranslation } from 'react-i18next';
import { VLAN_FORM } from "@/features/networkCanvas/utils/constants";
import { LAB_TEMPLATES } from '@/features/networkCanvas/utils/labTemplates';
import { CLOUD_AWS_VALUE } from '@/shared/constants';
import {
  buildCanvasProviderOptions,
  getCanvasProviderDefinition,
  getCanvasProviderLabel,
} from '@/features/networkCanvas/providers/providerCatalog';
import { translate as tr } from '@/shared/i18n';
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
    return { ok: false, message: tr('labs.cidrErrors.format') };
  }
  const [base, prefixStr] = value.split('/');
  const prefix = Number(prefixStr);

  if (Number.isNaN(prefix) || prefix < 8 || prefix > 30) {
    return { ok: false, message: tr('labs.cidrErrors.prefix') };
  }

  return { ok: true, base: base.trim(), prefix };
};

// eslint-disable-next-line react/prop-types
const providerStatusLabels = {
  ready: 'canvas.form.providerStatus.ready',
  planned: 'canvas.form.providerStatus.planned',
  unknown: 'canvas.form.providerStatus.unknown',
};

const executionSourceLabels = {
  explicit: 'canvas.form.executionSource.explicit',
  owner_personal_auto: 'canvas.form.executionSource.ownerPersonalAuto',
  course_shared_auto: 'canvas.form.executionSource.courseSharedAuto',
  unresolved: 'canvas.form.executionSource.unresolved',
};

const FALLBACK_REGION = 'us-east-1';

const buildDynamicFieldDefaults = (fields = []) =>
  (Array.isArray(fields) ? fields : []).reduce((acc, field) => {
    if (!field?.name) return acc;
    if (Object.prototype.hasOwnProperty.call(field, 'defaultValue')) {
      acc[field.name] = field.defaultValue;
      return acc;
    }
    acc[field.name] = field.control === 'select' ? '' : '';
    return acc;
  }, {});

// eslint-disable-next-line react/prop-types
const NewVLANForm = ({
  onSave,
  wizardMode = false,
  availableCourses = [],
  availableCloudConnections = [],
  requireCourseSelection = false,
  currentUserRole = '',
  currentUserCourseId = '',
  providerOptions = [],
  defaultProvider = CLOUD_AWS_VALUE,
}) => {
  const { t } = useTranslation();
  const allowedProviders = useMemo(
    () =>
      (Array.isArray(providerOptions) && providerOptions.length > 0
        ? providerOptions
        : buildCanvasProviderOptions([]))
        .map((item) => String(item?.provider || '').trim().toLowerCase())
        .filter(Boolean),
    [providerOptions],
  );
  const validationSchema = useFormValidationSchema(
    VLAN_FORM,
    null,
    null,
    { allowedProviders },
    true,
  );
  const defaultProviderValue = normalizeProviderValue(defaultProvider) || CLOUD_AWS_VALUE;
  const defaultProviderDefinition = useMemo(
    () => getCanvasProviderDefinition(defaultProviderValue),
    [defaultProviderValue],
  );
  const defaultLabFormConfig = defaultProviderDefinition.lab?.form || {};
  const defaultRegionValue = defaultProviderDefinition.lab?.defaultRegion || FALLBACK_REGION;
  const defaultLabFieldValues = useMemo(
    () => buildDynamicFieldDefaults(defaultLabFormConfig.fields || []),
    [defaultLabFormConfig.fields],
  );

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
      cloudProvider: defaultProviderValue,
      vlanName: '',
      cidrBlock: defaultCidr,
      region: defaultRegionValue,
      labTemplate: 'mvp1-single-vpc-bastion-private', // solo se usa si wizardMode=true
      courseId: '',
      cloudConnectionId: '',
      labNotes: '',
      ...defaultLabFieldValues,
    },
  });

  const normalizedProviderOptions = useMemo(() => {
    const source = Array.isArray(providerOptions) && providerOptions.length > 0
      ? providerOptions
      : buildCanvasProviderOptions([]);

    return source
      .map((item) => ({
        provider: String(item?.provider || '').trim().toLowerCase(),
        label: item?.label || getCanvasProviderLabel(item?.provider),
        designEnabled: item?.designEnabled !== false,
        runtimeStatus: item?.runtimeStatus || 'unknown',
        features: item?.features || {},
      }))
      .filter((item) => item.provider);
  }, [providerOptions]);

  const selectedProvider = normalizeProviderValue(watch('cloudProvider')) || defaultProviderValue;
  const selectedProviderOption = useMemo(
    () =>
      normalizedProviderOptions.find((item) => item.provider === selectedProvider)
      || normalizedProviderOptions.find((item) => item.designEnabled)
      || normalizedProviderOptions[0]
      || { provider: defaultProviderValue, label: getCanvasProviderLabel(defaultProviderValue), designEnabled: true, runtimeStatus: 'unknown', features: {} },
    [defaultProviderValue, normalizedProviderOptions, selectedProvider],
  );
  const selectedProviderLabel =
    selectedProviderOption.label || getCanvasProviderLabel(selectedProviderOption.provider);
  const selectedProviderDefinition = useMemo(
    () => getCanvasProviderDefinition(selectedProviderOption.provider),
    [selectedProviderOption.provider],
  );
  const selectedLabFormConfig = selectedProviderDefinition.lab?.form || {};
  const selectedLabFields = Array.isArray(selectedLabFormConfig.fields) ? selectedLabFormConfig.fields : [];
  const selectedLabProviderOverrideRules = Array.isArray(selectedLabFormConfig.providerOverrides)
    ? selectedLabFormConfig.providerOverrides
    : [];
  const selectedWizardAlerts = Array.isArray(selectedLabFormConfig.wizardAlerts)
    ? selectedLabFormConfig.wizardAlerts
    : [];
  const supportsExecutableTarget = selectedLabFormConfig.executionBindingMode === 'cloud_connection';
  const selectedRegionOptions = selectedProviderDefinition.lab?.regionOptions || [];
  const selectedProviderDefaultRegion = selectedProviderDefinition.lab?.defaultRegion || FALLBACK_REGION;
  const selectedExecutionTargetDescriptor =
    selectedProviderDefinition.lab?.executionTargetDescriptor || selectedProviderLabel;

  const setNestedValue = (target, path, value) => {
    const keys = String(path || '').split('.').filter(Boolean);
    if (keys.length === 0) return target;
    let cursor = target;
    keys.forEach((key, index) => {
      const isLeaf = index === keys.length - 1;
      if (isLeaf) {
        cursor[key] = value;
        return;
      }
      if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    });
    return target;
  };

  const resolveProviderOverrideValue = (rule, data) => {
    if (!rule?.target) return undefined;
    if (rule.source === '$literal') return rule.value;
    const rawValue = data?.[rule.source];
    if (rule.transform === 'boolean') return !!rawValue;
    if (rule.transform === 'trim') return String(rawValue || '').trim();
    if (rule.transform === 'arrayIfValue') {
      const value = String(rawValue || '').trim();
      return value ? [value] : [];
    }
    return rawValue;
  };

  const buildLabProviderOverrides = (data) =>
    selectedLabProviderOverrideRules.reduce((acc, rule) => {
      const value = resolveProviderOverrideValue(rule, data);
      if (typeof value === 'undefined') return acc;
      setNestedValue(acc, rule.target, value);
      return acc;
    }, {});

  useEffect(() => {
    const current = normalizeProviderValue(watch('cloudProvider'));
    if (!current && defaultProviderValue) {
      setValue('cloudProvider', defaultProviderValue, { shouldValidate: true });
    }
  }, [defaultProviderValue, setValue, watch]);

  const region = watch('region');
  const labTemplate = watch('labTemplate');
  const cidrBlockValue = watch('cidrBlock');
  const selectedCourseId = watch('courseId') || currentUserCourseId || '';
  const selectedConnectionId = watch('cloudConnectionId') || '';
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

  const filteredCloudConnections = useMemo(() => {
    return availableCloudConnections.filter((connection) => {
      if (String(connection?.provider || 'aws').toLowerCase() !== selectedProvider) {
        return false;
      }
      if (connection.scope !== 'course_shared') {
        return true;
      }
      if (!selectedCourseId) {
        return currentUserRole !== 'teacher';
      }
      return connection.course?.id === selectedCourseId;
    });
  }, [availableCloudConnections, currentUserRole, selectedCourseId, selectedProvider]);

  useEffect(() => {
    if (!selectedConnectionId) return;
    const stillVisible = filteredCloudConnections.some((connection) => connection.id === selectedConnectionId);
    if (!stillVisible) {
      setValue('cloudConnectionId', '', { shouldValidate: true, shouldDirty: true });
    }
  }, [filteredCloudConnections, selectedConnectionId, setValue]);

  useEffect(() => {
    selectedLabFields.forEach((field) => {
      if (!field?.name || !Object.prototype.hasOwnProperty.call(field, 'defaultValue')) return;
      const currentValue = watch(field.name);
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        setValue(field.name, field.defaultValue, { shouldDirty: false });
      }
    });
  }, [selectedLabFields, setValue, watch]);

  useEffect(() => {
    if (!selectedRegionOptions.length) return;
    const regionStillVisible = selectedRegionOptions.some((option) => option.value === region);
    if (!regionStillVisible) {
      setValue('region', selectedProviderDefaultRegion, { shouldValidate: true, shouldDirty: true });
    }
  }, [region, selectedProviderDefaultRegion, selectedRegionOptions, setValue]);

  const selectedRegionLabel = useMemo(() => {
    return selectedRegionOptions.find((option) => option.value === region)?.label || region;
  }, [region, selectedRegionOptions]);

  const executionPreview = useMemo(() => {
    if (!supportsExecutableTarget) {
      return {
        source: 'planned',
        status: 'planned',
        name: '',
        accountId: '',
        helper: 'canvas.form.executionTargetPlannedPreview',
        helperValues: { provider: selectedProviderLabel },
      };
    }

    const explicit = filteredCloudConnections.find((connection) => connection.id === selectedConnectionId);
    if (explicit) {
      return {
        source: 'explicit',
        status: 'resolved',
        name: explicit.name,
        scope: explicit.scope,
        accountId: explicit.last_test_identity?.Account || '',
        helper: executionSourceLabels.explicit,
      };
    }

    const personal = filteredCloudConnections.find((connection) => connection.scope === 'personal');
    if (personal) {
      return {
        source: 'owner_personal_auto',
        status: 'resolved',
        name: personal.name,
        scope: personal.scope,
        accountId: personal.last_test_identity?.Account || '',
        helper: executionSourceLabels.owner_personal_auto,
      };
    }

    const courseShared = filteredCloudConnections.find((connection) => connection.scope === 'course_shared');
    if (courseShared) {
      return {
        source: 'course_shared_auto',
        status: 'resolved',
        name: courseShared.name,
        scope: courseShared.scope,
        accountId: courseShared.last_test_identity?.Account || '',
        helper: executionSourceLabels.course_shared_auto,
      };
    }

    return {
      source: 'unresolved',
      status: 'missing',
      name: '',
      accountId: '',
      helper: executionSourceLabels.unresolved,
    };
  }, [filteredCloudConnections, selectedConnectionId, selectedProviderLabel, supportsExecutableTarget]);

  const renderConfiguredField = (field) => {
    if (!field?.name && field.control !== 'alert') return null;

    if (field.control === 'text') {
      return (
        <TextField
          key={field.name}
          label={field.labelKey ? t(field.labelKey) : ''}
          placeholder={field.placeholderKey ? t(field.placeholderKey) : (field.placeholder || '')}
          {...register(field.name)}
          error={!!errors[field.name]}
          helperText={errors[field.name]?.message || (field.helpKey ? t(field.helpKey) : '')}
          fullWidth
          autoComplete="off"
        />
      );
    }

    if (field.control === 'select') {
      return (
        <FormControl key={field.name} fullWidth error={!!errors[field.name]}>
          <InputLabel id={`${field.name}-label`}>{field.labelKey ? t(field.labelKey) : ''}</InputLabel>
          <Select
            labelId={`${field.name}-label`}
            {...register(field.name)}
            label={field.labelKey ? t(field.labelKey) : ''}
            defaultValue={field.defaultValue ?? ''}
          >
            {(Array.isArray(field.options) ? field.options : []).map((option) => (
              <MenuItem key={`${field.name}-${String(option.value)}`} value={option.value}>
                {option.labelKey ? t(option.labelKey) : option.label || option.value}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {errors[field.name]?.message || (field.helpKey ? t(field.helpKey) : '')}
          </FormHelperText>
        </FormControl>
      );
    }

    if (field.control === 'alert') {
      return (
        <Alert key={field.name || field.textKey} severity={field.severity || 'info'} variant="outlined">
          {field.textKey ? t(field.textKey, field.textValues) : ''}
        </Alert>
      );
    }

    return null;
  };

  const onSubmit = (data) => {
    if (requireCourseSelection && !data.courseId) {
      setError('courseId', { type: 'manual', message: t('canvas.form.courseRequired') });
      return;
    }
    const cidrCheck = parseAndValidateCidr(data.cidrBlock);
    if (!cidrCheck.ok) {
      setError('cidrBlock', { type: 'manual', message: cidrCheck.message });
      return;
    }

    const { base, prefix } = cidrCheck;
    const provider = normalizeProviderValue(data.cloudProvider) || CLOUD_AWS_VALUE;
    const canBindExecutionTarget = supportsExecutableTarget;

    for (const field of selectedLabFields) {
      if (!field?.name || !field.required) continue;
      const value = data[field.name];
      if (value === undefined || value === null || String(value).trim() === '') {
        setError(field.name, {
          type: 'manual',
          message: field.requiredMessageKey ? t(field.requiredMessageKey) : t('canvas.validation.requiredField'),
        });
        return;
      }
    }

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
      cloud_connection_id: canBindExecutionTarget ? (data.cloudConnectionId || null) : null,
      notes: String(data.labNotes || '').trim(),
      provider_lab_overrides: buildLabProviderOverrides(data),
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
              {t('canvas.form.stepOneTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('canvas.form.stepOneDescription')}
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
            {t('canvas.form.cidrTip')}
          </Alert>
        )}

        {wizardMode && selectedWizardAlerts.map((alert) => (
          <Alert key={`${alert.textKey}-${selectedProvider}`} severity={alert.severity || 'info'} sx={{ alignItems: 'center' }}>
            {alert.textKey ? t(alert.textKey, alert.textValues) : ''}
          </Alert>
        ))}

        {/* Cloud Provider */}
        <FormControl fullWidth>
          <InputLabel id="select-cloud-label">{t('canvas.form.cloudProvider')}</InputLabel>
          <Select
            labelId="select-cloud-label"
            id="select-cloud"
            {...register('cloudProvider')}
            label={t('canvas.form.cloudProvider')}
            defaultValue={CLOUD_AWS_VALUE}
          >
            {normalizedProviderOptions.map((providerOption) => (
              <MenuItem
                key={providerOption.provider}
                value={providerOption.provider}
                disabled={!providerOption.designEnabled}
              >
                {providerOption.label || getCanvasProviderLabel(providerOption.provider)}
                {' '}
                {providerOption.runtimeStatus !== 'ready' ? `(${t('canvas.form.providerStatus.planned')})` : ''}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {selectedProviderOption.runtimeStatus === 'ready'
              ? `${selectedProviderOption.label || getCanvasProviderLabel(selectedProviderOption.provider)}: ${t(providerStatusLabels[selectedProviderOption.runtimeStatus])}.`
              : `${selectedProviderOption.label || getCanvasProviderLabel(selectedProviderOption.provider)}: ${t(providerStatusLabels[selectedProviderOption.runtimeStatus])}. ${t('canvas.form.designRuntimeHint', { provider: selectedProviderOption.label || getCanvasProviderLabel(selectedProviderOption.provider) })}`}
          </FormHelperText>
        </FormControl>

        {/* Template only in wizard */}
        {wizardMode && (
          <FormControl fullWidth>
            <InputLabel id="lab-template-label">{t('canvas.form.labTemplate')}</InputLabel>
            <Select
              labelId="lab-template-label"
              id="lab-template"
              {...register('labTemplate')}
              label={t('canvas.form.labTemplate')}
              defaultValue="mvp1-single-vpc-bastion-private"
            >
              {LAB_TEMPLATES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.title}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {selectedTemplate?.desc || t('canvas.form.chooseTemplate')}
            </FormHelperText>

            {selectedTemplate?.recommendedCidr && (
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={applyTemplateCidr}>
                  {t('canvas.form.useRecommendedCidr', { value: selectedTemplate.recommendedCidr })}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {t('canvas.form.templateCanvasHint')}
                </Typography>
              </Box>
            )}

            {hasCustomTemplateCidr && (
              <Alert severity="warning" sx={{ mt: 1.25 }}>
                {t('canvas.form.customTemplateWarning', {
                  value: selectedTemplate.recommendedCidr,
                })}
              </Alert>
            )}
          </FormControl>
        )}

        <TextField
          label={t('canvas.form.labName')}
          placeholder={wizardMode ? t('canvas.form.labNameWizardPlaceholder') : t('canvas.form.labNamePlaceholder')}
          {...register('vlanName')}
          error={!!errors.vlanName}
          helperText={
            errors.vlanName?.message ||
            t('canvas.form.labNameHelp')
          }
          fullWidth
          autoComplete="off"
        />

        <TextField
          label={t('labs.notesLabel')}
          placeholder={t('canvas.form.notesPlaceholder')}
          {...register('labNotes')}
          error={!!errors.labNotes}
          helperText={
            errors.labNotes?.message ||
            t('labs.notesHelp')
          }
          fullWidth
          multiline
          minRows={3}
          autoComplete="off"
        />

        {selectedLabFields.map(renderConfiguredField)}

        {availableCourses.length > 0 && (
          <FormControl fullWidth error={requireCourseSelection && !watch('courseId')}>
            <InputLabel id="course-select-label">{t('labels.course')}</InputLabel>
            <Select
              labelId="course-select-label"
              id="course-select"
              {...register('courseId')}
              label={t('labels.course')}
              defaultValue=""
            >
              {!requireCourseSelection && <MenuItem value="">{t('common.noCourse')}</MenuItem>}
              {availableCourses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {requireCourseSelection
                ? t('canvas.form.courseSelectionRequired')
                : t('canvas.form.courseOptional')}
            </FormHelperText>
          </FormControl>
        )}

        {supportsExecutableTarget && (
          <FormControl fullWidth>
            <InputLabel id="cloud-connection-label">{t('labs.cloudConnection')}</InputLabel>
            <Select
              labelId="cloud-connection-label"
              id="cloud-connection"
              {...register('cloudConnectionId')}
              label={t('labs.cloudConnection')}
              defaultValue=""
            >
              <MenuItem value="">{t('labs.autoSelectOwnerCourse')}</MenuItem>
              {filteredCloudConnections.map((connection) => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name} · {connection.scope === 'course_shared' ? t('labs.connectionScopeCourse') : t('labs.connectionScopePersonal')}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {t('canvas.form.cloudConnectionHelp')}
            </FormHelperText>
          </FormControl>
        )}

        {!supportsExecutableTarget && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
              {t('canvas.form.executionTarget')}
            </Typography>
            <Alert severity="info" variant="outlined">
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.35 }}>
                {t('canvas.form.executionTargetPlannedTitle', { provider: selectedProviderLabel })}
              </Typography>
              <Typography variant="body2">
                {t('canvas.form.executionTargetPlannedBody', {
                  provider: selectedProviderLabel,
                  target: selectedExecutionTargetDescriptor,
                })}
              </Typography>
            </Alert>
          </Box>
        )}

        <Alert
          severity={
            executionPreview.status === 'resolved'
              ? 'success'
              : executionPreview.status === 'planned'
                ? 'info'
                : 'warning'
          }
          variant="outlined"
        >
          {executionPreview.status === 'resolved'
            ? t('canvas.form.executionPreviewResolved', {
              name: executionPreview.name,
              account: executionPreview.accountId ? ` · ${t('canvas.form.accountLabel')} ${executionPreview.accountId}` : '',
              helper: t(executionPreview.helper),
            })
            : t(executionPreview.helper, executionPreview.helperValues)}
        </Alert>

        <TextField
          label={t('canvas.form.masterCidr')}
          placeholder={wizardMode ? t('canvas.form.masterCidrWizardPlaceholder') : t('canvas.form.masterCidrPlaceholder')}
          {...register('cidrBlock')}
          error={!!errors.cidrBlock}
          helperText={
            errors.cidrBlock?.message ||
            (wizardMode
              ? t('canvas.form.masterCidrWizardHelp')
              : t('canvas.form.masterCidrHelp'))
          }
          fullWidth
          autoComplete="off"
        />

        {/* Region */}
        <FormControl fullWidth>
          <InputLabel id="select-region-label">{t('labs.region')}</InputLabel>
          <Select
            labelId="select-region-label"
            id="select-region"
            {...register('region')}
            label={t('labs.region')}
            defaultValue={defaultRegionValue}
          >
            {selectedRegionOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {t('canvas.form.selectedRegion', { value: selectedRegionLabel })}
          </FormHelperText>
        </FormControl>

        <Button type="submit" variant="contained" color="primary">
          {wizardMode ? t('canvas.form.continue') : t('labs.createLab')}
        </Button>
      </Stack>

    </form>
  );
};

export default NewVLANForm;

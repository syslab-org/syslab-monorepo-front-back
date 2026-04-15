import * as yup from 'yup';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '@/app/providers/AuthContext';
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext';
import { api } from '@/infrastructure/http/api';
import { PageHeader } from '@/shared/ui/layouts/MainLayout';
import {
  STATUS_USER_ACTIVE,
  STATUS_USER_DESACTIVE,
  STATUS_USER_PENDING,
  USER_ROL_STUDENT,
  USER_ROL_SUPER_ADMIN,
  USER_ROL_SUPER_ADMIN_LEGACY,
  USER_ROL_TEACHER,
} from '@/shared/constants';

const EMPTY_PROFILE_VALUES = {
  first_name: '',
  last_name: '',
  email: '',
  photo_url: '',
};

const roleLabels = {
  [USER_ROL_SUPER_ADMIN]: 'Admin principal',
  [USER_ROL_SUPER_ADMIN_LEGACY]: 'Admin principal',
  [USER_ROL_TEACHER]: 'Profesor',
  [USER_ROL_STUDENT]: 'Alumno',
};

const statusLabels = {
  [STATUS_USER_ACTIVE]: 'Activo',
  [STATUS_USER_PENDING]: 'Pendiente',
  [STATUS_USER_DESACTIVE]: 'Desactivado',
};

const statusColor = {
  [STATUS_USER_ACTIVE]: 'success',
  [STATUS_USER_PENDING]: 'warning',
  [STATUS_USER_DESACTIVE]: 'default',
};

const trimText = (value) => (typeof value === 'string' ? value.trim() : value);

const optionalText = (value) => {
  const trimmed = trimText(value);
  return trimmed ? trimmed : '';
};

const schema = yup.object({
  first_name: yup
    .string()
    .transform((value) => optionalText(value))
    .max(150, 'El nombre es demasiado largo')
    .required('El nombre es obligatorio'),
  last_name: yup
    .string()
    .transform((value) => optionalText(value))
    .max(150, 'El apellido es demasiado largo'),
  email: yup
    .string()
    .transform((value) => optionalText(value))
    .email('Ingresa un correo valido')
    .required('El correo es obligatorio'),
  photo_url: yup
    .string()
    .transform((value) => optionalText(value))
    .test('is-valid-url', 'Ingresa una URL valida', (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }),
}).required();

const getProfileValues = (user) => ({
  first_name: user?.first_name || user?.display_name || '',
  last_name: user?.last_name || '',
  email: user?.email || '',
  photo_url: user?.photo_url || '',
});

const getFullName = (firstName, lastName, fallback) => {
  const fullName = [trimText(firstName), trimText(lastName)].filter(Boolean).join(' ');
  return fullName || fallback || 'Mi perfil';
};

const getInitials = (value) => {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'U';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const [feedback, setFeedback] = useState({ severity: '', message: '' });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur',
    defaultValues: EMPTY_PROFILE_VALUES,
  });

  useEffect(() => {
    if (!user) return;
    reset(getProfileValues(user));
    setFeedback({ severity: '', message: '' });
  }, [user, reset]);

  const watchedFirstName = watch('first_name');
  const watchedLastName = watch('last_name');
  const watchedPhotoUrl = watch('photo_url');
  const watchedEmail = watch('email');

  const previewName = useMemo(
    () => getFullName(watchedFirstName, watchedLastName, user?.display_name || user?.email),
    [watchedFirstName, watchedLastName, user?.display_name, user?.email],
  );

  const avatarSrc = useMemo(() => {
    const candidate = optionalText(watchedPhotoUrl) || user?.photo_url || '';
    return candidate || undefined;
  }, [watchedPhotoUrl, user?.photo_url]);

  const roleLabel = roleLabels[user?.role] || user?.role || 'Sin rol';
  const statusLabel = statusLabels[user?.status] || user?.status || 'Sin estado';

  const handleReset = () => {
    reset(getProfileValues(user));
    setFeedback({ severity: '', message: '' });
  };

  const onSubmit = async (data) => {
    if (!isDirty) {
      setFeedback({ severity: 'info', message: 'No hay cambios pendientes por guardar.' });
      return;
    }

    setLoadingFlow(true);
    setFeedback({ severity: '', message: '' });

    try {
      await api.updateMe(
        {
          first_name: optionalText(data.first_name),
          last_name: optionalText(data.last_name),
          email: optionalText(data.email),
          photo_url: optionalText(data.photo_url),
        },
        { trackLoading: false },
      );
      await refreshUser();
      setFeedback({ severity: 'success', message: 'Tu perfil se actualizo correctamente.' });
    } catch (error) {
      setFeedback({
        severity: 'error',
        message: error?.message || 'No se pudo actualizar el perfil.',
      });
    } finally {
      setLoadingFlow(false);
    }
  };

  if (!user) {
    return <Typography>Cargando datos del perfil...</Typography>;
  }

  return (
    <Box>
      <PageHeader
        title="Mi perfil"
        subtitle="Actualiza tu informacion principal y revisa el estado actual de tu cuenta."
      />

      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Avatar
              src={avatarSrc}
              alt={previewName}
              sx={{
                width: 96,
                height: 96,
                fontSize: 32,
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              {getInitials(previewName)}
            </Avatar>

            <Stack spacing={1} flex={1} minWidth={0}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {previewName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {optionalText(watchedEmail) || user.email || 'Sin correo principal'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={roleLabel} />
                <Chip
                  size="small"
                  color={statusColor[user?.status] || 'default'}
                  label={statusLabel}
                  variant={user?.status === STATUS_USER_ACTIVE ? 'filled' : 'outlined'}
                />
                {user?.course?.name ? (
                  <Chip size="small" variant="outlined" label={`Curso: ${user.course.name}`} />
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Informacion personal
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Estos datos se usan para identificarte dentro de la plataforma y en los flujos del laboratorio.
              </Typography>
            </Box>

            {feedback.message ? (
              <Alert severity={feedback.severity || 'info'}>
                {feedback.message}
              </Alert>
            ) : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Nombre"
                {...register('first_name')}
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Apellido"
                {...register('last_name')}
                error={!!errors.last_name}
                helperText={errors.last_name?.message || 'Opcional'}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="Correo"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="URL del avatar"
              {...register('photo_url')}
              error={!!errors.photo_url}
              helperText={errors.photo_url?.message || 'Opcional. Si lo dejas vacio, se mostraran tus iniciales.'}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Divider />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Rol"
                value={roleLabel}
                disabled
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Estado"
                value={statusLabel}
                disabled
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
              <Button
                type="button"
                variant="outlined"
                onClick={handleReset}
                disabled={!isDirty || isSubmitting}
              >
                Restablecer
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default ProfilePage;

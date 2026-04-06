import * as yup from 'yup';
import { useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Avatar, Button, Paper, Stack, TextField, Typography } from '@mui/material';

import { useAuth } from '@/app/providers/AuthContext';
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext';
import { api } from '@/infrastructure/http/api';

const schema = yup.object({
  first_name: yup.string().required('Name is required'),
  last_name: yup.string().optional(),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  photo_url: yup.string().url('Must be a valid URL').optional().nullable(),
}).required();

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const [saveError, setSaveError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      photo_url: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      first_name: user.first_name || user.display_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      photo_url: user.photo_url || '',
    });
  }, [user, reset]);

  const onSubmit = async (data) => {
    setLoadingFlow(true);
    setSaveError('');
    try {
      await api.updateMe({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        photo_url: data.photo_url || '',
      });
      await refreshUser();
    } catch (error) {
      setSaveError(error?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setLoadingFlow(false);
    }
  };

  if (!user) {
    return <Typography>Cargando datos del perfil...</Typography>;
  }

  return (
    <Paper sx={{ p: 4, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Stack direction="column" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Avatar
          src={user.photo_url || 'https://i.pravatar.cc/100'}
          alt="Profile"
          sx={{ width: 120, height: 120 }}
        />
      </Stack>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <TextField
            label="Name"
            {...register('first_name')}
            error={!!errors.first_name}
            helperText={errors.first_name?.message}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Last name"
            {...register('last_name')}
            error={!!errors.last_name}
            helperText={errors.last_name?.message}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Avatar URL"
            {...register('photo_url')}
            error={!!errors.photo_url}
            helperText={errors.photo_url?.message}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Role"
            value={user?.role || 'N/A'}
            disabled
            fullWidth
          />
          {saveError && <Typography color="error">{saveError}</Typography>}
          <Button type="submit" variant="contained" color="primary">
            Update Profile
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};

export default ProfilePage;

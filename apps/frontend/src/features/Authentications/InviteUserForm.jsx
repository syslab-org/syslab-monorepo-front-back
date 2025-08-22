/* eslint-disable react/prop-types */
import { useInviteUserFormValidation } from '../../utils/hooks/useInviteUserFormValidation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { STATUS_USER_PENDING, USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROLES_ARRAY, USER_STATUS_ARRAY } from '../../constants';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'

// eslint-disable-next-line react/prop-types
const InviteUserForm = ({ closeModal, userData }) => {
    const validationSchema = useInviteUserFormValidation();
    const { user } = useAuth()
    const rolesUser = user?.role === USER_ROL_SUPER_ADMIN
        ? USER_ROLES_ARRAY
        : [USER_ROL_STUDENT];
    const statusUser = USER_STATUS_ARRAY;

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            email: '',
            role: '',
            status: STATUS_USER_PENDING,
        },
    });

    // Watch for status to ensure it is being updated correctly
    const statusValue = watch('status');

    // Pre-fill values when `userData` is available (for editing)
    useEffect(() => {
        if (userData) {
            setValue('email', userData.email || '');
            setValue('role', userData.role || '');
            setValue('status', userData.status || STATUS_USER_PENDING);
        }
    }, [userData, setValue]);

    const onSubmit = (data) => {
        closeModal(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
                <TextField
                    label="Email"
                    {...register('email')}
                    disabled={!!userData}
                    placeholder="Set Email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                />

                <FormControl fullWidth>
                    <InputLabel id="roles-select-label">Role</InputLabel>
                    <Select
                        labelId="roles-select-label"
                        {...register('role')}
                        label="Role"
                        disabled={!!userData}
                        value={watch('role') || ''}
                    >
                        {rolesUser.map((roleItem, index) => (
                            <MenuItem key={index} value={roleItem}>
                                {roleItem}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.role && <p>{errors.role.message}</p>}
                </FormControl>

                <FormControl fullWidth>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                        labelId="status-select-label"
                        {...register('status')}
                        label="Status"
                        value={statusValue || STATUS_USER_PENDING} // Use watched value for controlled input
                    >
                        {statusUser.map((statusItem, index) => (
                            <MenuItem key={index} value={statusItem}>
                                {statusItem}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.status && <p>{errors.status.message}</p>}
                </FormControl>

                <Button type="submit">
                    {userData ? 'Update User' : 'Add New User'}
                </Button>
            </Stack>
        </form>
    );
};

export default InviteUserForm;

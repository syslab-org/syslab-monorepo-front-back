/* eslint-disable react/prop-types */
import { useEffect, useMemo } from 'react'

import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, Button, FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/app/providers/AuthContext'
import { useInviteUserFormValidation } from '@/features/auth/hooks/useInviteUserFormValidation'
import {
    STATUS_USER_PENDING,
    USER_ROL_STUDENT,
    USER_ROL_SUPER_ADMIN,
    USER_ROLES_ARRAY,
    USER_STATUS_ARRAY,
} from '@/shared/constants'

const InviteUserForm = ({ closeModal, userData, courses = [] }) => {
    const { t } = useTranslation()
    const validationSchema = useInviteUserFormValidation()
    const { user } = useAuth()
    const canEditRole = user?.role === USER_ROL_SUPER_ADMIN
    const rolesUser = canEditRole ? USER_ROLES_ARRAY : [USER_ROL_STUDENT]
    const statusUser = USER_STATUS_ARRAY

    const roleLabels = useMemo(() => ({
        platform_admin: t('labels.adminPrimary'),
        teacher: t('labels.teacher'),
        student: t('labels.student'),
    }), [t])

    const statusLabels = useMemo(() => ({
        active: t('labels.active'),
        pending: t('labels.pending'),
        deactivated: t('labels.deactivated'),
    }), [t])

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors },
        watch,
    } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            email: '',
            first_name: '',
            last_name: '',
            role: '',
            status: STATUS_USER_PENDING,
            course_id: '',
        },
    })

    useEffect(() => {
        reset({
            email: userData?.email || '',
            first_name: userData?.first_name || '',
            last_name: userData?.last_name || '',
            role: userData?.role || (canEditRole ? '' : USER_ROL_STUDENT),
            status: userData?.status || STATUS_USER_PENDING,
            course_id: userData?.course?.id || '',
        })
    }, [canEditRole, reset, userData])

    const selectedRole = watch('role')

    const onSubmit = (data) => {
        const effectiveRole = data.role || userData?.role || (canEditRole ? '' : USER_ROL_STUDENT)
        const effectiveCourseId = effectiveRole === USER_ROL_STUDENT
            ? (data.course_id || userData?.course?.id || null)
            : null

        const payload = {
            email: data.email?.trim(),
            first_name: data.first_name?.trim() || '',
            last_name: data.last_name?.trim() || '',
            status: data.status,
            course_id: effectiveCourseId,
        }

        if (!userData || canEditRole) {
            payload.role = effectiveRole
        }

        closeModal(payload)
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                    {userData ? t('inviteUser.editTitle') : t('inviteUser.inviteTitle')}
                </Typography>

                <Alert severity="info">
                    {userData
                        ? t('inviteUser.editInfo')
                        : t('inviteUser.inviteInfo')}
                </Alert>

                <TextField
                    label={t('labels.email')}
                    {...register('email')}
                    disabled={!!userData}
                    placeholder={t('inviteUser.emailPlaceholder')}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                />

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        label={t('labels.name')}
                        {...register('first_name')}
                        placeholder={t('inviteUser.firstNamePlaceholder')}
                        error={!!errors.first_name}
                        helperText={errors.first_name?.message || t('common.optional')}
                        fullWidth
                    />

                    <TextField
                        label={t('labels.lastName')}
                        {...register('last_name')}
                        placeholder={t('inviteUser.lastNamePlaceholder')}
                        error={!!errors.last_name}
                        helperText={errors.last_name?.message || t('common.optional')}
                        fullWidth
                    />
                </Stack>

                <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth error={!!errors.role}>
                            <InputLabel id="roles-select-label">{t('labels.role')}</InputLabel>
                            <Select
                                {...field}
                                labelId="roles-select-label"
                                label={t('labels.role')}
                                disabled={!!userData && !canEditRole}
                            >
                                {rolesUser.map((roleItem) => (
                                    <MenuItem key={roleItem} value={roleItem}>
                                        {roleLabels[roleItem] || roleItem}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>{errors.role?.message || t('inviteUser.roleHelper')}</FormHelperText>
                        </FormControl>
                    )}
                />

                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth error={!!errors.status}>
                            <InputLabel id="status-select-label">{t('labels.state')}</InputLabel>
                            <Select
                                {...field}
                                labelId="status-select-label"
                                label={t('labels.state')}
                            >
                                {statusUser.map((statusItem) => (
                                    <MenuItem key={statusItem} value={statusItem}>
                                        {statusLabels[statusItem] || statusItem}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>{errors.status?.message || t('inviteUser.statusHelper')}</FormHelperText>
                        </FormControl>
                    )}
                />

                {selectedRole === USER_ROL_STUDENT && (
                    <Controller
                        name="course_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.course_id}>
                                <InputLabel id="course-select-label">{t('labels.course')}</InputLabel>
                                <Select
                                    {...field}
                                    labelId="course-select-label"
                                    label={t('labels.course')}
                                >
                                    <MenuItem value="">{t('inviteUser.assignLater')}</MenuItem>
                                    {courses.map((course) => (
                                        <MenuItem key={course.id} value={course.id}>
                                            {course.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    {errors.course_id?.message || t('inviteUser.courseHelper')}
                                </FormHelperText>
                            </FormControl>
                        )}
                    />
                )}

                <Button type="submit" variant="contained" fullWidth>
                    {userData ? t('actions.saveChanges') : t('actions.createInvitation')}
                </Button>
            </Stack>
        </form>
    )
}

export default InviteUserForm

import { useContext, useEffect, useMemo, useState } from 'react'

import { ContentCopyOutlined, ModeEditOutlined, PersonOffOutlined, VerifiedUserOutlined } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext'
import InviteUserForm from '@/features/auth/components/InviteUserForm'
import { useUsersFetch } from '@/features/settings/hooks/useUsersFetch'
import { ModalLayout } from '@/shared/ui/layouts/ModalLayout'
import { PageHeader } from '@/shared/ui/layouts/MainLayout'
import {
    STATUS_USER_ACTIVE,
    STATUS_USER_DESACTIVE,
    STATUS_USER_PENDING,
    USER_ROL_STUDENT,
    USER_ROL_SUPER_ADMIN,
    USER_ROL_TEACHER,
    USER_ROLES_ARRAY,
    USER_STATUS_ARRAY,
} from '@/shared/constants'

const statusColor = {
    [STATUS_USER_ACTIVE]: 'success',
    [STATUS_USER_PENDING]: 'warning',
    [STATUS_USER_DESACTIVE]: 'default',
}

export const UsersManagement = () => {
    const { t } = useTranslation()

    const { setLoadingFlow } = useContext(LoadingFlowContext)
    const {
        usersList,
        courses,
        latestInvite,
        setLatestInvite,
        selectedUser,
        setSelectedUser,
        addUser,
        updateUser,
        fetchUsers,
    } = useUsersFetch(setLoadingFlow)
    const [isCreateModalLayoutOpen, setIsCreateModalLayoutOpen] = useState(false)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [courseFilter, setCourseFilter] = useState('')

    const columns = useMemo(() => ([
        { id: 'display_name', label: t('settings.users.columns.user'), minWidth: 190, align: 'left' },
        { id: 'email', label: t('settings.users.columns.email'), minWidth: 220, align: 'left' },
        { id: 'role', label: t('settings.users.columns.role'), minWidth: 120, align: 'left' },
        { id: 'status', label: t('settings.users.columns.status'), minWidth: 120, align: 'left' },
        { id: 'class', label: t('settings.users.columns.course'), minWidth: 150, align: 'left' },
        { id: 'actions', label: t('settings.users.columns.actions'), minWidth: 220, align: 'left' },
    ]), [t])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value)
        setPage(0)
    }

    const resetFilters = () => {
        setSearchTerm('')
        setRoleFilter('')
        setStatusFilter('')
        setCourseFilter('')
        setPage(0)
    }

    const handleModalClose = async (data) => {
        if (data) {
            selectedUser ? await updateUser(selectedUser.id, data) : await addUser(data)
        }
        setIsCreateModalLayoutOpen(false)
        setSelectedUser(null)
    }

    const handleCreateInvite = () => {
        setSelectedUser(null)
        setIsCreateModalLayoutOpen(true)
    }

    const handleEditUser = (user) => {
        setSelectedUser(user)
        setIsCreateModalLayoutOpen(true)
    }

    const handleQuickStatusChange = async (user, nextStatus) => {
        await updateUser(user.id, { status: nextStatus })
    }

    const summary = useMemo(() => ({
        total: usersList.length,
        active: usersList.filter((user) => user.status === STATUS_USER_ACTIVE).length,
        pending: usersList.filter((user) => user.status === STATUS_USER_PENDING).length,
        deactivated: usersList.filter((user) => user.status === STATUS_USER_DESACTIVE).length,
    }), [usersList])

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()

        return usersList.filter((user) => {
            const matchesSearch = !normalizedSearch || [
                user.display_name,
                user.email,
                user.first_name,
                user.last_name,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedSearch))

            const matchesRole = !roleFilter || user.role === roleFilter
            const matchesStatus = !statusFilter || user.status === statusFilter
            const matchesCourse = !courseFilter
                || (courseFilter === '__no_course__' ? !user?.course?.id : user?.course?.id === courseFilter)

            return matchesSearch && matchesRole && matchesStatus && matchesCourse
        })
    }, [courseFilter, roleFilter, searchTerm, statusFilter, usersList])

    const paginatedUsers = useMemo(
        () => filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredUsers, page, rowsPerPage],
    )

    const handleCopyInvite = async () => {
        if (!latestInvite?.invite_url) return
        try {
            await navigator.clipboard.writeText(latestInvite.invite_url)
        } catch (error) {
            console.error('Cannot copy invite link:', error)
            alert(t('settings.users.copyInviteError'))
        }
    }

    const roleLabels = useMemo(() => ({
        [USER_ROL_SUPER_ADMIN]: t('labels.adminPrimary'),
        [USER_ROL_TEACHER]: t('labels.teacher'),
        [USER_ROL_STUDENT]: t('labels.student'),
    }), [t])

    const statusLabels = useMemo(() => ({
        [STATUS_USER_ACTIVE]: t('labels.active'),
        [STATUS_USER_PENDING]: t('labels.pending'),
        [STATUS_USER_DESACTIVE]: t('labels.deactivated'),
    }), [t])

    return (
        <Box>
            <PageHeader
                title={t('settings.users.title')}
                subtitle={t('settings.users.subtitle')}
                actions={(
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleCreateInvite}
                    >
                        {t('actions.createInvitation')}
                    </Button>
                )}
            />

            {latestInvite?.invite_url && (
                <Alert
                    severity="success"
                    sx={{ mb: 3 }}
                    action={(
                        <Stack direction="row" spacing={1}>
                            <Button size="small" onClick={handleCopyInvite} startIcon={<ContentCopyOutlined />}>
                                {t('actions.copyLink')}
                            </Button>
                            <Button size="small" onClick={() => setLatestInvite(null)}>
                                {t('actions.close')}
                            </Button>
                        </Stack>
                    )}
                >
                    {t('settings.users.inviteCreated', { email: latestInvite.email })}{' '}
                    {t('settings.users.inviteLinkPrefix')} {latestInvite.invite_url}
                    {latestInvite.role === USER_ROL_STUDENT && !latestInvite.course_id && (
                        <>
                            {' '}{t('settings.users.inviteNoCourseWarning')}
                        </>
                    )}
                </Alert>
            )}

            {!latestInvite?.invite_url && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    {t('settings.users.infoBanner')}
                </Alert>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                <Chip label={`Total: ${summary.total}`} />
                <Chip color="success" label={`${t('labels.active')}: ${summary.active}`} />
                <Chip color="warning" label={`${t('labels.pending')}: ${summary.pending}`} />
                <Chip label={`${t('labels.deactivated')}: ${summary.deactivated}`} />
            </Stack>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
                    <TextField
                        label={t('settings.users.searchLabel')}
                        placeholder={t('settings.users.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value)
                            setPage(0)
                        }}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel id="role-filter-label">{t('settings.users.filters.role')}</InputLabel>
                        <Select
                            labelId="role-filter-label"
                            label={t('settings.users.filters.role')}
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {USER_ROLES_ARRAY.map((role) => (
                                <MenuItem key={role} value={role}>
                                    {roleLabels[role] || role}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="status-filter-label">{t('settings.users.filters.status')}</InputLabel>
                        <Select
                            labelId="status-filter-label"
                            label={t('settings.users.filters.status')}
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            {USER_STATUS_ARRAY.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {statusLabels[status] || status}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="course-filter-label">{t('settings.users.filters.course')}</InputLabel>
                        <Select
                            labelId="course-filter-label"
                            label={t('settings.users.filters.course')}
                            value={courseFilter}
                            onChange={(event) => {
                                setCourseFilter(event.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">{t('common.all')}</MenuItem>
                            <MenuItem value="__no_course__">{t('common.noCourse')}</MenuItem>
                            {courses.map((course) => (
                                <MenuItem key={course.id} value={course.id}>
                                    {course.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button variant="outlined" onClick={resetFilters}>
                        {t('actions.clearFilters')}
                    </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {t('settings.users.showing', { filtered: filteredUsers.length, total: usersList.length })}
                </Typography>
            </Paper>

            <Paper sx={{ width: '100%' }}>
                <TableContainer sx={{ maxHeight: 800 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead >
                            <TableRow>
                                <TableCell align='center' colSpan={3}>
                                    {t('settings.users.usersGroup')}
                                </TableCell>
                                <TableCell align='center' colSpan={3}>
                                    {t('settings.users.managementGroup')}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        align={column.align}
                                        style={{ top: 57, minWidth: column.minWidth }}
                                    >
                                        {column.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedUsers.map((user) => (
                                    <TableRow hover key={user.id}>
                                        {columns.map((column) => (
                                            <TableCell key={column.id} align={column.align}>
                                                {column.id === 'actions' ? (
                                                    <Stack direction="row" spacing={1}>
                                                        <IconButton onClick={() => handleEditUser(user)} aria-label="edit" color="primary">
                                                                <ModeEditOutlined />
                                                        </IconButton>
                                                        {user.status !== STATUS_USER_ACTIVE && (
                                                            <Button
                                                                size="small"
                                                                color="success"
                                                                startIcon={<VerifiedUserOutlined />}
                                                                onClick={() => handleQuickStatusChange(user, STATUS_USER_ACTIVE)}
                                                            >
                                                                {t('actions.activate')}
                                                            </Button>
                                                        )}
                                                        {user.status === STATUS_USER_ACTIVE && (
                                                            <Button
                                                                size="small"
                                                                color="inherit"
                                                                startIcon={<PersonOffOutlined />}
                                                                onClick={() => handleQuickStatusChange(user, STATUS_USER_DESACTIVE)}
                                                            >
                                                                {t('actions.deactivate')}
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                ) : (
                                                    column.id === 'class'
                                                        ? (
                                                            user?.course?.name
                                                                ? user.course.name
                                                                : <Chip size="small" variant="outlined" label={t('common.noCourse')} />
                                                        )
                                                        : column.id === 'status'
                                                            ? (
                                                                <Chip
                                                                    size="small"
                                                                    color={statusColor[user.status] || 'default'}
                                                                    label={statusLabels[user.status] || user.status || '-'}
                                                                />
                                                            )
                                                            : column.id === 'role'
                                                                ? <Chip size="small" label={roleLabels[user.role] || user.role || '-'} />
                                                                : column.id === 'display_name'
                                                                    ? (
                                                                        <Stack spacing={0.25}>
                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                {user.display_name || user.email || '-'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : t('settings.users.noAdditionalName')}
                                                                            </Typography>
                                                                        </Stack>
                                                                    )
                                                                    : user[column.id]
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            {paginatedUsers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={columns.length}>
                                        <Alert severity="info">
                                            {t('settings.users.noVisibleUsers')}
                                        </Alert>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={filteredUsers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>

            <ModalLayout
                open={isCreateModalLayoutOpen}
                closeModal={handleModalClose}
            >
                <InviteUserForm
                    closeModal={handleModalClose}
                    userData={selectedUser}
                    courses={courses}
                />
            </ModalLayout>

        </Box>
    )
}

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

const columns = [
    { id: 'display_name', label: 'Usuario', minWidth: 190, align: 'left' },
    { id: 'email', label: 'Correo', minWidth: 220, align: 'left' },
    { id: 'role', label: 'Rol', minWidth: 120, align: 'left' },
    { id: 'status', label: 'Estado', minWidth: 120, align: 'left' },
    { id: 'class', label: 'Curso', minWidth: 150, align: 'left' },
    { id: 'actions', label: 'Acciones', minWidth: 220, align: 'left' },
];

const statusColor = {
    [STATUS_USER_ACTIVE]: 'success',
    [STATUS_USER_PENDING]: 'warning',
    [STATUS_USER_DESACTIVE]: 'default',
}

const roleLabels = {
    [USER_ROL_SUPER_ADMIN]: 'Admin principal',
    [USER_ROL_TEACHER]: 'Profesor',
    [USER_ROL_STUDENT]: 'Alumno',
}

const statusLabels = {
    [STATUS_USER_ACTIVE]: 'Activo',
    [STATUS_USER_PENDING]: 'Pendiente',
    [STATUS_USER_DESACTIVE]: 'Desactivado',
}

export const UsersManagement = () => {

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
            alert('No se pudo copiar el enlace de invitación.')
        }
    }

    return (
        <Box>
            <PageHeader
                title="Gestión de Usuarios"
                subtitle="Invita usuarios, activa accesos y ajusta rol o curso según el flujo académico del laboratorio."
                actions={(
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleCreateInvite}
                    >
                        Crear invitación
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
                                Copiar enlace
                            </Button>
                            <Button size="small" onClick={() => setLatestInvite(null)}>
                                Cerrar
                            </Button>
                        </Stack>
                    )}
                >
                    Invitación creada para <strong>{latestInvite.email}</strong>.
                    {' '}Enlace: {latestInvite.invite_url}
                    {latestInvite.role === USER_ROL_STUDENT && !latestInvite.course_id && (
                        <>
                            {' '}Este alumno quedó <strong>sin curso</strong>, así que ningún profesor lo verá hasta asignarlo desde Gestión de cursos.
                        </>
                    )}
                </Alert>
            )}

            {!latestInvite?.invite_url && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Usa esta vista para aprobar accesos, reasignar alumnos a sus cursos y actualizar el rol de cada cuenta.
                </Alert>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                <Chip label={`Total: ${summary.total}`} />
                <Chip color="success" label={`Activos: ${summary.active}`} />
                <Chip color="warning" label={`Pendientes: ${summary.pending}`} />
                <Chip label={`Desactivados: ${summary.deactivated}`} />
            </Stack>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
                    <TextField
                        label="Buscar usuario"
                        placeholder="Correo o nombre"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value)
                            setPage(0)
                        }}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel id="role-filter-label">Rol</InputLabel>
                        <Select
                            labelId="role-filter-label"
                            label="Rol"
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            {USER_ROLES_ARRAY.map((role) => (
                                <MenuItem key={role} value={role}>
                                    {roleLabels[role] || role}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="status-filter-label">Estado</InputLabel>
                        <Select
                            labelId="status-filter-label"
                            label="Estado"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            {USER_STATUS_ARRAY.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {statusLabels[status] || status}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="course-filter-label">Curso</InputLabel>
                        <Select
                            labelId="course-filter-label"
                            label="Curso"
                            value={courseFilter}
                            onChange={(event) => {
                                setCourseFilter(event.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="__no_course__">Sin curso</MenuItem>
                            {courses.map((course) => (
                                <MenuItem key={course.id} value={course.id}>
                                    {course.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button variant="outlined" onClick={resetFilters}>
                        Limpiar filtros
                    </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Mostrando {filteredUsers.length} de {usersList.length} usuarios.
                </Typography>
            </Paper>

            <Paper sx={{ width: '100%' }}>
                <TableContainer sx={{ maxHeight: 800 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead >
                            <TableRow>
                                <TableCell align='center' colSpan={3}>
                                    Usuarios
                                </TableCell>
                                <TableCell align='center' colSpan={3}>
                                    Gestión
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
                                                                Activar
                                                            </Button>
                                                        )}
                                                        {user.status === STATUS_USER_ACTIVE && (
                                                            <Button
                                                                size="small"
                                                                color="inherit"
                                                                startIcon={<PersonOffOutlined />}
                                                                onClick={() => handleQuickStatusChange(user, STATUS_USER_DESACTIVE)}
                                                            >
                                                                Desactivar
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                ) : (
                                                    column.id === 'class'
                                                        ? (
                                                            user?.course?.name
                                                                ? user.course.name
                                                                : <Chip size="small" variant="outlined" label="Sin curso" />
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
                                                                                {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Sin nombre adicional'}
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
                                            Todavia no hay usuarios visibles para esta cuenta.
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

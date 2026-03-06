import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext'
import InviteUserForm from '@/features/auth/components/InviteUserForm'
import { useUsersFetch } from '@/features/settings/hooks/useUsersFetch'
import { ModalLayout } from '@/shared/ui/layouts/ModalLayout'
import { ModeEditOutlined } from '@mui/icons-material'
import { Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material'
import { useContext, useEffect, useState } from 'react'

const columns = [
    { id: 'name', label: 'Name', minWidth: 170, align: 'left' },
    { id: 'email', label: 'Email', minWidth: 170, align: 'left' },
    { id: 'role', label: 'Role', minWidth: 50, align: 'left' },
    { id: 'status', label: 'Status', minWidth: 50, align: 'left' },
    { id: 'class', label: 'Class', minWidth: 100, align: 'left' },
    { id: 'actions', label: 'Actions', minWidth: 150, align: 'left' },
];


export const UsersManagement = () => {

    const { setLoadingFlow } = useContext(LoadingFlowContext)
    const { usersList, selectedUser, setSelectedUser, addUser, updateUser, fetchUsers } = useUsersFetch(setLoadingFlow)
    const [isCreateModalLayoutOpen, setIsCreateModalLayoutOpen] = useState(false)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)


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

    const handleModalClose = async (data) => {
        if (data) {
            selectedUser ? await updateUser(selectedUser.id, data) : await addUser(data)
        }
        setIsCreateModalLayoutOpen(false)
        setSelectedUser(null)
    }

    const handleEditUser = (user) => {
        setSelectedUser(user)
        setIsCreateModalLayoutOpen(true)
    }



    return (
        <div>
            <h2>Users Management</h2>
            <Button
                variant='contained'
                color='primary'
                onClick={() => setIsCreateModalLayoutOpen(true)}
            >
                Add new User
            </Button>

            <Paper sx={{ width: '100%' }}>
                <TableContainer sx={{ maxHeight: 800 }}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead >
                            <TableRow>
                                <TableCell align='center' colSpan={3}>
                                    Users
                                </TableCell>
                                <TableCell align='center' colSpan={3}>
                                    Details
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
                            {usersList
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((user) => (
                                    <TableRow hover key={user.id}>
                                        {columns.map((column) => (
                                            <TableCell key={column.id} align={column.align}>
                                                {column.id === 'actions' ? (
                                                    <Stack direction="row" spacing={1}>
                                                        <IconButton onClick={() => handleEditUser(user)} aria-label="edit" color="primary">
                                                            <ModeEditOutlined />
                                                        </IconButton>
                                                    </Stack>
                                                ) : (
                                                    user[column.id]
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={usersList.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />

            </Paper>

            <ModalLayout
                open={isCreateModalLayoutOpen}
                closeModal={handleModalClose}
                form={
                    <InviteUserForm
                        closeModal={handleModalClose}
                        userData={selectedUser}
                    />} />

        </div>
    )
}

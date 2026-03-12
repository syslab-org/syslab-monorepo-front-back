import { useCallback, useState } from 'react'

import { api } from '@/infrastructure/http/api'

export const useUsersFetch = (setLoadingFlow) => {
    const [usersList, setUsersList] = useState([])
    const [courses, setCourses] = useState([])
    const [selectedUser, setSelectedUser] = useState(null)

    const fetchUsers = useCallback(async () => {
        setLoadingFlow(true)
        try {
            const [usersResponse, coursesResponse] = await Promise.all([
                api.listUsers(),
                api.listCourses(),
            ])
            setUsersList(Array.isArray(usersResponse) ? usersResponse : [])
            setCourses(Array.isArray(coursesResponse) ? coursesResponse : [])
        } catch (error) {
            console.error('Cannot fetch users data: ', error)
        } finally {
            setLoadingFlow(false)
        }
    }, [setLoadingFlow])

    const addUser = useCallback(async (data) => {
        setLoadingFlow(true)
        try {
            const created = await api.createUser(data)
            alert(`Invitacion creada: ${created?.invite_url || ''}`)
            await fetchUsers()
        } catch (error) {
            console.error('Error adding user:', error)
            alert(error?.message || 'No se pudo crear el usuario.')
        } finally {
            setLoadingFlow(false)
        }
    }, [setLoadingFlow, fetchUsers])

    const updateUser = useCallback(async (userId, data) => {
        setLoadingFlow(true)
        try {
            await api.updateUser(userId, data)
            await fetchUsers()
        } catch (error) {
            console.error('Error updating user: ', error)
            alert(error?.message || 'No se pudo actualizar el usuario.')
        } finally {
            setLoadingFlow(false)
        }
    }, [setLoadingFlow, fetchUsers])

    return {
        usersList,
        courses,
        selectedUser,
        setSelectedUser,
        fetchUsers,
        addUser,
        updateUser,
    }
}

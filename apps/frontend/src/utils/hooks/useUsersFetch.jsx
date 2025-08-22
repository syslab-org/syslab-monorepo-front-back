import { addDoc, collection, doc, getDocs, Timestamp, updateDoc } from 'firebase/firestore'
import { useCallback } from 'react'
import { useState } from 'react'
import { db } from '../../firebase/firebaseConfig'
import { DB_FIRESTORE_USERS } from '../../constants'

export const useUsersFetch = (setLoadingFlow) => {

    const [usersList, setUsersList] = useState([])
    const [selectedUser, setSelectedUser] = useState(null)

    const fetchUsers = useCallback(async () => {
        setLoadingFlow(true)
        try {
            const usersCollection = collection(db, DB_FIRESTORE_USERS)
            const usersSnapshot = await getDocs(usersCollection)
            const usersListFecth = usersSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }))
            setUsersList(usersListFecth)
        } catch (error) {
            console.error('Cannot fetch users data: ', error);

        } finally {
            setLoadingFlow(false)
        }

    }, [setLoadingFlow])

    const addUser = useCallback(async (data) => {
        setLoadingFlow(true)

        try {

            const userRef = await addDoc(collection(db, DB_FIRESTORE_USERS), {
                email: data.email,
                role: data.role,
                status: data.status,
                invitationSent: true,
                createdAt: Timestamp.now(),
                expirationTime: 48 * 60 * 60 * 1000, // 48 hours
            })

            alert('Invitación enviada con éxito: https://miapp.com/register?userId=' + userRef.id);
            fetchUsers(); //Refresh Users

        } catch (error) {
            console.error('Error adding user:', error);
        } finally {
            setLoadingFlow(false)
        }
    }, [setLoadingFlow, fetchUsers])

    const updateUser = useCallback(async (userId, data) => {
        setLoadingFlow(true)

        try {
            await updateDoc(doc(db, DB_FIRESTORE_USERS, userId), {
                status: data.status
            })

            alert('user status updated successfully')
            fetchUsers() //Refresh user list
        } catch (error) {
            console.error('Error updating user: ', error);

        } finally {
            setLoadingFlow(false)
        }

    }, [setLoadingFlow, fetchUsers])


    return {
        usersList,
        selectedUser,
        setSelectedUser,
        fetchUsers,
        addUser,
        updateUser,
    };
}

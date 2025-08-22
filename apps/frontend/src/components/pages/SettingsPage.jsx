/* eslint-disable react/prop-types */
import { useContext } from 'react'
import { useState } from 'react'
import { LoadingFlowContext } from '../../contexts/LoadingFlowContext'
import { useEffect } from 'react'
import { addDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebaseConfig'
import { Box, Button, IconButton, List, ListItem, ListItemText } from '@mui/material'
import { DeleteOutlineOutlined } from '@mui/icons-material'
import AddAmiModal from './modals/AddAmiModal'
import { DB_AMI_LIST } from '../flow/utils/constants'

const AMIList = ({ amilist }) => (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper', marginTop: 3 }}>
        <List dense>
            {amilist.length > 0 ? (
                amilist.map((ami) => (
                    <ListItem key={ami.id} secondaryAction={
                        <IconButton edge="end" aria-label="delete">
                            <DeleteOutlineOutlined />
                        </IconButton>
                    }>
                        <ListItemText primary={ami.data?.amiCode || 'Unknown AMI Code'} />
                    </ListItem>
                ))
            ) : (
                <ListItem>
                    <ListItemText primary="No AMIs found." />
                </ListItem>
            )}
        </List>
    </Box>
);

const SettingsPage = () => {

    const [amilist, setAmilist] = useState([])
    const [isCreateAmiModalOpen, setIsCreateAmiModalOpen] = useState(false)
    const { setLoadingFlow } = useContext(LoadingFlowContext)

    //Load AMI List

    const fetchAmiList = async () => {
        setLoadingFlow(true)

        try {
            const amiListCollection = collection(db, DB_AMI_LIST)
            const amiListSnapshot = await getDocs(amiListCollection)
            const amiListResponse = amiListSnapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }))
            // console.log("amiListResponse: ", amiListResponse);

            setAmilist(amiListResponse)
        } catch (error) {
            console.error('Error fetching AMI list:', error);
        } finally {
            setLoadingFlow(false)
        }
    }

    useEffect(() => {

        fetchAmiList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    //Function to improve the close modal and add a new AMI
    const handleAddAmiModalClose = async (newAmiData) => {

        if (!newAmiData) return //Avoid unnecessary calls if there is no data

        setLoadingFlow(true)

        try {
            await addDoc(collection(db, DB_AMI_LIST), { data: newAmiData })
            fetchAmiList() //Reload list after add the new AMI

        } catch (error) {
            // console.log("Error adding new AMI: ", error);

        } finally {

            setIsCreateAmiModalOpen(false)
            setLoadingFlow(false)
        }


    }

    return (
        <div>
            <h2>AMI List</h2>
            <Button variant='contained' color='primary' onClick={() => setIsCreateAmiModalOpen(true)}>
                Add new AMI
            </Button>


            <AMIList amilist={amilist} />

            <AddAmiModal open={isCreateAmiModalOpen} closeModal={handleAddAmiModalClose} />

        </div>
    )
}

export default SettingsPage
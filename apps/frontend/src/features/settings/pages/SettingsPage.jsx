import { useContext, useEffect, useState } from 'react'

import { Box, Button, IconButton, List, ListItem, ListItemText } from '@mui/material'
import { DeleteOutlineOutlined } from '@mui/icons-material'

import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext'
import AddAmiModal from '@/features/settings/modals/AddAmiModal'
import { api } from '@/infrastructure/http/api'

const AMIList = ({ amilist, onDelete }) => (
  <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper', marginTop: 3 }}>
    <List dense>
      {amilist.length > 0 ? (
        amilist.map((ami) => (
          <ListItem key={ami.id} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(ami.id)}>
              <DeleteOutlineOutlined />
            </IconButton>
          }>
            <ListItemText primary={ami.code || ami.label || 'Unknown AMI Code'} />
          </ListItem>
        ))
      ) : (
        <ListItem>
          <ListItemText primary="No AMIs found." />
        </ListItem>
      )}
    </List>
  </Box>
)

const SettingsPage = () => {
  const [amilist, setAmilist] = useState([])
  const [isCreateAmiModalOpen, setIsCreateAmiModalOpen] = useState(false)
  const { setLoadingFlow } = useContext(LoadingFlowContext)

  const fetchAmiList = async () => {
    setLoadingFlow(true)
    try {
      const response = await api.listAmis({ provider: 'aws' })
      setAmilist(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error fetching AMI list:', error)
    } finally {
      setLoadingFlow(false)
    }
  }

  useEffect(() => {
    fetchAmiList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddAmiModalClose = async (newAmiData) => {
    setIsCreateAmiModalOpen(false)
    if (!newAmiData) return

    setLoadingFlow(true)
    try {
      await api.createAmi({
        code: newAmiData?.amiCode || '',
        label: newAmiData?.amiLabel || '',
        provider: 'aws',
        region: newAmiData?.region || '',
        metadata: newAmiData,
      })
      await fetchAmiList()
    } catch (error) {
      console.error('Error adding new AMI: ', error)
    } finally {
      setLoadingFlow(false)
    }
  }

  const handleDeleteAmi = async (amiId) => {
    setLoadingFlow(true)
    try {
      await api.deleteAmi(amiId)
      await fetchAmiList()
    } catch (error) {
      console.error('Error deleting AMI: ', error)
    } finally {
      setLoadingFlow(false)
    }
  }

  return (
    <div>
      <h2>AMI List</h2>
      <Button variant='contained' color='primary' onClick={() => setIsCreateAmiModalOpen(true)}>
        Add new AMI
      </Button>

      <AMIList amilist={amilist} onDelete={handleDeleteAmi} />

      <AddAmiModal open={isCreateAmiModalOpen} closeModal={handleAddAmiModalClose} />
    </div>
  )
}

export default SettingsPage

// apps/frontend/src/components/flow/pages/CreateVPCModal.jsx
import { Box, Modal } from '@mui/material';
import { addDoc, collection } from 'firebase/firestore';
import { useContext } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { LoadingFlowContext } from '../../../contexts/LoadingFlowContext';
import { db } from '../../../firebase/firebaseConfig';
import NewVLANForm from '../forms/NewVLANForm';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

// eslint-disable-next-line react/prop-types
const CreateVPCModal = ({ open, onClose }) => {
  const { setLoadingFlow, loadingFlow } = useContext(LoadingFlowContext)
  const { user } = useAuth()
  const userId = user.userId

  const handleCreateVPC = async (vpcData) => {
    // console.log("loadingFlow",loadingFlow);
    console.log("Creating VPC with data:", vpcData);

    setLoadingFlow(true)
    const { vlanName, cloudProvider, cidrBlock, prefixLength, region, type } = vpcData

    if (vlanName && cloudProvider && cidrBlock && prefixLength && type) {

      try {
        const vpcDoc = await addDoc(collection(db, 'vpcs'), {
          name: vlanName,
          cloudProvider,
          cidrBlock,
          userId,
          prefixLength,
          region,
          type
        })

        onClose(vpcDoc.id, cidrBlock, prefixLength, vpcData.vlanName, vpcData.region);

      } catch (error) {
        console.error("Error creating VPC:", error)
      }

    } else {
      console.error("Error: Missing VPC name or cloud type")
    }
  }



  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
    >

      <Box sx={{ ...style, width: 400 }}>
        {/* <NewVPCForm onSave={handleCreateVPC}/> */}
        <NewVLANForm onSave={handleCreateVPC} />
      </Box>
    </Modal>
  )
}

export default CreateVPCModal

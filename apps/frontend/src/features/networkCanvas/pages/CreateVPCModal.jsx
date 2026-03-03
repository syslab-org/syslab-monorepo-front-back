// apps/frontend/src/components/flow/pages/CreateVPCModal.jsx
import { Box, Modal, Stack, Typography } from '@mui/material';
import { addDoc, collection } from 'firebase/firestore';
import { useContext } from 'react';
import { useAuth } from '@/app/providers/AuthContext';
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext';
import { db } from '@/infraestructure/firebase/firebaseConfig';
import NewVLANForm from '../forms/NewVLANForm';
import { useWizard } from "@/features/networkCanvas/context/WizardContext"
import WizardModalLayout from '../components/WizardModalLayout';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',

  width: 'min(720px, 92vw)',
  maxHeight: '90vh',

  overflow: 'hidden',       // ⬅️ clave: el scroll lo hará el layout
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,

  // ⚠️ Ojo: quitamos p:4 de aquí, para que el layout controle padding
};
// eslint-disable-next-line react/prop-types
const CreateVPCModal = ({ open, onClose, wizardMode = false }) => {
  const { setLoadingFlow, loadingFlow } = useContext(LoadingFlowContext)
  const { user } = useAuth()
  const userId = user.userId

  const { active, currentStep, steps } = useWizard()



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
          type,
          narrative: wizardMode ? "wizard" : "advanced",
          labTemplate: vpcData?.labTemplate || null,
        })

        // devolvemos datos del padre (VPCList) para actualizar la lista
        onClose(
          vpcDoc.id,
          cidrBlock,
          prefixLength,
          vpcData.vlanName,
          vpcData.region);

      } catch (error) {
        // TODO: en un siguiente paso, aquí enganchamos snackbar global
        console.error("Error creating VPC:", error)
        setLoadingFlow(false);
      }

    } else {
      console.error("Error: Missing VPC name or cloud type")
      setLoadingFlow(false);
    }
  }

  // ------- UI: títulos y textos según modo -------

  const isWizardActive = wizardMode && active;

  let title = "Crear nueva VPC";
  let subtitle = "Define el nombre del laboratorio, la región y el rango de direcciones. Luego podrás agregar VPCs, subredes e instancias.";
  let stepLabel = "";

  if (wizardMode) {
    title = "Crear laboratorio";
    subtitle = "Define el nombre del laboratorio, la región y el rango de direcciones. Después te guiaremos por subredes, instancias y pruebas.";
    if (isWizardActive && Array.isArray(steps) && steps.length > 0) {
      const idx = steps.indexOf(currentStep);
      const stepNumber = idx >= 0 ? idx + 1 : 1;
      stepLabel = `Paso ${stepNumber} de ${steps.length}`;

    } else {
      stepLabel = "Laboratorio guiado";
    }
  }


  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      aria-labelledby="create-vpc-modal-title"
      aria-describedby="create-vpc-modal-description"
    >
      <Box sx={style}>
        <WizardModalLayout
          eyebrow={wizardMode ? stepLabel : null}
          title={title}
          description={subtitle}
        >
          <NewVLANForm onSave={handleCreateVPC} wizardMode={wizardMode} />
        </WizardModalLayout>
      </Box>
    </Modal>
  );
}

export default CreateVPCModal

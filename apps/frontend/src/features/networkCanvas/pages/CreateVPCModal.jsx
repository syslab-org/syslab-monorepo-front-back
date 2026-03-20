import { Box, Modal } from '@mui/material';
import { useContext, useEffect, useState } from 'react';

import { useAuth } from '@/app/providers/AuthContext';
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext';
import { api } from '@/infrastructure/http/api';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '@/shared/constants';
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
  overflow: 'hidden',
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
};

const normalizeProviderValue = (raw) => {
  if (Array.isArray(raw)) {
    return normalizeProviderValue(raw[0])
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('[')) {
      try {
        return normalizeProviderValue(JSON.parse(trimmed))
      } catch {
        return trimmed.replace(/[[\]"]/g, '').trim().toLowerCase()
      }
    }
    return trimmed.replace(/^"+|"+$/g, '').toLowerCase()
  }

  return String(raw || '').trim().toLowerCase()
}

const CreateVPCModal = ({ open, onClose, wizardMode = false }) => {
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { user } = useAuth()
  const { active, currentStep, steps } = useWizard()
  const [courses, setCourses] = useState([])

  useEffect(() => {
    let alive = true
    const loadCourses = async () => {
      if (!open) return
      try {
        const response = await api.listCourses()
        if (alive) setCourses(Array.isArray(response) ? response : [])
      } catch (error) {
        console.error('Error loading courses:', error)
      }
    }
    loadCourses()
    return () => {
      alive = false
    }
  }, [open])

  const handleCreateVPC = async (vpcData) => {
    setLoadingFlow(true)
    const { vlanName, cloudProvider, cidrBlock, prefixLength, region, type, course_id } = vpcData
    const targetProvider = normalizeProviderValue(cloudProvider) || 'aws'

    if (vlanName && targetProvider && cidrBlock && prefixLength && type) {
      try {
        const lab = await api.createLab({
          name: vlanName,
          target_provider: targetProvider,
          cidr_block: cidrBlock,
          prefix_length: prefixLength,
          region,
          narrative: wizardMode ? 'wizard' : 'advanced',
          lab_template: vpcData?.labTemplate || '',
          visibility_scope: user?.role === USER_ROL_STUDENT ? 'owner' : 'course',
          course_id: course_id || null,
          metadata: {
            type,
          },
        })

        onClose(
          lab.id,
          cidrBlock,
          prefixLength,
          vpcData.vlanName,
          vpcData.region,
        )
      } catch (error) {
        console.error('Error creating lab:', error)
        alert(error?.message || 'No se pudo crear el laboratorio.')
        setLoadingFlow(false)
      }
    } else {
      console.error('Error: Missing lab name or cloud type')
      setLoadingFlow(false)
    }
  }

  const isWizardActive = wizardMode && active;

  let title = 'Crear laboratorio de red';
  let subtitle = 'Crea un laboratorio para modelar topologías de red y dejarlo listo para una orquestación real. Define nombre, región y CIDR maestro.';
  let stepLabel = '';

  if (wizardMode) {
    title = 'Crear laboratorio';
    subtitle = 'Crea un laboratorio educativo guiado: modela topologías de red paso a paso y déjalo listo para una ejecución real.';
    if (isWizardActive && Array.isArray(steps) && steps.length > 0) {
      const idx = steps.indexOf(currentStep);
      const stepNumber = idx >= 0 ? idx + 1 : 1;
      stepLabel = `Paso ${stepNumber} de ${steps.length}`;
    } else {
      stepLabel = 'Laboratorio guiado';
    }
  }

  const canChooseCourse = user?.role === USER_ROL_TEACHER || user?.role === USER_ROL_SUPER_ADMIN

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
          <NewVLANForm
            onSave={handleCreateVPC}
            wizardMode={wizardMode}
            availableCourses={canChooseCourse ? courses : []}
            requireCourseSelection={user?.role === USER_ROL_TEACHER}
          />
        </WizardModalLayout>
      </Box>
    </Modal>
  );
}

export default CreateVPCModal

import { Box, Modal } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/app/providers/AuthContext';
import { LoadingFlowContext } from '@/app/providers/LoadingFlowContext';
import { api } from '@/infrastructure/http/api';
import { USER_ROL_STUDENT, USER_ROL_SUPER_ADMIN, USER_ROL_TEACHER } from '@/shared/constants';
import { useProviderCapabilities } from '@/features/networkCanvas/core/useProviderCapabilities';
import { buildCanvasProviderOptions } from '@/features/networkCanvas/providers/providerCatalog';
import { buildTemplateFlow, getLabTemplateByValue } from '@/features/networkCanvas/utils/labTemplates';
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

const CreateLabModal = ({ open, onClose, wizardMode = false }) => {
  const { t } = useTranslation();
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { user } = useAuth()
  const { active, currentStep, steps } = useWizard()
  const [courses, setCourses] = useState([])
  const [cloudConnections, setCloudConnections] = useState([])
  const { capabilities, getCapability } = useProviderCapabilities()
  const providerOptions = buildCanvasProviderOptions(capabilities)

  useEffect(() => {
    let alive = true
    const loadData = async () => {
      if (!open) return
      try {
        const [coursesResponse, connectionsResponse] = await Promise.all([
          api.listCourses(),
          api.listCloudConnections(),
        ])
        if (alive) {
          setCourses(Array.isArray(coursesResponse) ? coursesResponse : [])
          setCloudConnections(Array.isArray(connectionsResponse) ? connectionsResponse : [])
        }
      } catch (error) {
        console.error('Error loading create-lab dependencies:', error)
      }
    }
    loadData()
    return () => {
      alive = false
    }
  }, [open])

  const handleCreateVPC = async (vpcData) => {
    setLoadingFlow(true)
    const { vlanName, cloudProvider, cidrBlock, prefixLength, region, type, course_id, labTemplate, cloud_connection_id, notes } = vpcData
    const targetProvider = normalizeProviderValue(cloudProvider) || 'aws'
    const providerCapability = getCapability(targetProvider)
    const enabledFeatures = Object.entries(providerCapability.features || {})
      .filter(([, enabled]) => !!enabled)
      .map(([feature]) => feature)
    const selectedTemplate = getLabTemplateByValue(labTemplate)
    const templateFlow = wizardMode ? buildTemplateFlow(labTemplate) : null

    if (vlanName && targetProvider && cidrBlock && prefixLength && type) {
      try {
        const lab = await api.createLab({
          name: vlanName,
          target_provider: targetProvider,
          cidr_block: cidrBlock,
          prefix_length: prefixLength,
          region,
          notes: notes || '',
          narrative: wizardMode ? 'wizard' : 'advanced',
          lab_template: labTemplate || '',
          flow: templateFlow || {},
          visibility_scope: user?.role === USER_ROL_STUDENT ? 'owner' : 'course',
          course_id: course_id || null,
          cloud_connection_id: cloud_connection_id || null,
          capabilities: enabledFeatures,
          metadata: {
            type,
            provider_status: providerCapability.status || 'unknown',
            template_seed: labTemplate || '',
            template_title: selectedTemplate?.title || '',
            template_recommended_cidr: selectedTemplate?.recommendedCidr || '',
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
        alert(error?.message || t('canvas.createLab.error'))
        setLoadingFlow(false)
      }
    } else {
      console.error('Error: Missing lab name or cloud type')
      setLoadingFlow(false)
    }
  }

  const isWizardActive = wizardMode && active;

  let title = t('canvas.createLab.networkTitle');
  let subtitle = t('canvas.createLab.networkSubtitle');
  let stepLabel = '';

  if (wizardMode) {
    title = t('canvas.createLab.guidedTitle');
    subtitle = t('canvas.createLab.guidedSubtitle');
    if (isWizardActive && Array.isArray(steps) && steps.length > 0) {
      const idx = steps.indexOf(currentStep);
      const stepNumber = idx >= 0 ? idx + 1 : 1;
      stepLabel = t('canvas.createLab.stepLabel', { current: stepNumber, total: steps.length });
    } else {
      stepLabel = t('canvas.createLab.guidedEyebrow');
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
            availableCloudConnections={cloudConnections}
            requireCourseSelection={user?.role === USER_ROL_TEACHER}
            currentUserRole={user?.role || ''}
            currentUserCourseId={user?.course?.id || ''}
            providerOptions={providerOptions}
            defaultProvider={providerOptions.find((item) => item.designEnabled)?.provider || 'aws'}
          />
        </WizardModalLayout>
      </Box>
    </Modal>
  );
}

export default CreateLabModal

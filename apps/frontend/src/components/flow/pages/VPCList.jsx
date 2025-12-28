// apps/frontend/src/components/flow/pages/VPCList.jsx
import { DeleteOutline, ModeEditOutlined } from "@mui/icons-material";
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DB_FIRESTORE_VPCS, USER_ROL_STUDENT } from "../../../constants";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { useWizard } from "../../../contexts/WizardContext";
import { db } from "../../../firebase/firebaseConfig";
import useCidrBlockVPCStore from '../store/cidrBlocksIp';
import CreateVPCModal from "./CreateVPCModal";



const useFetchVPCs = (setLoadingFlow) => {
  const [vpcs, setVpcs] = useState([])
  const { user } = useAuth()
  const { role, userId } = user || {}

  const fetchVPCs = useCallback(async () => {
    setLoadingFlow(true)
    // console.log("user:", user);
    try {
      let vpcList = []
      if (role === USER_ROL_STUDENT) {
        vpcList = await fetchStudentVPCs(userId)
      } else {
        vpcList = await fetchAllVPCs()
      }

      setVpcs(vpcList)




    } catch (error) {
      // console.log("Error fetching VPCs: ", error);

    } finally {
      setLoadingFlow(false)
    }
  }, [setLoadingFlow, userId, user, role])

  useEffect(() => {
    fetchVPCs()
  }, [fetchVPCs])

  return { vpcs, fetchVPCs }
}

const fetchStudentVPCs = async (userId) => {

  const vpcStudesCollectionRef = collection(db, DB_FIRESTORE_VPCS)
  const q = query(vpcStudesCollectionRef, where('userId', '==', userId))
  const querySnapshot = await getDocs(q)

  if (querySnapshot.empty) {
    console.warn('No se encontraron registros para el estudiante');
    return []
  }

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

}

const fetchAllVPCs = async () => {
  const vpcCollection = collection(db, DB_FIRESTORE_VPCS)
  const vpcSnapshot = await getDocs(vpcCollection)
  return vpcSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}


const VPCList = () => {


  const [isCreateVPCModalOpen, setIsCreateVPCModalOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState(false)

  const navigate = useNavigate()
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { setCidrBlockVPC, setPrefixLength, setVlanName, setVlanRegion } = useCidrBlockVPCStore();

  const { vpcs } = useFetchVPCs(setLoadingFlow)
  const { start, finish, setStep } = useWizard()


  const handleCreateVPCModalClose = (newVPCId, cidrBlock, prefixLength, vlanName, vlanRegion) => {
    finish();
    setWizardMode(false)

    if (cidrBlock) {
      setCidrBlockVPC(cidrBlock)
    }
    if (prefixLength) {
      setPrefixLength(prefixLength);
    }
    if (vlanName) {
      setVlanName(vlanName);
    }
    if (vlanRegion) {
      setVlanRegion(vlanRegion);
    }

    setIsCreateVPCModalOpen(false);
    setLoadingFlow(false)
    if (newVPCId) {
      navigate(`/admin/vpcs/${newVPCId}/mainflow`);
    }
  };

  const handleLinkToFlow = (newVPCId, ipVPC) => {
    setLoadingFlow(true)
    setCidrBlockVPC(ipVPC)
    setLoadingFlow(false)
    navigate(`/admin/vpcs/${newVPCId}/mainflow`);
  }

  //Botón: laboratorio guiado
  const handleCreateGuideLab = () => {
    setWizardMode(true)
    start();
    setStep("vpc-lab-type"); //primer paso lógico del wizard
    setIsCreateVPCModalOpen(true);
  }

  //Botón: creación clásica/avanzada
  const handleCreateAdvancedVPC = () => {
    setWizardMode(false)
    start(); // opcional, si quieres que igual muestre hints del wizard.
    setStep("manual-vpc")
    setIsCreateVPCModalOpen(true);
  }

  return (
    <div>
      <Stack direction="column" spacing={4} >
        <Stack direction="row" alignItems="center">
          <Box flexGrow={1} flexShrink={1} flexBasis="auto">
            <Typography
              variant="h4"
              sx={{
                color: (theme) => theme.palette.primary.main
              }}>
              Laboratorios y VPCs
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: (theme) => theme.palette.text.secondary,
                mt: 1,
                maxWidth: 600
              }}>
              Aquí puedes gestionar tus laboratorios de redes. Crea un entorno guiado para demostraciones
              y prácticas, o una VPC avanzada si ya dominas la configuración.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleCreateGuideLab}
            >
              Crear Laboratorio Guiado
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateAdvancedVPC}
            >
              Crear VPC Avanzada
            </Button>
          </Stack>
          {/* <div> */}
          {/* <Button variant="contained" color="primary" onClick={() => setIsCreateVPCModalOpen(true)}>
                            Crear Nueva VPC
                        </Button> */}
          {/* <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsCreateVPCModalOpen(true)} color="secondary">
              add new VLAN
            </Button> */}
          {/* </div> */}

        </Stack>
        <VPCsTable vpcs={vpcs} onEdit={handleLinkToFlow} />
      </Stack>

      <CreateVPCModal
        open={isCreateVPCModalOpen}
        onClose={handleCreateVPCModalClose}
        wizardMode={wizardMode}
      />

    </div>
  )
}

const VPCsTable = ({ vpcs, onEdit }) => (

  <TableContainer component={Paper} variant="lightPaper">
    <Table sx={{ minWidth: 650 }} aria-label="vpcs table">
      <TableHead>
        <TableRow>
          <TableCell>VPC Name</TableCell>
          <TableCell>VPC ID</TableCell>
          <TableCell>VPC TYPE</TableCell>
          <TableCell>VPC Status</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {vpcs.map(vpc => (
          <TableRow
            key={vpc.id}
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
          >
            <TableCell component="th" scope="row">
              {vpc.name}
            </TableCell>
            <TableCell >{vpc.id}</TableCell>
            <TableCell >{vpc.cloudType}</TableCell>
            <TableCell >Active</TableCell>
            <TableCell >
              <Stack direction="row" spacing={1}>
                <IconButton onClick={() => onEdit(vpc.id, vpc.cidrBlock)} aria-label="edit" color="primary">
                  <ModeEditOutlined />
                </IconButton>
                <IconButton aria-label="delete" color="error" >
                  <DeleteOutline />
                </IconButton>
              </Stack>

            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
)


export default VPCList

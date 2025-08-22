/* eslint-disable react/prop-types */
import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from "../../../firebase/firebaseConfig";
import { Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import CreateVPCModal from "./CreateVPCModal";
import { useNavigate } from "react-router-dom";
import { DeleteOutline } from "@mui/icons-material";
import { ModeEditOutlined } from "@mui/icons-material";
import { useContext } from "react";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import useCidrBlockVPCStore from '../store/cidrBlocksIp'
import { useCallback } from "react";
import { DB_FIRESTORE_VPCS, USER_ROL_STUDENT } from "../../../constants";
import { useAuth } from "../../../contexts/AuthContext";



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
    const navigate = useNavigate()
    const { setLoadingFlow } = useContext(LoadingFlowContext)
    const { setCidrBlockVPC, setPrefixLength } = useCidrBlockVPCStore();

    const { vpcs } = useFetchVPCs(setLoadingFlow)

    const handleCreateVPCModalClose = (newVPCId, cidrBlock, prefixLength) => {
        setCidrBlockVPC(cidrBlock)
        setPrefixLength(prefixLength);
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


    return (
        <div>
            <Stack direction="column" // flex-direction: column
                spacing={4}     >
                <Stack direction="row">
                    <Box flexGrow={1} flexShrink={1} flexBasis="auto">
                        <Typography variant="h4" sx={{
                            color:(theme) => theme.palette.primary.main
                        }}>
                            Lista de VPCs
                        </Typography>
                    </Box>
                    <div>
                        {/* <Button variant="contained" color="primary" onClick={() => setIsCreateVPCModalOpen(true)}>
                            Crear Nueva VPC
                        </Button> */}
                        <Button variant="contained" startIcon={<AddIcon/>} onClick={() => setIsCreateVPCModalOpen(true)} color="secondary">
                            add new VLAN
                        </Button>
                    </div>

                </Stack>
                <VPCsTable vpcs={vpcs} onEdit={handleLinkToFlow} />
            </Stack>
            {/* <h2>Lista de VPCs</h2>
            <Button variant="contained" color="primary" onClick={() => setIsCreateVPCModalOpen(true)}>
                Crear Nueva VPC
            </Button>


            <VPCsTable vpcs={vpcs} onEdit={handleLinkToFlow} /> */}

            <CreateVPCModal open={isCreateVPCModalOpen} onClose={handleCreateVPCModalClose} />

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
                                {/* <IconButton component={Link} to={`/admin/vpcs/${vpc.id}/mainflow`} aria-label="edit" color="primary">
                                <ModeEditOutlined />
                            </IconButton> */}
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
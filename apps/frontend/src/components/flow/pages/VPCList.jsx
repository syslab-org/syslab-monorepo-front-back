// apps/frontend/src/components/flow/pages/VPCList.jsx
import { DeleteOutline, ModeEditOutlined } from "@mui/icons-material";
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DB_FIRESTORE_VPCS, USER_ROL_STUDENT } from "../../../constants";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { useWizard } from "../../../contexts/WizardContext";
import { db } from "../../../firebase/firebaseConfig";
import useCidrBlockVPCStore from '../store/cidrBlocksIp';
import CreateVPCModal from "./CreateVPCModal";
import { PageHeader } from "../../../components/layout/MainLayout.jsx";



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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vpcToDelete, setVpcToDelete] = useState(null);

  // UI filters (match PlanListPage look & feel)
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [isCreateVPCModalOpen, setIsCreateVPCModalOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState(false)

  const navigate = useNavigate()
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { setCidrBlockVPC, setPrefixLength, setVlanName, setVlanRegion } = useCidrBlockVPCStore();

  const { vpcs, fetchVPCs } = useFetchVPCs(setLoadingFlow)
  const { start, finish, setStep } = useWizard()

  const filteredVpcs = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (vpcs || [])
      .filter((v) => {
        if (typeFilter === "ALL") return true;
        const isWizard = v?.narrative === "wizard";
        return typeFilter === "GUIDED" ? isWizard : !isWizard;
      })
      .filter((v) => {
        if (!q) return true;
        const name = (v?.name || "").toLowerCase();
        const id = (v?.id || "").toLowerCase();
        return name.includes(q) || id.includes(q);
      });
  }, [vpcs, query, typeFilter]);


  const deleteFirestoreOnly = async () => {
    if (!vpcToDelete?.id) return;
    try {
      setLoadingFlow(true);
      await deleteDoc(doc(db, DB_FIRESTORE_VPCS, vpcToDelete.id));
      await fetchVPCs();
      closeDeleteDialog();
    } catch (error) {
      console.error("Error deleting VPC:", error);
      alert("No se pudo eliminar. Revisa consola.");
    } finally {
      setLoadingFlow(false);
    }

  }

  const handleCreateVPCModalClose = (newVPCId, cidrBlock, prefixLength, vlanName, vlanRegion) => {
    // 1) guarda si era wizard ANTES de resetearlo
    const wasWizard = wizardMode;

    // 2) ahora sí reseteas wizard UI
    finish();
    setWizardMode(false);

    // 3) store
    if (cidrBlock) setCidrBlockVPC(cidrBlock);
    if (prefixLength) setPrefixLength(prefixLength);
    if (vlanName) setVlanName(vlanName);
    if (vlanRegion) setVlanRegion(vlanRegion);

    setIsCreateVPCModalOpen(false);
    setLoadingFlow(false);

    // 4) navega con flag wizard
    if (newVPCId) {
      const qs = wasWizard ? "?wizard=1" : "";
      navigate(`/admin/vpcs/${newVPCId}/mainflow${qs}`);
    }
  };

  const handleLinkToFlow = (vpc) => {
    setLoadingFlow(true)
    setCidrBlockVPC(vpc.cidrBlock)
    setLoadingFlow(false)
    const qs = vpc.narrative === "wizard" ? "?wizard=1" : "";
    navigate(`/admin/vpcs/${vpc.id}/mainflow${qs}`);
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

  const handleDeleteVPC = async (vpc) => {
    const name = vpc?.name || vpc?.id;

    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar la VPC "${name}"? Esta acción no se puede deshacer.\n\nEsto borrará el registro en Firestore.\n(No destruye recursos en AWS si ya hiciste Deploy).`);
    if (!confirmDelete) return;

    try {
      setLoadingFlow(true);
      await deleteDoc(doc(db, DB_FIRESTORE_VPCS, vpc.id));
      // refrescar lista
      // Opción A: recargar (simple)
      await fetchVPCs();
      // Opción B (mejor): usar fetchVPCs desde el hook (te lo dejo en paso 2)
    } catch (error) {
      console.error("Error deleting VPC:", error);
      alert("No se pudo eliminar. Revisa consola.");
    } finally {
      setLoadingFlow(false);
    }

  }

  const openDeleteDialog = (vpc) => {
    setVpcToDelete(vpc);
    setDeleteDialogOpen(true);
  }
  const closeDeleteDialog = () => {
    setVpcToDelete(null);
    setDeleteDialogOpen(false);
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="column" spacing={3}>
        {/* Header (match PlanListPage) */}
        <PageHeader
          title="Laboratorios"
          subtitle="Aquí puedes gestionar tus laboratorios de redes. Crea un entorno guiado para demostraciones y prácticas, o una VPC avanzada si ya dominas la configuración."
          actions={
            <>
              <Tooltip
                title="Sigue un flujo paso a paso ideal para prácticas guiadas, clases y demostraciones académicas."
                arrow
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateGuideLab}
                  disableElevation
                  sx={{ borderRadius: 999, fontWeight: 700 }}
                >
                  Crear laboratorio guiado
                </Button>
              </Tooltip>

              <Tooltip
                title="Configura manualmente todos los parámetros de red. Recomendado si ya dominas conceptos como CIDR, subredes, tablas de rutas y gateways."
                arrow
              >
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateAdvancedVPC}
                  sx={{ borderRadius: 999, fontWeight: 700 }}
                >
                  Crear laboratorio avanzado
                </Button>
              </Tooltip>
            </>
          }
        />

        {/* Filters / toolbar panel (match PlanListPage) */}
        <Paper
          elevation={0}
          className="pt-panel"
          sx={{
            p: 2.5,
            borderRadius: 2,
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              label="Buscar"
              placeholder="Por nombre o VPC ID…"
              size="small"
              fullWidth
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="type-filter-label">Tipo</InputLabel>
              <Select
                labelId="type-filter-label"
                value={typeFilter}
                label="Tipo"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="GUIDED">Guiado</MenuItem>
                <MenuItem value="ADVANCED">Avanzado</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ minWidth: 120, display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Chip label={`${filteredVpcs.length} / ${(vpcs || []).length}`} variant="outlined" size="small" />
            </Box>
          </Stack>
        </Paper>

        <VPCsTable vpcs={filteredVpcs} onEdit={handleLinkToFlow} onDelete={openDeleteDialog} />
      </Stack>

      <CreateVPCModal
        open={isCreateVPCModalOpen}
        onClose={handleCreateVPCModalClose}
        wizardMode={wizardMode}
      />
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Eliminar laboratorio/VPC</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Vas a eliminar: <b>{vpcToDelete?.name || vpcToDelete?.id}</b>
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Esto borra el documento en Firestore. Si esta VPC ya fue desplegada en AWS,
            los recursos podrían quedar vivos.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDeleteDialog} variant="outlined">
            Cancelar
          </Button>

          <Button onClick={deleteFirestoreOnly} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

const VPCsTable = ({ vpcs, onEdit, onDelete }) => (
  <TableContainer
    component={Paper}
    elevation={0}
    sx={{
      borderRadius: 2,
      border: (theme) => `1px solid ${theme.palette.divider}`,
      backgroundColor: (theme) => theme.palette.background.paper,
    }}
  >
    <Table size="small" aria-label="vpcs table">
      <TableHead>
        <TableRow
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? theme.palette.grey[100] : theme.palette.background.paper,
          }}
        >
          <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Laboratorio / VPC</TableCell>
          <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Tipo</TableCell>
          <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Estado</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, color: "text.primary" }}>Acciones</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {(vpcs || []).map((vpc) => {
          const isWizard = vpc?.narrative === "wizard";
          const typeLabel = (isWizard ? "Guiado" : "Avanzado") + " • " + (vpc?.cloudProvider || "AWS");

          return (
            <TableRow
              key={vpc.id}
              hover
              sx={{
                transition: "background-color .15s ease",
                "&:hover": {
                  backgroundColor: (theme) =>
                    theme.palette.mode === "light" ? theme.palette.grey[50] : "rgba(255,255,255,0.04)",
                },
              }}
            >
              <TableCell sx={{ maxWidth: 520 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {vpc?.name || "Sin nombre"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  {vpc?.id}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {typeLabel}
                </Typography>
              </TableCell>

              <TableCell>
                {(() => {
                  // Derivar estado real basado en metadata del plan persistida en Firestore
                  let derivedStatus = "CREATED";

                  if (vpc?.planValidationOk === false) {
                    derivedStatus = "ERROR";
                  } else if (vpc?.planValidationOk === true) {
                    derivedStatus = "VALIDATED";
                  } else if (vpc?.planId) {
                    derivedStatus = "SYNCED";
                  }

                  let color = "default";
                  if (derivedStatus === "VALIDATED") color = "success";
                  else if (derivedStatus === "SYNCED") color = "info";
                  else if (derivedStatus === "ERROR") color = "error";
                  else if (derivedStatus === "CREATED") color = "default";

                  const statusDescriptionMap = {
                    CREATED:
                      "El laboratorio fue creado en Firestore, pero aún no se ha validado ni sincronizado con un plan de infraestructura.",
                    SYNCED:
                      "El laboratorio fue sincronizado con un plan en el backend, pero aún no se ha ejecutado una validación (Terraform plan).",
                    VALIDATED:
                      "La validación (Terraform plan) se ejecutó correctamente y la infraestructura es consistente.",
                    ERROR:
                      "La validación del plan falló. Revisa los detalles del plan para corregir la configuración.",
                  };

                  const description =
                    statusDescriptionMap[derivedStatus] ||
                    "Estado desconocido del laboratorio.";

                  return (
                    <Tooltip title={description} arrow>
                      <Chip
                        size="small"
                        label={derivedStatus}
                        color={color}
                        variant={
                          derivedStatus === "CREATED"
                            ? "outlined"
                            : "filled"
                        }
                      />
                    </Tooltip>
                  );
                })()}
              </TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <IconButton onClick={() => onEdit(vpc)} aria-label="edit" color="primary" size="small">
                    <ModeEditOutlined fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => onDelete(vpc)} aria-label="delete" color="error" size="small">
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}

        {(vpcs || []).length === 0 && (
          <TableRow>
            <TableCell colSpan={4}>
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No hay laboratorios para mostrar.
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
)


export default VPCList

import { DeleteOutline, ModeEditOutlined, ContentCopy } from "@mui/icons-material";
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext.jsx";
import { useWizard } from "@/features/networkCanvas/context/WizardContext";
import useCidrBlockVPCStore from '../store/cidrBlocksIp';
import CreateVPCModal from "./CreateVPCModal";
import { PageHeader } from '@/shared/ui/layouts/MainLayout';
import { api } from "@/infrastructure/http/api";

const useFetchLabs = (setLoadingFlow) => {
  const [vpcs, setVpcs] = useState([])

  const fetchVPCs = useCallback(async () => {
    setLoadingFlow(true)
    try {
      const response = await api.listLabs()
      setVpcs(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error fetching labs: ', error)
    } finally {
      setLoadingFlow(false)
    }
  }, [setLoadingFlow])

  useEffect(() => {
    fetchVPCs()
  }, [fetchVPCs])

  return { vpcs, fetchVPCs }
}

const VPCList = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vpcToDelete, setVpcToDelete] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [vpcToRename, setVpcToRename] = useState(null);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isCreateVPCModalOpen, setIsCreateVPCModalOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState(false)

  const navigate = useNavigate()
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { setCidrBlockVPC, setPrefixLength, setVlanName, setVlanRegion } = useCidrBlockVPCStore();

  const { vpcs, fetchVPCs } = useFetchLabs(setLoadingFlow)
  const { start, finish, setStep } = useWizard()

  const handleDuplicateVPC = async (vpc) => {
    if (!vpc?.id) return;

    try {
      setLoadingFlow(true);
      await api.createLab({
        name: `${vpc.name || "Laboratorio"} (copia)`,
        target_provider: vpc.target_provider || 'aws',
        cidr_block: vpc.cidr_block || '',
        prefix_length: vpc.prefix_length,
        region: vpc.region || '',
        narrative: vpc.narrative || 'advanced',
        lab_template: vpc.lab_template || '',
        flow: vpc.flow || {},
        metadata: vpc.metadata || {},
        intent: vpc.intent || {},
        capabilities: vpc.capabilities || [],
        provider_overrides: vpc.provider_overrides || {},
        course_id: vpc.course?.id || null,
        visibility_scope: vpc.visibility_scope || 'owner',
      });
      await fetchVPCs();
    } catch (error) {
      console.error("Error duplicating VPC:", error);
      alert("No se pudo duplicar el laboratorio.");
    } finally {
      setLoadingFlow(false);
    }
  };

  const filteredVpcs = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (vpcs || [])
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
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

  const deleteLabOnly = async () => {
    if (!vpcToDelete?.id) return;
    try {
      setLoadingFlow(true);
      await api.deleteLab(vpcToDelete.id);
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
    const wasWizard = wizardMode;
    finish();
    setWizardMode(false);

    if (cidrBlock) setCidrBlockVPC(cidrBlock);
    if (prefixLength) setPrefixLength(prefixLength);
    if (vlanName) setVlanName(vlanName);
    if (vlanRegion) setVlanRegion(vlanRegion);

    setIsCreateVPCModalOpen(false);
    setLoadingFlow(false);

    if (newVPCId) {
      const qs = wasWizard ? "?wizard=1" : "";
      navigate(`/admin/vpcs/${newVPCId}/mainflow${qs}`);
    }
  };

  const handleLinkToFlow = (vpc) => {
    setLoadingFlow(true)
    if (vpc?.cidr_block) setCidrBlockVPC(vpc.cidr_block)
    if (vpc?.prefix_length !== undefined && vpc?.prefix_length !== null) {
      setPrefixLength(vpc.prefix_length)
    }
    if (vpc?.name) setVlanName(vpc.name)
    if (vpc?.region) setVlanRegion(vpc.region)
    setLoadingFlow(false)
    const qs = vpc.narrative === "wizard" ? "?wizard=1" : "";
    navigate(`/admin/vpcs/${vpc.id}/mainflow${qs}`);
  }

  const handleCreateGuideLab = () => {
    setWizardMode(true)
    start();
    setStep("vpc-lab-type");
    setIsCreateVPCModalOpen(true);
  }

  const handleCreateLab = () => {
    setWizardMode(false)
    setIsCreateVPCModalOpen(true)
  }

  const openDeleteDialog = (vpc) => {
    setVpcToDelete(vpc);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setVpcToDelete(null);
  };

  const openRenameDialog = (vpc) => {
    setVpcToRename(vpc);
    setNewName(vpc?.name || "");
    setRenameDialogOpen(true);
  };

  const closeRenameDialog = () => {
    setRenameDialogOpen(false);
    setVpcToRename(null);
    setNewName("");
  };

  const handleRename = async () => {
    if (!vpcToRename?.id || !newName.trim()) return;
    try {
      setLoadingFlow(true);
      await api.updateLab(vpcToRename.id, { name: newName.trim() });
      await fetchVPCs();
      closeRenameDialog();
    } catch (error) {
      console.error('Error renaming lab:', error);
      alert('No se pudo renombrar el laboratorio.');
    } finally {
      setLoadingFlow(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Laboratorios"
        subtitle="Gestiona tus laboratorios y abre el canvas para editar topologías y preparar despliegues en AWS."
        actions={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateGuideLab}>
              Crear guiado
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateLab}>
              Crear laboratorio
            </Button>
          </Stack>
        }
      />

      <Paper className="pt-panel" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            label="Buscar"
            placeholder="Por nombre o id…"
            size="small"
            fullWidth
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="type-filter-label">Modo</InputLabel>
            <Select
              labelId="type-filter-label"
              value={typeFilter}
              label="Modo"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="GUIDED">Guiados</MenuItem>
              <MenuItem value="ADVANCED">Avanzados</MenuItem>
            </Select>
          </FormControl>

          <Chip label={`${filteredVpcs.length} / ${vpcs.length}`} variant="outlined" size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Laboratorio</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Curso</TableCell>
              <TableCell>Visibilidad</TableCell>
              <TableCell>Actualizado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVpcs.map((vpc) => (
              <TableRow key={vpc.id} hover>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{vpc.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{vpc.id}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{String(vpc.target_provider || 'aws').toUpperCase()}</TableCell>
                <TableCell>{vpc.course?.name || '-'}</TableCell>
                <TableCell>{vpc.visibility_scope || '-'}</TableCell>
                <TableCell>{new Date(vpc.updated_at || vpc.created_at || Date.now()).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Abrir laboratorio">
                      <Button size="small" variant="outlined" onClick={() => handleLinkToFlow(vpc)}>
                        Abrir
                      </Button>
                    </Tooltip>
                    <Tooltip title="Renombrar">
                      <IconButton onClick={() => openRenameDialog(vpc)} color="primary">
                        <ModeEditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicar">
                      <IconButton onClick={() => handleDuplicateVPC(vpc)} color="primary">
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => openDeleteDialog(vpc)} color="error">
                        <DeleteOutline />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Eliminar laboratorio</DialogTitle>
        <DialogContent>
          ¿Seguro que quieres eliminar <b>{vpcToDelete?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancelar</Button>
          <Button color="error" onClick={deleteLabOnly}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameDialogOpen} onClose={closeRenameDialog}>
        <DialogTitle>Renombrar laboratorio</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nuevo nombre"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog}>Cancelar</Button>
          <Button onClick={handleRename}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <CreateVPCModal open={isCreateVPCModalOpen} onClose={handleCreateVPCModalClose} wizardMode={wizardMode} />
    </Box>
  )
}

export default VPCList

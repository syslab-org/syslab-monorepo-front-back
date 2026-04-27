import { DeleteOutline, ModeEditOutlined, ContentCopy, MoreVert, OpenInNewOutlined } from "@mui/icons-material";
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
  ListItemIcon,
  ListItemText,
  Menu,
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
import TourLauncherButton from "@/shared/ui/onboarding/TourLauncherButton";
import useOnboardingTour from "@/shared/ui/onboarding/useOnboardingTour";
import { useCanvasLabStore } from '../store/canvasLabStore';
import CreateLabModal from "./CreateLabModal";
import { PageHeader } from '@/shared/ui/layouts/MainLayout';
import { api } from "@/infrastructure/http/api";

const parseAndValidateCidr = (raw) => {
  const value = String(raw || "").trim();
  if (!value.includes("/")) {
    return { ok: false, message: "Usa formato CIDR, ej: 10.0.0.0/16" };
  }
  const [base, prefixStr] = value.split("/");
  const prefix = Number(prefixStr);

  if (Number.isNaN(prefix) || prefix < 8 || prefix > 30) {
    return { ok: false, message: "Prefijo invalido (esperado /8 a /30)" };
  }

  return { ok: true, base: base.trim(), prefix };
};

const executionSourceLabels = {
  lab_explicit: 'Fijada en el lab',
  owner_personal_auto: 'Auto -> cuenta personal',
  course_shared_auto: 'Auto -> cuenta del curso',
  unresolved: 'Sin resolver',
};

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

const LabsPage = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vpcToDelete, setVpcToDelete] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [vpcToRename, setVpcToRename] = useState(null);
  const [newName, setNewName] = useState("");
  const [editCidr, setEditCidr] = useState("");
  const [editRegion, setEditRegion] = useState("us-east-1");
  const [editCloudConnectionId, setEditCloudConnectionId] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isCreateLabModalOpen, setIsCreateLabModalOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState(false)
  const [cloudConnections, setCloudConnections] = useState([])
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const [selectedLab, setSelectedLab] = useState(null);

  const navigate = useNavigate()
  const { setLoadingFlow } = useContext(LoadingFlowContext)
  const { setMasterCidrBlock, setPrefixLength, setLabName, setLabRegion } = useCanvasLabStore();
  const { startTourIfNeeded, restartTour } = useOnboardingTour();

  const { vpcs, fetchVPCs } = useFetchLabs(setLoadingFlow)
  const { start, finish, setStep } = useWizard()

  useEffect(() => {
    startTourIfNeeded("labs-overview");
  }, [startTourIfNeeded]);

  useEffect(() => {
    let alive = true;
    const loadConnections = async () => {
      try {
        const response = await api.listCloudConnections({ provider: 'aws' });
        if (alive) setCloudConnections(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Error loading cloud connections:', error);
      }
    };
    loadConnections();
    return () => {
      alive = false;
    };
  }, []);

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
        cloud_connection_id: vpc.cloud_connection?.id || null,
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
        const owner = (v?.owner_user?.display_name || v?.owner_user?.email || "").toLowerCase();
        const course = (v?.course?.name || "").toLowerCase();
        return name.includes(q) || id.includes(q) || owner.includes(q) || course.includes(q);
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

  const handleCreateLabModalClose = (newVPCId, cidrBlock, prefixLength, vlanName, vlanRegion) => {
    const wasWizard = wizardMode;
    finish();
    setWizardMode(false);

    if (cidrBlock) setMasterCidrBlock(cidrBlock);
    if (prefixLength) setPrefixLength(prefixLength);
    if (vlanName) setLabName(vlanName);
    if (vlanRegion) setLabRegion(vlanRegion);

    setIsCreateLabModalOpen(false);
    setLoadingFlow(false);

    if (newVPCId) {
      const qs = wasWizard ? "?wizard=1" : "";
      navigate(`/admin/labs/${newVPCId}/canvas${qs}`);
    }
  };

  const handleLinkToFlow = (vpc) => {
    setLoadingFlow(true)
    if (vpc?.cidr_block) setMasterCidrBlock(vpc.cidr_block)
    if (vpc?.prefix_length !== undefined && vpc?.prefix_length !== null) {
      setPrefixLength(vpc.prefix_length)
    }
    if (vpc?.name) setLabName(vpc.name)
    if (vpc?.region) setLabRegion(vpc.region)
    setLoadingFlow(false)
    const qs = vpc.narrative === "wizard" ? "?wizard=1" : "";
    navigate(`/admin/labs/${vpc.id}/canvas${qs}`);
  }

  const handleCreateGuideLab = () => {
    setWizardMode(true)
    start();
    setStep("vpc-lab-type");
    setIsCreateLabModalOpen(true);
  }

  const handleCreateLab = () => {
    setWizardMode(false)
    setIsCreateLabModalOpen(true)
  }

  const openDeleteDialog = (vpc) => {
    setVpcToDelete(vpc);
    setDeleteDialogOpen(true);
  };

  const openActionsMenu = (event, vpc) => {
    setActionsAnchorEl(event.currentTarget);
    setSelectedLab(vpc);
  };

  const closeActionsMenu = () => {
    setActionsAnchorEl(null);
    setSelectedLab(null);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setVpcToDelete(null);
  };

  const openRenameDialog = (vpc) => {
    setVpcToRename(vpc);
    setNewName(vpc?.name || "");
    setEditCidr(
      vpc?.cidr_block && vpc?.prefix_length !== undefined && vpc?.prefix_length !== null
        ? `${vpc.cidr_block}/${vpc.prefix_length}`
        : ""
    );
    setEditRegion(vpc?.region || "us-east-1");
    setEditCloudConnectionId(vpc?.cloud_connection?.id || "");
    setRenameDialogOpen(true);
  };

  const closeRenameDialog = () => {
    setRenameDialogOpen(false);
    setVpcToRename(null);
    setNewName("");
    setEditCidr("");
    setEditRegion("us-east-1");
    setEditCloudConnectionId("");
  };

  const handleRename = async () => {
    if (!vpcToRename?.id || !newName.trim()) return;
    const cidrCheck = parseAndValidateCidr(editCidr);
    if (!cidrCheck.ok) {
      alert(cidrCheck.message);
      return;
    }
    try {
      setLoadingFlow(true);
      await api.updateLab(vpcToRename.id, {
        name: newName.trim(),
        cidr_block: cidrCheck.base,
        prefix_length: cidrCheck.prefix,
        region: editRegion,
        cloud_connection_id: editCloudConnectionId || null,
      });
      await fetchVPCs();
      closeRenameDialog();
    } catch (error) {
      console.error('Error updating lab:', error);
      alert('No se pudo actualizar el laboratorio.');
    } finally {
      setLoadingFlow(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box data-tour="labs-page-header">
        <PageHeader
          title="Laboratorios"
          subtitle="Gestiona tus laboratorios y abre el canvas para editar topologías, validar intención y preparar despliegues."
          actions={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateGuideLab}
                data-tour="labs-create-guided-button"
              >
                Crear guiado
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateLab}
                data-tour="labs-create-lab-button"
              >
                Crear laboratorio
              </Button>
            </Stack>
          }
        />
      </Box>

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

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: 2, overflowX: 'auto' }}
        data-tour="labs-list-table"
      >
        <Table
          size="small"
          sx={{
            minWidth: 920,
            tableLayout: 'fixed',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Laboratorio</TableCell>
              <TableCell>Pertenencia</TableCell>
              <TableCell>Ejecución</TableCell>
              <TableCell>Actualizado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVpcs.map((vpc) => (
              <TableRow key={vpc.id} hover>
                <TableCell sx={{ width: '26%' }}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{vpc.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{vpc.id}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip
                        label={String(vpc.target_provider || 'aws').toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                      {vpc.narrative === 'wizard' && (
                        <Chip label="Guiado" size="small" color="primary" variant="outlined" />
                      )}
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell sx={{ width: '22%' }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {vpc.owner_user?.display_name || vpc.owner_user?.email || 'Sin owner'}
                    </Typography>
                    {vpc.owner_user?.email && (
                      <Typography variant="caption" color="text.secondary">
                        {vpc.owner_user.email}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Curso: {vpc.course?.name || 'Sin curso'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visibilidad: {vpc.visibility_scope || '-'}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ width: '24%' }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {vpc.resolved_execution_target?.name || vpc.cloud_connection?.name || 'Sin conexión resuelta'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {executionSourceLabels[vpc.resolved_execution_target?.source] || 'Auto'}
                    </Typography>
                    {vpc.resolved_execution_target?.account_id && (
                      <Typography variant="caption" color="text.secondary">
                        Cuenta AWS: {vpc.resolved_execution_target.account_id}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ width: '14%' }}>
                  {new Date(vpc.updated_at || vpc.created_at || Date.now()).toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ width: '14%' }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Abrir laboratorio">
                      <IconButton onClick={() => handleLinkToFlow(vpc)} color="primary">
                        <OpenInNewOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Acciones del laboratorio">
                      <IconButton onClick={(event) => openActionsMenu(event, vpc)} color="primary">
                        <MoreVert />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl)}
        onClose={closeActionsMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (!selectedLab) return;
            openRenameDialog(selectedLab);
            closeActionsMenu();
          }}
        >
          <ListItemIcon>
            <ModeEditOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (!selectedLab) return;
            const lab = selectedLab;
            closeActionsMenu();
            await handleDuplicateVPC(lab);
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!selectedLab) return;
            openDeleteDialog(selectedLab);
            closeActionsMenu();
          }}
        >
          <ListItemIcon>
            <DeleteOutline fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

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
        <DialogTitle>Editar laboratorio</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="CIDR padre"
            fullWidth
            value={editCidr}
            onChange={(e) => setEditCidr(e.target.value)}
            placeholder="10.64.0.0/12"
            helperText="Formato CIDR. Este es el rango padre del laboratorio."
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-region-label">Región</InputLabel>
            <Select
              labelId="edit-region-label"
              value={editRegion}
              label="Región"
              onChange={(e) => setEditRegion(e.target.value)}
            >
              <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
              <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
              <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-connection-label">Conexión cloud</InputLabel>
            <Select
              labelId="edit-connection-label"
              value={editCloudConnectionId}
              label="Conexión cloud"
              onChange={(e) => setEditCloudConnectionId(e.target.value)}
            >
              <MenuItem value="">Auto-seleccionar por owner/curso</MenuItem>
              {cloudConnections.map((connection) => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name} · {connection.scope === 'course_shared' ? 'curso' : 'personal'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog}>Cancelar</Button>
          <Button onClick={handleRename}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <CreateLabModal open={isCreateLabModalOpen} onClose={handleCreateLabModalClose} wizardMode={wizardMode} />
      <TourLauncherButton
        onClick={() => restartTour("labs-overview")}
        label="Ver tour de laboratorios"
      />
    </Box>
  )
}

export default LabsPage

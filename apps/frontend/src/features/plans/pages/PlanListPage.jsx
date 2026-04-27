// apps/frontend/src/features/plans/pages/PlanListPage.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';

import { api } from '@/infrastructure/http/api';
import TourLauncherButton from '@/shared/ui/onboarding/TourLauncherButton';
import useOnboardingTour from '@/shared/ui/onboarding/useOnboardingTour';
import { PageHeader } from '@/shared/ui/layouts/MainLayout';

const statusChipColor = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'SUCCESS':
      return 'success';
    case 'RUNNING':
      return 'info';
    case 'PENDING':
      return 'default';
    case 'FAILURE':
      return 'error';
    default:
      return 'default';
  }
};

const lifecycleMeta = (p) => {
  const simulate = !!p?.simulate_only;
  const last = (p?.last_action || '').toLowerCase();
  const applied = !!p?.applied;

  // PREVIEW: nunca tocó AWS
  if (simulate) return { label: 'PREVIEW', color: 'warning', variant: 'filled' };

  // DESTROYED: se aplicó en algún momento, pero el último action fue destroy
  if (last === 'destroy') return { label: 'DESTROYED', color: 'default', variant: 'outlined' };

  // ACTIVE: aplicado real y no destruido
  if (applied) return { label: 'ACTIVE', color: 'primary', variant: 'filled' };

  // CREATED: existe el plan, pero no hay evidencia de apply real
  return { label: 'CREATED', color: 'default', variant: 'filled' };
};

const modeMeta = (p) =>
  p?.simulate_only
    ? { label: 'SIMULATED', color: 'warning', variant: 'outlined' }
    : { label: 'REAL', color: 'success', variant: 'outlined' };

const formatDateTime = (iso) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function PlanListPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();
  const { startTourIfNeeded, restartTour } = useOnboardingTour();

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.listPlans();
      const list = Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
      setItems(list);
    } catch (e) {
      setErr(e?.message || 'Error cargando planes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTourIfNeeded('plans-list-overview');
  }, [startTourIfNeeded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || [])
      .filter((p) => (statusFilter === 'ALL' ? true : (p.status || '').toUpperCase() === statusFilter))
      .filter((p) => {
        if (!q) return true;
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        const canvasId = (p.canvas_id || '').toLowerCase();
        const labName = (p.lab?.name || '').toLowerCase();
        const owner = (
          p.owner_user?.display_name ||
          p.owner_user?.email ||
          p.lab?.owner_user?.display_name ||
          p.lab?.owner_user?.email ||
          ''
        ).toLowerCase();
        const course = (p.course?.name || p.lab?.course?.name || '').toLowerCase();
        return (
          name.includes(q) ||
          id.includes(q) ||
          canvasId.includes(q) ||
          labName.includes(q) ||
          owner.includes(q) ||
          course.includes(q)
        );
      });
  }, [items, query, statusFilter]);

  const handleDestroy = async (plan) => {
    if (!plan?.can_destroy) return;

    const label = plan?.name || plan?.id;
    const ok = window.confirm(
      `¿Destruir "${label}"? Esto eliminará recursos en AWS asociados a este plan.\n\nSugerencia: valida primero los Outputs.`
    );
    if (!ok) return;

    try {
      setLoading(true);
      setErr(null);
      await api.destroyPlan(plan.id);
      await load();
    } catch (e) {
      setErr(e?.message || 'Error al destruir el plan');
    } finally {
      setLoading(false);
    }
  };

  const openActionsMenu = (event, plan) => {
    setActionsAnchorEl(event.currentTarget);
    setSelectedPlan(plan);
  };

  const closeActionsMenu = () => {
    setActionsAnchorEl(null);
    setSelectedPlan(null);
  };

  return (
    <Box
      sx={{
        p: 3,
      }}
    >
      <Box data-tour="plans-list-header">
        <PageHeader
          title="Ejecuciones de infraestructura"
          subtitle={
            <>
              Lista de ejecuciones (simulación y reales). Usa{" "}
              <Box component="span" sx={{ fontFamily: "monospace" }}>
                Outputs
              </Box>{" "}
              para depurar sin ir a la consola de AWS.
            </>
          }
          actions={
            <Button variant="outlined" onClick={load} disabled={loading}>
              {loading ? "Actualizando…" : "Refrescar"}
            </Button>
          }
        />
      </Box>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Paper
        data-tour="plans-list-filters"
        elevation={0}
        className="pt-panel"
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            label="Buscar"
            placeholder="Por nombre o plan_id…"
            size="small"
            fullWidth
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="status-filter-label">Estado</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="PENDING">PENDING</MenuItem>
              <MenuItem value="RUNNING">RUNNING</MenuItem>
              <MenuItem value="SUCCESS">SUCCESS</MenuItem>
              <MenuItem value="FAILURE">FAILURE</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ minWidth: 120, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Chip
              label={`${filtered.length} / ${items.length}`}
              variant="outlined"
              size="small"
            />
          </Box>
        </Stack>
      </Paper>

      <TableContainer
        data-tour="plans-list-table"
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          overflowX: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.background.paper
              : theme.palette.background.paper,
        }}
      >
        <Table
          size="small"
          sx={{
            minWidth: 980,
            tableLayout: 'fixed',
          }}
        >
          <TableHead>
            <TableRow
              sx={(theme) => ({
                backgroundColor: "transparent",
                borderBottom: `1px solid ${theme.palette.divider}`,
              })}
            >
              <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Pertenece a</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Actualizado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "text.primary" }}>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    No hay planes para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              filtered.map((p) => {
                const lifecycle = lifecycleMeta(p);
                const mode = modeMeta(p);

                return (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{
                      transition: "all .15s ease",
                      "&:hover": {
                        backgroundColor: (theme) =>
                          theme.palette.mode === "light"
                            ? theme.palette.grey[50]
                            : "rgba(255,255,255,0.04)",
                        transform: "translateY(-1px)",
                        boxShadow: (theme) =>
                          theme.palette.mode === "light"
                            ? "0 4px 10px rgba(0,0,0,0.04)"
                            : "0 4px 12px rgba(0,0,0,0.4)",
                      },
                    }}
                  >
                    <TableCell sx={{ width: '30%' }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {p.name || 'Sin nombre'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {p.id}
                      </Typography>
                      {p.canvas_id && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', fontFamily: 'monospace' }}
                        >
                          canvas: {p.canvas_id}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ width: '24%' }}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>
                          {p.owner_user?.display_name || p.owner_user?.email || p.lab?.owner_user?.display_name || p.lab?.owner_user?.email || 'Owner no disponible'}
                        </Typography>
                        {(p.owner_user?.email || p.lab?.owner_user?.email) && (
                          <Typography variant="caption" color="text.secondary">
                            {p.owner_user?.email || p.lab?.owner_user?.email}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Lab: {p.lab?.name || 'Sin laboratorio'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Curso: {p.course?.name || p.lab?.course?.name || 'Sin curso'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ width: '22%' }}>
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                          <Tooltip title="Resultado del job de Terraform">
                            <Chip
                              label={p.status}
                              size="small"
                              color={statusChipColor(p.status)}
                              variant="filled"
                            />
                          </Tooltip>
                          <Tooltip title="Estado lógico actual del plan">
                            <Chip
                              label={lifecycle.label}
                              size="small"
                              color={lifecycle.color}
                              variant={lifecycle.variant}
                            />
                          </Tooltip>
                          <Tooltip title="Simulada (plan) o ejecución real en AWS">
                            <Chip
                              label={mode.label}
                              size="small"
                              color={mode.color}
                              variant={mode.variant}
                            />
                          </Tooltip>
                        </Stack>

                        {p.last_action && (
                          <Typography variant="caption" color="text.secondary">
                            Última acción: {p.last_action}
                          </Typography>
                        )}
                        {p.lab?.visibility_scope && (
                          <Typography variant="caption" color="text.secondary">
                            Visibilidad: {p.lab.visibility_scope}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ width: '12%' }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(p.updated_at || p.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right" sx={{ width: '12%' }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/admin/plans/${p.id}`)}
                            aria-label={`Ver detalle de ${p.name || p.id}`}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Acciones">
                          <IconButton
                            size="small"
                            onClick={(event) => openActionsMenu(event, p)}
                            aria-label={`Acciones para ${p.name || p.id}`}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            if (!selectedPlan) return;
            navigate(`/admin/plans/${selectedPlan.id}/outputs`);
            closeActionsMenu();
          }}
        >
          <ListItemIcon>
            <DataObjectOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Outputs</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={!selectedPlan?.can_destroy || loading}
          onClick={async () => {
            if (!selectedPlan?.can_destroy || loading) return;
            const plan = selectedPlan;
            closeActionsMenu();
            await handleDestroy(plan);
          }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color={selectedPlan?.can_destroy ? 'error' : 'disabled'} />
          </ListItemIcon>
          <ListItemText>Destroy</ListItemText>
        </MenuItem>
      </Menu>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary">
        Nota: el botón <Box component="span" sx={{ fontFamily: 'monospace' }}>Destroy</Box> se habilita solo cuando el plan es destruible, pero el backend vuelve a validar la regla.
      </Typography>
      <TourLauncherButton
        onClick={() => restartTour('plans-list-overview')}
        label="Ver tour de planes"
      />
    </Box>
  );
}

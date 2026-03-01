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

import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';

import { api } from '../../lib/api';
import { PageHeader } from "../../components/layout/MainLayout.jsx";

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || [])
      .filter((p) => (statusFilter === 'ALL' ? true : (p.status || '').toUpperCase() === statusFilter))
      .filter((p) => {
        if (!q) return true;
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return name.includes(q) || id.includes(q);
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

  return (
    <Box
      sx={{
        p: 3,
      }}
    >
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

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Paper
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
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.background.paper
              : theme.palette.background.paper,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={(theme) => ({
                backgroundColor: "transparent",
                borderBottom: `1px solid ${theme.palette.divider}`,
              })}
            >
              <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Plan</TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  whiteSpace: "nowrap",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <SettingsSuggestIcon fontSize="small" sx={{ opacity: 0.6 }} />
                  <span>Resultado ejecución</span>
                </Stack>
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  whiteSpace: "nowrap",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Inventory2OutlinedIcon fontSize="small" sx={{ opacity: 0.6 }} />
                  <span>Estado del plan</span>
                </Stack>
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  whiteSpace: "nowrap",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <PublicOutlinedIcon fontSize="small" sx={{ opacity: 0.6 }} />
                  <span>Tipo de ejecución</span>
                </Stack>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Actualizado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "text.primary" }}>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
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
                    <TableCell sx={{ maxWidth: 420 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {p.name || 'Sin nombre'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {p.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Tooltip title="Resultado del job de Terraform">
                          <Chip
                            label={p.status}
                            size="small"
                            color={statusChipColor(p.status)}
                            variant="filled"
                          />
                        </Tooltip>

                        {p.last_action && (
                          <Typography variant="caption" color="text.secondary">
                            last: {p.last_action}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Tooltip title="Estado lógico actual del plan">
                        <Chip
                          label={lifecycle.label}
                          size="small"
                          color={lifecycle.color}
                          variant={lifecycle.variant}
                        />
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Tooltip title="Simulada (plan) o ejecución real en AWS">
                        <Chip
                          label={mode.label}
                          size="small"
                          color={mode.color}
                          variant={mode.variant}
                        />
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(p.updated_at || p.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          href={`/admin/plans/${p.id}`}
                        >
                          Ver
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          href={`/admin/plans/${p.id}/outputs`}
                        >
                          Outputs
                        </Button>

                        <Tooltip
                          title={
                            p.can_destroy
                              ? 'Destruir infraestructura de este plan'
                              : 'Solo se puede destruir si status=SUCCESS, applied=true, simulate_only=false y last_action!=destroy'
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              disabled={!p.can_destroy || loading}
                              onClick={() => handleDestroy(p)}
                            >
                              Destroy
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary">
        Nota: el botón <Box component="span" sx={{ fontFamily: 'monospace' }}>Destroy</Box> se habilita solo cuando el plan es destruible, pero el backend vuelve a validar la regla.
      </Typography>
    </Box>
  );
}

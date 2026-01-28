// apps/frontend/src/pages/Plans/PlanDetailPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

import { TASK_STATE_PENDING, TASK_STATE_RUNNING } from '../../constants';
import { api } from '../../lib/api';

const POLL_MS = 2000;

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function computeLifecycle(plan) {
  const status = plan?.status;
  const lastAction = plan?.last_action || plan?.lastAction || '';
  const applied = Boolean(plan?.applied);
  const simulateOnly = Boolean(plan?.payload?.simulate_only ?? plan?.payload?.simulateOnly ?? true);

  // 1) Preview gana siempre si es simulate_only (no hay infraestructura real)
  if (simulateOnly) {
    return {
      key: 'PREVIEW',
      label: 'PREVIEW',
      helper: 'Simulado: nunca se aplicó en AWS.',
      chip: { variant: 'outlined', color: 'info' },
      allowDestroy: false,
    };
  }

  // 2) Si el último action fue destroy, está destruido
  if (String(lastAction).toLowerCase() === 'destroy') {
    return {
      key: 'DESTROYED',
      label: 'DESTROYED',
      helper: 'Infraestructura eliminada en AWS.',
      chip: { variant: 'outlined', color: 'default' },
      allowDestroy: false,
    };
  }

  // 3) Si está aplicado y SUCCESS, lo consideramos activo
  if (applied && status === 'SUCCESS') {
    return {
      key: 'ACTIVE',
      label: 'ACTIVE',
      helper: 'Infraestructura activa en AWS.',
      chip: { variant: 'filled', color: 'success' },
      allowDestroy: true,
    };
  }

  // 4) Caso base: existe plan real pero no aplicado
  return {
    key: 'NOT_APPLIED',
    label: 'NOT APPLIED',
    helper: 'Plan real aún no aplicado.',
    chip: { variant: 'outlined', color: 'warning' },
    allowDestroy: false,
  };
}

function statusChipProps(status) {
  switch (status) {
    case 'SUCCESS':
      return { label: 'SUCCESS', color: 'success', variant: 'filled' };
    case 'FAILURE':
      return { label: 'FAILURE', color: 'error', variant: 'filled' };
    case 'RUNNING':
      return { label: 'RUNNING', color: 'info', variant: 'filled' };
    case 'PENDING':
      return { label: 'PENDING', color: 'warning', variant: 'filled' };
    default:
      return { label: status || '—', color: 'default', variant: 'outlined' };
  }
}

export default function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [deploying, setDeploying] = useState(false);
  const [destroying, setDestroying] = useState(false);

  const [applyMode, setApplyMode] = useState(false); // false=PLAN preview, true=APPLY real

  const [tab, setTab] = useState('summary');

  const [outputsResponse, setOutputsResponse] = useState(null); // { plan_id, applied, status, outputs }
  const [outputsLoading, setOutputsLoading] = useState(false);

  const [logText, setLogText] = useState(null);
  const [lastDestroyTaskId, setLastDestroyTaskId] = useState(null);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const timerRef = useRef(null);

  const isRunning = plan?.status === TASK_STATE_RUNNING || plan?.status === TASK_STATE_PENDING;
  const isTerminal = plan?.status === 'SUCCESS' || plan?.status === 'FAILURE';

  const lifecycle = useMemo(() => computeLifecycle(plan), [plan]);

  const busy = deploying || destroying;

  // Deploy permitido cuando el plan NO está corriendo
  const canDeploy = !isRunning;

  // Destroy permitido cuando está ACTIVE + SUCCESS (regla backend), y no está corriendo
  const canDestroy = !isRunning && lifecycle.allowDestroy && plan?.status === 'SUCCESS';

  async function fetchPlan({ resetLoading = false } = {}) {
    if (!id) return;
    if (resetLoading) setLoading(true);
    try {
      const data = await api.getPlan(id);
      setPlan(data);
      setLoading(false);

      // Poll solo si está corriendo
      if (data?.status === TASK_STATE_RUNNING || data?.status === TASK_STATE_PENDING) {
        timerRef.current = setTimeout(() => fetchPlan(), POLL_MS);
      }
    } catch (e) {
      setLoading(false);
      setErr(`Error cargando plan: ${e?.message || String(e)}`);
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  async function fetchOutputs() {
    if (!id) return;
    setOutputsLoading(true);
    setErr(null);

    try {
      // Usamos el helper centralizado para evitar inconsistencias de baseURL y parsing.
      const json = await api.getPlanOutputs(id);
      // El backend responde: { plan_id, applied, status, outputs }
      setOutputsResponse(json || null);
    } catch (e) {
      // Axios-style errors: e.response?.data suele traer {error, detail, ...}
      const backendMsg = e?.response?.data?.error || e?.response?.data?.detail;
      const msg = backendMsg || e?.message || String(e);
      setErr(`No pude cargar outputs: ${msg}`);
      // eslint-disable-next-line no-console
      console.error('getPlanOutputs failed', e?.response?.status, e?.response?.data, e);
    } finally {
      setOutputsLoading(false);
    }
  }

  async function fetchTaskLog(taskId) {
    if (!taskId) return;
    try {
      const ts = await api.taskStatus(taskId);
      const log = ts?.result?.log || ts?.result?.error || ts?.error || '(sin log)';
      setLogText(log);
    } catch (e) {
      setLogText(`No se pudo leer el log: ${String(e)}`);
    }
  }

  useEffect(() => {
    fetchPlan({ resetLoading: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeploy = async () => {
    setDeploying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);
    try {
      // backend espera simulate_only; api.deployPlan en tu proyecto ya hace el mapeo.
      const res = await api.deployPlan(id, { applyMode });
      setMsg(
        `Deploy ${applyMode ? 'APPLY' : 'PLAN'} iniciado. task_id=${res?.task_id || '—'} (actualizando estado…)`
      );
      await fetchPlan();
      // Si estamos en tab logs, auto-carga el log
      if (res?.task_id && tab === 'logs') {
        await fetchTaskLog(res.task_id);
      }
    } catch (e) {
      setErr(`Fallo al iniciar deploy: ${e?.message || String(e)}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleDestroy = async () => {
    if (!canDestroy) return;
    if (
      !window.confirm(
        'Esto destruirá los recursos en AWS asociados a ESTE plan.\n\n¿Continuar?'
      )
    ) {
      return;
    }

    setDestroying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);

    try {
      const res = await api.destroyPlan(id);
      const tid = res?.task_id;
      setLastDestroyTaskId(tid || null);
      setMsg(
        `Destroy encolado${tid ? ` (task_id=${tid})` : ''}. Revisa Logs para ver el progreso.`
      );
      await fetchPlan();
      if (tid && tab === 'logs') {
        await fetchTaskLog(tid);
      }
    } catch (e) {
      setErr(`Fallo al iniciar destroy: ${e?.message || String(e)}`);
    } finally {
      setDestroying(false);
    }
  };

  const header = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {plan?.name || 'Plan'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ID: <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{id}</Box>
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
        <Chip size="small" {...statusChipProps(plan?.status)} />
        <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />

        <Chip
          size="small"
          label={Boolean(plan?.payload?.simulate_only ?? plan?.payload?.simulateOnly ?? true) ? 'PREVIEW' : 'REAL'}
          variant="outlined"
          color={Boolean(plan?.payload?.simulate_only ?? plan?.payload?.simulateOnly ?? true) ? 'info' : 'success'}
        />

        <Button variant="outlined" onClick={() => navigate('/admin/plans')}>
          Volver
        </Button>
      </Stack>
    </Stack>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Cargando plan…</Typography>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!plan) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="warning">Plan no encontrado.</Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/plans')}>
              Volver
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          {header}

          <Divider sx={{ my: 2 }} />

          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          {msg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {msg}
            </Alert>
          )}
          {plan?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {plan.error}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Actualizado: <b>{formatDateTime(plan?.updated_at)}</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Última acción: <b>{plan?.last_action || plan?.lastAction || '—'}</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                task_id: <b>{plan?.task_id || '—'}</b>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {lifecycle.helper}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={applyMode}
                    onChange={(e) => setApplyMode(e.target.checked)}
                    disabled={busy}
                  />
                }
                label={applyMode ? 'Modo APPLY (real)' : 'Modo PLAN (preview)'}
              />

              <Button
                variant="contained"
                onClick={handleDeploy}
                disabled={!canDeploy || busy}
              >
                {deploying ? 'Lanzando…' : applyMode ? 'Deploy (APPLY)' : 'Deploy (PLAN)'}
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleDestroy}
                disabled={!canDestroy || busy}
              >
                {destroying ? 'Destruyendo…' : 'Destroy'}
              </Button>
            </Stack>
          </Stack>

          {isRunning && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Procesando… (se actualiza automáticamente)
              </Typography>
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 0 }}>
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="summary" label="Resumen" />
            <Tab value="outputs" label="Outputs" />
            <Tab value="logs" label="Logs" />
            <Tab value="payload" label="Payload" />
          </Tabs>

          <Divider />

          {/* SUMMARY */}
          {tab === 'summary' && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Estado del plan
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip size="small" {...statusChipProps(plan?.status)} />
                <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Este detalle sirve para entender <b>qué pasó</b> (status), <b>qué existe hoy</b> (lifecycle) y
                <b> qué acciones son válidas</b> (deploy/destroy).
              </Typography>
            </Box>
          )}

          {/* OUTPUTS */}
          {tab === 'outputs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Outputs</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Útil para depurar sin ir a la consola de AWS.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={fetchOutputs}
                  disabled={outputsLoading}
                >
                  {outputsLoading ? 'Cargando…' : 'Cargar outputs'}
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!outputsResponse && (
                  <Alert severity="info">
                    Aún no se han cargado outputs. Haz clic en “Cargar outputs”.
                  </Alert>
                )}

                {outputsResponse && (
                  <>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                      <Chip size="small" label={`backend_status: ${outputsResponse?.status ?? '—'}`} variant="outlined" />
                      <Chip
                        size="small"
                        label={outputsResponse?.applied ? 'APPLIED: true' : 'APPLIED: false'}
                        color={outputsResponse?.applied ? 'success' : 'default'}
                        variant={outputsResponse?.applied ? 'filled' : 'outlined'}
                      />
                    </Stack>

                    {outputsResponse?.outputs && Object.keys(outputsResponse.outputs).length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        El backend respondió correctamente, pero no hay outputs guardados para este plan.
                      </Alert>
                    ) : null}

                    <Paper
                      variant="outlined"
                      sx={{ mt: 2, p: 2, bgcolor: 'background.default', overflow: 'auto' }}
                    >
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 12,
                        }}
                      >
                        {JSON.stringify(outputsResponse?.outputs ?? outputsResponse, null, 2)}
                      </Box>
                    </Paper>
                  </>
                )}
              </Box>
            </Box>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Logs</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Logs del último deploy o destroy (según el task_id).
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    onClick={() => fetchTaskLog(plan?.task_id)}
                    disabled={!plan?.task_id}
                  >
                    Ver log (deploy)
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => fetchTaskLog(lastDestroyTaskId)}
                    disabled={!lastDestroyTaskId}
                  >
                    Ver log (destroy)
                  </Button>
                </Stack>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!logText && (
                  <Alert severity="info">
                    Selecciona “Ver log” para cargar el texto del log.
                  </Alert>
                )}

                {logText && (
                  <Paper
                    variant="outlined"
                    sx={{ mt: 2, p: 2, bgcolor: 'background.default', overflow: 'auto' }}
                  >
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 12,
                      }}
                    >
                      {logText}
                    </Box>
                  </Paper>
                )}
              </Box>
            </Box>
          )}

          {/* PAYLOAD */}
          {tab === 'payload' && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Payload
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, bgcolor: 'background.default', overflow: 'auto' }}
              >
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(plan, null, 2)}
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

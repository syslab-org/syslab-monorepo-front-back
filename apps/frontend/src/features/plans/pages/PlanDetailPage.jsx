// apps/frontend/src/features/plans/pages/PlanDetailPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { TASK_STATE_PENDING, TASK_STATE_RUNNING } from '@/shared/constants';
import { api } from '@/infrastructure/http/api';

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
  const lastAction = String(plan?.last_action || plan?.lastAction || '').toLowerCase();
  const applied = plan?.applied === true;

  const simulateOnly = Boolean(
    plan?.simulate_only ??
    plan?.simulateOnly ??
    plan?.payload?.simulate_only ??
    plan?.payload?.simulateOnly ??
    false
  );

  const isDestroyed = lastAction === 'destroy';
  const hasRealInfra = applied && !isDestroyed;
  const failedRealApply =
    status === 'FAILURE' &&
    lastAction === 'apply' &&
    !simulateOnly &&
    !applied;
  const isRunning = status === TASK_STATE_RUNNING || status === TASK_STATE_PENDING;

  if (isRunning && lastAction === 'destroy') {
    return {
      key: 'DESTROYING',
      label: 'DESTROYING',
      helper: 'Destroy en ejecución: eliminando infraestructura en AWS.',
      chip: { variant: 'filled', color: 'warning' },
      allowDestroy: false,
    };
  }

  if (isRunning && lastAction === 'apply') {
    return {
      key: 'DEPLOYING',
      label: 'DEPLOYING',
      helper: 'Deploy en ejecución: aplicando cambios en AWS.',
      chip: { variant: 'filled', color: 'info' },
      allowDestroy: false,
    };
  }

  // 1️⃣ ACTIVE (infra real viva)
  if (hasRealInfra) {
    return {
      key: 'ACTIVE',
      label: 'ACTIVE',
      helper: 'Infraestructura activa en AWS.',
      chip: { variant: 'filled', color: 'success' },
      allowDestroy: true,
    };
  }

  // 2️⃣ DESTROYED
  if (isDestroyed) {
    return {
      key: 'DESTROYED',
      label: 'DESTROYED',
      helper: 'Infraestructura eliminada en AWS.',
      chip: { variant: 'outlined', color: 'default' },
      allowDestroy: false,
    };
  }

  // 3️⃣ PREVIEW (solo si NO hay infra real)
  if (simulateOnly) {
    return {
      key: 'PREVIEW',
      label: 'PREVIEW',
      helper: 'Simulado: nunca se aplicó en AWS.',
      chip: { variant: 'outlined', color: 'info' },
      allowDestroy: false,
    };
  }

  // 4️⃣ FAILED REAL APPLY (puede haber recursos parciales)
  if (failedRealApply) {
    return {
      key: 'FAILED_REAL_APPLY',
      label: 'RECOVERY',
      helper: 'El apply real falló. Puede haber recursos parciales en AWS: ejecuta Destroy antes de reintentar.',
      chip: { variant: 'outlined', color: 'error' },
      allowDestroy: true,
    };
  }

  // 5️⃣ NOT APPLIED
  return {
    key: 'NOT_APPLIED',
    label: 'NOT APPLIED',
    helper:
      lastAction === 'canvas_update'
        ? 'Cambios detectados desde el canvas: listo para aplicar en AWS.'
        : 'Plan real aún no aplicado.',
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

const safeObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const splitInstanceKey = (key) => {
  const raw = String(key || '');
  const idx = raw.indexOf(':');
  if (idx === -1) return { vpcId: raw, instanceName: raw };
  return {
    vpcId: raw.slice(0, idx),
    instanceName: raw.slice(idx + 1),
  };
};

function buildInstanceCatalog(outputs) {
  const instanceIds = safeObject(outputs?.instance_ids);
  const privateIps = safeObject(outputs?.instance_private_ips);
  const publicIps = safeObject(outputs?.instance_public_ips);

  const keys = Array.from(
    new Set([
      ...Object.keys(instanceIds),
      ...Object.keys(privateIps),
      ...Object.keys(publicIps),
    ]),
  );

  const byVpc = new Map();
  keys.forEach((key) => {
    const { vpcId, instanceName } = splitInstanceKey(key);
    if (!vpcId) return;

    if (!byVpc.has(vpcId)) byVpc.set(vpcId, []);
    byVpc.get(vpcId).push({
      key,
      instanceName,
      instanceId: instanceIds[key] || null,
      privateIp: privateIps[key] || null,
      publicIp: publicIps[key] || null,
    });
  });

  byVpc.forEach((list) => {
    list.sort((a, b) => a.instanceName.localeCompare(b.instanceName));
  });

  return byVpc;
}

const pairKey = (a, b) => (a < b ? `${a}::${b}` : `${b}::${a}`);

function buildConnectivityScenarios(plan, outputsResponse) {
  const payload = safeObject(plan?.payload);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];
  const links = Array.isArray(payload?.links) ? payload.links : [];
  const outputs = safeObject(outputsResponse?.outputs);

  const vpcById = new Map(
    vpcs.map((vpc) => [
      vpc.id,
      {
        id: vpc.id,
        name: vpc.name || vpc.id,
        cidr: vpc.cidr_block || 'CIDR n/a',
      },
    ]),
  );

  const pairMap = new Map();
  const upsertPair = (aId, bId, mode, routerId) => {
    if (!aId || !bId || aId === bId) return;
    const key = pairKey(aId, bId);
    if (!pairMap.has(key)) {
      pairMap.set(key, {
        aId: aId < bId ? aId : bId,
        bId: aId < bId ? bId : aId,
        modes: new Set(),
        routers: new Set(),
      });
    }
    const item = pairMap.get(key);
    if (mode) item.modes.add(mode);
    if (routerId) item.routers.add(routerId);
  };

  links
    .filter((link) => String(link?.type || '').toLowerCase() === 'peering')
    .forEach((link) => {
      upsertPair(link.vpc_a_id, link.vpc_b_id, 'peering', link.via_router_id);
    });

  const tgwByRouter = new Map();
  links
    .filter((link) => String(link?.type || '').toLowerCase() === 'tgw-attach')
    .forEach((link) => {
      if (!link?.router_id || !link?.vpc_id) return;
      if (!tgwByRouter.has(link.router_id)) tgwByRouter.set(link.router_id, []);
      tgwByRouter.get(link.router_id).push(link.vpc_id);
    });

  tgwByRouter.forEach((routerVpcIds, routerId) => {
    const uniqueVpcIds = Array.from(new Set(routerVpcIds));
    for (let i = 0; i < uniqueVpcIds.length; i += 1) {
      for (let j = i + 1; j < uniqueVpcIds.length; j += 1) {
        upsertPair(uniqueVpcIds[i], uniqueVpcIds[j], 'tgw', routerId);
      }
    }
  });

  const instanceCatalog = buildInstanceCatalog(outputs);
  return Array.from(pairMap.values()).map((pair) => {
    const aVpc = vpcById.get(pair.aId) || { id: pair.aId, name: pair.aId, cidr: 'CIDR n/a' };
    const bVpc = vpcById.get(pair.bId) || { id: pair.bId, name: pair.bId, cidr: 'CIDR n/a' };
    const aInstances = instanceCatalog.get(pair.aId) || [];
    const bInstances = instanceCatalog.get(pair.bId) || [];
    const src = aInstances[0] || null;
    const dst = bInstances[0] || null;
    const reverseSrc = bInstances[0] || null;
    const reverseDst = aInstances[0] || null;

    const modeNames = Array.from(pair.modes);
    const modeLabel =
      modeNames.length === 0
        ? 'Sin modo'
        : modeNames.length > 1
          ? 'Mixto'
          : modeNames[0] === 'tgw'
            ? 'Transit Gateway'
            : 'Peering';

    const checks = [];
    if (src?.privateIp && dst?.privateIp) {
      checks.push({
        title: `Prueba ida (${aVpc.name} -> ${bVpc.name})`,
        command: `ping -c 4 ${dst.privateIp}`,
        context: src.publicIp
          ? `Ejecutar dentro de ${src.instanceName} (${src.publicIp})`
          : `Ejecutar dentro de ${src.instanceName} (${src.instanceId || 'sin instance_id'})`,
      });
    }
    if (reverseSrc?.privateIp && reverseDst?.privateIp) {
      checks.push({
        title: `Prueba retorno (${bVpc.name} -> ${aVpc.name})`,
        command: `ping -c 4 ${reverseDst.privateIp}`,
        context: reverseSrc.publicIp
          ? `Ejecutar dentro de ${reverseSrc.instanceName} (${reverseSrc.publicIp})`
          : `Ejecutar dentro de ${reverseSrc.instanceName} (${reverseSrc.instanceId || 'sin instance_id'})`,
      });
    }

    return {
      ...pair,
      aVpc,
      bVpc,
      modeLabel,
      routers: Array.from(pair.routers),
      src,
      dst,
      checks,
      readyForRun: checks.length >= 2,
    };
  });
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

  const [msg, setMsg] = useState(null); // { text: string, severity: 'success'|'info'|'warning'|'error' }
  const [err, setErr] = useState(null);

  const timerRef = useRef(null);
  const msgTimerRef = useRef(null);
  const prevStatusRef = useRef(null);
  const actionLockRef = useRef(false);

  const isRunning = plan?.status === TASK_STATE_RUNNING || plan?.status === TASK_STATE_PENDING;

  const lifecycle = useMemo(() => computeLifecycle(plan), [plan]);
  const connectivityScenarios = useMemo(
    () => buildConnectivityScenarios(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const hasOutputsData = Boolean(
    outputsResponse?.outputs &&
      typeof outputsResponse.outputs === 'object' &&
      Object.keys(outputsResponse.outputs).length > 0,
  );

  const busy = deploying || destroying;

  function getConflictMessage(e, fallback) {
    const payload = e?.data ?? e?.response?.data;
    const code = payload?.code;
    const taskId = payload?.task_id || payload?.taskId;

    if (code === 'PLAN_RUNNING') {
      return `${payload?.error || fallback}${taskId ? ` (task_id=${taskId})` : ''}`;
    }

    const backendMsg =
      payload?.error ||
      payload?.detail ||
      (typeof payload === 'string' ? payload : null);

    return backendMsg || fallback;
  }

  // Deploy permitido cuando el plan NO está corriendo
  const canDeploy = !isRunning;

  // Destroy permitido según regla backend (incluye apply real fallido), y no está corriendo
  const canDestroy =
    !isRunning &&
    Boolean(
      plan?.can_destroy ??
      (plan?.applied === true &&
        String(plan?.last_action || '').toLowerCase() !== 'destroy')
    );

  const fetchPlan = useCallback(
    async ({ resetLoading = false } = {}) => {
      if (!id) return;
      if (resetLoading) setLoading(true);
      try {
        const prevStatus = prevStatusRef.current;

        const data = await api.getPlan(id);
        setPlan(data);
        setLoading(false);

        const nowStatus = data?.status;
        const nowTerminal = nowStatus === 'SUCCESS' || nowStatus === 'FAILURE';
        const wasRunning = prevStatus === TASK_STATE_RUNNING || prevStatus === TASK_STATE_PENDING;

        const nowRunning = nowStatus === TASK_STATE_RUNNING || nowStatus === TASK_STATE_PENDING;

        // Si el plan está corriendo y no hay mensaje activo, muestra uno único (evita duplicados)
        if (nowRunning && !msg) {
          setMsg({
            severity: 'info',
            text: `Plan en ejecución. Espera a que termine antes de lanzar otra acción.${data?.task_id ? ` (task_id=${data.task_id})` : ''}`,
          });
        }

        // Si inició una acción y el usuario recarga la página mientras estaba RUNNING,
        // igual queremos limpiar el banner “iniciado” cuando detectemos estado terminal.
        const msgLooksLikeStarted =
          typeof msg === 'object' &&
          typeof msg?.text === 'string' &&
          msg.text.toLowerCase().includes('iniciado');

        if ((wasRunning && nowTerminal) || (msgLooksLikeStarted && nowTerminal)) {
          const terminalSeverity = nowStatus === 'SUCCESS' ? 'success' : 'error';
          setMsg({
            severity: terminalSeverity,
            text: `Terminó: ${nowStatus}${nowStatus === 'FAILURE' && data?.error ? ` — ${data.error}` : ''}`,
          });
        }

        // Actualiza el prevStatus para el próximo poll
        prevStatusRef.current = nowStatus;

        // Poll solo si está corriendo
        if (nowStatus === TASK_STATE_RUNNING || nowStatus === TASK_STATE_PENDING) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => fetchPlan(), POLL_MS);
        }
      } catch (e) {
        setLoading(false);
        setErr(`Error cargando plan: ${e?.message || String(e)}`);
        // eslint-disable-next-line no-console
        console.error(e);
      }
    },
    // OJO: incluimos `id` y `msg` porque usamos ambos para decidir si limpiar el banner.
    // No incluimos `plan` para evitar estados viejos.
    [id, msg]
  );

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

  async function fetchPlanLogs() {
    if (!id) return;
    setErr(null);

    try {
      const resp = await api.getPlanLogs(id);
      const text = resp?.log ?? '';
      setLogText(text && String(text).trim().length > 0 ? text : '(sin log guardado)');
    } catch (e) {
      // Fallback: intenta leer el log desde task_status si existe task_id
      if (plan?.task_id) {
        await fetchTaskLog(plan.task_id);
        return;
      }
      const backendMsg = e?.response?.data?.error || e?.response?.data?.detail;
      const msg = backendMsg || e?.message || String(e);
      setErr(`No pude cargar logs: ${msg}`);
    }
  }

  useEffect(() => {
    // reset de prevStatus cuando cambia el id
    prevStatusRef.current = null;
    fetchPlan({ resetLoading: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [fetchPlan, id]);

  useEffect(() => {
    if (tab !== 'logs') return;
    if (logText) return;
    // intenta cargar el log persistido automáticamente al entrar al tab
    fetchPlanLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  useEffect(() => {
    // Auto-oculta el mensaje de término (SUCCESS/FAILURE) luego de 5s.
    const isTerminalMsg =
      msg && typeof msg === 'object' && typeof msg.text === 'string' && msg.text.startsWith('Terminó:');

    if (!isTerminalMsg) return undefined;

    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 5000);

    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [msg]);

  const handleDeploy = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (busy || isRunning) {
      actionLockRef.current = false;
      return;
    }
    setDeploying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    prevStatusRef.current = plan?.status ?? null;
    try {
      // backend espera simulate_only; api.deployPlan en tu proyecto ya hace el mapeo.
      const res = await api.deployPlan(id, { applyMode });
      setMsg({
        severity: 'info',
        text: `Deploy ${applyMode ? 'APPLY' : 'PLAN'} iniciado.${res?.task_id ? ` task_id=${res.task_id}` : ''} (actualizando estado…)`,
      });
      await fetchPlan();
      // Si estamos en tab logs, auto-carga el log
      if (res?.task_id && tab === 'logs') {
        await fetchTaskLog(res.task_id);
      }
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      const payload = e?.data ?? e?.response?.data;
      // If the backend says "conflict" (already running), treat it as info and refresh status
      if (status === 409) {
        setErr(null);
        setMsg({
          severity: 'info',
          text: getConflictMessage(
            e,
            'Plan en ejecución. Espera a que termine antes de lanzar otra acción.'
          ),
        });
        await fetchPlan();
        return;
      }
      const backendMsg =
        payload?.error ||
        payload?.detail ||
        (typeof payload === 'string' ? payload : null);
      setErr(`Fallo al iniciar deploy: ${backendMsg || e?.message || String(e)}`);
    } finally {
      actionLockRef.current = false;
      setDeploying(false);
    }
  };

  const handleDestroy = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (busy || isRunning) {
      actionLockRef.current = false;
      return;
    }
    if (!canDestroy) {
      actionLockRef.current = false;
      return;
    }
    if (
      !window.confirm(
        'Esto destruirá los recursos en AWS asociados a ESTE plan.\n\n¿Continuar?'
      )
    ) {
      actionLockRef.current = false;
      return;
    }

    setDestroying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);

    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    prevStatusRef.current = plan?.status ?? null;

    try {
      const res = await api.destroyPlan(id);
      const tid = res?.task_id;
      setLastDestroyTaskId(tid || null);
      setMsg({
        severity: 'info',
        text: `Destroy encolado${tid ? ` (task_id=${tid})` : ''}. Revisa Logs para ver el progreso.`,
      });
      await fetchPlan();
      if (tid && tab === 'logs') {
        await fetchTaskLog(tid);
      }
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      const payload = e?.data ?? e?.response?.data;
      if (status === 409) {
        setErr(null);
        setMsg({
          severity: 'info',
          text: getConflictMessage(
            e,
            'Plan en ejecución. Espera a que termine antes de lanzar otra acción.'
          ),
        });
        await fetchPlan();
        return;
      }
      const backendMsg =
        payload?.error ||
        payload?.detail ||
        (typeof payload === 'string' ? payload : null);
      setErr(`Fallo al iniciar destroy: ${backendMsg || e?.message || String(e)}`);
    } finally {
      actionLockRef.current = false;
      setDestroying(false);
    }
  };

  const header = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {plan?.name || 'Plan'}
        </Typography>
        <Typography component="div" variant="body2" color="text.secondary">
          ID: <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{id}</Box>
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
        <Chip size="small" {...statusChipProps(plan?.status)} />
        <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />

        <Chip
          size="small"
          label={
            Boolean(
              plan?.simulate_only ??
              plan?.simulateOnly ??
              plan?.payload?.simulate_only ??
              plan?.payload?.simulateOnly ??
              true
            )
              ? 'PREVIEW'
              : 'REAL'
          }
          variant="outlined"
          color={
            Boolean(
              plan?.simulate_only ??
              plan?.simulateOnly ??
              plan?.payload?.simulate_only ??
              plan?.payload?.simulateOnly ??
              true
            )
              ? 'info'
              : 'success'
          }
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
            <Alert severity={typeof msg === 'string' ? 'success' : msg.severity || 'success'} sx={{ mb: 2 }}>
              {typeof msg === 'string' ? msg : msg.text}
            </Alert>
          )}
          {plan?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {plan.error}
            </Alert>
          )}
          {(String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Plan actualizado desde canvas. Hay cambios pendientes; ejecuta <b>Deploy</b> para aplicar la nueva infraestructura.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Typography component="div" variant="body2" color="text.secondary">
                Actualizado: <b>{formatDateTime(plan?.updated_at)}</b>
              </Typography>
              <Typography component="div" variant="body2" color="text.secondary">
                Última acción: <b>{plan?.last_action || plan?.lastAction || '—'}</b>
              </Typography>
              {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  El canvas cambió: la infraestructura desplegada (si existía) ya no coincide con este plan.
                </Typography>
              )}
              <Typography component="div" variant="body2" color="text.secondary">
                task_id: <b>{plan?.task_id || '—'}</b>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {lifecycle.helper}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={applyMode}
                      onChange={(e) => setApplyMode(e.target.checked)}
                      disabled={busy || isRunning}
                    />
                  }
                  label={applyMode ? 'Modo APPLY (real)' : 'Modo PLAN (preview)'}
                />

                {/* Solo mostrar Deploy si lifecycle.key !== 'ACTIVE' */}
                {lifecycle.key !== 'ACTIVE' && (
                  <Button
                    variant="contained"
                    onClick={handleDeploy}
                    disabled={!canDeploy || busy}
                  >
                    {deploying ? 'Lanzando…' : applyMode ? 'Deploy (APPLY)' : 'Deploy (PLAN)'}
                  </Button>
                )}

                {/* Mostrar Destroy siempre que backend lo permita */}
                {canDestroy && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDestroy}
                    disabled={!canDestroy || busy}
                  >
                    {destroying ? 'Destruyendo…' : 'Destroy'}
                  </Button>
                )}
              </>
            </Stack>
          </Stack>

          {isRunning && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <CircularProgress size={16} />
              <Typography component="div" variant="body2" color="text.secondary">
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
            <Tab value="tests" label="Pruebas" />
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

              <Typography component="div" variant="body2" color="text.secondary">
                Este detalle sirve para entender <b>qué pasó</b> (status), <b>qué existe hoy</b> (lifecycle) y
                <b> qué acciones son válidas</b> (deploy/destroy).
              </Typography>

              {/* Microcopy aclaratorio */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                El estado indica la última ejecución; el lifecycle indica qué existe hoy en AWS.
              </Typography>

              {/* Bloque Última ejecución */}
              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Última ejecución
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography component="div" variant="body2" color="text.secondary">
                      Última acción:{' '}
                      <b>{plan?.last_action || plan?.lastAction || '—'}</b>
                    </Typography>
                    {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                        El canvas cambió: la infraestructura desplegada (si existía) ya no coincide con este plan.
                      </Typography>
                    )}
                    <Typography component="div" variant="body2" color="text.secondary">
                      Resultado:{' '}
                      <Chip size="small" {...statusChipProps(plan?.status)} />
                    </Typography>
                    <Typography component="div" variant="body2" color="text.secondary">
                      Fecha:{' '}
                      <b>{formatDateTime(plan?.updated_at)}</b>
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Box>
          )}

          {/* OUTPUTS */}
          {tab === 'outputs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Outputs</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
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

          {tab === 'tests' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Guía de pruebas post-deploy</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    Define pruebas de conectividad entre VPCs según el modo de enrutamiento desplegado.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={fetchOutputs}
                  disabled={outputsLoading}
                >
                  {outputsLoading ? 'Cargando…' : 'Cargar outputs para pruebas'}
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!hasOutputsData && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Carga outputs para identificar instancias/IPs reales y ejecutar pruebas guiadas.
                  </Alert>
                )}

                {connectivityScenarios.length === 0 && (
                  <Alert severity="warning">
                    Este plan no expone pares de VPC conectados por peering o TGW para pruebas cruzadas.
                  </Alert>
                )}

                {connectivityScenarios.map((scenario) => (
                  <Paper key={`${scenario.aId}:${scenario.bId}`} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {scenario.aVpc.name} ↔ {scenario.bVpc.name}
                      </Typography>
                      <Chip size="small" label={scenario.modeLabel} color="primary" variant="outlined" />
                      <Chip size="small" label={`${scenario.aVpc.cidr} / ${scenario.bVpc.cidr}`} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Routers implicados: {scenario.routers.length > 0 ? scenario.routers.join(', ') : 'n/a'}
                    </Typography>

                    {!scenario.readyForRun && (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>
                        No hay suficientes outputs de instancias para generar prueba ida/vuelta en este par.
                      </Alert>
                    )}

                    {scenario.checks.length > 0 && (
                      <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                        {scenario.checks.map((check) => (
                          <Box key={`${scenario.aId}:${scenario.bId}:${check.title}`}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {check.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              {check.context}
                            </Typography>
                            <Paper
                              variant="outlined"
                              sx={{ p: 1, bgcolor: 'background.default', overflow: 'auto' }}
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
                                {check.command}
                              </Box>
                            </Paper>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                ))}

                <Alert severity="info" variant="outlined">
                  Resultado esperado: si la topología está correcta, cada par conectado debe responder ping en ida y retorno.
                </Alert>
              </Box>
            </Box>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Logs del plan</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    El log corresponde siempre a la última ejecución (deploy o destroy).
                  </Typography>
                </Box>
                <Button variant="contained" onClick={fetchPlanLogs}>
                  Ver log del plan
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!logText && (
                  <Alert severity="info">
                    Haz clic en “Ver log del plan” para mostrar el log de la última ejecución.
                  </Alert>
                )}

                {logText && (
                  <>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Este log corresponde a la última ejecución del plan.
                    </Alert>
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
                  </>
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

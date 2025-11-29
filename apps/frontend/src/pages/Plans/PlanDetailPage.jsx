// apps/frontend/src/pages/Plans/PlanDetailPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TASK_STATE_PENDING, TASK_STATE_RUNNING } from '../../constants';
import { api } from '../../lib/api';

export default function PlanDetailPage() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logText, setLogText] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [lastDestroyTaskId, setLastDestroyTaskId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // ✅ NUEVO: control del modo de despliegue (preview vs apply real)
  const [applyMode, setApplyMode] = useState(false); // false = solo PLAN, true = APPLY

  const timerRef = useRef(null);

  async function fetchPlan() {
    try {
      const data = await api.getPlan(id);
      setPlan(data);
      setLoading(false);
      if (data.status === TASK_STATE_RUNNING || data.status === TASK_STATE_PENDING) {
        timerRef.current = setTimeout(fetchPlan, 2000);
      }
    } catch (e) {
      setLoading(false);
      setErr(`Error cargando plan: ${e.message}`);
      console.error(e);
    }
  }

  async function fetchTaskLog() {
    if (!plan?.task_id) return;
    try {
      const ts = await api.taskStatus(plan.task_id);
      const log = ts?.result?.log || ts?.result?.error || ts?.error || '(sin log)';
      setLogText(log);
    } catch (e) {
      setLogText(`No se pudo leer el log: ${String(e)}`);
    }
  }

  async function fetchDestroyLog() {
    if (!lastDestroyTaskId) return;
    try {
      const ts = await api.taskStatus(lastDestroyTaskId);
      const log = ts?.result?.log || ts?.result?.error || ts?.error || '(sin log)';
      setLogText(log);
    } catch (e) {
      setLogText(`No se pudo leer el log (destroy): ${String(e)}`);
    }
  }

  useEffect(() => {
    fetchPlan();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeploy = async () => {
    setDeploying(true);
    setMsg(null);
    setErr(null);
    try {
      // ✅ PASAMOS EL MODO
      const res = await api.deployPlan(id, { applyMode });
      setMsg(`Deploy ${applyMode ? 'APPLY' : 'PLAN'} iniciado. task_id=${res.task_id || '¿?'} (actualizando...)`);
      await fetchPlan();
    } catch (e) {
      setErr(`Fallo al iniciar deploy: ${e.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleDestroy = async () => {
    if (!window.confirm('Esto destruirá los recursos del último despliegue de este contenedor.\n¿Continuar?')) {
      return;
    }
    setDestroying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);
    try {
      const res = await api.destroyPlan(id); // o api.destroyLast()
      const tid = res?.task_id;
      setLastDestroyTaskId(tid || null);
      setMsg(`Destroy encolado${tid ? ` (task_id=${tid})` : ''}. Abre "Ver log (destroy)" para ver el progreso.`);
    } catch (e) {
      setErr(`Fallo al iniciar destroy: ${e.message}`);
    } finally {
      setDestroying(false);
    }
  };

  if (loading) return <div>Cargando…</div>;
  if (!plan) return <div>No encontrado</div>;

  const isTerminal = plan.status === 'SUCCESS' || plan.status === 'FAILURE';
  const canDeploy = isTerminal || plan.status === 'PENDING';
  const busy = deploying || destroying;

  return (
    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Plan {plan.name}</h2>
        <span style={{ padding: '2px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
          Status: <b>{plan.status}</b>
        </span>

        {/* ✅ Switch Apply */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={applyMode}
            onChange={(e) => setApplyMode(e.target.checked)}
            disabled={busy}
          />
          <span>{applyMode ? 'Modo APPLY (real)' : 'Modo PLAN (preview)'}</span>
        </label>

        {/* Botón Deploy */}
        <button
          onClick={handleDeploy}
          disabled={!canDeploy || busy}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: '#2563eb',
            color: 'white',
            border: 'none',
            opacity: (!canDeploy || busy) ? 0.6 : 1,
            cursor: (!canDeploy || busy) ? 'not-allowed' : 'pointer',
          }}
          title={!canDeploy ? 'El plan está ejecutándose; espera a que termine.' : (applyMode ? 'Aplicar en AWS' : 'Solo plan (preview)')}
        >
          {deploying ? 'Lanzando…' : (applyMode ? 'Deploy (APPLY)' : 'Deploy (PLAN)')}
        </button>

        {/* Botón Destroy */}
        <button
          onClick={handleDestroy}
          disabled={busy}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: '#dc2626',
            color: 'white',
            border: 'none',
            opacity: busy ? 0.6 : 1,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
          title="Destruir el último despliegue (usa el último directorio /tmp/tf-multi-*)"
        >
          {destroying ? 'Destruyendo…' : 'Destroy'}
        </button>
      </div>

      {plan.task_id && <p><b>task_id:</b> {plan.task_id}</p>}
      {!isTerminal && <p style={{ opacity: .7 }}>Procesando… (se actualiza solo)</p>}

      {msg && <div style={{ color: '#166534', marginTop: 8 }}>{msg}</div>}
      {err && <div style={{ color: '#b91c1c', marginTop: 8 }}>{err}</div>}
      {plan.error && <pre style={{ color: "#b91c1c" }}>{plan.error}</pre>}

      {/* Logs deploy */}
      {plan.task_id && (
        <p>
          task_id: {plan.task_id}{' '}
          <button onClick={fetchTaskLog} style={{ marginLeft: 8 }}>Ver log (deploy)</button>
        </p>
      )}

      {/* Logs destroy */}
      {lastDestroyTaskId && (
        <p>
          destroy task_id: {lastDestroyTaskId}{' '}
          <button onClick={fetchDestroyLog} style={{ marginLeft: 8 }}>Ver log (destroy)</button>
        </p>
      )}

      {logText && (
        <>
          <h4>Log de ejecución</h4>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{logText}</pre>
        </>
      )}

      <h4>Payload</h4>
      <pre>{JSON.stringify(plan, null, 2)}</pre>
    </div>
  );
}

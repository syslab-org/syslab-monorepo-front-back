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
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const timerRef = useRef(null);

  async function fetchPlan() {
    try {
      const data = await api.getPlan(id);
      setPlan(data);
      setLoading(false);

      // si está corriendo, seguimos con polling
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
      // Celery SUCCESS con nuestro payload { ok, error?, log? }
      const log = ts?.result?.log || ts?.result?.error || ts?.error || '(sin log)';
      setLogText(log);
    } catch (e) {
      setLogText(`No se pudo leer el log: ${String(e)}`);
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
      const res = await api.deployPlan(id); // POST /api/network/plans/:id/deploy/
      setMsg(`Deploy iniciado. task_id=${res.task_id || '¿?'} (actualizando...)`);

      // forzamos un refresh inmediato y dejamos el polling seguir
      await fetchPlan();
    } catch (e) {
      setErr(`Fallo al iniciar deploy: ${e.message}`);
    } finally {
      setDeploying(false);
    }
  };

  if (loading) return <div>Cargando…</div>;
  if (!plan) return <div>No encontrado</div>;

  const isTerminal = plan.status === 'SUCCESS' || plan.status === 'FAILURE';
  const canDeploy = isTerminal || plan.status === 'PENDING'; // permite relanzar si terminó o aún no inició

  return (
    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Plan {plan.name}</h2>
        <span style={{ padding: '2px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
          Status: <b>{plan.status}</b>
        </span>
        <button
          onClick={handleDeploy}
          disabled={deploying || !canDeploy}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: 8,
            background: '#2563eb',
            color: 'white',
            border: 'none',
            opacity: (deploying || !canDeploy) ? 0.6 : 1,
            cursor: (deploying || !canDeploy) ? 'not-allowed' : 'pointer',
          }}
          title={!canDeploy ? 'El plan está ejecutándose; espera a que termine.' : 'Lanzar deploy en AWS'}
        >
          {deploying ? 'Lanzando…' : 'Deploy ahora'}
        </button>
      </div>

      {plan.task_id && <p><b>task_id:</b> {plan.task_id}</p>}
      {!isTerminal && <p style={{ opacity: .7 }}>Procesando… (se actualiza solo)</p>}

      {msg && <div style={{ color: '#166534', marginTop: 8 }}>{msg}</div>}
      {err && <div style={{ color: '#b91c1c', marginTop: 8 }}>{err}</div>}
      {plan.error && <pre style={{ color: "#b91c1c" }}>{plan.error}</pre>}

      {plan.task_id && (
        <p>
          task_id: {plan.task_id}{' '}
          <button onClick={fetchTaskLog} style={{ marginLeft: 8 }}>Ver log</button>
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

import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export default function TaskDemo() {
  const [health, setHealth] = useState(null);
  const [n, setN] = useState(5);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/healthz/`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }));
  }, []);

  async function runTask() {
    setBusy(true);
    setStatus(null);
    try {
      const r = await fetch(`${API}/api/tasks/run/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n: Number(n) || 5 }),
      });
      const data = await r.json();
      setTaskId(data.task_id);
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    if (!taskId) return;
    const r = await fetch(`${API}/api/tasks/status/${taskId}/`);
    const data = await r.json();
    setStatus(data);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Demo Celery</h1>
      <p><b>API:</b> {API}</p>
      <p><b>Health:</b> {health ? JSON.stringify(health) : "…"}</p>

      <hr />
      <label>
        Segundos (n):{" "}
        <input
          type="number"
          value={n}
          min="1"
          onChange={(e) => setN(e.target.value)}
          style={{ width: 80 }}
        />
      </label>{" "}
      <button onClick={runTask} disabled={busy}>
        {busy ? "Encolando…" : "Encolar tarea"}
      </button>{" "}
      <button onClick={checkStatus} disabled={!taskId}>
        Consultar estado
      </button>

      <p><b>task_id:</b> {taskId || "-"}</p>
      <p><b>status:</b> {status ? JSON.stringify(status) : "-"}</p>
    </div>
  );
}

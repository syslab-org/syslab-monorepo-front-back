// apps/frontend/src/lib/api.js
// NO pongas "/" antes de BASE_URL; quita barras finales de BASE_URL
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

async function jsonFetch(path, options = {}) {
  // `path` debe EMPEZAR con "/" y NUNCA con "http"
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const ct = res.headers.get('content-type') || "";
  const isJSON = ct.includes('application/json');

  const body = isJSON ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = isJSON ? JSON.stringify(body) : String(body).slice(0, 300);
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${msg}`);
  }
  return body;
}

export const api = {
  // health
  health: () => jsonFetch('/healthz/'),

  // celery demo
  runPrueba: (n = 5) => jsonFetch("/api/tasks/run/", { method: "POST", body: JSON.stringify({ n }) }),
  taskStatus: (taskId) => jsonFetch(`/api/tasks/status/${taskId}/`),

  // plans
  listPlans: () => jsonFetch('/api/network/plans/'),
  getPlan: (id) => jsonFetch(`/api/network/plans/${id}/`),
  getPlanPayload: (id) => jsonFetch(`/api/network/plans/${id}/payload/`),

  //crar plan
  createPlan: (plan) =>
    jsonFetch("/api/network/plan/", {
      method: "POST",
      body: typeof plan === "string" ? plan : JSON.stringify(plan),
    })
};

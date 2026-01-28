// apps/frontend/src/lib/api.js
const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function jsonFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const msg = isJSON ? JSON.stringify(body) : String(body).slice(0, 300);
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${msg}`);
  }
  return body;
}

export const api = {
  // health
  health: () => jsonFetch("/healthz/"),

  // celery demo
  runPrueba: (n = 5) =>
    jsonFetch("/api/tasks/run/", {
      method: "POST",
      body: JSON.stringify({ n }),
    }),
  taskStatus: (taskId) => jsonFetch(`/api/tasks/status/${taskId}/`),

  // planes
  listPlans: () => jsonFetch(`/api/network/plans/`),
  getPlan: (id) => jsonFetch(`/api/network/plans/${id}/`),
  getPlanPayload: (id) => jsonFetch(`/api/network/plans/${id}/payload/`),
  getPlanOutputs: (id) => jsonFetch(`/api/network/plans/${id}/outputs/`),
  getPlanLogs: (id) => jsonFetch(`/api/network/plans/${id}/logs/`),
  createPlan(plan) {
    return jsonFetch(`/api/network/plan/`, {
      method: "POST",
      body: typeof plan === "string" ? plan : JSON.stringify(plan),
    });
  },

  /**
   * Deploy del plan.
   * @param {string} id - UUID del plan.
   * @param {object} opts - { applyMode?: boolean, simulateOnly?: boolean }
   *  - applyMode=true  => simulate_only=false (APPLY real)
   *  - applyMode=false => simulate_only=true  (solo PLAN)
   *  - si pasas simulateOnly se respeta tal cual
   */
  deployPlan(id, opts = {}) {
    const { applyMode, simulateOnly } = opts;
    const body = {
      simulate_only:
        typeof simulateOnly === "boolean" ? simulateOnly : !!!applyMode, // por defecto: preview
    };
    return jsonFetch(`/api/network/plans/${id}/deploy/`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // destroys
  destroyPlan(id) {
    return jsonFetch(`/api/network/plans/${id}/destroy/`, { method: "POST" });
  },
  destroyLast() {
    return jsonFetch(`/api/network/plans/destroy-last`, { method: "POST" });
  },
};

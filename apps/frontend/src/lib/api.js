const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  // Django devuelve HTML en 404/500 con DEBUG=True; manejamos feliz/sad path:
  const contentType = res.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  if (!res.ok) {
    const body = isJSON ? await res.json().catch(() => ({})) : await res.text();
    const msg = isJSON ? JSON.stringify(body) : body?.slice(0, 300);
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${msg || ""}`);
  }
  return isJSON ? res.json() : res.text();
}

export const api = {
  health() {
    return jsonFetch(`${BASE_URL}/healthz`);
  },
  runPrueba(n = 5) {
    return jsonFetch(`${BASE_URL}/api/tasks/prueba`, {
      method: "POST",
      body: JSON.stringify({ n }),
    });
  },
  taskStatus(taskId) {
    return jsonFetch(`${BASE_URL}/api/tasks/${taskId}`);
  },
};

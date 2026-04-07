const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const TOKEN_KEY = "syslab_api_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function jsonFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const token = getAuthToken();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Token ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const body = isJSON ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const err = new Error(
      isJSON
        ? body?.detail || JSON.stringify(body)
        : String(body).slice(0, 300),
    );
    err.status = res.status;
    err.statusText = res.statusText;
    err.data = body;
    if (res.status === 401) {
      clearAuthToken();
    }
    throw err;
  }

  return body;
}

export const api = {
  health: () => jsonFetch("/healthz/"),

  loginWithEmail: ({ email, password }) =>
    jsonFetch("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  loginWithGoogle: ({ credential, clientId }) =>
    jsonFetch("/api/auth/login/google/", {
      method: "POST",
      headers: clientId ? { "X-Google-Client-Id": clientId } : {},
      body: JSON.stringify({ credential, client_id: clientId || "" }),
    }),

  logout: () => jsonFetch("/api/auth/logout/", { method: "POST" }),
  me: () => jsonFetch("/api/me/"),
  updateMe: (payload) =>
    jsonFetch("/api/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getRegistration: (inviteToken) => jsonFetch(`/api/auth/register/${inviteToken}/`),
  registerWithPassword: (inviteToken, payload) =>
    jsonFetch(`/api/auth/register/${inviteToken}/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listUsers: () => jsonFetch("/api/users/"),
  createUser: (payload) =>
    jsonFetch("/api/users/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (id, payload) =>
    jsonFetch(`/api/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  listCourses: () => jsonFetch("/api/courses/"),
  createCourse: (payload) =>
    jsonFetch("/api/courses/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCourse: (id, payload) =>
    jsonFetch(`/api/courses/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  enrollStudent: (courseId, userId) =>
    jsonFetch(`/api/courses/${courseId}/enroll-student/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  removeStudent: (courseId, userId) =>
    jsonFetch(`/api/courses/${courseId}/remove-student/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  listCloudConnections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return jsonFetch(`/api/cloud-connections/${query ? `?${query}` : ""}`);
  },
  createCloudConnection: (payload) =>
    jsonFetch("/api/cloud-connections/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCloudConnection: (id, payload) =>
    jsonFetch(`/api/cloud-connections/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCloudConnection: (id) =>
    jsonFetch(`/api/cloud-connections/${id}/`, {
      method: "DELETE",
    }),
  testCloudConnection: (id) =>
    jsonFetch(`/api/cloud-connections/${id}/test/`, {
      method: "POST",
    }),

  listLabs: () => jsonFetch("/api/labs/"),
  createLab: (payload) =>
    jsonFetch("/api/labs/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getLab: (id) => jsonFetch(`/api/labs/${id}/`),
  updateLab: (id, payload) =>
    jsonFetch(`/api/labs/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLab: (id) =>
    jsonFetch(`/api/labs/${id}/`, {
      method: "DELETE",
    }),

  listAmis: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return jsonFetch(`/api/settings/amis/${query ? `?${query}` : ""}`);
  },
  createAmi: (payload) =>
    jsonFetch("/api/settings/amis/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteAmi: (id) =>
    jsonFetch(`/api/settings/amis/${id}/`, {
      method: "DELETE",
    }),

  listProviderCapabilities: () => jsonFetch("/api/providers/capabilities/"),

  runPrueba: (n = 5) =>
    jsonFetch("/api/tasks/run/", {
      method: "POST",
      body: JSON.stringify({ n }),
    }),
  taskStatus: (taskId) => jsonFetch(`/api/tasks/status/${taskId}/`),

  listPlans: () => jsonFetch("/api/network/plans/"),
  getPlan: (id) => jsonFetch(`/api/network/plans/${id}/`),
  getPlanPayload: (id) => jsonFetch(`/api/network/plans/${id}/payload/`),
  getPlanOutputs: (id) => jsonFetch(`/api/network/plans/${id}/outputs/`),
  getPlanLogs: (id) => jsonFetch(`/api/network/plans/${id}/logs/`),
  syncPlanFromCanvas(payload) {
    return jsonFetch("/api/network/plans/sync-from-canvas/", {
      method: "POST",
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    });
  },
  createPlan(plan) {
    return jsonFetch("/api/network/plan/", {
      method: "POST",
      body: typeof plan === "string" ? plan : JSON.stringify(plan),
    });
  },
  deployPlan(id, opts = {}) {
    const { applyMode, simulateOnly } = opts;
    return jsonFetch(`/api/network/plans/${id}/deploy/`, {
      method: "POST",
      body: JSON.stringify({
        simulate_only:
          typeof simulateOnly === "boolean" ? simulateOnly : !!!applyMode,
      }),
    });
  },
  destroyPlan(id) {
    return jsonFetch(`/api/network/plans/${id}/destroy/`, { method: "POST" });
  },
  destroyLast() {
    return jsonFetch("/api/network/plans/destroy-last/", { method: "POST" });
  },
};

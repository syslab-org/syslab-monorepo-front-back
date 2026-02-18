import { buildRoutingPreview } from "./buildRoutingPreview";

// Stable stringify para que el hash sea determinista (ordena keys recursivamente)
export const stableStringify = (value) => {
  const seen = new WeakSet();

  const norm = (v) => {
    if (v === undefined) return null;
    if (v === null) return null;

    const t = typeof v;
    if (t === "number" || t === "boolean" || t === "string") return v;

    if (Array.isArray(v)) return v.map(norm);

    if (t === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);

      const out = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = norm(v[k]);
      }
      return out;
    }

    return String(v);
  };

  return JSON.stringify(norm(value));
};

// Genera un hash basado en la infraestructura real (preview)
export const computeInfraHash = (nodesArr, edgesArr) => {
  try {
    const preview = buildRoutingPreview(nodesArr, edgesArr);

    const payloadLite = {
      vpcs: preview?.vpcs || [],
      links: preview?.links || [],
      routers: preview?.routers || [],
    };

    return stableStringify(payloadLite);
  } catch (_err) {
    return `infra:n${(nodesArr || []).length}-e${(edgesArr || []).length}`;
  }
};

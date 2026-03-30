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

const fnv1a64 = (input) => {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, "0");
};

// Genera un hash basado en la infraestructura real (preview)
export const computeInfraHash = (nodesArr, edgesArr) => {
  try {
    const preview = buildRoutingPreview(nodesArr || [], edgesArr || []);

    const payloadLite = {
      vpcs: preview?.vpcs || [],
    };

    return fnv1a64(stableStringify(payloadLite));
  } catch (err) {
    console.warn("computeInfraHash fallback:", err);
    return fnv1a64(`infra:n${(nodesArr || []).length}-e${(edgesArr || []).length}`);
  }
};

import { useEffect, useState } from "react";

import { api } from "@/infrastructure/http/api";


export function useIntentPluginManifest() {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.getIntentPluginManifest();
        if (!alive) return;
        setManifest(response || null);
      } catch (err) {
        if (!alive) return;
        setManifest(null);
        setError(err?.data?.error || err?.message || "Intent plugin manifest unavailable");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  return {
    manifest,
    loading,
    error,
    enabled: Boolean(manifest?.enabled),
  };
}

export default useIntentPluginManifest;

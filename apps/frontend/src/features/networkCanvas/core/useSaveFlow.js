import { useCallback, useContext } from "react";

import { LoadingFlowContext } from "@/app/providers/LoadingFlowContext";
import { api } from "@/infrastructure/http/api";

function sanitizeForStorage(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => (v === undefined ? null : sanitizeForStorage(v)));
  }

  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, sanitizeForStorage(v)]);
  return Object.fromEntries(entries);
}

const useSaveFlow = ({ reactFlowInstance, flowKey, vpcid }) => {
  const { setLoadingFlow } = useContext(LoadingFlowContext);

  return useCallback(async () => {
    if (!reactFlowInstance || !vpcid) return;

    setLoadingFlow(true);

    try {
      const vpcObject = reactFlowInstance.toObject();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 15);

      const sanitizedFlow = sanitizeForStorage({ ...vpcObject, expiration: expirationDate });
      localStorage.setItem(flowKey, JSON.stringify(sanitizedFlow));

      await api.updateLab(vpcid, { flow: sanitizedFlow });
    } catch (error) {
      console.error("Error saving flow data:", error);
    } finally {
      setLoadingFlow(false);
    }
  }, [reactFlowInstance, setLoadingFlow, flowKey, vpcid]);
};

export default useSaveFlow;

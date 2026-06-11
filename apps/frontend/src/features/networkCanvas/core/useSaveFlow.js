import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

const useSaveFlow = ({ reactFlowInstance, flowKey, labId, vpcid }) => {
  const { t } = useTranslation();
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const resolvedLabId = labId || vpcid;
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const resetTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const saveFlow = useCallback(async () => {
    if (!reactFlowInstance || !resolvedLabId) return false;

    const startedAt = Date.now();
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setSaveState("saving");
    setSaveMessage(t("canvas.saveFlow.saving"));

    setLoadingFlow(true);

    try {
      const vpcObject = reactFlowInstance.toObject();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 15);

      const sanitizedFlow = sanitizeForStorage({ ...vpcObject, expiration: expirationDate });
      localStorage.setItem(flowKey, JSON.stringify(sanitizedFlow));

      await api.updateLab(resolvedLabId, { flow: sanitizedFlow });
      const elapsed = Date.now() - startedAt;
      if (elapsed < 450) {
        await new Promise((resolve) => setTimeout(resolve, 450 - elapsed));
      }
      const savedAt = new Date().toISOString();
      setLastSavedAt(savedAt);
      setSaveState("saved");
      setSaveMessage(t("canvas.saveFlow.savedRecently"));
      resetTimerRef.current = setTimeout(() => {
        setSaveState("idle");
        setSaveMessage("");
      }, 2800);
      return true;
    } catch (error) {
      console.error("Error saving flow data:", error);
      setSaveState("error");
      setSaveMessage(t("canvas.saveFlow.error"));
      resetTimerRef.current = setTimeout(() => {
        setSaveState("idle");
        setSaveMessage("");
      }, 5000);
      return false;
    } finally {
      setLoadingFlow(false);
    }
  }, [reactFlowInstance, setLoadingFlow, flowKey, resolvedLabId, t]);

  return {
    saveFlow,
    saveState,
    saveMessage,
    lastSavedAt,
  };
};

export default useSaveFlow;

import { useEffect, useRef, useState } from "react";
import { TASK_STATE_FAILURE, TASK_STATE_SUCCESS } from "../constants";
import { api } from "./api";

export function useTaskPoller(taskId, { intervalMs = 1500 } = {}) {
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await api.taskStatus(taskId);
        if (cancelled) return;
        setState(data.state);

        if (data.state === TASK_STATE_SUCCESS) {
          setResult(data.result ?? true);
          clearInterval(timer.current);

        } else if (data.state === TASK_STATE_FAILURE) {
          setError(data.error || "Task failed");
          clearInterval(timer.current);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
        clearInterval(timer.current);
      }
    }

    tick();
    timer.current = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer.current);
    };

  }, [taskId, intervalMs]);
  return { state, result, error };
}

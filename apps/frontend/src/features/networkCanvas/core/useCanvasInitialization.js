import { useEffect } from "react";

export function useCanvasInitialization({ onRestoreFlow, setRestorationDone }) {
  useEffect(() => {
    const handleFlowRestore = async () => {
      await onRestoreFlow();
      setRestorationDone(true);
    };

    handleFlowRestore();
  }, [onRestoreFlow, setRestorationDone]);
}

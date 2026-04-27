export const LOADING_FLOW_EVENT = "syslab:loading-flow";

export function emitLoadingFlowStart(message) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LOADING_FLOW_EVENT, {
      detail: { type: "start", message: message || "Procesando..." },
    }),
  );
}

export function emitLoadingFlowEnd() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LOADING_FLOW_EVENT, {
      detail: { type: "end" },
    }),
  );
}

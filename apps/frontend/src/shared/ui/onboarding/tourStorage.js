const TOUR_STORAGE_PREFIX = "syslab-tour";

function getStorageKey(tourId) {
  return `${TOUR_STORAGE_PREFIX}:${tourId}:v1`;
}

export function isTourCompleted(tourId) {
  if (!tourId || typeof window === "undefined") return false;
  return window.localStorage.getItem(getStorageKey(tourId)) === "done";
}

export function markTourCompleted(tourId) {
  if (!tourId || typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(tourId), "done");
}

export function clearTourCompleted(tourId) {
  if (!tourId || typeof window === "undefined") return;
  window.localStorage.removeItem(getStorageKey(tourId));
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/shared/i18n/resources/en";
import es from "@/shared/i18n/resources/es";

export const LANGUAGE_STORAGE_KEY = "syslab_language";
export const DEFAULT_LANGUAGE = "es";
export const SUPPORTED_LANGUAGES = ["es", "en"];

export function normalizeLanguage(value) {
  const lowered = String(value || "").trim().toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(lowered)) {
    return lowered;
  }

  if (lowered.startsWith("en")) {
    return "en";
  }

  if (lowered.startsWith("es")) {
    return "es";
  }

  return DEFAULT_LANGUAGE;
}

function getStoredLanguage() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "";
}

function resolveInitialLanguage() {
  const storedLanguage = getStoredLanguage();
  if (storedLanguage) {
    return normalizeLanguage(storedLanguage);
  }

  if (typeof navigator !== "undefined") {
    return normalizeLanguage(navigator.language || navigator.languages?.[0]);
  }

  return DEFAULT_LANGUAGE;
}

function syncDocumentLanguage(language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = normalizeLanguage(language);
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  });
}

syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);

i18n.on("languageChanged", (language) => {
  const normalized = normalizeLanguage(language);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  }

  syncDocumentLanguage(normalized);
});

export function changeLanguage(language) {
  return i18n.changeLanguage(normalizeLanguage(language));
}

export function getCurrentLanguage() {
  return normalizeLanguage(i18n.resolvedLanguage || i18n.language);
}

export function translate(key, options) {
  return i18n.t(key, options);
}

export default i18n;

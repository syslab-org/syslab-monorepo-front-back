import { useEffect, useState } from "react";

import { api, clearAuthToken, setAuthToken } from "@/infrastructure/http/api";

export const loginWithEmail = async (email, password) => {
  const res = await api.loginWithEmail({ email, password });
  setAuthToken(res?.token || "");
  return res;
};

export const loginWithGoogle = async (credential, clientId) => {
  const res = await api.loginWithGoogle({ credential, clientId });
  setAuthToken(res?.token || "");
  return res;
};

export const logoutSession = async () => {
  try {
    await api.logout();
  } finally {
    clearAuthToken();
  }
};

export const useUserRegistration = (inviteToken) => {
  const [user, setUser] = useState(null);
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCheckingLink, setIsCheckingLink] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchInvitation = async () => {
      setIsCheckingLink(true);
      try {
        const res = await api.getRegistration(inviteToken);
        if (!alive) return;
        setUser(res);
        setIsLinkValid(true);
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "No se pudo validar la invitacion.");
        setIsLinkValid(false);
      } finally {
        if (alive) setIsCheckingLink(false);
      }
    };

    if (inviteToken) {
      fetchInvitation();
    } else {
      setIsCheckingLink(false);
      setIsLinkValid(false);
      setError("Invitacion invalida.");
    }

    return () => {
      alive = false;
    };
  }, [inviteToken]);

  const registerWithEmailPassword = async (email, password) => {
    try {
      const res = await api.registerWithPassword(inviteToken, { email, password });
      setAuthToken(res?.token || "");
      setSuccessMessage("Cuenta activada correctamente.");
      return true;
    } catch (err) {
      setError(err?.message || "No se pudo completar el registro.");
      return false;
    }
  };

  return {
    user,
    isLinkValid,
    error,
    successMessage,
    setError,
    registerWithEmailPassword,
    isCheckingLink,
  };
};

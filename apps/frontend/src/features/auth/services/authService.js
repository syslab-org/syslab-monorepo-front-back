import { useEffect, useState } from "react";

import { api, clearAuthToken, setAuthToken } from "@/infrastructure/http/api";
import { translate } from "@/shared/i18n";

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
        setError(err?.message || translate("auth.register.validateInvitationError"));
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
      setError(translate("auth.register.invalidInvitation"));
    }

    return () => {
      alive = false;
    };
  }, [inviteToken]);

  const registerWithEmailPassword = async (email, password) => {
    try {
      const res = await api.registerWithPassword(inviteToken, { email, password });
      setAuthToken(res?.token || "");
      setSuccessMessage(translate("auth.register.success"));
      return true;
    } catch (err) {
      setError(err?.message || translate("auth.register.defaultError"));
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

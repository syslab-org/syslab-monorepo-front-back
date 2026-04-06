import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, clearAuthToken, getAuthToken, setAuthToken } from "@/infrastructure/http/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const me = await api.me();
      setUser(me);
      return me;
    } catch (error) {
      clearAuthToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeLogin = async (authPayload) => {
    if (authPayload?.token) {
      setAuthToken(authPayload.token);
    }
    const me = authPayload?.user || (await api.me());
    setUser(me);
    return me;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore server logout errors; local token is source of truth for the SPA session
    } finally {
      clearAuthToken();
      setUser(null);
      navigate("/login");
    }
  };

  const value = useMemo(
    () => ({ user, loading, logout, refreshUser, completeLogin }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

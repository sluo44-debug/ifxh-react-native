import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  refreshAccessToken,
  setApiBaseUrl as setApiBaseUrlGlobal,
  setAuthToken,
  setUnauthorizedHandler,
} from "../src/api/client";
import { fetchCurrentUser } from "../src/api/auth";
import { setRefreshToken } from "../src/auth/tokenStore";

const DEFAULT_API_BASE_URL = "https://webportal.ifse.ca";

function clearedAuth() {
  return { email: "", token: "", role: "" };
}

export const AuthContext = createContext({
  email: "",
  token: "",
  role: "",
  apiBaseUrl: DEFAULT_API_BASE_URL,
  setApiBaseUrl: (_url) => {},
  signIn: (_payload) => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [apiBaseUrl, _setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [auth, setAuth] = useState(clearedAuth());

  useEffect(() => {
    if (apiBaseUrl) setApiBaseUrlGlobal(String(apiBaseUrl).replace(/\/$/, ""));
  }, [apiBaseUrl]);

  useEffect(() => {
    setAuthToken(auth?.token ? String(auth.token) : null);
  }, [auth?.token]);

  // Let the API client sign out when refresh fails (V1)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      setAuth(clearedAuth());
      setRefreshToken(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore session on app start (best-effort)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const newToken = await refreshAccessToken();
        if (!newToken || cancelled) return;

        const user = await fetchCurrentUser();
        if (!user || cancelled) return;

        setAuth({ email: user.email, token: user.token, role: user.role });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setApiBaseUrl = useCallback((url) => {
    const next = String(url || "").replace(/\/$/, "");
    _setApiBaseUrl(next || DEFAULT_API_BASE_URL);
    if (next) setApiBaseUrlGlobal(next);
  }, []);

  const signIn = useCallback((payload) => {
    const next = {
      email: payload?.email ? String(payload.email) : "",
      token: payload?.token ? String(payload.token) : "",
      role: payload?.role ? String(payload.role) : "",
    };

    setAuthToken(next.token || null);
    setAuth(next);
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setAuth(clearedAuth());
    await setRefreshToken(null);
  }, []);

  const value = useMemo(
    () => ({
      email: auth.email,
      token: auth.token,
      role: auth.role,
      apiBaseUrl,
      setApiBaseUrl,
      signIn,
      signOut,
    }),
    [auth.email, auth.token, auth.role, apiBaseUrl, setApiBaseUrl, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
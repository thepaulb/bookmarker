import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import * as authApi from "../api/auth";
import { AUTH_EXPIRED_EVENT } from "../api/http";

// Holds who is signed in. The token lives in an httpOnly cookie the SPA
// can't read, so on load we ask /api/auth/me who we are; if nobody is, we
// check whether the app still needs its first account creating.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(async () => {
        const status = await authApi.getAuthStatus().catch(() => null);
        if (!cancelled) setNeedsSetup(Boolean(status?.needsSetup));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (username, password) => {
    setUser(await authApi.login(username, password));
  }, []);

  const register = useCallback(async (username, password) => {
    setUser(await authApi.register(username, password));
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, needsSetup, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

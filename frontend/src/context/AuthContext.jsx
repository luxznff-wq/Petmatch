import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, getToken, onUnauthorized, setToken } from '../services/api.js';

const AuthContext = createContext(null);

/**
 * Estado de sesión de la aplicación.
 *
 * El token vive en localStorage, pero el usuario se revalida siempre contra
 * `/auth/me` al arrancar: así una cuenta suspendida o un token caducado se
 * detectan antes de pintar cualquier pantalla protegida.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Sin token no hay nada que revalidar: `loading` ya nace en false.
    if (!getToken()) return undefined;

    let active = true;
    authApi
      .me()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [logout]);

  // Cualquier 401 del cliente HTTP cierra la sesión en toda la aplicación.
  useEffect(() => onUnauthorized(logout), [logout]);

  const applySession = useCallback((session) => {
    setToken(session.token);
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(
    async (credentials) => applySession(await authApi.login(credentials)),
    [applySession]
  );

  const register = useCallback(
    async (data) => applySession(await authApi.register(data)),
    [applySession]
  );

  /** Recarga el perfil tras cambios que afectan al panel (crear refugio, etc.). */
  const refresh = useCallback(async () => {
    const profile = await authApi.me();
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdopter: user?.role === 'ADOPTANTE',
      isShelter: user?.role === 'REFUGIO',
      isAdmin: user?.role === 'ADMINISTRADOR',
      login,
      register,
      logout,
      refresh,
      setUser
    }),
    [user, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}

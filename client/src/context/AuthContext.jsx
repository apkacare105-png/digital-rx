import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { refreshSession, setToken, setAuthFailHandler } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthFailHandler(() => setUser(null));
    refreshSession()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>{children}</AuthContext.Provider>;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api.js';
import { clearToken, getToken, setToken } from '../utils/token.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const accept = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
  }, []);

  const signIn = useCallback(async (email, password) => accept(await api.login(email, password)), [accept]);

  const signUp = useCallback(
    async (name, email, password) => accept(await api.register(name, email, password)),
    [accept]
  );

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

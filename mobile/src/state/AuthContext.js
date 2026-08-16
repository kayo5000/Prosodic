import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, register as apiRegister, getMe, setAuthToken, clearAuthToken } from '../api/prosodicApi';

const TOKEN_KEY = 'prosodic_auth_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore a stored session on app launch. Backend JWTs expire after
  // exactly 1 hour with no refresh mechanism (see api.py _make_token) —
  // flagged as a real UX gap for a mobile app (session dying mid-use is
  // much more disruptive on mobile than a web tab), not fixed tonight.
  // Any failure here (expired token, no network) just drops back to the
  // login screen rather than guessing at a stale user.
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!stored) return;
        setAuthToken(stored);
        const { data, error } = await getMe();
        if (error || !data?.user) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          clearAuthToken();
          return;
        }
        setUser(data.user);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { data, error } = await apiLogin(identifier, password);
    if (error) return { error };
    setAuthToken(data.token);
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setUser(data.user);
    return { error: null };
  }, []);

  const register = useCallback(async (email, username, password) => {
    const { data, error } = await apiRegister(email, username, password);
    if (error) return { error };
    setAuthToken(data.token);
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setUser(data.user);
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    clearAuthToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, register as apiRegister, getMe, setAuthToken, clearAuthToken } from '../api/prosodicApi';

const TOKEN_KEY = 'prosodic_auth_token';
const AuthContext = createContext(null);

// expo-secure-store has no real implementation on web (its .web.js module
// is a bare `{}` — every method is undefined there), so calling it on web
// throws. The primary target here is native (iOS/Android via Expo Go),
// but `expo start --web` is a script that ships in package.json by
// default and someone could still reach for it — these wrappers turn
// "storage unavailable" into "just don't persist" instead of a crash.
async function safeGetToken() {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); }
  catch { return null; }
}
async function safeSetToken(value) {
  try { await SecureStore.setItemAsync(TOKEN_KEY, value); }
  catch { /* no persistent storage on this platform — session is memory-only */ }
}
async function safeDeleteToken() {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); }
  catch { /* nothing to clean up if it was never persisted */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore a stored session on app launch. Backend JWTs are valid 30
  // days (see api.py _make_token) — any failure here (expired/invalid
  // token, no network, no storage on this platform) just drops back to
  // the login screen rather than guessing at a stale user.
  useEffect(() => {
    (async () => {
      try {
        const stored = await safeGetToken();
        if (!stored) return;
        setAuthToken(stored);
        const { data, error } = await getMe();
        if (error || !data?.user) {
          await safeDeleteToken();
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
    await safeSetToken(data.token);
    setUser(data.user);
    return { error: null };
  }, []);

  const register = useCallback(async (email, username, password) => {
    const { data, error } = await apiRegister(email, username, password);
    if (error) return { error };
    setAuthToken(data.token);
    await safeSetToken(data.token);
    setUser(data.user);
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await safeDeleteToken();
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

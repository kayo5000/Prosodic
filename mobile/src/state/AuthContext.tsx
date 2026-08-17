import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  login as apiLogin, register as apiRegister, getMe, setAuthToken, clearAuthToken,
} from '../services/api/prosodicApi';
import type { User } from '../types/api';

const TOKEN_KEY = 'prosodic_auth_token';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// expo-secure-store has no real implementation on web (its .web.js module
// is a bare `{}` — every method is undefined there), so calling it on web
// throws. The primary target here is native (iOS/Android via Expo Go),
// but `expo start --web` is a script that ships in package.json by
// default and someone could still reach for it — these wrappers turn
// "storage unavailable" into "just don't persist" instead of a crash.
async function safeGetToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); }
  catch { return null; }
}
async function safeSetToken(value: string): Promise<void> {
  try { await SecureStore.setItemAsync(TOKEN_KEY, value); }
  catch { /* no persistent storage on this platform — session is memory-only */ }
}
async function safeDeleteToken(): Promise<void> {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); }
  catch { /* nothing to clean up if it was never persisted */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  const login = useCallback(async (identifier: string, password: string) => {
    const { data, error } = await apiLogin(identifier, password);
    if (error || !data) return { error };
    setAuthToken(data.token);
    await safeSetToken(data.token);
    setUser(data.user);
    return { error: null };
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const { data, error } = await apiRegister(email, username, password);
    if (error || !data) return { error };
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

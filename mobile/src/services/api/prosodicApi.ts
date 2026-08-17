// Talks to the same Flask API the web frontend uses (frontend/src/api/
// prosodicApi.js) — same endpoints, same JSON shapes, no backend changes.
// Base URL comes from EXPO_PUBLIC_API_URL (see .env / .env.example) —
// Expo inlines any env var prefixed EXPO_PUBLIC_ at build time, same
// convention as the web app's REACT_APP_ prefix.
import type {
  ApiResult,
  AnalyzeResponse,
  AuthResponse,
  MasteryResponse,
  SuggestResponse,
  User,
  VeilChatResponse,
  VeilMessage,
} from '../../types/api';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const TIMEOUT_MS = 120000; // /analyze and /suggest can be slow on cold start

// Set by AuthContext on login/logout/restore — every request below
// automatically attaches this as `Authorization: Bearer <token>` when
// present, so call sites don't have to thread it through individually.
// Endpoints that don't require auth (analyze/suggest/veilChat) just
// ignore the header if the backend doesn't check it.
let authToken: string | null = null;
export const setAuthToken = (token: string): void => { authToken = token; };
export const clearAuthToken = (): void => { authToken = null; };

async function request<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(`${BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { data: null, error: json?.error || `Request failed (${res.status})`, status: res.status };
    }
    return { data: json as T, error: null, status: res.status };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const msg = isAbort
      ? 'Request timed out — is the API reachable?'
      : (err instanceof Error ? err.message : 'Unknown error');
    return { data: null, error: msg, status: null };
  } finally {
    clearTimeout(timeout);
  }
}

export const analyze = (verse_lines: string[], bpm: number): Promise<ApiResult<AnalyzeResponse>> =>
  request('/analyze', { verse_lines, bpm });

export const suggest = (
  verse_lines: string[],
  bpm: number | undefined,
  trigger: 'auto' | 'manual',
  target_word?: string,
  context_lines?: string[],
  motif_bank?: Record<string, string[]>,
): Promise<ApiResult<SuggestResponse>> =>
  request('/suggest', {
    verse_lines, bpm, trigger_mode: trigger,
    ...(target_word   ? { target_word }   : {}),
    ...(context_lines ? { context_lines } : {}),
    ...(motif_bank    ? { motif_bank }    : {}),
  });

// /mastery is currently an honest stub on the backend (always returns
// {ready: false, reason: '...'} — see api.py's mastery() route) rather
// than real data. No dedicated mobile screen built against it yet for
// that reason; kept here for whenever the backend catches up.
export const getMastery = (): Promise<ApiResult<MasteryResponse>> => request('/mastery');

export const register = (email: string, username: string, password: string): Promise<ApiResult<AuthResponse>> =>
  request('/auth/register', { email, username, password });

// Backend accepts either field name as a generic identifier
// (`data.get('email') or data.get('username')` — api.py auth_login) and
// doesn't validate email shape, so sending whatever the user typed
// under `email` works whether it's actually an email or a username.
export const login = (identifier: string, password: string): Promise<ApiResult<AuthResponse>> =>
  request('/auth/login', { email: identifier, password });

export const getMe = (): Promise<ApiResult<{ user: User }>> => request('/auth/me');

// VEIL is rate-limited (5/min, 20/hour per IP — see rate_limiter.py) and
// circuit-breaker protected (anthropic_circuit_breaker.py) on the backend.
// Callers should expect and handle 429 ("Too many requests...") and 503
// ("temporarily unavailable...") error strings surfacing through `error`,
// not just generic failures.
export const veilChat = (
  messages: VeilMessage[],
  analysisContext?: string,
): Promise<ApiResult<VeilChatResponse>> =>
  request('/veil/chat', {
    messages,
    ...(analysisContext ? { analysis_context: analysisContext } : {}),
  });

export const apiBaseUrl = BASE;

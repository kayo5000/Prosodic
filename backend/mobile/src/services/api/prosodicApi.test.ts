// Contract tests — Phase 4b (docs/BUILD_PLAN.md): validates prosodicApi.ts's
// actual request/response handling against docs/openapi.yaml, the backend's
// formal contract (Phase 2a, sourced from real live routes, not guessed at).
// Every method/path/body assertion below traces back to a specific
// docs/openapi.yaml path — cross-reference before changing either file.
//
// fetch is mocked at the global level (React Native/Expo test env doesn't
// have a real network) — this tests prosodicApi.ts's own request-shaping
// and response-unwrapping logic, not the live backend itself (that's what
// tests/test_*.py's real Flask-test-client calls on the backend side do).

import {
  analyze, suggest, getMastery, register, login, getMe, veilChat,
  setAuthToken, clearAuthToken, apiBaseUrl,
} from './prosodicApi';

function mockFetchOnce(status: number, body: unknown) {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

function lastCall(mockFetch: jest.Mock) {
  const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  return {
    url,
    method: init.method,
    body: init.body ? JSON.parse(init.body as string) : undefined,
    headers: init.headers as Record<string, string>,
  };
}

afterEach(() => {
  clearAuthToken();
  jest.resetAllMocks();
});

describe('analyze — POST /analyze', () => {
  it('sends verse_lines and bpm, no more no less (openapi.yaml: required [verse_lines, bpm])', async () => {
    const mockFetch = mockFetchOnce(200, { rhyme_map: [], bpm: 90, line_count: 1 });
    await analyze(['one line'], 90);
    const call = lastCall(mockFetch);
    expect(call.url).toBe(`${apiBaseUrl}/analyze`);
    expect(call.method).toBe('POST');
    expect(call.body).toEqual({ verse_lines: ['one line'], bpm: 90 });
  });

  it('unwraps a successful response into { data, error: null, status }', async () => {
    const payload = { rhyme_map: [], bpm: 90, line_count: 1 };
    mockFetchOnce(200, payload);
    const result = await analyze(['line'], 90);
    expect(result).toEqual({ data: payload, error: null, status: 200 });
  });

  it('maps a non-2xx response to { data: null, error, status } using the backend\'s error field', async () => {
    mockFetchOnce(400, { error: 'verse_lines is required' });
    const result = await analyze([], 0);
    expect(result).toEqual({ data: null, error: 'verse_lines is required', status: 400 });
  });
});

describe('suggest — POST /suggest', () => {
  it('sends trigger_mode and omits optional fields when not provided (openapi.yaml: target_word/context_lines/motif_bank all nullable)', async () => {
    const mockFetch = mockFetchOnce(200, { suggestions: [], count: 0, trigger_mode: 'auto' });
    await suggest(['line'], 90, 'auto');
    const call = lastCall(mockFetch);
    expect(call.body).toEqual({ verse_lines: ['line'], bpm: 90, trigger_mode: 'auto' });
    expect(call.body.target_word).toBeUndefined();
    expect(call.body.context_lines).toBeUndefined();
    expect(call.body.motif_bank).toBeUndefined();
  });

  it('includes target_word/context_lines/motif_bank when provided', async () => {
    const mockFetch = mockFetchOnce(200, { suggestions: [], count: 0, trigger_mode: 'manual' });
    await suggest(['line'], 90, 'manual', 'crown', ['prior line'], { fire: ['flame', 'blaze'] });
    const call = lastCall(mockFetch);
    expect(call.body).toEqual({
      verse_lines: ['line'], bpm: 90, trigger_mode: 'manual',
      target_word: 'crown', context_lines: ['prior line'],
      motif_bank: { fire: ['flame', 'blaze'] },
    });
  });

  it('bpm is optional (openapi.yaml: /suggest does not require bpm, unlike /analyze)', async () => {
    const mockFetch = mockFetchOnce(200, { suggestions: [], count: 0, trigger_mode: 'auto' });
    await suggest(['line'], undefined, 'auto');
    const call = lastCall(mockFetch);
    expect(call.body.bpm).toBeUndefined();
  });
});

describe('getMastery — GET /mastery', () => {
  it('sends a GET with no body (openapi.yaml: no requestBody on this route)', async () => {
    const mockFetch = mockFetchOnce(200, {
      ready: false, reason: 'not wired up yet', missing: [], data_snapshot: null,
    });
    await getMastery();
    const call = lastCall(mockFetch);
    expect(call.method).toBe('GET');
    expect(call.body).toBeUndefined();
  });
});

describe('auth — /auth/register, /auth/login, /auth/me', () => {
  it('register() sends email, username, password (openapi.yaml: all 3 required)', async () => {
    const mockFetch = mockFetchOnce(201, { token: 't', user: { id: 1 } });
    await register('a@b.com', 'kayo', 'secretpw');
    const call = lastCall(mockFetch);
    expect(call.url).toBe(`${apiBaseUrl}/auth/register`);
    expect(call.body).toEqual({ email: 'a@b.com', username: 'kayo', password: 'secretpw' });
  });

  it('login() always sends the identifier under the "email" key — the backend accepts either as a generic identifier (api.py auth_login)', async () => {
    const mockFetch = mockFetchOnce(200, { token: 't', user: { id: 1 } });
    await login('kayo_username_not_an_email', 'secretpw');
    const call = lastCall(mockFetch);
    expect(call.body).toEqual({ email: 'kayo_username_not_an_email', password: 'secretpw' });
  });

  it('getMe() attaches the Authorization header once setAuthToken() has been called', async () => {
    setAuthToken('jwt-abc');
    const mockFetch = mockFetchOnce(200, { user: { id: 1 } });
    await getMe();
    const call = lastCall(mockFetch);
    expect(call.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('requests carry no Authorization header before setAuthToken() / after clearAuthToken()', async () => {
    const mockFetch = mockFetchOnce(200, { user: { id: 1 } });
    await getMe();
    const call = lastCall(mockFetch);
    expect(call.headers.Authorization).toBeUndefined();
  });
});

describe('veilChat — POST /veil/chat', () => {
  it('sends messages and omits analysis_context when not given', async () => {
    const mockFetch = mockFetchOnce(200, { reply: 'hi' });
    await veilChat([{ role: 'user', content: 'hey' }]);
    const call = lastCall(mockFetch);
    expect(call.body).toEqual({ messages: [{ role: 'user', content: 'hey' }] });
  });

  it('includes analysis_context when given', async () => {
    const mockFetch = mockFetchOnce(200, { reply: 'hi' });
    await veilChat([{ role: 'user', content: 'hey' }], 'song data here');
    const call = lastCall(mockFetch);
    expect(call.body.analysis_context).toBe('song data here');
  });

  it('surfaces the backend\'s rate-limit error string as-is on 429 (openapi.yaml: /veil/chat 429 response)', async () => {
    mockFetchOnce(429, { error: 'Too many requests. Please wait before trying again.' });
    const result = await veilChat([{ role: 'user', content: 'hey' }]);
    expect(result.error).toBe('Too many requests. Please wait before trying again.');
    expect(result.status).toBe(429);
  });

  it('surfaces the backend\'s circuit-breaker 503 message as-is', async () => {
    mockFetchOnce(503, { error: 'VEIL is temporarily unavailable — the AI service has been failing repeatedly. Please try again shortly.' });
    const result = await veilChat([{ role: 'user', content: 'hey' }]);
    expect(result.status).toBe(503);
    expect(result.error).toContain('temporarily unavailable');
  });
});

describe('network failure handling', () => {
  it('returns a clean error (not a thrown exception) when fetch itself rejects', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    const result = await analyze(['line'], 90);
    expect(result.data).toBeNull();
    expect(result.status).toBeNull();
    expect(result.error).toBe('Network request failed');
  });

  it('returns a clear timeout message on AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    globalThis.fetch = jest.fn().mockRejectedValue(abortError) as unknown as typeof fetch;
    const result = await analyze(['line'], 90);
    expect(result.error).toBe('Request timed out — is the API reachable?');
  });
});

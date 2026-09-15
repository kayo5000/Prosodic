import { env } from '@/config/env';

import { createRailwaySyncClient } from './railwaySyncClient';

describe('railwaySyncClient', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = env.syncApiUrl;
  const originalKey = env.syncApiKey;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.syncApiUrl = originalUrl;
    env.syncApiKey = originalKey;
  });

  test('push rejects a table name outside the canonical list before touching the network', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret';

    const client = createRailwaySyncClient();
    await expect(client.push('not_a_real_table', [])).rejects.toThrow(/not a syncable table/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('push refuses to call an unconfigured backend rather than silently succeeding', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    env.syncApiUrl = null;
    env.syncApiKey = null;

    const client = createRailwaySyncClient();
    await expect(client.push('events', [])).rejects.toThrow(/EXPO_PUBLIC_SYNC_API_URL is not set/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('push sends a bearer token and the table/rows body, and surfaces non-2xx as an error', async () => {
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, accepted: 1 }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createRailwaySyncClient();
    await client.push('events', [{ id: '1' }]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.railway.app/sync/push',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-key' }),
        body: JSON.stringify({ table: 'events', rows: [{ id: '1' }] }),
      }),
    );
  });

  test('push throws if the server accepts fewer rows than were sent, instead of resolving as success', async () => {
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, accepted: 1 }),
    }) as unknown as typeof fetch;

    const client = createRailwaySyncClient();
    await expect(client.push('events', [{ id: '1' }, { id: '2' }])).rejects.toThrow(
      /only accepted 1\/2 rows/,
    );
  });

  test('push throws when the server responds non-2xx', async () => {
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }) as unknown as typeof fetch;

    const client = createRailwaySyncClient();
    await expect(client.push('events', [])).rejects.toThrow(/Sync push failed for "events": 500/);
  });

  test('pull includes `since` only when provided, and hands back both rows and the sync cursor', async () => {
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret-key';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rows: [{ id: '1' }], serverTime: '2026-01-03T00:00:00.000Z' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createRailwaySyncClient();
    const result = await client.pull('events', null);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.railway.app/sync/pull?table=events',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-key' }),
      }),
    );
    // serverTime must come back to the caller — it's the next sync cursor,
    // not something the client is allowed to derive on its own.
    expect(result).toEqual({ rows: [{ id: '1' }], serverTime: '2026-01-03T00:00:00.000Z' });

    await client.pull('events', '2026-01-01T00:00:00.000Z');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://example.railway.app/sync/pull?table=events&since=2026-01-01T00%3A00%3A00.000Z',
      expect.anything(),
    );
  });
  /**
   * The failure being guarded against is not a rejection — it is a promise
   * that never settles. A server can accept the connection and then say
   * nothing, and an unguarded fetch waits forever with no error to react to.
   */
  test('every request carries an abort signal, so it cannot hang forever', async () => {
    const fetchMock = jest.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeDefined();
      return {
        ok: true,
        json: async () => ({ rows: [], serverTime: '2026-01-01T00:00:00.000Z' }),
      } as unknown as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret';

    await createRailwaySyncClient().pull('events', null);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('an aborted request surfaces as a timeout, not a bare AbortError', async () => {
    globalThis.fetch = jest.fn(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }) as unknown as typeof fetch;
    env.syncApiUrl = 'https://example.railway.app';
    env.syncApiKey = 'secret';

    await expect(createRailwaySyncClient().pull('events', null)).rejects.toThrow(/timed out/);
  });
});

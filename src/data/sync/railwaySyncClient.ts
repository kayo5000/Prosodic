import { env } from '@/config/env';

import { isSyncableTable, type SyncPullResponse, type SyncPushResponse } from './contract';
import type { SyncClient } from './syncClient';

/**
 * SyncClient implementation for the Railway-hosted Postgres backend
 * (build order step 1 decision — see CLAUDE.md). No API service is
 * deployed yet: EXPO_PUBLIC_SYNC_API_URL is unset until one exists, and
 * every call below fails loudly rather than pretending to succeed, so a
 * caller can't mistake "not deployed yet" for "synced." Use
 * `noopSyncClient` from ./syncClient for local-only development until
 * then.
 */
/**
 * How long a request may hang before it is treated as dead.
 *
 * A `fetch` with no timeout never settles when a server accepts the
 * connection and then goes silent — the caller waits forever, holding its
 * memory, with no error to react to. Silence is the failure mode that looks
 * identical to "still working," which is why it needs a hard limit rather
 * than patience.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** Wraps fetch so a server that never answers becomes an error, not a hang. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Sync request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function createRailwaySyncClient(): SyncClient {
  function assertConfigured(): { baseUrl: string; apiKey: string } {
    if (!env.syncApiUrl) {
      throw new Error('EXPO_PUBLIC_SYNC_API_URL is not set — no sync backend is configured yet.');
    }
    if (!env.syncApiKey) {
      throw new Error(
        'EXPO_PUBLIC_SYNC_API_KEY is not set — refusing to call the sync API without it.',
      );
    }
    return { baseUrl: env.syncApiUrl, apiKey: env.syncApiKey };
  }

  return {
    async push(table, rows) {
      if (!isSyncableTable(table)) {
        throw new Error(`"${table}" is not a syncable table.`);
      }
      const { baseUrl, apiKey } = assertConfigured();

      const response = await fetchWithTimeout(`${baseUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ table, rows }),
      });

      if (!response.ok) {
        throw new Error(
          `Sync push failed for "${table}": ${response.status} ${response.statusText}`,
        );
      }
      const body = (await response.json()) as SyncPushResponse;
      if (body.accepted !== rows.length) {
        // A 200 with a partial count is not success — treating it as one
        // would let a caller mark rows synced that the server never
        // actually durably accepted, silently losing them.
        throw new Error(
          `Sync push for "${table}" only accepted ${body.accepted}/${rows.length} rows.`,
        );
      }
    },

    async pull(table, since) {
      if (!isSyncableTable(table)) {
        throw new Error(`"${table}" is not a syncable table.`);
      }
      const { baseUrl, apiKey } = assertConfigured();

      const params = new URLSearchParams({ table });
      if (since) params.set('since', since);

      const response = await fetchWithTimeout(`${baseUrl}/sync/pull?${params.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        throw new Error(
          `Sync pull failed for "${table}": ${response.status} ${response.statusText}`,
        );
      }
      const body = (await response.json()) as SyncPullResponse;
      return { rows: body.rows, serverTime: body.serverTime };
    },
  };
}

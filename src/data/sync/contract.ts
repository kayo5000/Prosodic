// The HTTP contract a real sync backend must implement. This is documented
// here so the client and server sides can be built independently against
// the same shape — no server is deployed yet (see tools/codex-auditor-prompt.md
// audit notes / the step 1 status in CLAUDE.md for why that's deliberate).
//
//   POST {syncApiUrl}/sync/push
//     headers: { Authorization: `Bearer ${syncApiKey}` }
//     body:    SyncPushRequest
//     200:     SyncPushResponse
//
//   GET {syncApiUrl}/sync/pull?table=<table>&since=<iso8601|omitted>
//     headers: { Authorization: `Bearer ${syncApiKey}` }
//     200:     SyncPullResponse

export const SYNCABLE_TABLES = [
  'events',
  'rollups',
  'fingerprint',
  'goals',
  'metric_definitions',
  'song_context',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

export function isSyncableTable(value: string): value is SyncableTable {
  return (SYNCABLE_TABLES as readonly string[]).includes(value);
}

export interface SyncPushRequest {
  table: SyncableTable;
  rows: unknown[];
}

export interface SyncPushResponse {
  ok: true;
  accepted: number;
}

export interface SyncPullResponse {
  rows: unknown[];
  /** Server's clock at response time — the client's next `since` for this table. */
  serverTime: string;
}

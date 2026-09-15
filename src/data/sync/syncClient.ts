// Sync boundary. The backend host decision (step 1) is Railway — see
// ./railwaySyncClient.ts for the real implementation and ./contract.ts for
// the HTTP shape it speaks. No API service is deployed there yet (that
// needs a GitHub repo to deploy from — see CLAUDE.md current-step notes),
// so `noopSyncClient` below is still what local development should use
// until one exists.

export interface SyncPullResult {
  rows: unknown[];
  /**
   * The backend's clock at response time. A caller must persist this as
   * the table's next `since` cursor only after it has successfully
   * applied `rows` — using local device time instead would drift under
   * clock skew and either miss or re-pull rows.
   */
  serverTime: string;
}

export interface SyncClient {
  /**
   * Resolves only once every row was durably accepted. A caller may treat
   * a resolved push as license to mark those rows synced locally.
   */
  push(table: string, rows: unknown[]): Promise<void>;
  pull(table: string, since: string | null): Promise<SyncPullResult>;
}

export const noopSyncClient: SyncClient = {
  async push() {},
  async pull() {
    return { rows: [], serverTime: new Date(0).toISOString() };
  },
};

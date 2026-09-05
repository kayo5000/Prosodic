import type { SQLiteDatabaseLike } from '../db/types';

/**
 * Committed practice time toward the 10,000 hours.
 *
 * Single row by construction (`CHECK (id = 1)`), because there is one clock
 * per person and a second row could only ever mean the total had forked.
 *
 * This is the fast read, not the audit trail. The history of how the total got
 * here lives in `mastery_checkpoint` events, which are append-only — so the
 * value being updated in place here never destroys the record of how it moved.
 */

const SINGLETON_ID = 1;

export function getCommittedMs(db: SQLiteDatabaseLike): number {
  const row = db.getFirstSync<{ committed_ms: number }>(
    'SELECT committed_ms FROM mastery_state WHERE id = ?',
    [SINGLETON_ID],
  );
  return row?.committed_ms ?? 0;
}

/**
 * Writes the new total. Guards against going backwards: practice time is only
 * ever earned, so a lower value means a stale write racing a fresher one — for
 * instance a backgrounding commit landing after a later keystroke already
 * saved. Taking the max makes the write order irrelevant.
 */
export function setCommittedMs(
  db: SQLiteDatabaseLike,
  committedMs: number,
  updatedAt: string,
): void {
  db.runSync(
    `INSERT INTO mastery_state (id, committed_ms, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       committed_ms = MAX(mastery_state.committed_ms, excluded.committed_ms),
       updated_at = excluded.updated_at`,
    [SINGLETON_ID, Math.max(0, Math.round(committedMs)), updatedAt],
  );
}

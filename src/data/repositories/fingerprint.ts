import type { SQLiteDatabaseLike } from '../db/types';
import type { Fingerprint } from '../types';

interface FingerprintRow {
  metric_id: string;
  value: number | null;
  not_measured_reason: string | null;
  metric_version: number;
  computed_at: string;
}

function fromRow(row: FingerprintRow): Fingerprint {
  return {
    metricId: row.metric_id,
    value: row.value,
    notMeasuredReason: row.not_measured_reason,
    metricVersion: row.metric_version,
    computedAt: row.computed_at,
  };
}

/**
 * Fingerprint is current-state, not history — one row per metric,
 * replaced on every recompute. Rollups (not this table) are where the
 * history lives.
 *
 * A null `value` is written positively rather than by omitting the row.
 * Skipping the write would leave a previous session's number in place,
 * so a song emptied down to nothing would keep reporting the score it had
 * when it still had words in it.
 */
export function upsertFingerprint(db: SQLiteDatabaseLike, snapshot: Fingerprint): void {
  db.runSync(
    `INSERT INTO fingerprint (metric_id, value, not_measured_reason, metric_version, computed_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(metric_id) DO UPDATE SET
       value = excluded.value,
       not_measured_reason = excluded.not_measured_reason,
       metric_version = excluded.metric_version,
       computed_at = excluded.computed_at`,
    [
      snapshot.metricId,
      snapshot.value,
      snapshot.notMeasuredReason,
      snapshot.metricVersion,
      snapshot.computedAt,
    ],
  );
}

export function getFingerprint(db: SQLiteDatabaseLike, metricId: string): Fingerprint | null {
  const row = db.getFirstSync<FingerprintRow>('SELECT * FROM fingerprint WHERE metric_id = ?', [
    metricId,
  ]);
  return row ? fromRow(row) : null;
}

export function listFingerprint(db: SQLiteDatabaseLike): Fingerprint[] {
  const rows = db.getAllSync<FingerprintRow>('SELECT * FROM fingerprint ORDER BY metric_id');
  return rows.map(fromRow);
}

/**
 * Only the metrics that actually have a value. Anything rendering a
 * profile should use this rather than filtering `listFingerprint`
 * downstream, so an unmeasured metric cannot reach a chart by being
 * treated as zero.
 */
export function listMeasuredFingerprint(db: SQLiteDatabaseLike): Fingerprint[] {
  const rows = db.getAllSync<FingerprintRow>(
    'SELECT * FROM fingerprint WHERE value IS NOT NULL ORDER BY metric_id',
  );
  return rows.map(fromRow);
}

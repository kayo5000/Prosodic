import type { SQLiteDatabaseLike } from '../db/types';
import type { Rollup, RollupPeriod } from '../types';

interface RollupRow {
  id: string;
  metric_id: string;
  period: string;
  period_start: string;
  value: number | null;
  not_measured_reason: string | null;
  metric_version: number;
  computed_at: string;
}

function fromRow(row: RollupRow): Rollup {
  return {
    id: row.id,
    metricId: row.metric_id,
    period: row.period as RollupPeriod,
    periodStart: row.period_start,
    value: row.value,
    notMeasuredReason: row.not_measured_reason,
    metricVersion: row.metric_version,
    computedAt: row.computed_at,
  };
}

/**
 * One row per (metric, period, periodStart) — recomputing a period
 * overwrites its prior value rather than accumulating duplicates.
 */
export function upsertRollup(db: SQLiteDatabaseLike, rollup: Rollup): void {
  db.runSync(
    `INSERT INTO rollups (id, metric_id, period, period_start, value, not_measured_reason, metric_version, computed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(metric_id, period, period_start) DO UPDATE SET
       value = excluded.value,
       not_measured_reason = excluded.not_measured_reason,
       metric_version = excluded.metric_version,
       computed_at = excluded.computed_at`,
    [
      rollup.id,
      rollup.metricId,
      rollup.period,
      rollup.periodStart,
      rollup.value,
      rollup.notMeasuredReason,
      rollup.metricVersion,
      rollup.computedAt,
    ],
  );
}

export function listRollupsForMetric(
  db: SQLiteDatabaseLike,
  metricId: string,
  period: RollupPeriod,
): Rollup[] {
  const rows = db.getAllSync<RollupRow>(
    'SELECT * FROM rollups WHERE metric_id = ? AND period = ? ORDER BY period_start ASC',
    [metricId, period],
  );
  return rows.map(fromRow);
}

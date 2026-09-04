import { CANONICAL_METRIC_DEFINITIONS } from './canonicalMetrics';
import { withTransaction } from './db/transaction';
import type { SQLiteDatabaseLike } from './db/types';
import { upsertMetricDefinition } from './repositories/metricDefinitions';

/**
 * Seeds the canonical metric registry into `metric_definitions`.
 *
 * This has to run before anything writes a Rollup, Fingerprint, or Goal:
 * all three carry a foreign key to `metric_definitions(metric_id)` and
 * `getDb()` turns `PRAGMA foreign_keys` ON, so an unseeded registry makes
 * every downstream write fail rather than silently orphan rows.
 *
 * Idempotent — `upsertMetricDefinition` is an ON CONFLICT DO UPDATE, so
 * re-running it on every app start re-publishes any definition whose
 * display metadata or version changed in code without touching
 * `created_at`.
 */
export function seedCanonicalMetrics(db: SQLiteDatabaseLike): void {
  const now = new Date().toISOString();
  withTransaction(db, () => {
    for (const def of CANONICAL_METRIC_DEFINITIONS) {
      upsertMetricDefinition(db, { ...def, createdAt: now, updatedAt: now });
    }
  });
}

/** Every metric_id the canonical namespace recognises. */
export const CANONICAL_METRIC_IDS: ReadonlySet<string> = new Set(
  CANONICAL_METRIC_DEFINITIONS.map((d) => d.metricId),
);

/** The version each metric_id is currently calibrated under. */
export const CANONICAL_METRIC_VERSIONS: ReadonlyMap<string, number> = new Map(
  CANONICAL_METRIC_DEFINITIONS.map((d) => [d.metricId, d.version]),
);

import type { SQLiteDatabaseLike } from '../db/types';
import type { MetricDefinition } from '../types';

interface MetricDefinitionRow {
  metric_id: string;
  family: string;
  score_type: string;
  unit: string | null;
  direction: string;
  aggregation: string;
  display_json: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function fromRow(row: MetricDefinitionRow): MetricDefinition {
  return {
    metricId: row.metric_id,
    family: row.family as MetricDefinition['family'],
    scoreType: row.score_type as MetricDefinition['scoreType'],
    unit: row.unit,
    direction: row.direction as MetricDefinition['direction'],
    aggregation: row.aggregation as MetricDefinition['aggregation'],
    display: JSON.parse(row.display_json) as MetricDefinition['display'],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Insert or fully replace a metric definition. This is the canonical
 * registry — calibration adapters (build order step 4) are the only
 * expected caller once they exist; nothing else should be minting
 * metric_ids.
 */
export function upsertMetricDefinition(db: SQLiteDatabaseLike, def: MetricDefinition): void {
  db.runSync(
    `INSERT INTO metric_definitions
       (metric_id, family, score_type, unit, direction, aggregation, display_json, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(metric_id) DO UPDATE SET
       family = excluded.family,
       score_type = excluded.score_type,
       unit = excluded.unit,
       direction = excluded.direction,
       aggregation = excluded.aggregation,
       display_json = excluded.display_json,
       version = excluded.version,
       updated_at = excluded.updated_at`,
    [
      def.metricId,
      def.family,
      def.scoreType,
      def.unit,
      def.direction,
      def.aggregation,
      JSON.stringify(def.display),
      def.version,
      def.createdAt,
      def.updatedAt,
    ],
  );
}

export function getMetricDefinition(
  db: SQLiteDatabaseLike,
  metricId: string,
): MetricDefinition | null {
  const row = db.getFirstSync<MetricDefinitionRow>(
    'SELECT * FROM metric_definitions WHERE metric_id = ?',
    [metricId],
  );
  return row ? fromRow(row) : null;
}

export function listMetricDefinitions(db: SQLiteDatabaseLike): MetricDefinition[] {
  const rows = db.getAllSync<MetricDefinitionRow>(
    'SELECT * FROM metric_definitions ORDER BY metric_id',
  );
  return rows.map(fromRow);
}

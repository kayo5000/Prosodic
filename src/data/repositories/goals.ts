import type { SQLiteDatabaseLike } from '../db/types';
import type { Goal } from '../types';

interface GoalRow {
  id: string;
  metric_id: string;
  direction: string;
  target_value: number | null;
  active: number;
  created_at: string;
  archived_at: string | null;
}

function fromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    metricId: row.metric_id,
    direction: row.direction as Goal['direction'],
    targetValue: row.target_value,
    active: row.active === 1,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

export function insertGoal(db: SQLiteDatabaseLike, goal: Goal): void {
  db.runSync(
    `INSERT INTO goals (id, metric_id, direction, target_value, active, created_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.metricId,
      goal.direction,
      goal.targetValue,
      goal.active ? 1 : 0,
      goal.createdAt,
      goal.archivedAt,
    ],
  );
}

export function archiveGoal(db: SQLiteDatabaseLike, id: string, archivedAt: string): void {
  db.runSync('UPDATE goals SET active = 0, archived_at = ? WHERE id = ?', [archivedAt, id]);
}

/**
 * The flaw detector (build order step 7) must only ever look at metrics
 * the user actively opted into — this is the query that enforces that
 * gate at the data layer, not just in UI copy.
 */
export function listActiveGoals(db: SQLiteDatabaseLike): Goal[] {
  const rows = db.getAllSync<GoalRow>(
    'SELECT * FROM goals WHERE active = 1 ORDER BY created_at ASC',
  );
  return rows.map(fromRow);
}

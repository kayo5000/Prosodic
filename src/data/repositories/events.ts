import type { SQLiteDatabaseLike } from '../db/types';
import type { Event, EventType } from '../types';

interface EventRow {
  id: string;
  type: string;
  song_id: string | null;
  occurred_at: string;
  payload_json: string;
  created_at: string;
  synced_at: string | null;
}

function fromRow(row: EventRow): Event {
  return {
    id: row.id,
    type: row.type as EventType,
    songId: row.song_id,
    occurredAt: row.occurred_at,
    payload: JSON.parse(row.payload_json),
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  };
}

/**
 * Events are append-only. The Mastery Countdown and every rollup read
 * these directly — do not add an update path here; a correction is a new
 * event, not a mutation of history.
 */
export function insertEvent(db: SQLiteDatabaseLike, event: Event): void {
  db.runSync(
    `INSERT INTO events (id, type, song_id, occurred_at, payload_json, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.type,
      event.songId,
      event.occurredAt,
      JSON.stringify(event.payload),
      event.createdAt,
      event.syncedAt,
    ],
  );
}

export function listEventsByType(
  db: SQLiteDatabaseLike,
  type: EventType,
  options: { since?: string; songId?: string; limit?: number; offset?: number } = {},
): Event[] {
  const clauses = ['type = ?'];
  const params: (string | number | null)[] = [type];

  if (options.since) {
    clauses.push('occurred_at >= ?');
    params.push(options.since);
  }
  if (options.songId) {
    clauses.push('song_id = ?');
    params.push(options.songId);
  }

  // LIMIT/OFFSET are bound, not interpolated. They are typed `number` here,
  // but TypeScript types are erased at runtime — the moment one of these
  // arrives from a sync payload, a deep link, or stored JSON, a string
  // carrying SQL would have been concatenated straight into the statement.
  let limitClause = '';
  if (options.limit !== undefined) {
    limitClause = ' LIMIT ? OFFSET ?';
    params.push(options.limit, options.offset ?? 0);
  }

  const rows = db.getAllSync<EventRow>(
    `SELECT * FROM events WHERE ${clauses.join(' AND ')} ORDER BY occurred_at ASC${limitClause}`,
    params,
  );
  return rows.map(fromRow);
}

export function listEventsBySongId(
  db: SQLiteDatabaseLike,
  songId: string,
  limit: number = 100,
  offset: number = 0,
): Event[] {
  const rows = db.getAllSync<EventRow>(
    'SELECT * FROM events WHERE song_id = ? ORDER BY occurred_at DESC LIMIT ? OFFSET ?',
    [songId, limit, offset],
  );
  return rows.map(fromRow);
}

export function listUnsyncedEvents(db: SQLiteDatabaseLike): Event[] {
  const rows = db.getAllSync<EventRow>(
    'SELECT * FROM events WHERE synced_at IS NULL ORDER BY created_at ASC',
  );
  return rows.map(fromRow);
}

export function markEventsSynced(db: SQLiteDatabaseLike, ids: string[], syncedAt: string): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  db.runSync(`UPDATE events SET synced_at = ? WHERE id IN (${placeholders})`, [syncedAt, ...ids]);
}

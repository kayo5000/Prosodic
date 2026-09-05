import type { SQLiteDatabaseLike } from '../db/types';
import type { PerformanceMode, VoiceTake } from '../types';

interface VoiceTakeRow {
  id: string;
  song_id: string;
  uri: string;
  duration_ms: number;
  recorded_at: string;
  performance_mode: string | null;
  mode_set_at: string | null;
  created_at: string;
}

function fromRow(row: VoiceTakeRow): VoiceTake {
  return {
    id: row.id,
    songId: row.song_id,
    uri: row.uri,
    durationMs: row.duration_ms,
    recordedAt: row.recorded_at,
    performanceMode: (row.performance_mode as PerformanceMode | null) ?? null,
    modeSetAt: row.mode_set_at,
    createdAt: row.created_at,
  };
}

/**
 * Takes are append-only, same discipline as Events — a bad take isn't
 * corrected in place, it's deleted (see deleteVoiceTake) or superseded by
 * a new one. Nothing here ever updates uri/durationMs on an existing row.
 */
export function insertVoiceTake(db: SQLiteDatabaseLike, take: VoiceTake): void {
  db.runSync(
    `INSERT INTO voice_takes
       (id, song_id, uri, duration_ms, recorded_at, performance_mode, mode_set_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      take.id,
      take.songId,
      take.uri,
      take.durationMs,
      take.recordedAt,
      take.performanceMode,
      take.modeSetAt,
      take.createdAt,
    ],
  );
}

export function listVoiceTakesBySongId(db: SQLiteDatabaseLike, songId: string): VoiceTake[] {
  const rows = db.getAllSync<VoiceTakeRow>(
    'SELECT * FROM voice_takes WHERE song_id = ? ORDER BY recorded_at DESC',
    [songId],
  );
  return rows.map(fromRow);
}

/** Discards a take. Does not touch the underlying audio file on disk. */
export function deleteVoiceTake(db: SQLiteDatabaseLike, id: string): void {
  db.runSync('DELETE FROM voice_takes WHERE id = ?', [id]);
}

/**
 * Records what a take actually was, or corrects an earlier answer.
 *
 * Unlike the rest of this table, the mode IS updated in place — it is the one
 * field the user is expected to revise later ("that was written, not off the
 * top"). The audit trail lives in Events instead: the caller writes a
 * `mastery_checkpoint`-style correction event so the history of the change is
 * append-only even though the current value is not.
 */
export function setPerformanceMode(
  db: SQLiteDatabaseLike,
  takeId: string,
  mode: PerformanceMode | null,
  setAt: string,
): void {
  db.runSync('UPDATE voice_takes SET performance_mode = ?, mode_set_at = ? WHERE id = ?', [
    mode,
    setAt,
    takeId,
  ]);
}

/**
 * Takes still awaiting an answer. Null mode is never assumed to be freestyle —
 * an unclassified take is excluded from every mode-conditioned baseline rather
 * than guessed into one.
 */
export function listUnclassifiedTakes(db: SQLiteDatabaseLike, songId: string): VoiceTake[] {
  const rows = db.getAllSync<VoiceTakeRow>(
    'SELECT * FROM voice_takes WHERE song_id = ? AND performance_mode IS NULL ORDER BY recorded_at DESC',
    [songId],
  );
  return rows.map(fromRow);
}

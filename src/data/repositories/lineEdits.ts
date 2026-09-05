import type { SQLiteDatabaseLike } from '../db/types';
import type { LineEdit } from '../types';

interface LineEditRow {
  id: string;
  song_id: string;
  line_index: number;
  line_hash: string;
  kind: string;
  chars_added: number;
  chars_removed: number;
  occurred_at: string;
  created_at: string;
}

function fromRow(row: LineEditRow): LineEdit {
  return {
    id: row.id,
    songId: row.song_id,
    lineIndex: row.line_index,
    lineHash: row.line_hash,
    kind: row.kind as LineEdit['kind'],
    charsAdded: row.chars_added,
    charsRemoved: row.chars_removed,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

/**
 * Append-only, same discipline as Events. A revision is never corrected in
 * place — the history of how a line got written is the whole point, so
 * rewriting it would destroy exactly what this table exists to keep.
 */
export function insertLineEdits(db: SQLiteDatabaseLike, edits: LineEdit[]): void {
  for (const edit of edits) {
    db.runSync(
      `INSERT INTO line_edits
         (id, song_id, line_index, line_hash, kind, chars_added, chars_removed, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        edit.id,
        edit.songId,
        edit.lineIndex,
        edit.lineHash,
        edit.kind,
        edit.charsAdded,
        edit.charsRemoved,
        edit.occurredAt,
        edit.createdAt,
      ],
    );
  }
}

export function listLineEditsBySongId(db: SQLiteDatabaseLike, songId: string): LineEdit[] {
  const rows = db.getAllSync<LineEditRow>(
    'SELECT * FROM line_edits WHERE song_id = ? ORDER BY occurred_at ASC',
    [songId],
  );
  return rows.map(fromRow);
}

/**
 * Revision count per line position for one song — the shape the eventual
 * "where do you fight" finding reads. Not called in production yet.
 */
export function countEditsByLine(
  db: SQLiteDatabaseLike,
  songId: string,
): { lineIndex: number; edits: number }[] {
  const rows = db.getAllSync<{ line_index: number; edits: number }>(
    `SELECT line_index, COUNT(*) as edits
       FROM line_edits
      WHERE song_id = ?
   GROUP BY line_index
   ORDER BY line_index ASC`,
    [songId],
  );
  return rows.map((r) => ({ lineIndex: r.line_index, edits: r.edits }));
}

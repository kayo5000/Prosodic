import type { SQLiteDatabaseLike } from '../db/types';
import type { SongContext } from '../types';

interface SongContextRow {
  id: string;
  title: string;
  input_mode: string;
  bpm: number | null;
  bpm_source: string | null;
  structure_json: string | null;
  body_text: string | null;
  backing_track_uri: string | null;
  audio_offset_ms: number | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: SongContextRow): SongContext {
  return {
    id: row.id,
    title: row.title,
    inputMode: row.input_mode as SongContext['inputMode'],
    bpm: row.bpm,
    bpmSource: row.bpm_source as SongContext['bpmSource'],
    structure: row.structure_json ? JSON.parse(row.structure_json) : null,
    bodyText: row.body_text,
    backingTrackUri: row.backing_track_uri,
    audioOffsetMs: row.audio_offset_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertSongContext(db: SQLiteDatabaseLike, song: SongContext): void {
  db.runSync(
    `INSERT INTO song_context
       (id, title, input_mode, bpm, bpm_source, structure_json, body_text,
        backing_track_uri, audio_offset_ms, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      song.id,
      song.title,
      song.inputMode,
      song.bpm,
      song.bpmSource,
      song.structure ? JSON.stringify(song.structure) : null,
      song.bodyText,
      song.backingTrackUri ?? null,
      song.audioOffsetMs ?? null,
      song.createdAt,
      song.updatedAt,
    ],
  );
}

/**
 * Attaches (or clears, with null) the imported instrumental for a song.
 * Offset is stored alongside because a track and the point it lines up at
 * are one fact — writing them separately lets them drift, the same failure
 * the bpm/bpm_source pair is written together to avoid.
 */
export function setBackingTrack(
  db: SQLiteDatabaseLike,
  songId: string,
  uri: string | null,
  offsetMs: number | null,
  updatedAt: string,
): void {
  db.runSync(
    'UPDATE song_context SET backing_track_uri = ?, audio_offset_ms = ?, updated_at = ? WHERE id = ?',
    [uri, offsetMs, updatedAt, songId],
  );
}

/**
 * BPM is the one field two independent sources can write
 * (`bpm_source: 'user' | 'detected'`). This always overwrites both bpm and
 * bpm_source together so the pair never drifts out of sync with each
 * other — see CLAUDE.md's calibration/BPM warning.
 */
export function setSongBpm(
  db: SQLiteDatabaseLike,
  songId: string,
  bpm: number,
  source: SongContext['bpmSource'],
  updatedAt: string,
): void {
  db.runSync('UPDATE song_context SET bpm = ?, bpm_source = ?, updated_at = ? WHERE id = ?', [
    bpm,
    source,
    updatedAt,
    songId,
  ]);
}

/** The autosave path for the text input mode — offline-resume reads this back on relaunch. */
export function updateSongBodyText(
  db: SQLiteDatabaseLike,
  songId: string,
  bodyText: string,
  updatedAt: string,
): void {
  db.runSync('UPDATE song_context SET body_text = ?, updated_at = ? WHERE id = ?', [
    bodyText,
    updatedAt,
    songId,
  ]);
}

/** Updates the active song's title. */
export function updateSongTitle(
  db: SQLiteDatabaseLike,
  songId: string,
  title: string,
  updatedAt: string,
): void {
  db.runSync('UPDATE song_context SET title = ?, updated_at = ? WHERE id = ?', [
    title,
    updatedAt,
    songId,
  ]);
}

/** Deletes a song and cascades to clean up. */
export function deleteSongContext(db: SQLiteDatabaseLike, songId: string): void {
  db.runSync('DELETE FROM song_context WHERE id = ?', [songId]);
}

export function getSongContext(db: SQLiteDatabaseLike, id: string): SongContext | null {
  const row = db.getFirstSync<SongContextRow>('SELECT * FROM song_context WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

/** Paged list of all song contexts sorted by most recently updated. */
export function listSongContexts(
  db: SQLiteDatabaseLike,
  limit: number = 50,
  offset: number = 0,
): SongContext[] {
  const rows = db.getAllSync<SongContextRow>(
    'SELECT * FROM song_context ORDER BY updated_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows.map(fromRow);
}

/**
 * Offline resume for the Song View: the draft most recently touched,
 * regardless of input mode.
 */
export function getMostRecentSongContext(db: SQLiteDatabaseLike): SongContext | null {
  const row = db.getFirstSync<SongContextRow>(
    'SELECT * FROM song_context ORDER BY updated_at DESC LIMIT 1',
  );
  return row ? fromRow(row) : null;
}

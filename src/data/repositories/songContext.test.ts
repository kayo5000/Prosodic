import { createFakeDb } from '../db/testUtils';
import type { SongContext } from '../types';
import {
  deleteSongContext,
  getMostRecentSongContext,
  getSongContext,
  insertSongContext,
  listSongContexts,
  setBackingTrack,
  setSongBpm,
  updateSongBodyText,
  updateSongTitle,
} from './songContext';

const sample: SongContext = {
  id: 'song-1',
  title: 'Untitled',
  inputMode: 'text',
  bpm: null,
  bpmSource: null,
  structure: [{ label: 'verse', startBar: 1, endBar: 16 }],
  bodyText: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('songContext repository', () => {
  test('insertSongContext JSON-encodes structure and passes null bpm/body fields through', () => {
    const { db, calls } = createFakeDb();
    insertSongContext(db, sample);

    expect(calls[0].params).toEqual([
      'song-1',
      'Untitled',
      'text',
      null,
      null,
      JSON.stringify(sample.structure),
      null,
      null, // backing_track_uri — absent on a text-only draft
      null, // audio_offset_ms
      sample.createdAt,
      sample.updatedAt,
    ]);
  });

  test('a null structure is stored as null, not the string "null"', () => {
    const { db, calls } = createFakeDb();
    insertSongContext(db, { ...sample, structure: null });
    expect(calls[0].params?.[5]).toBeNull();
  });

  test('setSongBpm always writes bpm and bpm_source together, never one without the other', () => {
    const { db, calls } = createFakeDb();
    setSongBpm(db, 'song-1', 128, 'detected', '2026-01-02T00:00:00.000Z');

    expect(calls[0].sql).toContain('SET bpm = ?, bpm_source = ?');
    expect(calls[0].params).toEqual([128, 'detected', '2026-01-02T00:00:00.000Z', 'song-1']);
  });

  test('updateSongBodyText is the text-mode autosave path', () => {
    const { db, calls } = createFakeDb();
    updateSongBodyText(db, 'song-1', 'verse one...', '2026-01-02T00:00:00.000Z');

    expect(calls[0].sql).toContain('SET body_text = ?');
    expect(calls[0].params).toEqual(['verse one...', '2026-01-02T00:00:00.000Z', 'song-1']);
  });

  test('updateSongTitle updates the song title and updatedAt timestamp', () => {
    const { db, calls } = createFakeDb();
    updateSongTitle(db, 'song-1', 'New Track Title', '2026-01-02T00:00:00.000Z');

    expect(calls[0].sql).toContain('UPDATE song_context SET title = ?, updated_at = ?');
    expect(calls[0].params).toEqual(['New Track Title', '2026-01-02T00:00:00.000Z', 'song-1']);
  });

  test('deleteSongContext removes the song row by ID', () => {
    const { db, calls } = createFakeDb();
    deleteSongContext(db, 'song-1');

    expect(calls[0].sql).toContain('DELETE FROM song_context WHERE id = ?');
    expect(calls[0].params).toEqual(['song-1']);
  });

  test('getSongContext round-trips a row back into a SongContext', () => {
    const { db } = createFakeDb({
      getFirstResult: {
        id: sample.id,
        title: sample.title,
        input_mode: sample.inputMode,
        bpm: sample.bpm,
        bpm_source: sample.bpmSource,
        structure_json: JSON.stringify(sample.structure),
        body_text: sample.bodyText,
        created_at: sample.createdAt,
        updated_at: sample.updatedAt,
      },
    });

    expect(getSongContext(db, 'song-1')).toEqual(sample);
  });

  test('listSongContexts orders by updated_at descending with pagination', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });
    listSongContexts(db, 25, 10);
    expect(calls[0].sql).toContain('ORDER BY updated_at DESC LIMIT ? OFFSET ?');
    expect(calls[0].params).toEqual([25, 10]);
  });

  test('getMostRecentSongContext is the offline-resume read — most recently touched draft, LIMIT 1', () => {
    const { db, calls } = createFakeDb({ getFirstResult: null });
    expect(getMostRecentSongContext(db)).toBeNull();
    expect(calls[0].sql).toContain('ORDER BY updated_at DESC LIMIT 1');
  });
});

describe('backing track', () => {
  test('setBackingTrack writes uri and offset together so they cannot drift', () => {
    const { db, calls } = createFakeDb();
    setBackingTrack(db, 'song_1', 'file:///beat.mp3', 120, '2026-09-04T00:00:00.000Z');
    expect(calls[0].sql).toContain('backing_track_uri = ?');
    expect(calls[0].sql).toContain('audio_offset_ms = ?');
    expect(calls[0].params).toEqual([
      'file:///beat.mp3',
      120,
      '2026-09-04T00:00:00.000Z',
      'song_1',
    ]);
  });

  test('setBackingTrack with null clears the track', () => {
    const { db, calls } = createFakeDb();
    setBackingTrack(db, 'song_1', null, null, '2026-09-04T00:00:00.000Z');
    expect(calls[0].params?.[0]).toBeNull();
    expect(calls[0].params?.[1]).toBeNull();
  });

  test('a row with no backing track maps back to null, not undefined', () => {
    const { db } = createFakeDb({
      getFirstResult: {
        id: 'song_1',
        title: 'Untitled',
        input_mode: 'text',
        bpm: 90,
        bpm_source: 'user',
        structure_json: null,
        body_text: '',
        backing_track_uri: null,
        audio_offset_ms: null,
        created_at: '2026-09-04T00:00:00.000Z',
        updated_at: '2026-09-04T00:00:00.000Z',
      },
    });
    const song = getSongContext(db, 'song_1');
    expect(song?.backingTrackUri).toBeNull();
    expect(song?.audioOffsetMs).toBeNull();
  });
});

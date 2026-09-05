import { createFakeDb } from '../db/testUtils';
import type { VoiceTake } from '../types';
import {
  deleteVoiceTake,
  insertVoiceTake,
  listUnclassifiedTakes,
  listVoiceTakesBySongId,
  setPerformanceMode,
} from './voiceTakes';

const sample: VoiceTake = {
  id: 'take_1',
  songId: 'song_1',
  uri: 'file:///var/mobile/recordings/take_1.m4a',
  durationMs: 9800,
  recordedAt: '2026-09-04T00:00:00.000Z',
  performanceMode: null,
  modeSetAt: null,
  createdAt: '2026-09-04T00:00:00.000Z',
};

describe('voiceTakes repository', () => {
  test('insertVoiceTake writes every field, append-only (no ON CONFLICT clause)', () => {
    const { db, calls } = createFakeDb();
    insertVoiceTake(db, sample);
    expect(calls[0].sql).toContain('INSERT INTO voice_takes');
    expect(calls[0].sql).not.toContain('ON CONFLICT');
    expect(calls[0].params).toEqual([
      'take_1',
      'song_1',
      'file:///var/mobile/recordings/take_1.m4a',
      9800,
      '2026-09-04T00:00:00.000Z',
      null, // performance_mode — asked after the take, not assumed
      null, // mode_set_at
      '2026-09-04T00:00:00.000Z',
    ]);
  });

  test('listVoiceTakesBySongId scopes to one song and orders newest first', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });
    listVoiceTakesBySongId(db, 'song_1');
    expect(calls[0].sql).toContain('WHERE song_id = ?');
    expect(calls[0].sql).toContain('ORDER BY recorded_at DESC');
    expect(calls[0].params).toEqual(['song_1']);
  });

  test('listVoiceTakesBySongId maps snake_case rows back to VoiceTake', () => {
    const { db } = createFakeDb({
      getAllResult: [
        {
          id: 'take_1',
          song_id: 'song_1',
          uri: 'file:///var/mobile/recordings/take_1.m4a',
          duration_ms: 9800,
          recorded_at: '2026-09-04T00:00:00.000Z',
          performance_mode: null,
          mode_set_at: null,
          created_at: '2026-09-04T00:00:00.000Z',
        },
      ],
    });
    expect(listVoiceTakesBySongId(db, 'song_1')).toEqual([sample]);
  });

  test('listVoiceTakesBySongId returns an empty array for a song with no takes yet', () => {
    const { db } = createFakeDb({ getAllResult: [] });
    expect(listVoiceTakesBySongId(db, 'song_with_no_takes')).toEqual([]);
  });

  test('deleteVoiceTake removes exactly the requested row', () => {
    const { db, calls } = createFakeDb();
    deleteVoiceTake(db, 'take_1');
    expect(calls[0].sql).toBe('DELETE FROM voice_takes WHERE id = ?');
    expect(calls[0].params).toEqual(['take_1']);
  });
});

describe('performance mode', () => {
  test('a new take is stored unclassified — never defaulted to freestyle', () => {
    const { db, calls } = createFakeDb();
    insertVoiceTake(db, sample);
    // performance_mode is the 6th bound parameter
    expect(calls[0].params?.[5]).toBeNull();
  });

  test('setPerformanceMode records the answer and when it was given', () => {
    const { db, calls } = createFakeDb();
    setPerformanceMode(db, 'take_1', 'freestyle', '2026-09-05T00:00:00.000Z');
    expect(calls[0].sql).toContain('UPDATE voice_takes SET performance_mode = ?');
    expect(calls[0].params).toEqual(['freestyle', '2026-09-05T00:00:00.000Z', 'take_1']);
  });

  test('a later correction overwrites the earlier answer', () => {
    const { db, calls } = createFakeDb();
    setPerformanceMode(db, 'take_1', 'freestyle', '2026-09-05T00:00:00.000Z');
    setPerformanceMode(db, 'take_1', 'other_artist', '2026-09-08T00:00:00.000Z');
    expect(calls[1].params?.[0]).toBe('other_artist');
    expect(calls[1].params?.[1]).toBe('2026-09-08T00:00:00.000Z');
  });

  test('every mode in the union is accepted, including other_artist', () => {
    const { db, calls } = createFakeDb();
    for (const mode of ['freestyle', 'written', 'other_artist', 'mixed'] as const) {
      setPerformanceMode(db, 'take_1', mode, '2026-09-05T00:00:00.000Z');
    }
    expect(calls.map((c) => c.params?.[0])).toEqual([
      'freestyle',
      'written',
      'other_artist',
      'mixed',
    ]);
  });

  test('listUnclassifiedTakes asks only for takes with no answer yet', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });
    listUnclassifiedTakes(db, 'song_1');
    expect(calls[0].sql).toContain('performance_mode IS NULL');
    expect(calls[0].params).toEqual(['song_1']);
  });
});

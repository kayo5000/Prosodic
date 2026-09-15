import { createFakeDb } from '../db/testUtils';
import type { Event } from '../types';
import { insertEvent, listEventsByType, listUnsyncedEvents, markEventsSynced } from './events';

const sample: Event = {
  id: 'evt-1',
  type: 'keystroke_timer_tick',
  songId: 'song-1',
  occurredAt: '2026-01-01T00:00:00.000Z',
  payload: { deltaSeconds: 30 },
  createdAt: '2026-01-01T00:00:00.500Z',
  syncedAt: null,
};

describe('events repository', () => {
  test('insertEvent JSON-encodes the payload and binds every column', () => {
    const { db, calls } = createFakeDb();

    insertEvent(db, sample);

    const call = calls.find((c) => c.method === 'runSync');
    expect(call?.params).toEqual([
      'evt-1',
      'keystroke_timer_tick',
      'song-1',
      sample.occurredAt,
      JSON.stringify(sample.payload),
      sample.createdAt,
      null,
    ]);
  });

  /**
   * LIMIT and OFFSET were concatenated into the SQL string. They are typed
   * `number`, but that guarantee is erased at runtime — a value arriving from
   * a sync payload or stored JSON would have been interpolated directly into
   * the statement. Flagged by Aikido SAST; the fix is to bind them.
   */
  test('listEventsByType binds LIMIT and OFFSET instead of interpolating them', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });

    listEventsByType(db, 'keystroke_timer_tick', { limit: 50, offset: 10 });

    const call = calls.find((c) => c.method === 'getAllSync');
    expect(call?.sql).toContain('LIMIT ? OFFSET ?');
    expect(call?.sql).not.toMatch(/LIMIT\s+\d/);
    expect(call?.params).toEqual(['keystroke_timer_tick', 50, 10]);
  });

  test('a hostile limit lands as a bound value, never as SQL', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });

    // Types are erased at runtime; this is what an untrusted payload looks like.
    listEventsByType(db, 'keystroke_timer_tick', {
      limit: '1; DROP TABLE events' as unknown as number,
    });

    const call = calls.find((c) => c.method === 'getAllSync');
    expect(call?.sql).not.toContain('DROP TABLE');
    expect(call?.params).toContain('1; DROP TABLE events');
  });

  test('listEventsByType only adds since/songId clauses when provided', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });

    listEventsByType(db, 'keystroke_timer_tick');
    listEventsByType(db, 'keystroke_timer_tick', { since: '2026-01-01T00:00:00.000Z' });
    listEventsByType(db, 'keystroke_timer_tick', {
      since: '2026-01-01T00:00:00.000Z',
      songId: 'song-1',
    });

    const [bare, withSince, withBoth] = calls.filter((c) => c.method === 'getAllSync');
    expect(bare.sql).not.toMatch(/occurred_at >= \?|song_id = \?/);
    expect(bare.params).toEqual(['keystroke_timer_tick']);

    expect(withSince.sql).toContain('occurred_at >= ?');
    expect(withSince.params).toEqual(['keystroke_timer_tick', '2026-01-01T00:00:00.000Z']);

    expect(withBoth.sql).toContain('occurred_at >= ?');
    expect(withBoth.sql).toContain('song_id = ?');
    expect(withBoth.params).toEqual(['keystroke_timer_tick', '2026-01-01T00:00:00.000Z', 'song-1']);
  });

  test('listEventsByType round-trips a row back into an Event', () => {
    const { db } = createFakeDb({
      getAllResult: [
        {
          id: sample.id,
          type: sample.type,
          song_id: sample.songId,
          occurred_at: sample.occurredAt,
          payload_json: JSON.stringify(sample.payload),
          created_at: sample.createdAt,
          synced_at: sample.syncedAt,
        },
      ],
    });

    expect(listEventsByType(db, 'keystroke_timer_tick')).toEqual([sample]);
  });

  test('listUnsyncedEvents queries synced_at IS NULL', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });
    listUnsyncedEvents(db);
    expect(calls[0].sql).toContain('synced_at IS NULL');
  });

  test('markEventsSynced is a no-op for an empty id list and never touches the db', () => {
    const { db, calls } = createFakeDb();
    markEventsSynced(db, [], '2026-01-01T00:00:00.000Z');
    expect(calls).toHaveLength(0);
  });

  test('markEventsSynced binds one placeholder per id', () => {
    const { db, calls } = createFakeDb();
    markEventsSynced(db, ['evt-1', 'evt-2'], '2026-01-01T00:00:00.000Z');

    const call = calls[0];
    expect(call.sql).toContain('IN (?, ?)');
    expect(call.params).toEqual(['2026-01-01T00:00:00.000Z', 'evt-1', 'evt-2']);
  });
});

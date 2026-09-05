import { createFakeDb } from '../db/testUtils';
import { getCommittedMs, setCommittedMs } from './mastery';

describe('mastery repository', () => {
  test('a fresh install has zero practice committed', () => {
    const { db } = createFakeDb({ getFirstResult: null });
    expect(getCommittedMs(db)).toBe(0);
  });

  test('reads the single row', () => {
    const { db, calls } = createFakeDb({ getFirstResult: { committed_ms: 7_200_000 } });
    expect(getCommittedMs(db)).toBe(7_200_000);
    expect(calls[0].params).toEqual([1]);
  });

  test('writes to the singleton row', () => {
    const { db, calls } = createFakeDb();
    setCommittedMs(db, 5_000, '2026-09-05T00:00:00.000Z');
    expect(calls[0].sql).toContain('INSERT INTO mastery_state');
    expect(calls[0].params).toEqual([1, 5_000, '2026-09-05T00:00:00.000Z']);
  });

  /**
   * Practice time is only ever earned. A lower incoming value means a stale
   * write arrived late — for instance a backgrounding commit landing after a
   * keystroke already saved a higher total.
   */
  test('never lets the total go backwards', () => {
    const { db, calls } = createFakeDb();
    setCommittedMs(db, 5_000, '2026-09-05T00:00:00.000Z');
    expect(calls[0].sql).toContain('MAX(mastery_state.committed_ms, excluded.committed_ms)');
  });

  test('rounds to whole milliseconds and clamps negatives', () => {
    const { db, calls } = createFakeDb();
    setCommittedMs(db, 1_234.7, '2026-09-05T00:00:00.000Z');
    setCommittedMs(db, -50, '2026-09-05T00:00:00.000Z');
    expect(calls[0].params?.[1]).toBe(1_235);
    expect(calls[1].params?.[1]).toBe(0);
  });
});

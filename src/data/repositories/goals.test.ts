import { createFakeDb } from '../db/testUtils';
import type { Goal } from '../types';
import { archiveGoal, insertGoal, listActiveGoals } from './goals';

const sample: Goal = {
  id: 'goal-1',
  metricId: 'rhyme.variety',
  direction: 'increase',
  targetValue: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

describe('goals repository', () => {
  test('insertGoal stores the active flag as 0/1', () => {
    const { db, calls } = createFakeDb();
    insertGoal(db, sample);
    expect(calls[0].params).toEqual([
      'goal-1',
      'rhyme.variety',
      'increase',
      null,
      1,
      sample.createdAt,
      null,
    ]);
  });

  test('archiveGoal flips active off and stamps archivedAt', () => {
    const { db, calls } = createFakeDb();
    archiveGoal(db, 'goal-1', '2026-02-01T00:00:00.000Z');
    expect(calls[0].sql).toContain('SET active = 0');
    expect(calls[0].params).toEqual(['2026-02-01T00:00:00.000Z', 'goal-1']);
  });

  test('listActiveGoals only queries active = 1 — this is the flaw-detector opt-in gate', () => {
    const { db, calls } = createFakeDb({
      getAllResult: [
        {
          id: 'goal-1',
          metric_id: 'rhyme.variety',
          direction: 'increase',
          target_value: null,
          active: 1,
          created_at: sample.createdAt,
          archived_at: null,
        },
      ],
    });

    expect(calls.length).toBe(0); // no query has run yet
    const result = listActiveGoals(db);

    expect(calls[0].sql).toContain('WHERE active = 1');
    expect(result).toEqual([sample]);
  });
});

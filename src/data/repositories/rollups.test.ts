import { createFakeDb } from '../db/testUtils';
import type { Rollup } from '../types';
import { listRollupsForMetric, upsertRollup } from './rollups';

const sample: Rollup = {
  id: 'roll-1',
  metricId: 'rhyme.density',
  period: 'weekly',
  periodStart: '2026-01-05',
  value: 0.62,
  notMeasuredReason: null,
  metricVersion: 1,
  computedAt: '2026-01-12T00:00:00.000Z',
};

describe('rollups repository', () => {
  test('upsertRollup conflicts on the (metric_id, period, period_start) triple', () => {
    const { db, calls } = createFakeDb();
    upsertRollup(db, sample);
    expect(calls[0].sql).toContain('ON CONFLICT(metric_id, period, period_start)');
    expect(calls[0].params).toEqual([
      'roll-1',
      'rhyme.density',
      'weekly',
      '2026-01-05',
      0.62,
      null,
      1,
      sample.computedAt,
    ]);
  });

  test('listRollupsForMetric filters by metric and period, ordered oldest-first', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });
    listRollupsForMetric(db, 'rhyme.density', 'weekly');
    expect(calls[0].sql).toContain('ORDER BY period_start ASC');
    expect(calls[0].params).toEqual(['rhyme.density', 'weekly']);
  });
});

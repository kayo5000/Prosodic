import { createFakeDb } from '../db/testUtils';
import type { Fingerprint } from '../types';
import { getFingerprint, upsertFingerprint } from './fingerprint';

const sample: Fingerprint = {
  metricId: 'rhyme.density',
  value: 0.62,
  notMeasuredReason: null,
  metricVersion: 1,
  computedAt: '2026-01-12T00:00:00.000Z',
};

describe('fingerprint repository', () => {
  test('upsertFingerprint replaces the single current-state row for a metric', () => {
    const { db, calls } = createFakeDb();
    upsertFingerprint(db, sample);
    expect(calls[0].sql).toContain('ON CONFLICT(metric_id) DO UPDATE');
    expect(calls[0].params).toEqual(['rhyme.density', 0.62, null, 1, sample.computedAt]);
  });

  test('writes an absence positively, so a stale value cannot survive it', () => {
    const { db, calls } = createFakeDb();
    upsertFingerprint(db, {
      ...sample,
      value: null,
      notMeasuredReason: 'needs_two_bars_for_variance',
    });
    // The row is written, not skipped: skipping would leave the previous
    // session's number in place and keep reporting it as current.
    expect(calls[0].params).toEqual([
      'rhyme.density',
      null,
      'needs_two_bars_for_variance',
      1,
      sample.computedAt,
    ]);
  });

  test('getFingerprint returns null for a metric with no snapshot yet', () => {
    const { db } = createFakeDb({ getFirstResult: null });
    expect(getFingerprint(db, 'rhyme.density')).toBeNull();
  });
});

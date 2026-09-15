import { createFakeDb } from '../db/testUtils';
import type { MetricDefinition } from '../types';
import {
  getMetricDefinition,
  listMetricDefinitions,
  upsertMetricDefinition,
} from './metricDefinitions';

const sample: MetricDefinition = {
  metricId: 'rhyme.density',
  family: 'rhyme',
  scoreType: 'continuous',
  unit: null,
  direction: 'higher_is_better',
  aggregation: 'mean',
  display: { label: 'Rhyme density' },
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('metricDefinitions repository', () => {
  test('upsert binds every column, including a JSON-encoded display blob', () => {
    const { db, calls } = createFakeDb();

    upsertMetricDefinition(db, sample);

    const call = calls.find((c) => c.method === 'runSync');
    expect(call?.sql).toContain('INSERT INTO metric_definitions');
    expect(call?.sql).toContain('ON CONFLICT(metric_id) DO UPDATE');
    expect(call?.params).toEqual([
      'rhyme.density',
      'rhyme',
      'continuous',
      null,
      'higher_is_better',
      'mean',
      JSON.stringify(sample.display),
      1,
      sample.createdAt,
      sample.updatedAt,
    ]);
  });

  test('getMetricDefinition maps a snake_case row back to the domain shape', () => {
    const { db } = createFakeDb({
      getFirstResult: {
        metric_id: 'rhyme.density',
        family: 'rhyme',
        score_type: 'continuous',
        unit: null,
        direction: 'higher_is_better',
        aggregation: 'mean',
        display_json: JSON.stringify(sample.display),
        version: 1,
        created_at: sample.createdAt,
        updated_at: sample.updatedAt,
      },
    });

    expect(getMetricDefinition(db, 'rhyme.density')).toEqual(sample);
  });

  test('getMetricDefinition returns null when nothing matches', () => {
    const { db } = createFakeDb({ getFirstResult: null });
    expect(getMetricDefinition(db, 'missing')).toBeNull();
  });

  test('listMetricDefinitions maps every row', () => {
    const { db } = createFakeDb({
      getAllResult: [
        {
          metric_id: 'rhyme.density',
          family: 'rhyme',
          score_type: 'continuous',
          unit: null,
          direction: 'higher_is_better',
          aggregation: 'mean',
          display_json: JSON.stringify(sample.display),
          version: 1,
          created_at: sample.createdAt,
          updated_at: sample.updatedAt,
        },
      ],
    });

    expect(listMetricDefinitions(db)).toEqual([sample]);
  });
});

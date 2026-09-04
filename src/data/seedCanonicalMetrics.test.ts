import { CANONICAL_METRIC_DEFINITIONS } from './canonicalMetrics';
import { createFakeDb } from './db/testUtils';
import { CANONICAL_METRIC_IDS, seedCanonicalMetrics } from './seedCanonicalMetrics';

describe('canonical metric seeding', () => {
  test('publishes every canonical definition into metric_definitions', () => {
    const { db, calls } = createFakeDb();
    seedCanonicalMetrics(db);

    const writes = calls.filter(
      (c) => c.method === 'runSync' && c.sql.includes('INSERT INTO metric_definitions'),
    );
    expect(writes).toHaveLength(CANONICAL_METRIC_DEFINITIONS.length);
  });

  test('upserts rather than inserts, so a restart is not a duplicate-key crash', () => {
    const { db, calls } = createFakeDb();
    seedCanonicalMetrics(db);
    const write = calls.find((c) => c.method === 'runSync');
    expect(write?.sql).toContain('ON CONFLICT(metric_id) DO UPDATE');
  });

  test('metric ids are unique across the registry', () => {
    expect(CANONICAL_METRIC_IDS.size).toBe(CANONICAL_METRIC_DEFINITIONS.length);
  });
});

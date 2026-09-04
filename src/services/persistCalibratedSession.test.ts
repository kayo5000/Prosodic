import { createFakeDb } from '../data/db/testUtils';
import { CANONICAL_METRIC_IDS } from '../data/seedCanonicalMetrics';
import { calibrateEngineOutput } from './calibration';
import {
  CalibrationBoundaryError,
  persistCalibratedSession,
  toCanonicalMetrics,
} from './persistCalibratedSession';
import { analyzeLyricsMaster } from './prosodicCore';

const SAMPLE_LYRICS = [
  'Pressure keeps the measure of a message that I treasure',
  'Never letting lesser competition set the tempo',
  'Elevated cadences that navigate the sentence',
  'Intricate and delicate, the syllables assemble',
].join('\n');

function buildEnvelope() {
  const report = analyzeLyricsMaster(SAMPLE_LYRICS, 90, '4/4', 'Boundary Test');
  return calibrateEngineOutput(report, 'boundary_test_session');
}

describe('calibration boundary — toCanonicalMetrics', () => {
  test('strips rawScore so it cannot reach a repository', () => {
    const metrics = toCanonicalMetrics(buildEnvelope());
    expect(metrics.length).toBeGreaterThan(0);
    for (const metric of metrics) {
      expect(Object.keys(metric)).not.toContain('rawScore');
    }
  });

  test('every emitted metric_id belongs to the canonical namespace', () => {
    for (const metric of toCanonicalMetrics(buildEnvelope())) {
      expect(CANONICAL_METRIC_IDS.has(metric.metricId)).toBe(true);
    }
  });

  test('every calibrated value sits on the canonical [0, 1] scale', () => {
    for (const metric of toCanonicalMetrics(buildEnvelope())) {
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.value).toBeLessThanOrEqual(1);
    }
  });

  test('rejects a metric_id that is not in the canonical registry', () => {
    const envelope = buildEnvelope();
    envelope.scores['rhyme.invented_by_an_engine'] = {
      metricId: 'rhyme.invented_by_an_engine',
      family: 'rhyme',
      rawScore: 42,
      calibratedScore: 0.5,
      unit: '0-1',
      direction: 'higher_is_better',
      version: 1,
    };
    expect(() => toCanonicalMetrics(envelope)).toThrow(CalibrationBoundaryError);
  });

  test('rejects a calibrated score that escaped the [0, 1] scale', () => {
    const envelope = buildEnvelope();
    const first = Object.keys(envelope.scores)[0];
    envelope.scores[first].calibratedScore = 1.4;
    expect(() => toCanonicalMetrics(envelope)).toThrow(/outside the canonical/);
  });

  test('rejects a non-finite calibrated score instead of writing NaN', () => {
    const envelope = buildEnvelope();
    const first = Object.keys(envelope.scores)[0];
    envelope.scores[first].calibratedScore = Number.NaN;
    expect(() => toCanonicalMetrics(envelope)).toThrow(/non-finite/);
  });
});

describe('calibration boundary — persistCalibratedSession', () => {
  test('writes the calibrated event and one fingerprint row per metric', () => {
    const { db, calls } = createFakeDb();
    const report = analyzeLyricsMaster(SAMPLE_LYRICS, 90, '4/4', 'Boundary Test');
    const payload = persistCalibratedSession(db, report, 'song_1', 'session_1');

    const writes = calls.filter((c) => c.method === 'runSync');
    const eventWrites = writes.filter((c) => c.sql.includes('INSERT INTO events'));
    const fingerprintWrites = writes.filter((c) => c.sql.includes('INSERT INTO fingerprint'));

    expect(eventWrites).toHaveLength(1);
    expect(fingerprintWrites).toHaveLength(payload.metrics.length);
    expect(eventWrites[0].params?.[1]).toBe('analysis_calibrated');
  });

  /**
   * The architecture rule this whole boundary exists to enforce: no raw
   * engine score may be handed to any repository. Asserted against the
   * actual SQL parameters, so it fails if a future change routes a raw
   * value around `toCanonicalMetrics`.
   */
  test('no raw engine score reaches any SQL parameter', () => {
    const { db, calls } = createFakeDb();
    const report = analyzeLyricsMaster(SAMPLE_LYRICS, 90, '4/4', 'Boundary Test');
    const envelope = calibrateEngineOutput(report, 'session_1');
    persistCalibratedSession(db, report, 'song_1', 'session_1');

    const serialisedParams = calls
      .filter((c) => c.method === 'runSync')
      .flatMap((c) => c.params ?? [])
      .map((p) => String(p))
      .join(' | ');

    expect(serialisedParams).not.toContain('rawScore');

    for (const score of Object.values(envelope.scores)) {
      if (score.rawScore === score.calibratedScore) continue; // indistinguishable, nothing to prove
      expect(serialisedParams).not.toContain(`"rawScore":${score.rawScore}`);
    }
  });

  test('the persisted event payload carries only canonical metric fields', () => {
    const { db, calls } = createFakeDb();
    const report = analyzeLyricsMaster(SAMPLE_LYRICS, 90, '4/4', 'Boundary Test');
    persistCalibratedSession(db, report, 'song_1', 'session_1');

    const eventWrite = calls.find(
      (c) => c.method === 'runSync' && c.sql.includes('INSERT INTO events'),
    );
    const payload = JSON.parse(String(eventWrite?.params?.[4]));

    expect(Object.keys(payload).sort()).toEqual(['calibratedAt', 'metrics', 'sessionId']);
    for (const metric of payload.metrics) {
      expect(Object.keys(metric).sort()).toEqual([
        'direction',
        'metricId',
        'metricVersion',
        'unit',
        'value',
      ]);
    }
  });
});

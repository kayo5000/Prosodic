import type { SQLiteDatabaseLike } from '../data/db/types';
import { withTransaction } from '../data/db/transaction';
import { generateId } from '../data/id';
import { insertEvent } from '../data/repositories/events';
import { upsertFingerprint } from '../data/repositories/fingerprint';
import { CANONICAL_METRIC_IDS, CANONICAL_METRIC_VERSIONS } from '../data/seedCanonicalMetrics';
import { calibrateEngineOutput, type CalibratedSessionEnvelope } from './calibration';
import type { MasterProsodicReport } from './prosodicCore';

/**
 * A single metric as it is allowed to exist downstream of the encoder
 * boundary. Note what is absent: `rawScore`. `CalibratedScore` carries the
 * raw value alongside the calibrated one so the adapter can be inspected
 * and tested, but that shape must never be handed to a repository — this
 * is the type that crosses.
 */
export interface CanonicalMetricValue {
  metricId: string;
  value: number;
  unit: string;
  direction: 'higher_is_better' | 'lower_is_better' | 'neutral';
  metricVersion: number;
}

export interface CalibratedAnalysisPayload extends Record<string, unknown> {
  sessionId: string;
  calibratedAt: string;
  metrics: CanonicalMetricValue[];
}

export class CalibrationBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalibrationBoundaryError';
  }
}

/**
 * The encoder boundary, enforced.
 *
 * Converts a calibration envelope into the only score shape permitted
 * downstream, and rejects anything that would violate the architecture
 * rule in CLAUDE.md:
 *
 *  - a metric_id outside the canonical namespace (nothing may mint ids)
 *  - a calibrated score outside [0, 1] (the canonical scale)
 *  - a non-finite score
 *
 * These throw rather than clamp on purpose. A metric that fails here is a
 * defect in the adapter, and silently coercing it would reintroduce the
 * two-sources-of-truth bug this boundary exists to prevent.
 *
 * `envelope.summary` is deliberately not persisted: `overallCraftIndex`
 * is an engine-native 0-100 composite with no MetricDefinition backing
 * it, and `dominantVowelFamily` is engine-native categorical output.
 * Either may cross later — by being given a canonical metric_id first,
 * not by being smuggled through in a payload.
 */
export function toCanonicalMetrics(envelope: CalibratedSessionEnvelope): CanonicalMetricValue[] {
  return Object.values(envelope.scores).map((score) => {
    if (!CANONICAL_METRIC_IDS.has(score.metricId)) {
      throw new CalibrationBoundaryError(
        `"${score.metricId}" is not in the canonical metric namespace. ` +
          'Add a MetricDefinition to canonicalMetrics.ts before emitting it.',
      );
    }
    if (!Number.isFinite(score.calibratedScore)) {
      throw new CalibrationBoundaryError(
        `"${score.metricId}" calibrated to a non-finite value (${score.calibratedScore}).`,
      );
    }
    if (score.calibratedScore < 0 || score.calibratedScore > 1) {
      throw new CalibrationBoundaryError(
        `"${score.metricId}" calibrated to ${score.calibratedScore}, outside the canonical [0, 1] scale.`,
      );
    }

    return {
      metricId: score.metricId,
      value: score.calibratedScore,
      unit: score.unit,
      direction: score.direction,
      metricVersion: CANONICAL_METRIC_VERSIONS.get(score.metricId) ?? score.version,
    };
  });
}

/**
 * Runs a raw engine report through calibration and persists the result.
 *
 * This is the only sanctioned path from an analysis engine to storage.
 * The raw `MasterProsodicReport` enters, calibrated canonical metrics
 * land in `events` and `fingerprint`, and no raw score is written
 * anywhere. Both writes share one transaction so the append-only event
 * stream can never disagree with the current-state fingerprint.
 */
export function persistCalibratedSession(
  db: SQLiteDatabaseLike,
  report: MasterProsodicReport,
  songId: string,
  sessionId: string = generateId(),
): CalibratedAnalysisPayload {
  const envelope = calibrateEngineOutput(report, sessionId);
  const metrics = toCanonicalMetrics(envelope);

  const payload: CalibratedAnalysisPayload = {
    sessionId: envelope.sessionId,
    calibratedAt: envelope.calibratedAt,
    metrics,
  };
  const now = new Date().toISOString();

  withTransaction(db, () => {
    insertEvent(db, {
      id: generateId(),
      type: 'analysis_calibrated',
      songId,
      occurredAt: envelope.calibratedAt,
      payload,
      createdAt: now,
      syncedAt: null,
    });

    for (const metric of metrics) {
      upsertFingerprint(db, {
        metricId: metric.metricId,
        value: metric.value,
        metricVersion: metric.metricVersion,
        computedAt: envelope.calibratedAt,
      });
    }
  });

  return payload;
}

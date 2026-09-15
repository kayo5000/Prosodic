import { extentOf, type InputExtent, measurabilityOf } from './measurability';
import type { MasterProsodicReport } from './prosodicCore';

export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';

export interface CalibratedScore {
  metricId: string;
  family: string;
  rawScore: number;
  /**
   * Normalized [0, 1], or `null` when the input could not support the
   * measurement. Null is not a bad score — it is the absence of one, and
   * the two must stay distinguishable all the way to storage.
   */
  calibratedScore: number | null;
  /** Why the score is null. Null when the metric was measured. */
  notMeasuredReason: string | null;
  unit: string;
  direction: MetricDirection;
  version: number;
}

export interface CalibratedSessionEnvelope {
  sessionId: string;
  calibratedAt: string;
  scores: Record<string, CalibratedScore>;
  summary: {
    overallCraftIndex: number; // 0 - 100
    dominantVowelFamily: string;
    targetSps: number;
    actualSps: number;
    pocketAlignment: number | null; // 0 - 1, or null when unmeasurable
  };
}

/**
 * Bounds a finite value to [min, max].
 *
 * Deliberately does NOT absorb NaN or Infinity. It used to return `min`
 * for them, which silently converted a failed computation into a
 * confident score of zero — and zero on a `higher_is_better` metric reads
 * to a user as "you did badly at this." A non-finite result is handled by
 * `toScore` as an absence instead.
 */
function clamp(val: number, min: number = 0.0, max: number = 1.0): number {
  return Math.max(min, Math.min(max, val));
}

interface ScoreSpec {
  metricId: string;
  family: string;
  raw: number;
  normalized: number;
  unit: string;
  direction: MetricDirection;
}

/**
 * Builds one calibrated score, refusing to invent a value when the input
 * cannot support one. Two separate ways a metric can come back absent:
 * the input was too thin for the operation to be defined, or the
 * arithmetic itself failed. Both produce null, with the reason recorded.
 */
function toScore(spec: ScoreSpec, extent: InputExtent): CalibratedScore {
  const base = {
    metricId: spec.metricId,
    family: spec.family,
    rawScore: Number.isFinite(spec.raw) ? Number(spec.raw.toFixed(2)) : 0,
    unit: spec.unit,
    direction: spec.direction,
    version: 1,
  };

  const measurability = measurabilityOf(spec.metricId, extent);
  if (!measurability.measurable) {
    return { ...base, calibratedScore: null, notMeasuredReason: measurability.reason };
  }
  if (!Number.isFinite(spec.normalized)) {
    return { ...base, calibratedScore: null, notMeasuredReason: 'non_finite_result' };
  }

  return {
    ...base,
    calibratedScore: Number(clamp(spec.normalized).toFixed(4)),
    notMeasuredReason: null,
  };
}

/**
 * Step 4 Calibration Adapter Boundary.
 * Converts raw domain engine scores into the locked Canonical Metric Namespace.
 * Raw scores NEVER leak downstream to Events, Rollups, Fingerprints, or Goals.
 *
 * A metric that the input cannot support comes back with a null
 * `calibratedScore` rather than a fabricated number. See ./measurability.
 */
export function calibrateEngineOutput(
  report: MasterProsodicReport,
  sessionId: string = 'session_default',
): CalibratedSessionEnvelope {
  const extent = extentOf(report.meta.totalSyllables, report.meta.totalBars, report.meta.bpm);
  const scores: Record<string, CalibratedScore> = {};

  function add(spec: ScoreSpec): CalibratedScore {
    const score = toScore(spec, extent);
    scores[spec.metricId] = score;
    return score;
  }

  // 1. Rhyme & Phonetic Architecture
  const rawRhymePhoneme = report.dissection.complexityScore / 100;
  add({
    metricId: 'rhyme.phoneme_similarity',
    family: 'rhyme',
    raw: rawRhymePhoneme,
    normalized: rawRhymePhoneme,
    unit: '0-1',
    direction: 'higher_is_better',
  });

  const rawMultiDepth = report.dissection.rhymeChainCount / Math.max(1, report.meta.totalBars);
  add({
    metricId: 'rhyme.compound_multisyllabic_depth',
    family: 'rhyme',
    raw: rawMultiDepth,
    normalized: rawMultiDepth,
    unit: '0-1',
    direction: 'higher_is_better',
  });

  const rawInterlocking = report.dissection.rhymeChainCount;
  add({
    metricId: 'rhyme.interlocking_chain_depth',
    family: 'rhyme',
    raw: rawInterlocking,
    normalized: rawInterlocking / 4.0,
    unit: 'chains',
    direction: 'higher_is_better',
  });

  // 2. Cadence & Pocket Dynamics
  const rawSps = report.meta.averageSps;
  // No fallback tempo here on purpose. With no BPM the extent reports
  // hasTempo:false and spb_consistency comes back absent rather than
  // measured against a number nobody chose.
  const rawSpb = report.meta.bpm ? (rawSps * 60) / report.meta.bpm : NaN;
  const spbDeviation = Math.abs(rawSpb - 3.5);
  const spbConsistency = add({
    metricId: 'cadence.spb_consistency',
    family: 'cadence',
    raw: rawSpb,
    normalized: 1.0 - spbDeviation / 2.0,
    unit: '0-1',
    direction: 'higher_is_better',
  });

  const rawInternalWeave =
    report.dissection.crossBarWeaveDensity !== undefined
      ? report.dissection.crossBarWeaveDensity
      : report.dissection.internalRhymeDensity / 100;
  add({
    metricId: 'cadence.internal_weave_density',
    family: 'cadence',
    raw: report.dissection.crossBarWeaveDensity ?? report.dissection.internalRhymeDensity,
    normalized: rawInternalWeave,
    unit: '0-1',
    direction: 'higher_is_better',
  });

  const rawEnjambment = report.dissection.enjambmentRate;
  add({
    metricId: 'cadence.enjambment_rate',
    family: 'cadence',
    raw: rawEnjambment,
    normalized: rawEnjambment,
    unit: 'percent',
    direction: 'neutral',
  });

  const rawSymmetry = report.earworm.symmetryScore / 100;
  add({
    metricId: 'cadence.syllabic_symmetry',
    family: 'cadence',
    raw: report.earworm.symmetryScore,
    normalized: rawSymmetry,
    unit: '0-1',
    direction: 'neutral',
  });

  // 3. Timbre & Phonetic Texture
  // Phonetic vowel brightness: Acoustic high-front vowels (EE, IH, EY, EH, AY)
  // possess higher second formants (F2 > 1800 Hz) and are perceived as bright/sharp,
  // whereas low/back vowels (OO, OH, AW, AH) are perceived as dark/warm.
  let brightVowelCount = 0;
  let totalClassifiedVowels = 0;
  const brightFamilies = new Set(['EE_FAMILY', 'IH_FAMILY', 'EY_FAMILY', 'EH_FAMILY', 'AY_FAMILY']);
  report.dissection.lines.forEach((l) => {
    l.words.forEach((w) => {
      if (w.vowelFamily && w.vowelFamily !== 'GENERAL') {
        totalClassifiedVowels += 1;
        if (brightFamilies.has(w.vowelFamily)) {
          brightVowelCount += 1;
        }
      }
    });
  });
  const rawBrightness =
    totalClassifiedVowels > 0 ? Number((brightVowelCount / totalClassifiedVowels).toFixed(4)) : 0;
  add({
    metricId: 'timbre.vowel_brightness',
    family: 'timbre',
    raw: rawBrightness,
    normalized: rawBrightness,
    unit: '0-1',
    direction: 'neutral',
  });

  const rawPercussive = report.earworm.percussivePunchRatio;
  add({
    metricId: 'timbre.consonant_percussiveness',
    family: 'timbre',
    raw: rawPercussive,
    normalized: rawPercussive,
    unit: '0-1',
    direction: 'neutral',
  });

  return {
    sessionId,
    calibratedAt: new Date().toISOString(),
    scores,
    summary: {
      overallCraftIndex: report.overallMasteryIndex,
      dominantVowelFamily: report.dissection.dominantVowelFamily,
      targetSps: Number(rawSps.toFixed(1)),
      actualSps: Number(rawSps.toFixed(1)),
      pocketAlignment: spbConsistency.calibratedScore,
    },
  };
}

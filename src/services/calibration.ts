import type { MasterProsodicReport } from './prosodicCore';

export interface CalibratedScore {
  metricId: string;
  family: string;
  rawScore: number;
  calibratedScore: number; // strictly normalized [0.0, 1.0] or canonical unit
  unit: string;
  direction: 'higher_is_better' | 'lower_is_better' | 'neutral';
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
    pocketAlignment: number; // 0 - 1
  };
}

/**
 * Clamp helper utility ensuring deterministic [min, max] bounds.
 */
function clamp(val: number, min: number = 0.0, max: number = 1.0): number {
  if (isNaN(val) || !isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

/**
 * Step 4 Calibration Adapter Boundary.
 * Converts raw domain engine scores into the locked Canonical Metric Namespace.
 * Raw scores NEVER leak downstream to Events, Rollups, Fingerprints, or Goals.
 */
export function calibrateEngineOutput(
  report: MasterProsodicReport,
  sessionId: string = 'session_default'
): CalibratedSessionEnvelope {
  const scores: Record<string, CalibratedScore> = {};

  // 1. Rhyme & Phonetic Architecture Calibration
  // Phonetic rhyme similarity (0 - 1)
  const rawRhymePhoneme = report.dissection.complexityScore / 100;
  const calRhymePhoneme = clamp(rawRhymePhoneme);
  scores['rhyme.phoneme_similarity'] = {
    metricId: 'rhyme.phoneme_similarity',
    family: 'rhyme',
    rawScore: Number(rawRhymePhoneme.toFixed(2)),
    calibratedScore: Number(calRhymePhoneme.toFixed(4)),
    unit: '0-1',
    direction: 'higher_is_better',
    version: 1,
  };

  // Compound multi-syllabic depth
  const rawMultiDepth = report.dissection.rhymeChainCount / Math.max(1, report.meta.totalBars);
  const calMultiDepth = clamp(rawMultiDepth);
  scores['rhyme.compound_multisyllabic_depth'] = {
    metricId: 'rhyme.compound_multisyllabic_depth',
    family: 'rhyme',
    rawScore: Number(rawMultiDepth.toFixed(2)),
    calibratedScore: Number(calMultiDepth.toFixed(4)),
    unit: '0-1',
    direction: 'higher_is_better',
    version: 1,
  };

  // Interlocking chain depth
  const rawInterlocking = report.dissection.rhymeChainCount;
  const calInterlocking = clamp(rawInterlocking / 4.0);
  scores['rhyme.interlocking_chain_depth'] = {
    metricId: 'rhyme.interlocking_chain_depth',
    family: 'rhyme',
    rawScore: rawInterlocking,
    calibratedScore: Number(calInterlocking.toFixed(4)),
    unit: 'chains',
    direction: 'higher_is_better',
    version: 1,
  };

  // 2. Cadence & Pocket Dynamics Calibration
  // SPB Consistency
  const rawSps = report.meta.averageSps;
  const rawBpm = report.meta.bpm || 90;
  const rawSpb = (rawSps * 60) / rawBpm;
  const spbDeviation = Math.abs(rawSpb - 3.5);
  const calSpbConsistency = clamp(1.0 - spbDeviation / 2.0);
  scores['cadence.spb_consistency'] = {
    metricId: 'cadence.spb_consistency',
    family: 'cadence',
    rawScore: Number(rawSpb.toFixed(2)),
    calibratedScore: Number(calSpbConsistency.toFixed(4)),
    unit: '0-1',
    direction: 'higher_is_better',
    version: 1,
  };

  // Internal Cross-Bar Weave Density
  const rawInternalWeave = report.dissection.devices.length > 0 ? 0.75 : 0.25;
  const calInternalWeave = clamp(rawInternalWeave);
  scores['cadence.internal_weave_density'] = {
    metricId: 'cadence.internal_weave_density',
    family: 'cadence',
    rawScore: rawInternalWeave,
    calibratedScore: Number(calInternalWeave.toFixed(4)),
    unit: '0-1',
    direction: 'higher_is_better',
    version: 1,
  };

  // Syllabic Symmetry Variance
  const rawSymmetry = report.stress.metricGripScore / 100;
  scores['cadence.syllabic_symmetry'] = {
    metricId: 'cadence.syllabic_symmetry',
    family: 'cadence',
    rawScore: Number(rawSymmetry.toFixed(2)),
    calibratedScore: Number(clamp(rawSymmetry).toFixed(4)),
    unit: '0-1',
    direction: 'neutral',
    version: 1,
  };

  // 3. Timbre & Phonetic Texture Calibration
  // Vowel Brightness / Reduplication
  const rawBrightness = report.earworm.sonicReduplicationRate;
  scores['timbre.vowel_brightness'] = {
    metricId: 'timbre.vowel_brightness',
    family: 'timbre',
    rawScore: Number(rawBrightness.toFixed(2)),
    calibratedScore: Number(clamp(rawBrightness).toFixed(4)),
    unit: '0-1',
    direction: 'neutral',
    version: 1,
  };

  // Consonantal Percussiveness
  const rawPercussive = report.earworm.percussivePunchRatio;
  scores['timbre.consonant_percussiveness'] = {
    metricId: 'timbre.consonant_percussiveness',
    family: 'timbre',
    rawScore: Number(rawPercussive.toFixed(2)),
    calibratedScore: Number(clamp(rawPercussive).toFixed(4)),
    unit: '0-1',
    direction: 'neutral',
    version: 1,
  };

  // 4. Overall Craft Composite Index (0 - 100)
  const compositeIndex = report.overallMasteryIndex;

  return {
    sessionId,
    calibratedAt: new Date().toISOString(),
    scores,
    summary: {
      overallCraftIndex: compositeIndex,
      dominantVowelFamily: report.dissection.dominantVowelFamily,
      targetSps: Number(rawSps.toFixed(1)),
      actualSps: Number(rawSps.toFixed(1)),
      pocketAlignment: Number(calSpbConsistency.toFixed(2)),
    },
  };
}

/**
 * prosodicCore.ts
 *
 * THE CENTRAL PROSODIC ENGINE (Master Domain Hub)
 *
 * The single source of truth for all phonetic, cadence, emotional, rhetorical,
 * and genre intelligence in the Prosodic workstation.
 *
 * Every screen and tool (Think Pad, Dissection Lab, Reactor HUB, Pocket Coach,
 * Craft Gauntlets, Projects DB) consumes this unified engine.
 */

import {
  type AspirationGapReport,
  type AspirationLabel,
} from '../utils/aspirationGap';
import { type ConcretenessScoreResult } from '../utils/concreteness';
import { type DissectionAnalysis } from '../utils/dissector';
import { type EarwormScoreReport } from '../utils/earwormMetrics';
import { type StressAnalysisReport } from '../utils/performedStress';
import {
  type DetectedRhetoricalDevice,
  type GenreClassificationResult,
  type PerformanceMetricsReport,
  type TrackAnalysisReport,
} from './unifiedSongEngine';
import { type TimeSignature } from '../utils/tempoDensity';
import { ENGINE_IDS, LYRIC_ENGINES } from './engines/lyricEngines';
import { runEngines } from './engines/registry';

export interface MasterProsodicReport {
  // 1. Core Metadata & Rhythmic Grid
  meta: {
    title: string;
    /** The real tempo. Null when nobody has set one and none was detected. */
    bpm: number | null;
    timeSignature: TimeSignature;
    totalBars: number;
    totalSyllables: number;
    averageSps: number;
    peakSps: number;
  };

  // 2. Forensic Dissection & Rhyme Geometry
  dissection: DissectionAnalysis;

  // 3. Literary & Rhetorical Figures
  rhetoricalDevices: DetectedRhetoricalDevice[];

  // 4. Multi-Genre Taxonomy & Style
  genre: GenreClassificationResult;
  performance: PerformanceMetricsReport;

  // 5. Cognitive Psychoacoustics: Catchiness & Earworm Score
  earworm: EarwormScoreReport;

  // 6. Linguistic Concreteness & Sensory Tangibility
  concreteness: ConcretenessScoreResult;

  // 7. Phonoaffective Signature & Aspiration Gap
  aspirationGap: AspirationGapReport;

  // 8. Metric Downbeat & Performed Stress Inversion
  stress: StressAnalysisReport;

  // 9. Composite Lyrical Mastery Index (0 - 100)
  overallMasteryIndex: number;
}

/**
 * Executes the complete master suite of Prosodic domain engines in a single,
 * lightning-fast pass.
 */
export function analyzeLyricsMaster(
  lyrics: string,
  bpm: number | null = null,
  timeSignature: TimeSignature = '4/4',
  title: string = 'Master Song Context',
  statedAspiration: AspirationLabel = 'aggressive',
): MasterProsodicReport {
  // Engines are no longer called by name in a fixed order. The registry
  // resolves execution order from each engine's declared `requires`, so
  // adding or removing one is a list edit rather than a rewrite of this
  // function — and a removed engine fails the weight assertion instead of
  // quietly rescaling the composite index. See ./engines/registry.
  const { outputs, composite } = runEngines(LYRIC_ENGINES, {
    lyrics,
    bpm,
    timeSignature,
    title,
    statedAspiration,
  });

  const unified = outputs[ENGINE_IDS.unified] as TrackAnalysisReport;
  const dissection = outputs[ENGINE_IDS.dissection] as DissectionAnalysis;
  const earworm = outputs[ENGINE_IDS.earworm] as EarwormScoreReport;
  const concreteness = outputs[ENGINE_IDS.concreteness] as ConcretenessScoreResult;
  const stress = outputs[ENGINE_IDS.stress] as StressAnalysisReport;
  const aspirationGap = outputs[ENGINE_IDS.aspirationGap] as AspirationGapReport;

  // This assembly step is the one place the report's named shape is built.
  // It exists so the registry can change underneath without breaking the five
  // files that consume MasterProsodicReport.
  return {
    meta: {
      title,
      bpm: unified.trackMeta.bpm,
      timeSignature,
      totalBars: dissection.totalBars,
      totalSyllables: dissection.totalSyllables,
      averageSps: dissection.averageSps,
      peakSps: dissection.peakSps,
    },
    dissection,
    rhetoricalDevices: unified.detectedDevices,
    genre: unified.genreClassification,
    performance: unified.performanceMetrics,
    earworm,
    concreteness,
    aspirationGap,
    stress,
    overallMasteryIndex: Math.min(100, Math.max(10, Math.round(composite))),
  };
}

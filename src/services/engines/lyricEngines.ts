import {
  type AspirationGapReport,
  type AspirationLabel,
  computeAspirationGap,
  computePhonemicTextureFromText,
  computeProsodicPressureFromSps,
} from '../../utils/aspirationGap';
import { type ConcretenessScoreResult, scoreConcreteness } from '../../utils/concreteness';
import { dissectLyrics, type DissectionAnalysis } from '../../utils/dissector';
import { type EarwormScoreReport, scoreEarwormMetrics } from '../../utils/earwormMetrics';
import { analyzePerformedStress, type StressAnalysisReport } from '../../utils/performedStress';
import { type TimeSignature } from '../../utils/tempoDensity';
import { analyzeTrackUnified, type TrackAnalysisReport } from '../unifiedSongEngine';
import { defineEngine, type EngineDefinition } from './registry';

/**
 * Everything an engine is allowed to start from. Anything else it needs comes
 * from another engine, declared in `requires` — never read off a shared object.
 */
export interface LyricAnalysisInput {
  readonly lyrics: string;
  /** Null when nobody has set a tempo. Engines must handle that themselves. */
  readonly bpm: number | null;
  readonly timeSignature: TimeSignature;
  readonly title: string;
  readonly statedAspiration: AspirationLabel;
}

/** Ids are the contract. Downstream code keys off these, not off call order. */
export const ENGINE_IDS = {
  unified: 'unified',
  dissection: 'dissection',
  earworm: 'earworm',
  concreteness: 'concreteness',
  stress: 'stress',
  aspirationGap: 'aspirationGap',
} as const;

/**
 * Tempo the bar grid falls back to when none is set, so `dissectLyrics` can
 * still lay out bars. It never reaches a metric — `measurability.ts` refuses
 * tempo-dependent metrics when the real BPM is null.
 */
const LAYOUT_FALLBACK_BPM = 120;

/**
 * Composite weights.
 *
 * These are inherited from the original hardcoded formula, not derived from
 * any measured population — the same class of arbitrary constant as the
 * `/100` and `/4.0` removed from calibration. They are gathered here so the
 * arbitrariness is visible in one place and can be replaced with a measured
 * weighting later, rather than being scattered through an expression nobody
 * reads. The registry asserts they sum to 1.
 *
 * See the CLAUDE.md backlog entry on the composite index.
 */
const WEIGHTS = {
  dissection: 0.3,
  earworm: 0.25,
  concreteness: 0.15,
  stress: 0.15,
  unified: 0.15,
} as const;

const unifiedEngine = defineEngine<LyricAnalysisInput, TrackAnalysisReport>({
  id: ENGINE_IDS.unified,
  requires: [],
  compositeWeight: WEIGHTS.unified,
  // Original expression was `Math.min(15, devices.length * 4)` on a 100-point
  // total. Rescaled to 0-100 here so every compositeValue speaks one scale;
  // 0.15 * this reproduces the old contribution exactly.
  compositeValue: (out) => Math.min(100, ((out.detectedDevices.length * 4) / 15) * 100),
  run: ({ input }) => analyzeTrackUnified(input.lyrics, input.bpm),
});

const dissectionEngine = defineEngine<LyricAnalysisInput, DissectionAnalysis>({
  id: ENGINE_IDS.dissection,
  requires: [],
  compositeWeight: WEIGHTS.dissection,
  compositeValue: (out) => out.complexityScore,
  run: ({ input }) =>
    dissectLyrics(
      input.lyrics,
      input.bpm ?? LAYOUT_FALLBACK_BPM,
      input.timeSignature,
      input.title,
    ),
});

const earwormEngine = defineEngine<LyricAnalysisInput, EarwormScoreReport>({
  id: ENGINE_IDS.earworm,
  requires: [],
  compositeWeight: WEIGHTS.earworm,
  compositeValue: (out) => out.earwormScore,
  run: ({ input }) => scoreEarwormMetrics(input.lyrics),
});

const concretenessEngine = defineEngine<LyricAnalysisInput, ConcretenessScoreResult>({
  id: ENGINE_IDS.concreteness,
  requires: [],
  compositeWeight: WEIGHTS.concreteness,
  compositeValue: (out) => out.tangibilityScore,
  run: ({ input }) => scoreConcreteness(input.lyrics),
});

const stressEngine = defineEngine<LyricAnalysisInput, StressAnalysisReport>({
  id: ENGINE_IDS.stress,
  requires: [],
  compositeWeight: WEIGHTS.stress,
  compositeValue: (out) => out.metricGripScore,
  run: ({ input }) => analyzePerformedStress(input.lyrics),
});

/**
 * The only engine that reads other engines. That dependency was previously
 * invisible — it lived in the order two `const` lines happened to appear in —
 * and it is the reason removing `concreteness` broke a file that never
 * mentioned concreteness in its name.
 */
const aspirationGapEngine = defineEngine<LyricAnalysisInput, AspirationGapReport>({
  id: ENGINE_IDS.aspirationGap,
  requires: [ENGINE_IDS.dissection, ENGINE_IDS.concreteness],
  compositeWeight: 0,
  run: ({ input, need }) => {
    const dissection = need<DissectionAnalysis>(ENGINE_IDS.dissection);
    const concreteness = need<ConcretenessScoreResult>(ENGINE_IDS.concreteness);
    return computeAspirationGap(
      {
        PT: computePhonemicTextureFromText(input.lyrics),
        PP: computeProsodicPressureFromSps(dissection.averageSps),
        SF: (concreteness.tangibilityScore / 100) * 0.8,
        // Placeholders carried over unchanged from the original call. They are
        // constants, not measurements, and are flagged as such rather than
        // being quietly rescued by this refactor.
        CM: 0.5,
        IS: 0.6,
        TP: 0.5,
        SA: 0.7,
        SD: 0.3,
      },
      input.statedAspiration,
    );
  },
});

/**
 * The registry. Adding an engine is appending here; removing one is deleting a
 * line. Neither requires knowing what order the others run in — that is
 * derived from `requires`.
 */
export const LYRIC_ENGINES: readonly EngineDefinition<LyricAnalysisInput>[] = [
  unifiedEngine,
  dissectionEngine,
  earwormEngine,
  concretenessEngine,
  stressEngine,
  aspirationGapEngine,
];

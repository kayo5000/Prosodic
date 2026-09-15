/**
 * performedStress.ts
 *
 * Performed Stress & Metric Downbeat Inversion Engine for Prosodic.
 *
 * Analyzes the alignment between linguistic word stress and musical bar downbeats
 * (Beats 1 and 3 in 4/4 time).
 *
 * Identifies:
 * - Metric Downbeat Inversions: Landing unstressed syllables on primary beats for syncopated bounce.
 * - Metric Grip: How tightly vocal accents lock to the musical pulse.
 *
 * Source: domain/performed_stress.py & bar_grid_linguistics.py from original Prosodic build.
 */

import { analyzeLyricsLines } from './syllableCounter';
import { SLANG_PHONETIC_LEXICON } from './aavePhonology';

export type StressSignalType =
  | 'promotion'
  | 'demotion'
  | 'syncopation'
  | 'trochaic_inversion'
  | 'stress_clash'
  | 'stress_lapse'
  | 'secondary_recruitment';

export interface StressMismatchEvent {
  type: StressSignalType;
  line: number;
  word: string;
  syllableIndex: number;
  gridSlot: number;
  description: string;
}

export interface StressAnalysisReport {
  metricGripScore: number; // 0 to 100 (100 = rigidly locked to downbeats)
  inversionRate: number; // 0.0 to 1.0 (frequency of deliberate unstressed downbeats)
  syncopationRating: 'Strict On-Beat' | 'Dynamic Syncopation' | 'Off-Beat Elastic Flow';
  totalDownbeatHits: number;
  invertedDownbeats: number;
  signals: Record<StressSignalType, StressMismatchEvent[]>;
  signalCounts: Record<StressSignalType, number>;
}

// Grammatical function words that carry zero lexical stress in standard English delivery
const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'nor', 'for', 'yet', 'so',
  'in', 'on', 'at', 'to', 'of', 'with', 'by', 'from', 'up', 'as', 'into',
  'is', 'it', 'its', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'had', 'do', 'does', 'did',
  'that', 'than', 'this',
]);

const TROCHAIC_WORDS = new Set([
  'rhythm', 'music', 'cadence', 'tempo', 'pocket', 'brother', 'sister', 'never',
  'always', 'better', 'after', 'under', 'over', 'city', 'water', 'power', 'money',
  'baby', 'mother', 'father', 'master', 'danger', 'silence', 'hammer', 'reason',
  'question', 'people', 'system', 'future', 'daily', 'hollow', 'heavy', 'party',
  'drama', 'story', 'lyric', 'rhyming', 'verse', 'spitting', 'flow',
]);

const IAMBIC_WORDS = new Set([
  'begin', 'create', 'divide', 'expect', 'repeat', 'define', 'believe', 'resolve',
  'connect', 'respect', 'control', 'supply', 'demand', 'decide', 'alive', 'today',
  'tonight', 'against', 'between', 'before', 'behind', 'ahead', 'away', 'alone',
  'without', 'within', 'around', 'across', 'because',
]);

/**
 * Resolves the lexical stress pattern (0 = unstressed, 1 = primary, 2 = secondary) for each syllable.
 */
function getWordStressPattern(rawWord: string, syllableCount: number): number[] {
  const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean || syllableCount <= 0) return [1];

  // 1. Check pre-computed slang lexicon
  if (SLANG_PHONETIC_LEXICON[clean]) {
    const phonemes = SLANG_PHONETIC_LEXICON[clean];
    const digits: number[] = [];
    for (const ph of phonemes) {
      const match = ph.match(/\d$/);
      if (match) digits.push(parseInt(match[0], 10));
    }
    if (digits.length === syllableCount) return digits;
  }

  // 2. Monosyllables
  if (syllableCount === 1) {
    return FUNCTION_WORDS.has(clean) ? [0] : [1];
  }

  // 3. Disyllables
  if (syllableCount === 2) {
    if (IAMBIC_WORDS.has(clean)) return [0, 1];
    if (TROCHAIC_WORDS.has(clean)) return [1, 0];
    // Default English disyllabic tendency (85% trochaic)
    return [1, 0];
  }

  // 4. Polysyllables (3+ syllables)
  const pattern: number[] = new Array(syllableCount).fill(0);
  pattern[0] = 1; // Primary initial stress
  if (syllableCount >= 4) pattern[2] = 2; // Secondary stress on 3rd syllable
  return pattern;
}

const EMPTY_SIGNALS: Record<StressSignalType, StressMismatchEvent[]> = {
  promotion: [],
  demotion: [],
  syncopation: [],
  trochaic_inversion: [],
  stress_clash: [],
  stress_lapse: [],
  secondary_recruitment: [],
};

const EMPTY_COUNTS: Record<StressSignalType, number> = {
  promotion: 0,
  demotion: 0,
  syncopation: 0,
  trochaic_inversion: 0,
  stress_clash: 0,
  stress_lapse: 0,
  secondary_recruitment: 0,
};

/**
 * Computes metric downbeat stress alignment and the 7 stress-mismatch signals across a verse.
 */
export function analyzePerformedStress(lyrics: string): StressAnalysisReport {
  if (!lyrics || !lyrics.trim()) {
    return {
      metricGripScore: 75,
      inversionRate: 0.2,
      syncopationRating: 'Dynamic Syncopation',
      totalDownbeatHits: 0,
      invertedDownbeats: 0,
      signals: { ...EMPTY_SIGNALS },
      signalCounts: { ...EMPTY_COUNTS },
    };
  }

  const lines = analyzeLyricsLines(lyrics);
  const signals: Record<StressSignalType, StressMismatchEvent[]> = {
    promotion: [],
    demotion: [],
    syncopation: [],
    trochaic_inversion: [],
    stress_clash: [],
    stress_lapse: [],
    secondary_recruitment: [],
  };

  let totalDownbeats = 0;
  let invertedCount = 0;

  lines.forEach((line) => {
    if (line.words.length === 0 || line.syllableCount === 0) return;

    totalDownbeats += 2;

    const firstWord = line.words[0].word.toLowerCase().replace(/[^a-z]/g, '');
    if (FUNCTION_WORDS.has(firstWord)) {
      invertedCount += 1;
    }

    if (line.words.length >= 4) {
      const midWord = line.words[Math.floor(line.words.length / 2)].word.toLowerCase().replace(/[^a-z]/g, '');
      if (FUNCTION_WORDS.has(midWord)) {
        invertedCount += 1;
      }
    }

    // Expand word syllables into a flat sequential syllable array
    const lineSyllables: { word: string; syllableInWord: number; stress: number }[] = [];
    line.words.forEach((w) => {
      const stressPattern = getWordStressPattern(w.word, w.syllables);
      for (let sIdx = 0; sIdx < w.syllables; sIdx += 1) {
        lineSyllables.push({
          word: w.word,
          syllableInWord: sIdx,
          stress: stressPattern[sIdx] ?? 0,
        });
      }
    });

    const totalSyl = lineSyllables.length;
    let consecutiveUnstressed = 0;

    lineSyllables.forEach((syl, i) => {
      // Map syllable position to 16-step grid slot (0 to 15)
      const gridSlot = Math.round((i / Math.max(1, totalSyl)) * 16) % 16;
      const isStrongBeat = gridSlot === 0 || gridSlot === 4 || gridSlot === 8 || gridSlot === 12;
      const isPocketWindow = isStrongBeat || [1, 3, 5, 7, 9, 11, 13, 15].includes(gridSlot);

      // 1. Promotion: Lexically weak syllable (0) lands on strong grid downbeat
      if (syl.stress === 0 && isStrongBeat) {
        signals.promotion.push({
          type: 'promotion',
          line: line.lineNumber,
          word: syl.word,
          syllableIndex: i,
          gridSlot,
          description: `Unstressed syllable in "${syl.word}" promoted to strong downbeat (slot ${gridSlot}).`,
        });
      }

      // 2. Demotion: Lexically stressed syllable (1, 2) pulled off-beat within pocket window
      if (syl.stress >= 1 && !isStrongBeat && isPocketWindow) {
        signals.demotion.push({
          type: 'demotion',
          line: line.lineNumber,
          word: syl.word,
          syllableIndex: i,
          gridSlot,
          description: `Stressed syllable in "${syl.word}" demoted off downbeat into pocket window (slot ${gridSlot}).`,
        });
      }

      // 3. Syncopation: Stressed syllable lands off-beat beyond pocket window
      if (syl.stress >= 1 && !isPocketWindow) {
        signals.syncopation.push({
          type: 'syncopation',
          line: line.lineNumber,
          word: syl.word,
          syllableIndex: i,
          gridSlot,
          description: `Stressed syllable in "${syl.word}" syncopated on off-beat subdivision (slot ${gridSlot}).`,
        });
      }

      // 4. Secondary Recruitment: Secondary stress (2) lands on strong beat while primary does not
      if (syl.stress === 2 && isStrongBeat) {
        signals.secondary_recruitment.push({
          type: 'secondary_recruitment',
          line: line.lineNumber,
          word: syl.word,
          syllableIndex: i,
          gridSlot,
          description: `Secondary stress on "${syl.word}" recruited as primary anchor downbeat.`,
        });
      }

      // 5. Trochaic Inversion: Falling lexical stress inverted across rising metrical foot
      if (i < totalSyl - 1) {
        const nextSyl = lineSyllables[i + 1];
        const nextGridSlot = Math.round(((i + 1) / Math.max(1, totalSyl)) * 16) % 16;
        const nextIsStrong = nextGridSlot === 0 || nextGridSlot === 4 || nextGridSlot === 8 || nextGridSlot === 12;
        if (syl.stress >= 1 && nextSyl.stress === 0 && nextIsStrong) {
          signals.trochaic_inversion.push({
            type: 'trochaic_inversion',
            line: line.lineNumber,
            word: `${syl.word} ${nextSyl.word}`,
            syllableIndex: i,
            gridSlot,
            description: `Trochaic inversion: metrical prominence landed on unstressed syllable following stressed syllable.`,
          });
        }
      }

      // 6. Stress Clash: Adjacent stressed syllables colliding without unstressed buffer
      if (i > 0 && syl.stress >= 1 && lineSyllables[i - 1].stress >= 1) {
        signals.stress_clash.push({
          type: 'stress_clash',
          line: line.lineNumber,
          word: `${lineSyllables[i - 1].word} ${syl.word}`,
          syllableIndex: i,
          gridSlot,
          description: `Stress clash: adjacent stressed syllables collide without buffer between "${lineSyllables[i - 1].word}" and "${syl.word}".`,
        });
      }

      // 7. Stress Lapse: >= 3 consecutive unstressed syllables
      if (syl.stress === 0) {
        consecutiveUnstressed += 1;
        if (consecutiveUnstressed === 3) {
          signals.stress_lapse.push({
            type: 'stress_lapse',
            line: line.lineNumber,
            word: syl.word,
            syllableIndex: i,
            gridSlot,
            description: `Stress lapse: rapid patter of 3+ consecutive unstressed syllables ending at "${syl.word}".`,
          });
        }
      } else {
        consecutiveUnstressed = 0;
      }
    });
  });

  const inversionRate = totalDownbeats > 0 ? Number((invertedCount / totalDownbeats).toFixed(2)) : 0.2;
  const metricGripScore = Math.round(Math.max(20, Math.min(100, 100 - inversionRate * 60)));

  let syncopationRating: StressAnalysisReport['syncopationRating'] = 'Dynamic Syncopation';
  if (inversionRate <= 0.15) syncopationRating = 'Strict On-Beat';
  else if (inversionRate >= 0.45) syncopationRating = 'Off-Beat Elastic Flow';

  const signalCounts: Record<StressSignalType, number> = {
    promotion: signals.promotion.length,
    demotion: signals.demotion.length,
    syncopation: signals.syncopation.length,
    trochaic_inversion: signals.trochaic_inversion.length,
    stress_clash: signals.stress_clash.length,
    stress_lapse: signals.stress_lapse.length,
    secondary_recruitment: signals.secondary_recruitment.length,
  };

  return {
    metricGripScore,
    inversionRate,
    syncopationRating,
    totalDownbeatHits: totalDownbeats,
    invertedDownbeats: invertedCount,
    signals,
    signalCounts,
  };
}

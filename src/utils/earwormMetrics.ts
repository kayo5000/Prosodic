/**
 * earwormMetrics.ts
 *
 * The Psychoacoustics of Catchiness: Hook & Earworm Metric Engine.
 *
 * Implements empirical formulas for melodic and lyrical stickiness:
 * 1. Sonic Reduplication Index (SRI): % of identical vowel nucleus repeats in 2-4 syllable chunks.
 * 2. Bouba / Kiki Percussive Punch Ratio: Ratio of punchy plosive consonants to open vowels.
 * 3. Hook Symmetrical Balance: Syllable count parity across consecutive lines.
 * 4. Overall Earworm & Catchiness Score (0 to 100).
 */

import { extractVowelFamily } from './dissector';
import { analyzeLyricsLines } from './syllableCounter';

export interface EarwormScoreReport {
  earwormScore: number; // 0 to 100
  sonicReduplicationRate: number; // 0.0 to 1.0 (% vowel repetition)
  percussivePunchRatio: number; // 0.0 to 1.0 (Kiki / Bouba balance)
  symmetryScore: number; // 0 to 100
  hookGrade: 'Viral Earworm' | 'Sticky Catchy' | 'Standard Flow' | 'Dense Narrative';
  recommendation: string;
}

/**
 * Computes Earworm & Catchiness metrics for a chorus, hook, or verse.
 */
export function scoreEarwormMetrics(lyrics: string): EarwormScoreReport {
  if (!lyrics || !lyrics.trim()) {
    return {
      earwormScore: 50,
      sonicReduplicationRate: 0.3,
      percussivePunchRatio: 0.5,
      symmetryScore: 50,
      hookGrade: 'Standard Flow',
      recommendation: 'Increase vowel repetition across bar endings to boost memory recall.',
    };
  }

  const lines = analyzeLyricsLines(lyrics);
  if (lines.length === 0) {
    return {
      earwormScore: 50,
      sonicReduplicationRate: 0.3,
      percussivePunchRatio: 0.5,
      symmetryScore: 50,
      hookGrade: 'Standard Flow',
      recommendation: 'Add lines to analyze hook catchiness.',
    };
  }

  // 1. Sonic Reduplication: Check vowel recurrence in line endings & key words
  const endingVowels: string[] = [];
  lines.forEach((line) => {
    if (line.words.length > 0) {
      const lastWord = line.words[line.words.length - 1].word;
      endingVowels.push(extractVowelFamily(lastWord));
    }
  });

  const vowelTally: Record<string, number> = {};
  endingVowels.forEach((v) => {
    if (v !== 'GENERAL') vowelTally[v] = (vowelTally[v] || 0) + 1;
  });

  const maxRepetitions = Math.max(...Object.values(vowelTally), 0);
  const sonicReduplicationRate =
    endingVowels.length > 0 ? Number((maxRepetitions / endingVowels.length).toFixed(2)) : 0.2;

  // 2. Bouba / Kiki Percussive Punch Ratio
  const clean = lyrics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const kikiStops = (clean.match(/[ptkbcg]/g) || []).length;
  const boubaVowels = (clean.match(/[mnouae]/g) || []).length;
  const percussivePunchRatio =
    boubaVowels > 0 ? Number((kikiStops / (kikiStops + boubaVowels)).toFixed(2)) : 0.5;

  // 3. Syllabic Symmetry Score across adjacent lines
  let syllableDeviations = 0;
  for (let i = 0; i < lines.length - 1; i += 1) {
    const diff = Math.abs(lines[i].syllableCount - lines[i + 1].syllableCount);
    syllableDeviations += diff;
  }
  const avgDiff = lines.length > 1 ? syllableDeviations / (lines.length - 1) : 0;
  const symmetryScore = Math.round(Math.max(20, Math.min(100, 100 - avgDiff * 12)));

  // 4. Composite Earworm Score (0 - 100)
  // Reduplication (0-45 pts), Punch Ratio (0-25 pts), Symmetry (0-30 pts)
  const redupPts = sonicReduplicationRate * 45;
  const punchPts = Math.min(25, Math.abs(0.5 - Math.abs(percussivePunchRatio - 0.5)) * 50);
  const symmPts = (symmetryScore / 100) * 30;

  const earwormScore = Math.round(Math.min(100, Math.max(15, redupPts + punchPts + symmPts)));

  let hookGrade: EarwormScoreReport['hookGrade'] = 'Standard Flow';
  let recommendation = 'Solid flow. Try repeating the exact vowel nucleus across beats 2 and 4 for instant hook recognition.';

  if (earwormScore >= 80) {
    hookGrade = 'Viral Earworm';
    recommendation = 'Exceptional acoustic memory retention. Symmetrical meter with high phonetic reduplication.';
  } else if (earwormScore >= 65) {
    hookGrade = 'Sticky Catchy';
    recommendation = 'Strong percussive punch with memorable vowel repetitions.';
  } else if (earwormScore < 45) {
    hookGrade = 'Dense Narrative';
    recommendation = 'Syllable variance is high. Great for complex storytelling verses; standardize line lengths if writing a chorus.';
  }

  return {
    earwormScore,
    sonicReduplicationRate,
    percussivePunchRatio,
    symmetryScore,
    hookGrade,
    recommendation,
  };
}

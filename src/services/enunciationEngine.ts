/**
 * enunciationEngine.ts
 *
 * Phonological Annunciation & Delivery Engine for Prosodic.
 * Generates all viable performance enunciations for a word (Standard Rhotic,
 * AAVE / Vernacular Non-Rhotic, Monophthongized, Cluster Reduced, Stress Shifted,
 * Elided / Compressed) and ranks them in order of likelihood determined by
 * surrounding verse rhyme syllables and active vowel families.
 */

import {
  basePhoneme,
  isVowel,
  stressDigit,
  lookupWordPhonemesWithSlang,
  rVocalization,
  consonantClusterReduction,
  monophthongization,
  aaveRhymeBridge,
} from '../utils/aavePhonology';
import { colorForFamily } from '../theme/theme';
import { countWordSyllables } from '../utils/syllableCounter';

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

export interface EnunciationSyllable {
  text: string;
  phonemes: string[];
  stress: number; // 0 = unstressed, 1 = primary, 2 = secondary
  vowelFamilyId: number;
  vowelFamilyName: string;
  vowelFamilyColor: string;
}

export interface EnunciationOption {
  id: string;
  label: string; // e.g. "Standard Rhotic", "AAVE Non-Rhotic Slant", "Trochaic Front Stress"
  dialectType: 'standard' | 'aave' | 'slant' | 'stress_shift' | 'elision' | 'lengthened';
  description: string;
  phonemes: string[];
  ipa: string;
  syllables: EnunciationSyllable[];
  rhymeFamilyId: number;
  rhymeFamilyName: string;
  likelihoodScore: number; // 0.0 to 1.0 (e.g. 0.96 -> 96% Match)
  contextMatchReason?: string;
  isRecommended?: boolean;
}

export interface EnunciationContext {
  activeVowelFamiliesInVerse?: number[];
  surroundingRhymeUnits?: string[][];
  surroundingWords?: string[];
  dominantFamilyId?: number;
  currentLineIndex?: number;
}

// ---------------------------------------------------------------------------
// 2. Vowel Family & IPA Lookup Tables
// ---------------------------------------------------------------------------

export const FAMILY_METADATA: Record<number, { name: string; nucleus: string; example: string }> = {
  1: { name: 'ER-Family (NURSE)', nucleus: 'ER', example: 'worst, curse, turnt, hurt' },
  2: { name: 'VR-Family (NEAR)', nucleus: 'IH/IY+R', example: 'persevere, adhere, clear, steer' },
  3: { name: 'AIR-Family (SQUARE)', nucleus: 'EH+R', example: 'rare, stare, care, there' },
  4: { name: 'AR-Family (START)', nucleus: 'AA+R', example: 'car, far, hard, smart' },
  5: { name: 'OR-Family (NORTH)', nucleus: 'AO+R', example: 'more, door, floor, store' },
  6: { name: 'EE-Family', nucleus: 'IY', example: 'see, feel, deep, dream' },
  7: { name: 'AY-Family', nucleus: 'AY', example: 'life, night, mind, rhyme' },
  8: { name: 'EY-Family', nucleus: 'EY', example: 'day, way, make, state' },
  9: { name: 'OH-Family', nucleus: 'OW', example: 'know, flow, cold, stone' },
  10: { name: 'OO-Family', nucleus: 'UW', example: 'true, move, cool, room' },
  11: { name: 'AH-Family', nucleus: 'AH/AA', example: 'blood, love, run, god' },
  12: { name: 'EH-Family', nucleus: 'EH', example: 'head, dead, best, step' },
  13: { name: 'IH-Family', nucleus: 'IH', example: 'win, begin, think, spit' },
  14: { name: 'AW-Family', nucleus: 'AW', example: 'down, sound, out, crown' },
  15: { name: 'AE-Family', nucleus: 'AE', example: 'back, track, trap, stand' },
  16: { name: 'OY-Family', nucleus: 'OY', example: 'coin, voice, boy, joy' },
};

const ARPABET_TO_IPA: Record<string, string> = {
  AA: 'ɑ',
  AE: 'æ',
  AH: 'ʌ',
  AO: 'ɔ',
  AW: 'aʊ',
  AY: 'aɪ',
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  EH: 'ɛ',
  ER: 'ɜːr',
  EY: 'eɪ',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  IH: 'ɪ',
  IY: 'iː',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  OW: 'oʊ',
  OY: 'ɔɪ',
  P: 'p',
  R: 'r',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  UH: 'ʊ',
  UW: 'uː',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
};

export function phonemesToIpa(phonemes: string[]): string {
  if (!phonemes || phonemes.length === 0) return '';
  return '/' + phonemes.map((p) => {
    const base = basePhoneme(p);
    const stress = stressDigit(p);
    const ipa = ARPABET_TO_IPA[base] || base.toLowerCase();
    if (stress === '1') return `ˈ${ipa}`;
    if (stress === '2') return `ˌ${ipa}`;
    return ipa;
  }).join(' ') + '/';
}

/**
 * Maps an ARPABET phoneme sequence to its primary Wells / Perceptual Rhyme Family ID (1-16).
 */
export function classifyRhymeFamilyId(phonemes: string[]): { id: number; name: string } {
  if (!phonemes || phonemes.length === 0) {
    return { id: 11, name: 'AH-Family' };
  }

  // Find last vowel or vowel+R combination
  for (let i = phonemes.length - 1; i >= 0; i -= 1) {
    const p = basePhoneme(phonemes[i]);
    const next = i + 1 < phonemes.length ? basePhoneme(phonemes[i + 1]) : null;

    if (p === 'ER') {
      return { id: 1, name: 'ER-Family (NURSE)' };
    }

    if ((p === 'IH' || p === 'IY') && next === 'R') {
      return { id: 2, name: 'VR-Family (NEAR)' };
    }

    if (p === 'EH' && next === 'R') {
      return { id: 3, name: 'AIR-Family (SQUARE)' };
    }

    if ((p === 'AA' || p === 'AH') && next === 'R') {
      return { id: 4, name: 'AR-Family (START)' };
    }

    if ((p === 'AO' || p === 'OW') && next === 'R') {
      return { id: 5, name: 'OR-Family (NORTH)' };
    }

    if (p === 'IY') return { id: 6, name: 'EE-Family' };
    if (p === 'AY') return { id: 7, name: 'AY-Family' };
    if (p === 'EY') return { id: 8, name: 'EY-Family' };
    if (p === 'OW') return { id: 9, name: 'OH-Family' };
    if (p === 'UW' || p === 'UH') return { id: 10, name: 'OO-Family' };
    if (p === 'AH' || p === 'AA') return { id: 11, name: 'AH-Family' };
    if (p === 'EH') return { id: 12, name: 'EH-Family' };
    if (p === 'IH') return { id: 13, name: 'IH-Family' };
    if (p === 'AW') return { id: 14, name: 'AW-Family' };
    if (p === 'AE') return { id: 15, name: 'AE-Family' };
    if (p === 'OY') return { id: 16, name: 'OY-Family' };
  }

  return { id: 11, name: 'AH-Family' };
}

// ---------------------------------------------------------------------------
// 3. Syllable Segmenter for Phonemes
// ---------------------------------------------------------------------------

function segmentPhonemesIntoSyllables(
  word: string,
  phonemes: string[],
): EnunciationSyllable[] {
  const syllables: EnunciationSyllable[] = [];
  const vowelIndices: number[] = [];

  for (let i = 0; i < phonemes.length; i += 1) {
    if (isVowel(phonemes[i])) {
      vowelIndices.push(i);
    }
  }

  if (vowelIndices.length === 0) {
    const fam = classifyRhymeFamilyId(phonemes);
    return [
      {
        text: word,
        phonemes: phonemes.length > 0 ? phonemes : ['AH1'],
        stress: 1,
        vowelFamilyId: fam.id,
        vowelFamilyName: fam.name,
        vowelFamilyColor: colorForFamily(fam.id),
      },
    ];
  }

  // Partition word text into chunks matching syllable count
  const wordParts = partitionWordText(word, vowelIndices.length);

  for (let sIdx = 0; sIdx < vowelIndices.length; sIdx += 1) {
    const vIdx = vowelIndices[sIdx];
    const prevVIdx = sIdx > 0 ? vowelIndices[sIdx - 1] : -1;
    const nextVIdx = sIdx + 1 < vowelIndices.length ? vowelIndices[sIdx + 1] : phonemes.length;

    let start = 0;
    if (sIdx === 0) {
      start = 0;
    } else {
      const dist = vIdx - prevVIdx;
      start = prevVIdx + Math.max(1, Math.floor(dist / 2));
    }

    let end = phonemes.length;
    if (sIdx < vowelIndices.length - 1) {
      const dist = nextVIdx - vIdx;
      end = vIdx + Math.max(1, Math.ceil(dist / 2));
    }

    const sylPhonemes = phonemes.slice(start, end);
    const vowelPhoneme = phonemes[vIdx];
    const sDigit = stressDigit(vowelPhoneme);
    const stressVal = parseInt(sDigit, 10) || 0;
    const fam = classifyRhymeFamilyId(sylPhonemes);

    syllables.push({
      text: wordParts[sIdx] || word,
      phonemes: sylPhonemes,
      stress: stressVal,
      vowelFamilyId: fam.id,
      vowelFamilyName: fam.name,
      vowelFamilyColor: colorForFamily(fam.id),
    });
  }

  return syllables;
}

/**
 * Splits raw word string into approximate syllable chunks for UI display.
 */
function partitionWordText(word: string, count: number): string[] {
  if (count <= 1) return [word];
  const clean = word.trim();
  const len = clean.length;
  if (len <= count) {
    return clean.split('');
  }

  const chunkSize = Math.floor(len / count);
  const parts: string[] = [];
  let curr = 0;

  for (let i = 0; i < count; i += 1) {
    if (i === count - 1) {
      parts.push(clean.slice(curr));
    } else {
      parts.push(clean.slice(curr, curr + chunkSize));
      curr += chunkSize;
    }
  }

  return parts;
}

// ---------------------------------------------------------------------------
// 4. Enunciation Variant Generation
// ---------------------------------------------------------------------------

export function generateWordEnunciations(
  rawWord: string,
  context?: EnunciationContext,
): EnunciationOption[] {
  const clean = rawWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z']/g, '');

  if (!clean) return [];

  const { phonemes: standardPhonemes } = lookupWordPhonemesWithSlang(clean);
  const basePhs = standardPhonemes && standardPhonemes.length > 0 ? standardPhonemes : ['AH1'];

  const variants: EnunciationOption[] = [];
  const seenPhonemeKeys = new Set<string>();

  const pushOption = (
    id: string,
    label: string,
    dialectType: EnunciationOption['dialectType'],
    description: string,
    phonemes: string[],
    baseLikelihood: number,
  ) => {
    const key = phonemes.join(' ');
    if (seenPhonemeKeys.has(key)) return;
    seenPhonemeKeys.add(key);

    const syllables = segmentPhonemesIntoSyllables(rawWord, phonemes);
    const rhymeFamily = classifyRhymeFamilyId(phonemes);
    const ipa = phonemesToIpa(phonemes);

    variants.push({
      id,
      label,
      dialectType,
      description,
      phonemes,
      ipa,
      syllables,
      rhymeFamilyId: rhymeFamily.id,
      rhymeFamilyName: rhymeFamily.name,
      likelihoodScore: baseLikelihood,
    });
  };

  // 1. Standard Dictionary Pronunciation
  pushOption(
    'standard',
    'Standard Rhotic',
    'standard',
    'Standard dictionary pronunciation with full articulation.',
    basePhs,
    0.88,
  );

  // 2. AAVE R-Vocalization / Non-Rhoticity
  const rvoc = rVocalization(basePhs);
  if (rvoc) {
    const fam = classifyRhymeFamilyId(rvoc);
    pushOption(
      'aave_rvoc',
      'AAVE Non-Rhotic Slant',
      'aave',
      `Postvocalic R-dropping shifting cadence into the ${fam.name}.`,
      rvoc,
      0.82,
    );
  }

  // 3. Consonant Cluster Reduction (CCR)
  const ccr = consonantClusterReduction(basePhs);
  if (ccr) {
    pushOption(
      'aave_ccr',
      'Cluster Reduced (CCR)',
      'aave',
      'Final consonant softening (e.g. past -> pass, mind -> mine).',
      ccr,
      0.80,
    );
  }

  // 4. Monophthongization (/AY/ -> /AA/)
  const mono = monophthongization(basePhs);
  if (mono) {
    pushOption(
      'monophthong',
      'Southern / Trap Monophthong',
      'aave',
      'Diphthong smoothing /AY/ -> /AA/ for open vowel pocketing.',
      mono,
      0.78,
    );
  }

  // 5. Stress Shifting (Trochaic Front Stress vs Back Stress)
  const vowelCount = basePhs.filter(isVowel).length;
  if (vowelCount >= 2) {
    const frontStressed = basePhs.map((p, idx) => {
      if (!isVowel(p)) return p;
      const base = basePhoneme(p);
      const isFirstVowel = basePhs.findIndex(isVowel) === idx;
      return isFirstVowel ? `${base}1` : `${base}0`;
    });

    if (frontStressed.join(' ') !== basePhs.join(' ')) {
      pushOption(
        'front_stress',
        'Trochaic Front Stress',
        'stress_shift',
        'Emphasizes the initial syllable for punchy on-the-beat delivery.',
        frontStressed,
        0.65,
      );
    }

    const backStressed = basePhs.map((p, idx) => {
      if (!isVowel(p)) return p;
      const base = basePhoneme(p);
      const lastVowelIdx = basePhs.reduce((acc, curr, i) => (isVowel(curr) ? i : acc), -1);
      return idx === lastVowelIdx ? `${base}1` : `${base}0`;
    });

    if (backStressed.join(' ') !== basePhs.join(' ') && backStressed.join(' ') !== frontStressed.join(' ')) {
      pushOption(
        'back_stress',
        'End-Rhyme Stress',
        'stress_shift',
        'Accents the trailing syllable for sustained end-rhyme cadence.',
        backStressed,
        0.68,
      );
    }
  }

  // 6. Syllable Compression / Elision (e.g. 3 syl -> 2 syl, syncope / fast flow)
  const sylCount = Math.max(vowelCount, countWordSyllables(clean));
  if (sylCount >= 3 && vowelCount >= 2) {
    let dropped = false;
    const compressed: string[] = [];
    let seenVowels = 0;
    
    // Attempt 1: drop a middle vowel (vowel index > 0 and < vowelCount - 1)
    for (let i = 0; i < basePhs.length; i += 1) {
      const p = basePhs[i];
      if (isVowel(p)) {
        seenVowels += 1;
        if (seenVowels > 1 && seenVowels < vowelCount && !dropped) {
          dropped = true;
          continue;
        }
      }
      compressed.push(p);
    }

    // Attempt 2: if not dropped, drop the first unstressed vowel
    if (!dropped && vowelCount >= 3) {
      seenVowels = 0;
      for (let i = 0; i < basePhs.length; i += 1) {
        const p = basePhs[i];
        if (isVowel(p)) {
          seenVowels += 1;
          if (seenVowels === 1 && stressDigit(p) === '0' && !dropped) {
            dropped = true;
            continue;
          }
        }
        compressed.push(p);
      }
    }

    if (compressed.length > 0 && compressed.length < basePhs.length) {
      pushOption(
        'compressed',
        'Compressed / Fast Flow',
        'elision',
        'Elides the internal syllable for high-speed meter pockets.',
        compressed,
        0.58,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 5. Context-Aware Ranking & Likelihood Scoring
  // -------------------------------------------------------------------------
  const activeFamilies = new Set(context?.activeVowelFamiliesInVerse || []);
  const dominantFamilyId = context?.dominantFamilyId;
  const surroundingWords = context?.surroundingWords || [];

  variants.forEach((v) => {
    let score = v.likelihoodScore;
    let reason: string | undefined;

    if (dominantFamilyId && v.rhymeFamilyId === dominantFamilyId) {
      score += 0.28;
      const famName = FAMILY_METADATA[dominantFamilyId]?.name || 'Dominant Family';
      reason = `Matches verse dominant rhyme: ${famName}`;
    } else if (activeFamilies.has(v.rhymeFamilyId)) {
      score += 0.22;
      const famName = FAMILY_METADATA[v.rhymeFamilyId]?.name || 'Surrounding Family';
      reason = `Aligns with active rhyme family in verse (${famName})`;
    }

    for (const w of surroundingWords) {
      const cleanW = w.toLowerCase().replace(/[^a-z']/g, '');
      if (cleanW === clean || cleanW.length <= 1) continue;

      const { phonemes: wPhs } = lookupWordPhonemesWithSlang(cleanW);
      if (wPhs && wPhs.length > 0) {
        if (aaveRhymeBridge(v.phonemes, wPhs, 0.6)) {
          score += 0.32;
          const famName = FAMILY_METADATA[v.rhymeFamilyId]?.name || 'Rhyme Set';
          reason = `Rhymes with surrounding word "${cleanW}" (${famName})`;
          break;
        }
      }
    }

    v.likelihoodScore = Math.min(0.99, Math.max(0.15, Number(score.toFixed(2))));
    if (reason) {
      v.contextMatchReason = reason;
    }
  });

  variants.sort((a, b) => b.likelihoodScore - a.likelihoodScore);

  if (variants.length > 0) {
    variants[0].isRecommended = true;
  }

  return variants;
}

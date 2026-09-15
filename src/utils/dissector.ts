import {
  analyzeLyricsLines,
  countWordSyllables,
  type LineSyllableAnalysis,
} from './syllableCounter';
import { getBarMetrics, type TimeSignature } from './tempoDensity';
import {
  aaveRhymeBridge,
  extractRhymeUnit,
  lookupWordPhonemesWithSlang,
} from './aavePhonology';

import {
  extractVowelFamily,
  classifyRFamily,
  areRClassesCompatible,
  areCodasCompatible,
  normalizeWord,
  VOWEL_FAMILIES,
  type VowelFamilyKey,
} from './perceptualFamilies';

export type RhymeType = 'PERFECT' | 'SLANT' | 'NEAR' | 'FAMILY' | 'NONE';

export {
  VOWEL_FAMILIES,
  extractVowelFamily,
  classifyRFamily,
  areRClassesCompatible,
  areCodasCompatible,
  isSelfRhyme,
  normalizeWord,
  type VowelFamilyKey,
  type VowelFamilyMeta,
} from './perceptualFamilies';

/**
 * Classifies the phonetic relationship between two words into canonical rhyme categories.
 * Enforces:
 * 1. Self-rhyme guard (Money/money, runnin'/Running -> NONE)
 * 2. R-Family hard gate (Class 1 ER vs Class 2 VR -> NONE)
 * 3. Exact CMU rhyme unit match -> PERFECT
 * 4. AAVE / Slant phonological bridge -> SLANT
 * 5. Coda compatibility -> NEAR
 * 6. Shared vowel family -> FAMILY
 */
export function classifyRhymePair(rawWordA: string, rawWordB: string): RhymeType {
  const cleanA = rawWordA.toLowerCase().replace(/[^a-z]/g, '');
  const cleanB = rawWordB.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleanA || !cleanB) return 'NONE';
  if (cleanA === cleanB) return 'PERFECT';

  // R-family architectural gate: ER (worst/thirst/curse) <-> VR (adhere/career/steer) is BLOCKED
  const rA = classifyRFamily(cleanA);
  const rB = classifyRFamily(cleanB);
  if (!areRClassesCompatible(rA, rB)) return 'NONE';

  const famA = extractVowelFamily(cleanA);
  const famB = extractVowelFamily(cleanB);

  // 1. Check exact phonetic rhyme units via CMU / Slang
  const phonemesA = lookupWordPhonemesWithSlang(cleanA).phonemes;
  const phonemesB = lookupWordPhonemesWithSlang(cleanB).phonemes;
  const unitA = extractRhymeUnit(phonemesA);
  const unitB = extractRhymeUnit(phonemesB);

  if (unitA.length > 0 && unitB.length > 0 && unitA.join('_') === unitB.join('_')) {
    return 'PERFECT';
  }

  // 2. Check Slant / AAVE rhyme bridge
  if (aaveRhymeBridge(phonemesA, phonemesB, 0.5)) {
    return 'SLANT';
  }

  // 3. Shared vowel family checks with coda compatibility
  if (famA !== 'GENERAL' && famA === famB) {
    if (areCodasCompatible(cleanA, cleanB, famA, famB)) {
      return 'NEAR';
    }
    return 'FAMILY';
  }

  return 'NONE';
}

export interface DissectedWord {
  word: string;
  syllables: number;
  vowelFamily: VowelFamilyKey;
  color: string;
  rhymeGroup: number | null; // Group ID if part of a detected rhyme chain
  isRhymeAnchor: boolean;
  rhymeType?: RhymeType;
}

export interface DissectedLine {
  lineNumber: number;
  rawText: string;
  syllableCount: number;
  sps: number;
  pocketStatus: 'open' | 'locked' | 'fast';
  words: DissectedWord[];
  rhymeEndingWord: string | null;
  rhymeFamily: VowelFamilyKey;
}

export interface LiteraryDeviceMatch {
  type: 'Alliteration' | 'Anaphora' | 'Anadiplosis' | 'Internal Multisyllabic Weave';
  title: string;
  description: string;
  lineNumbers: number[];
  words: string[];
}

export interface CrossBarWord {
  fullWord: string;
  leadingFragment: string;
  trailingFragment: string;
  fromBar: number;
  toBar: number;
  leadingSyllables: number;
  trailingSyllables: number;
  type: 'hyphenated_straddle' | 'barline_marker' | 'metric_spillover';
}

export interface CrossBarRhyme {
  fromBar: number;
  toBar: number;
  fromWord: string;
  toWord: string;
  vowelFamily: VowelFamilyKey;
  rhymeType: RhymeType;
}

export interface DissectionAnalysis {
  title: string;
  bpm: number;
  timeSignature: TimeSignature;
  totalBars: number;
  totalSyllables: number;
  averageSps: number;
  peakSps: number;
  complexityScore: number; // 0 - 100
  lines: DissectedLine[];
  devices: LiteraryDeviceMatch[];
  dominantVowelFamily: VowelFamilyKey;
  rhymeChainCount: number;
  internalRhymeDensity: number; // 0 - 100 (%)
  compoundMultisyllabicDepth: number; // 0 - 1 (chains / bar)
  enjambmentRate: number; // 0 - 1
  crossBarWords: CrossBarWord[];
  crossBarRhymes: CrossBarRhyme[];
  crossBarWeaveDensity: number; // 0 - 1
}

/**
 * Performs full forensic analysis on a completed verse:
 * - Vowel family extraction per word
 * - Rhyme chain clustering across end and internal rhymes
 * - Literary device discovery (Alliteration, Anaphora, Anadiplosis)
 * - Cadence velocity curve (SPS) and 0-100 Complexity scoring
 */
export function dissectLyrics(
  text: string,
  bpm: number = 90,
  timeSignature: TimeSignature = '4/4',
  title: string = 'Lyrical Dissection',
): DissectionAnalysis {
  const linesAnalysis: LineSyllableAnalysis[] = analyzeLyricsLines(text);
  const metrics = getBarMetrics(bpm, 'dense', false, timeSignature);
  const barDuration = metrics.barDurationSeconds;

  // Step 1: Map words to vowel families and syllable metadata
  const dissectedLines: DissectedLine[] = linesAnalysis.map((line) => {
    const sps = barDuration > 0 ? Number((line.syllableCount / barDuration).toFixed(2)) : 0;
    let pocketStatus: 'open' | 'locked' | 'fast' = 'locked';
    if (line.syllableCount < metrics.minSyllables) pocketStatus = 'open';
    if (line.syllableCount > metrics.maxSyllables) pocketStatus = 'fast';

    const words: DissectedWord[] = line.words.map((w) => {
      const family = extractVowelFamily(w.word);
      return {
        word: w.word,
        syllables: w.syllables,
        vowelFamily: family,
        color: VOWEL_FAMILIES[family].color,
        rhymeGroup: null,
        isRhymeAnchor: false,
      };
    });

    const lastWord = words.length > 0 ? words[words.length - 1] : null;
    const rhymeFamily = lastWord ? lastWord.vowelFamily : 'GENERAL';

    return {
      lineNumber: line.lineNumber,
      rawText: line.rawText,
      syllableCount: line.syllableCount,
      sps,
      pocketStatus,
      words,
      rhymeEndingWord: lastWord ? lastWord.word : null,
      rhymeFamily,
    };
  });

  // Step 2: Rhyme Chain Discovery across end-words & internal multi-chains
  const rhymeFamilyMap: Record<string, { lineIdx: number; wordIdx: number }[]> = {};
  dissectedLines.forEach((line, lIdx) => {
    line.words.forEach((w, wIdx) => {
      if (w.vowelFamily !== 'GENERAL') {
        if (!rhymeFamilyMap[w.vowelFamily]) {
          rhymeFamilyMap[w.vowelFamily] = [];
        }
        rhymeFamilyMap[w.vowelFamily].push({ lineIdx: lIdx, wordIdx: wIdx });
      }
    });
  });

  let rhymeGroupId = 1;
  let rhymeChainCount = 0;
  Object.entries(rhymeFamilyMap).forEach(([_, occurrences]) => {
    // Guard: filter out groups where all words are identical repetitions (self-rhymes)
    const distinctWords = new Set(
      occurrences.map((occ) => normalizeWord(dissectedLines[occ.lineIdx].words[occ.wordIdx].word))
    );
    if (occurrences.length >= 2 && distinctWords.size >= 2) {
      rhymeChainCount += 1;
      const anchorWord = occurrences[0];
      const anchorWordText = dissectedLines[anchorWord.lineIdx].words[anchorWord.wordIdx].word;
      occurrences.forEach((occ) => {
        const targetWord = dissectedLines[occ.lineIdx].words[occ.wordIdx];
        targetWord.rhymeGroup = rhymeGroupId;
        targetWord.rhymeType = classifyRhymePair(anchorWordText, targetWord.word);
        if (occ.wordIdx === dissectedLines[occ.lineIdx].words.length - 1) {
          targetWord.isRhymeAnchor = true;
        }
      });
      rhymeGroupId += 1;
    }
  });

  // Step 3: Discover Literary Devices
  const devices: LiteraryDeviceMatch[] = [];

  // A. Alliteration (3+ words in a line starting with same consonant sound)
  dissectedLines.forEach((line) => {
    const consonants: Record<string, string[]> = {};
    line.words.forEach((w) => {
      const clean = w.word.toLowerCase().replace(/[^a-z]/g, '');
      if (clean && !/^[aeiou]/.test(clean)) {
        const lead = clean.slice(0, 1);
        if (!consonants[lead]) consonants[lead] = [];
        consonants[lead].push(w.word);
      }
    });

    Object.entries(consonants).forEach(([letter, matches]) => {
      if (matches.length >= 3) {
        devices.push({
          type: 'Alliteration',
          title: `Alliterative Sequence: /${letter.toUpperCase()}/`,
          description: `${matches.length} words in Bar ${line.lineNumber} emphasize the plosive /${letter.toUpperCase()}/ consonant.`,
          lineNumbers: [line.lineNumber],
          words: matches,
        });
      }
    });
  });

  // B. Anaphora (Repeated opening words across 2+ consecutive lines)
  for (let i = 0; i < dissectedLines.length - 1; i += 1) {
    const currFirst = dissectedLines[i].words[0]?.word.toLowerCase().replace(/[^a-z]/g, '');
    const nextFirst = dissectedLines[i + 1].words[0]?.word.toLowerCase().replace(/[^a-z]/g, '');
    if (currFirst && nextFirst && currFirst === nextFirst && currFirst.length > 2) {
      devices.push({
        type: 'Anaphora',
        title: `Anaphora Repetition: "${currFirst}"`,
        description: `Consecutive lines ${dissectedLines[i].lineNumber} & ${dissectedLines[i + 1].lineNumber} open with the identical anchor "${currFirst}".`,
        lineNumbers: [dissectedLines[i].lineNumber, dissectedLines[i + 1].lineNumber],
        words: [dissectedLines[i].words[0].word, dissectedLines[i + 1].words[0].word],
      });
    }
  }

  // C. Anadiplosis (Last word of line i matches first word of line i + 1)
  for (let i = 0; i < dissectedLines.length - 1; i += 1) {
    const lastWord = dissectedLines[i].words[dissectedLines[i].words.length - 1]?.word
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const nextFirstWord = dissectedLines[i + 1].words[0]?.word.toLowerCase().replace(/[^a-z]/g, '');
    if (lastWord && nextFirstWord && lastWord === nextFirstWord && lastWord.length > 2) {
      devices.push({
        type: 'Anadiplosis',
        title: `Anadiplosis Loop: "${lastWord}"`,
        description: `Bar ${dissectedLines[i].lineNumber} ends with "${lastWord}", which immediately opens Bar ${dissectedLines[i + 1].lineNumber}.`,
        lineNumbers: [dissectedLines[i].lineNumber, dissectedLines[i + 1].lineNumber],
        words: [lastWord],
      });
    }
  }

  // Step 4: Summary Telemetry & Complexity Index Scoring
  const activeBars = dissectedLines.filter((l) => l.syllableCount > 0);
  const totalBars = activeBars.length > 0 ? activeBars.length : dissectedLines.length;
  const totalSyllables = dissectedLines.reduce((acc, l) => acc + l.syllableCount, 0);
  const averageSps =
    activeBars.length > 0
      ? Number((activeBars.reduce((acc, l) => acc + l.sps, 0) / activeBars.length).toFixed(2))
      : 0;
  const peakSps = Math.max(...dissectedLines.map((l) => l.sps), 0);

  // Internal Rhyme Density: % of total syllables occurring in internal rhyme positions
  let internalRhymeSyllables = 0;
  dissectedLines.forEach((l) => {
    l.words.forEach((w) => {
      if (w.rhymeGroup !== null && !w.isRhymeAnchor) {
        internalRhymeSyllables += w.syllables;
      }
    });
  });
  const internalRhymeDensity =
    totalSyllables > 0 ? Number(((internalRhymeSyllables / totalSyllables) * 100).toFixed(2)) : 0;

  // Compound Multisyllabic Depth: frequency of compound multi-syllable rhyme instances (>=3 syllables) per bar
  let multisyllabicChainCount = 0;
  Object.values(rhymeFamilyMap).forEach((occurrences) => {
    if (occurrences.length >= 2) {
      const maxWordSyl = Math.max(
        ...occurrences.map((o) => dissectedLines[o.lineIdx].words[o.wordIdx]?.syllables || 1),
      );
      if (maxWordSyl >= 3 || occurrences.length >= 3) {
        multisyllabicChainCount += 1;
      }
    }
  });
  const compoundMultisyllabicDepth =
    totalBars > 0 ? Number((multisyllabicChainCount / totalBars).toFixed(4)) : 0;

  // Cross-Bar Enjambment Rate: lines without terminal punctuation ending in continuative syntax
  const ENJAMBMENT_CONNECTORS = new Set([
    'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
    'in', 'on', 'at', 'to', 'of', 'with', 'by', 'from', 'into', 'onto', 'through', 'about',
    'that', 'which', 'who', 'whom', 'whose', 'where', 'when', 'while', 'because', 'if', 'as',
    'the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their',
  ]);
  let enjambedLineCount = 0;
  for (let i = 0; i < dissectedLines.length - 1; i += 1) {
    const raw = dissectedLines[i].rawText.trim();
    if (!raw) continue;
    const endsWithTerminalPunct = /[.!?؛;:]$/.test(raw);
    const lastWord = dissectedLines[i].words[dissectedLines[i].words.length - 1]?.word
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    if (!endsWithTerminalPunct && lastWord && ENJAMBMENT_CONNECTORS.has(lastWord)) {
      enjambedLineCount += 1;
    }
  }
  const enjambmentRate =
    dissectedLines.length > 1
      ? Number((enjambedLineCount / (dissectedLines.length - 1)).toFixed(4))
      : 0;

  // Find dominant vowel/rhyme family (line rhyme endings weighted heavily)
  const familyTally: Record<string, number> = {};
  dissectedLines.forEach((l) => {
    if (l.rhymeFamily !== 'GENERAL') {
      familyTally[l.rhymeFamily] = (familyTally[l.rhymeFamily] || 0) + 10;
    }
    l.words.forEach((w) => {
      if (w.vowelFamily !== 'GENERAL') {
        const weight = w.isRhymeAnchor ? 5 : w.rhymeGroup ? 2 : 1;
        familyTally[w.vowelFamily] = (familyTally[w.vowelFamily] || 0) + weight;
      }
    });
  });
  let dominantVowelFamily: VowelFamilyKey = 'GENERAL';
  let maxTally = 0;
  Object.entries(familyTally).forEach(([fam, count]) => {
    if (count > maxTally) {
      maxTally = count;
      dominantVowelFamily = fam as VowelFamilyKey;
    }
  });

  // Calculate Complexity Score (0 - 100)
  // Factors: Syllable density (0-35), Rhyme chains (0-35), Devices (0-20), Velocity range (0-10)
  const densityScore = Math.min(35, (averageSps / 7.0) * 35);
  const rhymeScore = Math.min(35, (rhymeChainCount / Math.max(2, totalBars * 0.75)) * 35);
  const deviceScore = Math.min(20, devices.length * 7);
  const dynamicRangeScore = Math.min(10, Math.abs(peakSps - averageSps) * 3);
  const complexityScore =
    totalSyllables === 0 || activeBars.length === 0
      ? 0
      : Math.round(
          Math.min(100, Math.max(0, densityScore + rhymeScore + deviceScore + dynamicRangeScore)),
        );

  // Cross-Bar Words: Syllables of a single word straddling across the barline
  const crossBarWords: CrossBarWord[] = [];

  // 1. Hyphenated word break across consecutive lines (e.g. "de-" at line end, "posit" at next line start)
  for (let i = 0; i < dissectedLines.length - 1; i += 1) {
    const currLine = dissectedLines[i];
    const nextLine = dissectedLines[i + 1];

    if (currLine.words.length > 0 && nextLine.words.length > 0) {
      const lastW = currLine.words[currLine.words.length - 1];
      const firstW = nextLine.words[0];
      const lastRaw = lastW.word.trim();
      const firstRaw = firstW.word.trim();

      if (/-\W*$/.test(lastRaw) || /^\W*-/.test(firstRaw)) {
        const leadClean = lastRaw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
        const trailClean = firstRaw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
        if (leadClean && trailClean) {
          const fullWord = `${leadClean}${trailClean}`;
          const fullSyl = countWordSyllables(fullWord);
          const leadSyl = Math.max(1, countWordSyllables(leadClean));
          const trailSyl = Math.max(
            1,
            fullSyl > leadSyl ? fullSyl - leadSyl : countWordSyllables(trailClean),
          );
          crossBarWords.push({
            fullWord,
            leadingFragment: leadClean,
            trailingFragment: trailClean,
            fromBar: currLine.lineNumber,
            toBar: nextLine.lineNumber,
            leadingSyllables: leadSyl,
            trailingSyllables: trailSyl,
            type: 'hyphenated_straddle',
          });
        }
      }
    }
  }

  // 2. Inline barline delimiter inside a word (e.g. "de|posit", "ac|cident", "de/posit")
  dissectedLines.forEach((currLine, idx) => {
    const nextLine = idx < dissectedLines.length - 1 ? dissectedLines[idx + 1] : null;
    const toBar = nextLine ? nextLine.lineNumber : currLine.lineNumber + 1;
    const matches = currLine.rawText.matchAll(/\b([a-zA-Z]+)[|\/]([a-zA-Z]+)\b/g);
    for (const match of matches) {
      const leadClean = match[1];
      const trailClean = match[2];
      const fullWord = `${leadClean}${trailClean}`;
      const fullSyl = countWordSyllables(fullWord);
      const leadSyl = Math.max(1, countWordSyllables(leadClean));
      const trailSyl = Math.max(
        1,
        fullSyl > leadSyl ? fullSyl - leadSyl : countWordSyllables(trailClean),
      );
      crossBarWords.push({
        fullWord,
        leadingFragment: leadClean,
        trailingFragment: trailClean,
        fromBar: currLine.lineNumber,
        toBar,
        leadingSyllables: leadSyl,
        trailingSyllables: trailSyl,
        type: 'barline_marker',
      });
    }
  });

  // Cross-Bar Rhymes: Rhymes that link from bar coda (pickup beats 3-4) into the next bar's onset (beats 1-2)
  const crossBarRhymes: CrossBarRhyme[] = [];
  for (let i = 0; i < dissectedLines.length - 1; i += 1) {
    const currLine = dissectedLines[i];
    const nextLine = dissectedLines[i + 1];
    if (currLine.words.length === 0 || nextLine.words.length === 0) continue;

    const tailWords = currLine.words.slice(-3);
    const headWords = nextLine.words.slice(0, 3);

    tailWords.forEach((tw) => {
      headWords.forEach((hw) => {
        const rhymeType = classifyRhymePair(tw.word, hw.word);
        if (rhymeType !== 'NONE') {
          crossBarRhymes.push({
            fromBar: currLine.lineNumber,
            toBar: nextLine.lineNumber,
            fromWord: tw.word,
            toWord: hw.word,
            vowelFamily: tw.vowelFamily,
            rhymeType,
          });
        }
      });
    });
  }

  const crossBarWeaveDensity =
    dissectedLines.length > 1
      ? Number(Math.min(1.0, crossBarRhymes.length / (dissectedLines.length - 1)).toFixed(4))
      : 0;

  return {
    title,
    bpm,
    timeSignature,
    totalBars,
    totalSyllables,
    averageSps,
    peakSps,
    complexityScore,
    lines: dissectedLines,
    devices,
    dominantVowelFamily,
    rhymeChainCount,
    internalRhymeDensity,
    compoundMultisyllabicDepth,
    enjambmentRate,
    crossBarWords,
    crossBarRhymes,
    crossBarWeaveDensity,
  };
}

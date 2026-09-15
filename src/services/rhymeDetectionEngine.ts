/**
 * rhymeDetectionEngine.ts
 *
 * Direct TypeScript port of the vetted Prosodic Python domain engines:
 * - domain/rhyme_detection_engine.py
 * - domain/phoneme_engine.py
 * - domain/syllable_engine.py
 * - domain/motif_engine.py
 * - domain/feedback_engine.py
 *
 * Algorithm Guarantees:
 * 1. Operates on syllable streams — never raw unclassified text.
 * 2. Stressed Syllable Candidates: filters out unstressed syllables and function words.
 * 3. Deduplication per Word: uses only the last stressed syllable of each word as grouping seed.
 * 4. R-Family Classification & Hard Gates: ER (worst/curse) vs VR (appear/career) vs EH+R (rare/stare).
 * 5. Union-Find Connected Components with Transitivity (syllable_rhyme_score >= 0.75).
 * 6. Multi-Line Filtering: A rhyme group is ONLY kept if it spans >= 2 distinct lines.
 * 7. Word-Level Color Inheritance: If any syllable in a word earns a color_id > 0, the entire word inherits the color.
 * 8. Non-rhyming words have color_id = 0 (clean neutral white #FFFFFF).
 * 9. Distinct Rhyme Family Palette (12 vetted hues).
 */

import { basePhoneme, isVowel, lookupWordPhonemesWithSlang, stressDigit } from '../utils/aavePhonology';
import { colorForFamily } from '../theme/theme';

export const FUNCTION_WORDS = new Set([
  'i', 'a', 'the', 'in', 'on', 'of', 'to', 'and', 'or', 'but',
  'is', 'it', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if',
  'me', 'my', 'no', 'so', 'up', 'us', 'we', 'am', 'an', 'are',
  'was', 'for', 'not', 'had', 'has', 'her', 'him', 'his', 'its',
  'our', 'out', 'who', 'you', 'she', 'they', 'them', 'their',
  'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would',
  'could', 'should', 'than', 'then', 'when', 'what', 'which',
]);

export const RHYME_THRESHOLD = 0.75;
export const NEAR_RHYME_SAME_VOWEL_SCORE = 0.75;

export interface VerseSyllable {
  index: number;
  phonemes: string[];
  stress: number;
  isStressed: boolean;
  word: string;
  cleanWord: string;
  lineIndex: number;
  wordIndex: number;
  streamIndex: number;
  charStart: number;
  charEnd: number;
  rhymeUnit?: string[];
}

export interface RhymeCandidate extends VerseSyllable {
  rhymeUnit: string[];
}

export interface RhymeGroup {
  type: 'rhyme' | 'compound';
  colorId: number;
  members: VerseSyllable[];
}

export interface CompoundSequence {
  seqA: VerseSyllable[];
  seqB: VerseSyllable[];
  score: number;
  size: number;
}

export interface VerseRhymeToken {
  text: string;
  isWord: boolean;
  colorId: number;
  color: string;
  word?: string;
  wordIndex?: number;
  lineIndex?: number;
  syllableIndex?: number;
  globalSyllableIndex?: number;
  gridPosition?: number;
  stress?: number;
  phonemes?: string[];
  rhymeUnit?: string[];
}

export interface VerseRhymeAnalysis {
  stream: VerseSyllable[];
  candidates: RhymeCandidate[];
  rhymeGroups: RhymeGroup[];
  compoundSequences: CompoundSequence[];
  totalFamilies: number;
  lineTokens: VerseRhymeToken[][];
  lineSyllables: VerseRhymeToken[][];
  wordColorMap: Map<string, number>; // key: `${lineIndex}:${wordIndex}` -> colorId
}

// ── Syllable Engine ──────────────────────────────────────────────────────────

/**
 * Splits a word into syllables using vowel boundaries in ARPABET phonemes.
 */
export function getWordSyllables(word: string): Array<{
  index: number;
  phonemes: string[];
  stress: number;
  isStressed: boolean;
}> {
  const clean = word.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
  if (!clean) return [];

  const { phonemes } = lookupWordPhonemesWithSlang(clean);
  if (!phonemes || phonemes.length === 0) {
    return [{ index: 0, phonemes: ['AH1'], stress: 1, isStressed: true }];
  }

  const syllables: Array<{
    index: number;
    phonemes: string[];
    stress: number;
    isStressed: boolean;
  }> = [];

  let current: string[] = [];

  for (const p of phonemes) {
    current.push(p);
    if (isVowel(p)) {
      const sDigit = stressDigit(p);
      const stressVal = parseInt(sDigit, 10) || 0;
      syllables.push({
        index: syllables.length,
        phonemes: [...current],
        stress: stressVal,
        isStressed: stressVal >= 1,
      });
      current = [];
    }
  }

  if (current.length > 0) {
    if (syllables.length > 0) {
      syllables[syllables.length - 1].phonemes.push(...current);
    } else {
      syllables.push({
        index: 0,
        phonemes: current,
        stress: 1,
        isStressed: true,
      });
    }
  }

  return syllables;
}

/**
 * Extracts rhyme unit (vowel nucleus onward) from a phoneme list.
 */
export function getRhymeUnitFromPhonemes(phonemes: string[]): string[] | null {
  if (!phonemes || phonemes.length === 0) return null;

  let lastStressIdx = -1;
  for (let i = 0; i < phonemes.length; i++) {
    const s = parseInt(stressDigit(phonemes[i]), 10);
    if (isVowel(phonemes[i]) && s >= 1) {
      lastStressIdx = i;
    }
  }

  if (lastStressIdx === -1) {
    for (let i = 0; i < phonemes.length; i++) {
      if (isVowel(phonemes[i])) {
        lastStressIdx = i;
      }
    }
  }

  if (lastStressIdx === -1) return null;
  return phonemes.slice(lastStressIdx);
}

// ── R-Family Classification & Hard Gates ─────────────────────────────────────

function isRColored(vowelBase: string, rhymeUnit: string[]): boolean {
  if (vowelBase === 'ER') return true;
  if (['IH', 'IY', 'AH', 'UH'].includes(vowelBase)) {
    return rhymeUnit.length > 1 && basePhoneme(rhymeUnit[1]) === 'R';
  }
  return false;
}

function isEhR(vowelBase: string, rhymeUnit: string[]): boolean {
  return vowelBase === 'EH' && rhymeUnit.length > 1 && basePhoneme(rhymeUnit[1]) === 'R';
}

/**
 * R-family classifier:
 * 0 = no R-colored vowel nucleus
 * 1 = ER family (worst, curse, shirt, hurt)
 * 2 = VR family (persevered, appeared, adhere, career, here)
 * 3 = EH+R family (rare, stare, care, there)
 */
export function classifyRFamily(rhymeUnit: string[] | null | undefined): number {
  if (!rhymeUnit || rhymeUnit.length === 0) return 0;
  const nuc = rhymeUnit[0];
  const vow = basePhoneme(nuc);

  if (vow === 'ER') return 1;

  if (rhymeUnit.length > 1 && basePhoneme(rhymeUnit[1]) === 'R') {
    if (['IH', 'IY', 'UH'].includes(vow)) return 2;
    if (vow === 'EH') return 3;
  }

  return 0;
}

/**
 * Hard gate: ER (1) is NEVER compatible with VR (2) or EH+R (3).
 */
export function rFamilyCompatible(famI: number, famJ: number): boolean {
  if (famI === 0 || famJ === 0) return true;
  if (famI === famJ) return true;
  if ((famI === 2 && famJ === 3) || (famI === 3 && famJ === 2)) return true;
  return false; // ER vs VR or EH+R is strictly blocked
}

// ── Syllable Rhyme Scoring ───────────────────────────────────────────────────

export function syllableRhymeScore(
  unitA: string[] | null | undefined,
  unitB: string[] | null | undefined,
): number {
  if (!unitA || !unitB || unitA.length === 0 || unitB.length === 0) return 0.0;

  const strA = unitA.join(' ');
  const strB = unitB.join(' ');
  if (strA === strB) return 1.0;

  const nucA = unitA[0];
  const nucB = unitB[0];

  const vowA = basePhoneme(nucA);
  const vowB = basePhoneme(nucB);

  const aR = isRColored(vowA, unitA);
  const bR = isRColored(vowB, unitB);
  const aEhR = isEhR(vowA, unitA);
  const bEhR = isEhR(vowB, unitB);

  // Exact nucleus match (including stress)
  if (nucA === nucB) {
    const sameRContext = aR === bR && aEhR === bEhR;
    return sameRContext ? 0.88 : 0.35;
  }

  // R-colored bridge (both R-colored)
  if (aR && bR) {
    const aCoda = vowA === 'ER' ? unitA.slice(1).map(basePhoneme) : unitA.slice(2).map(basePhoneme);
    const bCoda = vowB === 'ER' ? unitB.slice(1).map(basePhoneme) : unitB.slice(2).map(basePhoneme);
    if (aCoda.join(' ') === bCoda.join(' ')) {
      return 0.80;
    }
    return 0.50;
  }

  // Same vowel base
  if (vowA === vowB) {
    const sameRContext = aR === bR && aEhR === bEhR;
    return sameRContext ? NEAR_RHYME_SAME_VOWEL_SCORE : 0.35;
  }

  // EH+R slant bridge
  if ((aEhR && bR) || (bEhR && aR)) {
    return 0.65;
  }

  // Shared final consonant
  if (unitA.length > 1 && unitB.length > 1) {
    if (basePhoneme(unitA[unitA.length - 1]) === basePhoneme(unitB[unitB.length - 1])) {
      return 0.35;
    }
  }

  return 0.0;
}

// ── Stream Construction & Candidate Extraction ──────────────────────────────

export function buildVerseStream(verseLines: string[]): VerseSyllable[] {
  const stream: VerseSyllable[] = [];

  verseLines.forEach((line, li) => {
    // Match tokens (words with their original whitespace/punctuation intact)
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    let charOffset = 0;

    words.forEach((rawWord, wi) => {
      const clean = rawWord.replace(/[^a-zA-Z0-9']/g, '');
      const sylls = getWordSyllables(clean);

      sylls.forEach((s) => {
        const syllableObj: VerseSyllable = {
          index: s.index,
          phonemes: s.phonemes,
          stress: s.stress,
          isStressed: s.isStressed,
          word: rawWord,
          cleanWord: clean,
          lineIndex: li,
          wordIndex: wi,
          streamIndex: stream.length,
          charStart: charOffset,
          charEnd: charOffset + clean.length,
        };

        const ru = getRhymeUnitFromPhonemes(s.phonemes);
        if (ru) {
          syllableObj.rhymeUnit = ru;
        }

        stream.push(syllableObj);
      });

      charOffset += rawWord.length + 1;
    });
  });

  return stream;
}

export function extractRhymeCandidates(stream: VerseSyllable[]): RhymeCandidate[] {
  const wordBuckets = new Map<string, VerseSyllable[]>();

  for (const s of stream) {
    if (!s.isStressed) continue;
    if (FUNCTION_WORDS.has(s.cleanWord.toLowerCase())) continue;

    const ru = s.rhymeUnit || getRhymeUnitFromPhonemes(s.phonemes);
    if (!ru) continue;
    s.rhymeUnit = ru;

    const key = `${s.cleanWord.toLowerCase()}:${s.lineIndex}:${s.wordIndex}`;
    const list = wordBuckets.get(key) || [];
    list.push(s);
    wordBuckets.set(key, list);
  }

  // Deduplication: take only the LAST stressed syllable per word occurrence
  const candidates: RhymeCandidate[] = [];
  for (const list of wordBuckets.values()) {
    let lastSyllable = list[0];
    for (let i = 1; i < list.length; i++) {
      if (list[i].streamIndex > lastSyllable.streamIndex) {
        lastSyllable = list[i];
      }
    }
    candidates.push(lastSyllable as RhymeCandidate);
  }

  candidates.sort((a, b) => a.streamIndex - b.streamIndex);
  return candidates;
}

// ── Union-Find Connected Components Grouping ─────────────────────────────────

export function findRhymeGroups(candidates: RhymeCandidate[]): VerseSyllable[][] {
  const n = candidates.length;
  if (n < 2) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  const rFams = candidates.map((c) => classifyRFamily(c.rhymeUnit));

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(x: number, y: number): void {
    const px = find(x);
    const py = find(y);
    if (px !== py) {
      parent[px] = py;
    }
  }

  // Pass 1–3: Core Rhyme Threshold (0.75) with R-Family Hard Gates
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!rFamilyCompatible(rFams[i], rFams[j])) continue;
      const score = syllableRhymeScore(candidates[i].rhymeUnit, candidates[j].rhymeUnit);
      if (score >= RHYME_THRESHOLD) {
        union(i, j);
      }
    }
  }

  // Pass 4: EH+R Slant Bridge for large families spanning >= 3 lines
  const EH_SLANT_MIN_SCORE = 0.62;
  const EH_SLANT_MIN_LINES = 3;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (find(i) === find(j)) continue;
      if (!rFamilyCompatible(rFams[i], rFams[j])) continue;

      const score = syllableRhymeScore(candidates[i].rhymeUnit, candidates[j].rhymeUnit);
      if (score >= EH_SLANT_MIN_SCORE) {
        const ri = find(i);
        const rj = find(j);
        const linesI = new Set<number>();
        const linesJ = new Set<number>();
        for (let k = 0; k < n; k++) {
          const pk = find(k);
          if (pk === ri) linesI.add(candidates[k].lineIndex);
          if (pk === rj) linesJ.add(candidates[k].lineIndex);
        }
        if (linesI.size >= EH_SLANT_MIN_LINES || linesJ.size >= EH_SLANT_MIN_LINES) {
          union(i, j);
        }
      }
    }
  }

  // Collect components
  const components = new Map<number, VerseSyllable[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = components.get(root) || [];
    list.push(candidates[i]);
    components.set(root, list);
  }

  // Filter: A group is ONLY kept if it spans >= 2 distinct lines
  const groups: VerseSyllable[][] = [];
  for (const group of components.values()) {
    if (group.length < 2) continue;
    const linesInGroup = new Set(group.map((s) => s.lineIndex));
    if (linesInGroup.size >= 2) {
      groups.push(group);
    }
  }

  return groups;
}

// ── Cross-Word Boundary Compounds ────────────────────────────────────────────

export function buildCompoundSequences(stream: VerseSyllable[], window: number = 2): CompoundSequence[] {
  const stressedStream = stream.filter(
    (s) => s.isStressed && !FUNCTION_WORDS.has(s.cleanWord.toLowerCase()),
  );

  for (const s of stressedStream) {
    if (!s.rhymeUnit) {
      s.rhymeUnit = getRhymeUnitFromPhonemes(s.phonemes) || undefined;
    }
  }

  const compounds: CompoundSequence[] = [];

  for (let size = 2; size <= window; size++) {
    for (let i = 0; i <= stressedStream.length - size; i++) {
      const seqA = stressedStream.slice(i, i + size);
      for (let j = i + 1; j <= stressedStream.length - size; j++) {
        const seqB = stressedStream.slice(j, j + size);
        const linesA = new Set(seqA.map((s) => s.lineIndex));
        const linesB = new Set(seqB.map((s) => s.lineIndex));

        // Skip if within the same line
        if ([...linesA].every((l) => linesB.has(l))) continue;

        let blocked = false;
        const scores: number[] = [];

        for (let k = 0; k < size; k++) {
          const fa = classifyRFamily(seqA[k].rhymeUnit);
          const fb = classifyRFamily(seqB[k].rhymeUnit);
          if (!rFamilyCompatible(fa, fb)) {
            blocked = true;
            break;
          }
          scores.push(syllableRhymeScore(seqA[k].rhymeUnit, seqB[k].rhymeUnit));
        }

        if (blocked || scores.length === 0) continue;
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore >= RHYME_THRESHOLD) {
          compounds.push({
            seqA,
            seqB,
            score: avgScore,
            size,
          });
        }
      }
    }
  }

  return compounds;
}

/**
 * Slices a word into its exact constituent syllable substrings using vowel boundary heuristics.
 * Directly ported from domain/syllable_engine.py:syllable_char_ranges.
 */
export function syllableCharRanges(word: string, numSyllables: number): Array<[number, number]> {
  const n = word.length;
  if (numSyllables <= 0) return [];
  if (numSyllables === 1) return [[0, n]];

  const wLower = word.toLowerCase();
  const vowelSet = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

  const vowelStarts: number[] = [];
  let inVowel = false;
  for (let i = 0; i < n; i++) {
    if (vowelSet.has(wLower[i])) {
      if (!inVowel) {
        vowelStarts.push(i);
      }
      inVowel = true;
    } else {
      inVowel = false;
    }
  }

  if (vowelStarts.length < numSyllables) {
    const chunk = n / numSyllables;
    return Array.from({ length: numSyllables }, (_, i) => [
      Math.floor(i * chunk),
      Math.min(n, Math.floor((i + 1) * chunk)),
    ]);
  }

  const anchors = vowelStarts.slice(0, numSyllables);

  const vowelGroupEnd = (pos: number) => {
    let p = pos;
    while (p < n && vowelSet.has(wLower[p])) {
      p++;
    }
    return p;
  };

  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < numSyllables; i++) {
    const start = i === 0 ? 0 : ranges[ranges.length - 1][1];
    let end = n;
    if (i < numSyllables - 1) {
      const vEnd = vowelGroupEnd(anchors[i]);
      const inter = anchors[i + 1] - vEnd;
      if (inter === 1) {
        // Single consonant between vowels: Maximal Onset Principle assigns it to the following syllable onset
        end = vEnd;
      } else {
        end = Math.floor((anchors[i] + anchors[i + 1]) / 2) + 1;
      }
    }
    ranges.push([start, end]);
  }
  return ranges;
}

// ── Top-Level Verse Analysis ─────────────────────────────────────────────────

/**
 * Analyzes verse lyrics, building the complete Rhyme Map and Line Tokens.
 */
export function analyzeVerseRhymes(verseLines: string[]): VerseRhymeAnalysis {
  const stream = buildVerseStream(verseLines);
  const candidates = extractRhymeCandidates(stream);
  const rhymeGroups = findRhymeGroups(candidates);
  const compounds = buildCompoundSequences(stream);

  // Map syllable keys (lineIndex, streamIndex) -> colorId
  const motifMap = new Map<string, number>();
  const motifGroups: RhymeGroup[] = [];
  let colorIdCounter = 1;

  for (const group of rhymeGroups) {
    const currentId = colorIdCounter++;
    for (const s of group) {
      motifMap.set(`${s.lineIndex}:${s.streamIndex}`, currentId);
    }
    motifGroups.push({ type: 'rhyme', colorId: currentId, members: group });
  }

  for (const compound of compounds) {
    const members = [...compound.seqA, ...compound.seqB];
    const currentId = colorIdCounter++;
    for (const s of members) {
      const key = `${s.lineIndex}:${s.streamIndex}`;
      if (!motifMap.has(key)) {
        motifMap.set(key, currentId);
      }
    }
    motifGroups.push({ type: 'compound', colorId: currentId, members });
  }

  // Word-Level Color Inheritance:
  // If any syllable in a word earns color_id > 0, copy that color to all other syllables of the same word.
  const wordBuckets = new Map<string, VerseSyllable[]>();
  for (const s of stream) {
    const key = `${s.lineIndex}:${s.wordIndex}`;
    const list = wordBuckets.get(key) || [];
    list.push(s);
    wordBuckets.set(key, list);
  }

  const wordColorMap = new Map<string, number>(); // `${lineIndex}:${wordIndex}` -> colorId

  for (const [wKey, syllables] of wordBuckets.entries()) {
    let earnerColor = 0;
    for (const s of syllables) {
      const cid = motifMap.get(`${s.lineIndex}:${s.streamIndex}`) || 0;
      if (cid > 0) {
        earnerColor = cid;
        break;
      }
    }
    if (earnerColor > 0) {
      wordColorMap.set(wKey, earnerColor);
      for (const s of syllables) {
        motifMap.set(`${s.lineIndex}:${s.streamIndex}`, earnerColor);
      }
    } else {
      wordColorMap.set(wKey, 0);
    }
  }

  // Remap color IDs to a compact 1..N sequence
  const rawIds = Array.from(new Set(Array.from(wordColorMap.values()).filter((id) => id > 0))).sort((a, b) => a - b);
  const idRemap = new Map<number, number>();
  rawIds.forEach((oldId, index) => {
    idRemap.set(oldId, index + 1);
  });

  for (const [key, cid] of wordColorMap.entries()) {
    if (cid > 0 && idRemap.has(cid)) {
      wordColorMap.set(key, idRemap.get(cid)!);
    }
  }

  for (const group of motifGroups) {
    if (idRemap.has(group.colorId)) {
      group.colorId = idRemap.get(group.colorId)!;
    }
  }

  // Build VerseRhymeTokens per line for visual overlay rendering
  const lineTokens: VerseRhymeToken[][] = verseLines.map((line, li) => {
    if (!line.trim()) return [];

    const tokens: VerseRhymeToken[] = [];
    // Tokenize preserving spaces and punctuation
    const matches = Array.from(line.matchAll(/([a-zA-Z0-9']+|[^a-zA-Z0-9'\s]+|\s+)/g));
    let wordIdx = 0;

    for (const match of matches) {
      const text = match[0];
      const isWordMatch = /^[a-zA-Z0-9']+$/.test(text);

      if (isWordMatch) {
        const cId = wordColorMap.get(`${li}:${wordIdx}`) || 0;
        const matchingSylls = stream.filter((s) => s.lineIndex === li && s.wordIndex === wordIdx);
        const primarySyll = matchingSylls.find((s) => s.isStressed) || matchingSylls[0];
        tokens.push({
          text,
          isWord: true,
          colorId: cId,
          color: cId > 0 ? colorForFamily(cId) : '#FFFFFF',
          word: text,
          wordIndex: wordIdx,
          lineIndex: li,
          syllableIndex: primarySyll ? primarySyll.index : 0,
          stress: primarySyll ? primarySyll.stress : 1,
          phonemes: primarySyll ? primarySyll.phonemes : [],
          rhymeUnit: primarySyll ? primarySyll.rhymeUnit : [],
        });
        wordIdx++;
      } else {
        tokens.push({
          text,
          isWord: false,
          colorId: 0,
          color: 'rgba(255, 255, 255, 0.4)',
          word: '',
          wordIndex: -1,
          lineIndex: li,
          syllableIndex: -1,
          stress: 0,
        });
      }
    }

    return tokens;
  });

  // Build discrete Syllable Tokens per line (atomic syllables, NOT words)
  const lineSyllables: VerseRhymeToken[][] = verseLines.map((line, li) => {
    if (!line.trim()) return [];

    const lineStreamSylls = stream.filter((s) => s.lineIndex === li);
    const totalLineSyllables = Math.max(1, lineStreamSylls.length);

    const tokens: VerseRhymeToken[] = [];
    const words = line.trim().split(/\s+/);

    let globalSyllIdx = 0;

    words.forEach((rawWord, wi) => {
      const clean = rawWord.replace(/[^a-zA-Z0-9']/g, '');
      const syllsForWord = lineStreamSylls.filter((s) => s.wordIndex === wi);
      const numSylls = Math.max(1, syllsForWord.length);
      const ranges = syllableCharRanges(clean, numSylls);

      syllsForWord.forEach((s, sIdx) => {
        const [start, end] = ranges[sIdx] || [0, clean.length];
        const syllableText = clean.slice(start, end) || clean;
        const cId = motifMap.get(`${li}:${s.streamIndex}`) || wordColorMap.get(`${li}:${wi}`) || 0;
        const gridPos = Math.floor((globalSyllIdx * 16) / totalLineSyllables);

        tokens.push({
          text: syllableText,
          isWord: true,
          colorId: cId,
          color: cId > 0 ? colorForFamily(cId) : '#FFFFFF',
          word: rawWord,
          wordIndex: wi,
          lineIndex: li,
          syllableIndex: s.index,
          globalSyllableIndex: globalSyllIdx,
          gridPosition: gridPos,
          stress: s.stress,
          phonemes: s.phonemes,
          rhymeUnit: s.rhymeUnit,
        });

        globalSyllIdx++;
      });
    });

    return tokens;
  });

  return {
    stream,
    candidates,
    rhymeGroups: motifGroups,
    compoundSequences: compounds,
    totalFamilies: rawIds.length,
    lineTokens,
    lineSyllables,
    wordColorMap,
  };
}

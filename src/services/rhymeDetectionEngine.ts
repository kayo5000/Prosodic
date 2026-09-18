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

export interface CrossBarFlowPhrase {
  fromLineIndex: number;
  toLineIndex: number;
  syllables: VerseSyllable[];
  rhymeFamilyColorId: number;
  isPickupAnacrusis: boolean;
  words: string[];
}

export interface VerseRhymeAnalysis {
  stream: VerseSyllable[];
  candidates: RhymeCandidate[];
  rhymeGroups: RhymeGroup[];
  compoundSequences: CompoundSequence[];
  crossBarPhrases: CrossBarFlowPhrase[];
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

const VOICING_PAIRS: Record<string, string> = {
  T: 'D', D: 'T',
  P: 'B', B: 'P',
  K: 'G', G: 'K',
  S: 'Z', Z: 'S',
  F: 'V', V: 'F',
  CH: 'JH', JH: 'CH',
  SH: 'ZH', ZH: 'SH',
  TH: 'DH', DH: 'TH',
};

const NASAL_SET = new Set(['M', 'N', 'NG']);
const SIBILANT_SET = new Set(['S', 'Z', 'SH', 'ZH', 'CH', 'JH']);
const STOP_SET = new Set(['P', 'T', 'K', 'B', 'D', 'G']);

/**
 * Computes phonetic acoustic similarity between coda consonant sequences.
 * Returns a value in [0, 1] based on articulatory manner, voicing pairs, and CCR clusters.
 */
export function codaConsonantSimilarity(codaA: string[], codaB: string[]): number {
  if (codaA.length === 0 && codaB.length === 0) return 1.0;
  if (codaA.join(' ') === codaB.join(' ')) return 1.0;

  const baseA = codaA.map(basePhoneme);
  const baseB = codaB.map(basePhoneme);
  if (baseA.join(' ') === baseB.join(' ')) return 1.0;

  // Open syllable vs single weak consonant (e.g. non-rhotic slang or relaxed glide)
  if (baseA.length === 0 || baseB.length === 0) {
    const nonEmp = baseA.length > 0 ? baseA : baseB;
    if (nonEmp.length === 1 && (nonEmp[0] === 'H' || nonEmp[0] === 'N' || nonEmp[0] === 'R')) {
      return 0.50;
    }
    return 0.20;
  }

  // Single coda consonant comparison
  if (baseA.length === 1 && baseB.length === 1) {
    const ca = baseA[0];
    const cb = baseB[0];
    if (ca === cb) return 1.0;

    // Homorganic voicing pair (T/D, P/B, K/G, S/Z, etc.) -> High acoustic similarity
    if (VOICING_PAIRS[ca] === cb) return 0.88;

    // Nasal class (M, N, NG) -> Slant rhyme
    if (NASAL_SET.has(ca) && NASAL_SET.has(cb)) return 0.82;

    // Sibilant class (S, Z, SH, CH, JH) -> Slant rhyme
    if (SIBILANT_SET.has(ca) && SIBILANT_SET.has(cb)) return 0.80;

    // Stop class (P, T, K, B, D, G)
    if (STOP_SET.has(ca) && STOP_SET.has(cb)) return 0.65;

    return 0.25;
  }

  // Consonant cluster comparison (e.g. ST vs S, ND vs N, LD vs L, KT vs K, etc.)
  const strA = baseA.join('');
  const strB = baseB.join('');

  // CCR cluster subset (e.g. 'ST' starts with 'S', 'ND' starts with 'N')
  if (
    (strA.startsWith(strB) || strB.startsWith(strA)) ||
    (strA.endsWith(strB) || strB.endsWith(strA))
  ) {
    return 0.85;
  }

  // Last consonant match in cluster
  const lastA = baseA[baseA.length - 1];
  const lastB = baseB[baseB.length - 1];
  if (lastA === lastB) return 0.80;
  if (VOICING_PAIRS[lastA] === lastB) return 0.76;

  return 0.30;
}

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

  // Both R-colored (ER vs ER, or VR vs VR)
  if (aR && bR) {
    const aCoda = vowA === 'ER' ? unitA.slice(1).map(basePhoneme) : unitA.slice(2).map(basePhoneme);
    const bCoda = vowB === 'ER' ? unitB.slice(1).map(basePhoneme) : unitB.slice(2).map(basePhoneme);
    if (aCoda.join(' ') === bCoda.join(' ')) return 1.0;

    const codaSim = codaConsonantSimilarity(aCoda, bCoda);
    if (codaSim >= 0.75) {
      return 0.80 + (codaSim * 0.10);
    }
    // NURSE vs NURSE nucleus match with different codas (e.g. turnt vs merch)
    if (vowA === 'ER' && vowB === 'ER') {
      return 0.88;
    }
    return 0.45;
  }

  // Same exact nucleus (including stress)
  if (nucA === nucB) {
    const sameRContext = aR === bR && aEhR === bEhR;
    if (!sameRContext) return 0.35;

    const codaA = unitA.slice(1).map(basePhoneme);
    const codaB = unitB.slice(1).map(basePhoneme);
    const codaSim = codaConsonantSimilarity(codaA, codaB);

    if (codaSim >= 0.75) {
      return 0.75 + (codaSim * 0.25); // 0.94 - 1.0
    }
    // Unrelated codas with same vowel -> below threshold to prevent noisy chaining
    return 0.35 + (codaSim * 0.30); // 0.40 - 0.55
  }

  // Same base vowel (differing stress digit)
  if (vowA === vowB) {
    const sameRContext = aR === bR && aEhR === bEhR;
    if (!sameRContext) return 0.35;

    const codaA = unitA.slice(1).map(basePhoneme);
    const codaB = unitB.slice(1).map(basePhoneme);
    const codaSim = codaConsonantSimilarity(codaA, codaB);

    if (codaSim >= 0.75) {
      return 0.75 + (codaSim * 0.20); // 0.90 - 0.95
    }
    return 0.30 + (codaSim * 0.30); // 0.35 - 0.50
  }

  // EH+R slant bridge
  if ((aEhR && bR) || (bEhR && aR)) {
    return 0.65;
  }

  // Shared final consonant without vowel match -> non-rhyme
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
  const candidates: RhymeCandidate[] = [];

  for (const s of stream) {
    if (!s.isStressed) continue;
    if (FUNCTION_WORDS.has(s.cleanWord.toLowerCase())) continue;

    const ru = s.rhymeUnit || getRhymeUnitFromPhonemes(s.phonemes);
    if (!ru) continue;
    s.rhymeUnit = ru;
    candidates.push(s as RhymeCandidate);
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
  const isVowel = (c: string) => 'aeiouy'.includes(c);

  // ── Step 1: Locate vowel-group starts (each group = one syllable nucleus) ──
  const vowelGroupStarts: number[] = [];
  let inVowel = false;
  for (let i = 0; i < n; i++) {
    if (isVowel(wLower[i])) {
      if (!inVowel) vowelGroupStarts.push(i);
      inVowel = true;
    } else {
      inVowel = false;
    }
  }

  // Fallback: not enough vowel nuclei → divide evenly
  if (vowelGroupStarts.length < numSyllables) {
    const chunk = n / numSyllables;
    return Array.from({ length: numSyllables }, (_, i) => [
      Math.floor(i * chunk),
      Math.min(n, Math.floor((i + 1) * chunk)),
    ]);
  }

  // ── Step 2: Build cut-points using VCCV / VCV golden rules ──
  // For each pair of adjacent nuclei, decide where to cut the inter-nucleus
  // consonant cluster:
  //   • 0 consonants between nuclei (VV): cut right before the second vowel
  //   • 1 consonant (VCV):  Maximal Onset → consonant belongs to next syllable
  //                         Exception: check if keeping it closed keeps a short vowel
  //                         (VC/V pattern). Since we're purely char-based here we
  //                         use Maximal Onset as the default (mirrors Open Vowel Push).
  //   • 2+ consonants (VCCV): split between the two middle consonants (Double-Consonant Split).
  //   • Silent trailing e: do not create a syllable for it.
  const cuts: number[] = [0];

  for (let ni = 0; ni < numSyllables - 1; ni++) {
    const vStart = vowelGroupStarts[ni];
    const vNext  = vowelGroupStarts[ni + 1];

    // End of current vowel group
    let vEnd = vStart;
    while (vEnd < n && isVowel(wLower[vEnd])) vEnd++;

    // Consonant cluster between vEnd and vNext
    const clusterLen = vNext - vEnd;

    let cut: number;
    if (clusterLen === 0) {
      // Adjacent vowels (hiatus): split right before next vowel
      cut = vNext;
    } else if (clusterLen === 1) {
      // VCV → Maximal Onset: single consonant begins next syllable
      cut = vEnd;
    } else {
      // VCCV or longer → split after the first consonant of the cluster
      // (Double-Consonant Split: "rab/bit", "nap/kin")
      cut = vEnd + 1;
    }
    cuts.push(cut);
  }
  cuts.push(n);

  // Build [start, end] pairs from cuts
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < numSyllables; i++) {
    ranges.push([cuts[i], cuts[i + 1]]);
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

  // Remap color IDs to a compact 1..N sequence across all syllable motifs
  const allMotifColors = Array.from(motifMap.values()).filter((id) => id > 0);
  const rawIds = Array.from(new Set(allMotifColors)).sort((a, b) => a - b);
  const idRemap = new Map<number, number>();
  rawIds.forEach((oldId, index) => {
    idRemap.set(oldId, index + 1);
  });

  for (const [key, cid] of motifMap.entries()) {
    if (cid > 0 && idRemap.has(cid)) {
      motifMap.set(key, idRemap.get(cid)!);
    }
  }

  for (const group of motifGroups) {
    if (idRemap.has(group.colorId)) {
      group.colorId = idRemap.get(group.colorId)!;
    }
  }

  // Word-Level Color Map: Tracks the primary rhyming syllable for monosyllabic words / whole word fallback
  const wordBuckets = new Map<string, VerseSyllable[]>();
  for (const s of stream) {
    const key = `${s.lineIndex}:${s.wordIndex}`;
    const list = wordBuckets.get(key) || [];
    list.push(s);
    wordBuckets.set(key, list);
  }

  const wordColorMap = new Map<string, number>(); // `${lineIndex}:${wordIndex}` -> colorId

  for (const [wKey, syllables] of wordBuckets.entries()) {
    const rhymingSyll = syllables.find((s) => (motifMap.get(`${s.lineIndex}:${s.streamIndex}`) || 0) > 0);
    if (rhymingSyll) {
      wordColorMap.set(wKey, motifMap.get(`${rhymingSyll.lineIndex}:${rhymingSyll.streamIndex}`) || 0);
    } else {
      wordColorMap.set(wKey, 0);
    }
  }

  // Build VerseRhymeTokens per line for visual overlay rendering
  const lineTokens: VerseRhymeToken[][] = verseLines.map((line, li) => {
    if (!line.trim()) return [];

    const tokens: VerseRhymeToken[] = [];
    // Tokenize preserving spaces, punctuation, and allowing hyphens inside words
    const matches = Array.from(line.matchAll(/([a-zA-Z0-9'-]+|[^a-zA-Z0-9'\-\s]+|\s+)/g));
    let wordIdx = 0;

    for (const match of matches) {
      const text = match[0];
      const isWordMatch = /^[a-zA-Z0-9'-]+$/.test(text);

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
        const cId = motifMap.get(`${li}:${s.streamIndex}`) || (numSylls === 1 ? (wordColorMap.get(`${li}:${wi}`) || 0) : 0);
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

  // Detect cross-bar flow compounds and pickup anacrusis phrases
  const crossBarPhrases = detectCrossBarFlowPhrases(stream, compounds, wordColorMap);

  return {
    stream,
    candidates,
    rhymeGroups: motifGroups,
    compoundSequences: compounds,
    crossBarPhrases,
    totalFamilies: rawIds.length,
    lineTokens,
    lineSyllables,
    wordColorMap,
  };
}

/**
 * Detects cross-bar flow phrases and pickup anacrusis units across bar boundaries.
 */
export function detectCrossBarFlowPhrases(
  stream: VerseSyllable[],
  compounds: CompoundSequence[],
  wordColorMap: Map<string, number>
): CrossBarFlowPhrase[] {
  const phrases: CrossBarFlowPhrase[] = [];

  // 1. Cross-line compound sequences
  for (const cmp of compounds) {
    const linesA = Array.from(new Set(cmp.seqA.map((s) => s.lineIndex))).sort((a, b) => a - b);
    if (linesA.length >= 2) {
      const fromLine = linesA[0];
      const toLine = linesA[linesA.length - 1];
      const firstSyll = cmp.seqA[0];
      const cId = wordColorMap.get(`${firstSyll.lineIndex}:${firstSyll.wordIndex}`) || 1;
      const uniqueWords = Array.from(new Set(cmp.seqA.map((s) => s.cleanWord)));
      phrases.push({
        fromLineIndex: fromLine,
        toLineIndex: toLine,
        syllables: cmp.seqA,
        rhymeFamilyColorId: cId,
        isPickupAnacrusis: true,
        words: uniqueWords,
      });
    }

    const linesB = Array.from(new Set(cmp.seqB.map((s) => s.lineIndex))).sort((a, b) => a - b);
    if (linesB.length >= 2) {
      const fromLine = linesB[0];
      const toLine = linesB[linesB.length - 1];
      const firstSyll = cmp.seqB[0];
      const cId = wordColorMap.get(`${firstSyll.lineIndex}:${firstSyll.wordIndex}`) || 1;
      const uniqueWords = Array.from(new Set(cmp.seqB.map((s) => s.cleanWord)));
      phrases.push({
        fromLineIndex: fromLine,
        toLineIndex: toLine,
        syllables: cmp.seqB,
        rhymeFamilyColorId: cId,
        isPickupAnacrusis: true,
        words: uniqueWords,
      });
    }
  }

  // 2. Anacrusis / pickup rhymes linking line tail with next line head
  const maxLine = stream.reduce((max, s) => Math.max(max, s.lineIndex), 0);
  for (let li = 0; li < maxLine; li++) {
    const lineSylls = stream.filter((s) => s.lineIndex === li);
    const nextLineSylls = stream.filter((s) => s.lineIndex === li + 1);
    if (lineSylls.length === 0 || nextLineSylls.length === 0) continue;

    const lastSyll = lineSylls[lineSylls.length - 1];
    const firstNextSyll = nextLineSylls[0];

    const cIdLast = wordColorMap.get(`${li}:${lastSyll.wordIndex}`) || 0;
    const cIdNext = wordColorMap.get(`${li + 1}:${firstNextSyll.wordIndex}`) || 0;

    if (cIdLast > 0 && cIdLast === cIdNext) {
      const words = Array.from(new Set([lastSyll.cleanWord, firstNextSyll.cleanWord]));
      const alreadyExists = phrases.some(
        (p) => p.fromLineIndex === li && p.toLineIndex === li + 1 && p.rhymeFamilyColorId === cIdLast
      );
      if (!alreadyExists) {
        phrases.push({
          fromLineIndex: li,
          toLineIndex: li + 1,
          syllables: [lastSyll, firstNextSyll],
          rhymeFamilyColorId: cIdLast,
          isPickupAnacrusis: true,
          words,
        });
      }
    }
  }

  return phrases;
}


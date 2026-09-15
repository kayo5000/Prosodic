/**
 * Deterministic, rule-based English syllable counter.
 * Optimized for real-time lyric analysis and hip-hop cadences.
 */

// Common contractions, slang, initialisms, and hiatus words dictionary
const SPECIAL_WORD_SYLLABLES: Record<string, number> = {
  // 1-syllable specials & contractions
  a: 1,
  i: 1,
  im: 1,
  "i'm": 1,
  "you're": 1,
  "they're": 1,
  "we're": 1,
  "can't": 1,
  "won't": 1,
  "don't": 1,
  "ain't": 1,
  yeah: 1,
  nah: 1,
  yo: 1,
  tryna: 2,
  gonna: 2,
  gotta: 2,
  wanna: 2,
  finna: 2,
  bout: 1,
  "'bout": 1,
  cause: 1,
  "'cause": 1,
  cuz: 1,
  em: 1,
  "'em": 1,

  // Common Initialisms & Slang Numbers (Pronounced letter-by-letter / digit-by-digit)
  '24/7': 5, // twen-ty four sev-en
  '24-7': 5,
  nyc: 3, // N-Y-C
  la: 2, // L-A
  vip: 3, // V-I-P
  dna: 3, // D-N-A
  fbi: 3, // F-B-I
  cia: 3, // C-I-A
  dj: 2, // D-J
  mc: 2, // M-C
  og: 2, // O-G
  aka: 3, // A-K-A
  rip: 3, // R-I-P
  r_i_p: 3,

  // Hiatus & common tricky multi-vowel words
  seeing: 2, // see-ing
  feeling: 2, // feel-ing
  being: 2, // be-ing
  radio: 3, // ra-di-o
  video: 3, // vi-de-o
  audio: 3, // au-di-o
  piano: 3, // pi-an-o
  idea: 3, // i-de-a
  area: 3, // a-re-a
  reality: 4, // re-al-i-ty (hiatus ea)
  realities: 4,
  mrs: 1, // Mrs. (slang / lyric pronunciation)
  mr: 2, // Mis-ter
  science: 2, // sci-ence
  client: 2, // cli-ent
  giant: 2, // gi-ant
  quiet: 2, // qui-et
  diet: 2, // di-et
  chaos: 2, // cha-os
  poet: 2, // po-et
  poetry: 3, // po-et-ry
  rhythm: 2,
  prism: 2,
  every: 2,
  family: 3,
  memory: 3,
  history: 3,
  different: 2,
  favorite: 2,
  general: 3,
  natural: 3,
  several: 2,
  chocolate: 2,
  camera: 2,
  business: 2,
  interesting: 3,
  vegetable: 3,
  comfortable: 4,
};

/**
 * Counts syllables in a single English word or acronym.
 */
export function countWordSyllables(word: string): number {
  if (!word) return 0;

  // Clean word: normalize unicode diacritics, lowercase, strip edge punctuation
  const cleaned = word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/^[^a-z0-9'/ -]+|[^a-z0-9'/ -]+$/g, '');

  if (!cleaned) return 0;

  // Check special lookup table first
  if (SPECIAL_WORD_SYLLABLES[cleaned] !== undefined) {
    return SPECIAL_WORD_SYLLABLES[cleaned];
  }

  // Handle numbers
  if (/^\d+$/.test(cleaned)) {
    return countNumberSyllables(parseInt(cleaned, 10));
  }

  // Pure consonant words (e.g. "shh", "psst", "nth")
  if (!/[aeiouy]/.test(cleaned)) {
    return 1;
  }

  // Short words (<= 3 chars with vowels) are typically 1 syllable
  if (cleaned.length <= 3) {
    return 1;
  }

  let text = cleaned;

  // Step 1: Replace triphthongs and compound vowel groups first
  text = text.replace(/eau/g, 'v');
  text = text.replace(/iou/g, 'v');
  text = text.replace(/ough/g, 'v');

  // Step 2: Replace standard single-syllable diphthongs with a single vowel token 'v'
  text = text.replace(/ai|au|ay|ea|ee|ei|ey|ie|oa|oe|oi|oo|ou|oy|ui/g, 'v');

  // Step 3: Deduplicate remaining duplicate vowels
  text = text.replace(/([aeiouyv])\1+/g, '$1');

  const hasConsonantLe = /^.*[^aeiou]le$/.test(cleaned);

  // Step 4: Handle silent trailing 'e'
  if (text.endsWith('e') && !text.endsWith('ee') && !text.endsWith('v')) {
    text = text.slice(0, -1);
  } else if (text.endsWith('ed') && !text.endsWith('ted') && !text.endsWith('ded')) {
    text = text.slice(0, -2);
  } else if (
    text.endsWith('es') &&
    !text.endsWith('ses') &&
    !text.endsWith('ches') &&
    !text.endsWith('shes') &&
    !text.endsWith('xes')
  ) {
    text = text.slice(0, -1);
  }

  // Count contiguous vowel groups
  const vowelMatches = text.match(/[aeiouyv]/g);
  let count = vowelMatches ? vowelMatches.length : 1;

  // If word had -le ending preceded by a consonant (like "table", "bottle"), add syllable
  if (hasConsonantLe && cleaned.length > 3) {
    count += 1;
  }

  return Math.max(1, count);
}

/**
 * Counts syllables for simple numeric digits.
 */
function countNumberSyllables(num: number): number {
  if (num < 0 || num > 999) return 2;
  const ones = [1, 1, 1, 1, 1, 1, 1, 2, 1, 1]; // 0=zero(2), 1..9
  if (num === 0) return 2;
  if (num <= 9) return ones[num];
  if (num === 11 || num === 12) return 3;
  if (num >= 13 && num <= 19) return 2;
  if (num === 17) return 3;
  if (num >= 20 && num <= 99) {
    const tens = Math.floor(num / 10);
    const rem = num % 10;
    const tensSyl = tens === 7 ? 3 : 2;
    return tensSyl + (rem > 0 ? (rem === 7 ? 2 : 1) : 0);
  }
  return 3;
}

export interface WordSyllableInfo {
  word: string;
  syllables: number;
}

export interface LineSyllableAnalysis {
  lineNumber: number;
  rawText: string;
  wordCount: number;
  syllableCount: number;
  words: WordSyllableInfo[];
}

/**
 * Counts total syllables in a single lyric line.
 */
export function countLineSyllables(lineText: string): number {
  if (!lineText || !lineText.trim()) return 0;
  const words = lineText.trim().split(/\s+/);
  return words.reduce((total, word) => total + countWordSyllables(word), 0);
}

/**
 * Analyzes a full multiline lyric verse into structured per-line metrics.
 */
export function analyzeLyricsLines(fullText: string): LineSyllableAnalysis[] {
  if (!fullText) {
    return [
      {
        lineNumber: 1,
        rawText: '',
        wordCount: 0,
        syllableCount: 0,
        words: [],
      },
    ];
  }

  const lines = fullText.split('\n');
  return lines.map((line, index) => {
    const words = line.trim() ? line.trim().split(/\s+/) : [];
    const wordInfos: WordSyllableInfo[] = words.map((w) => ({
      word: w,
      syllables: countWordSyllables(w),
    }));
    const syllableCount = wordInfos.reduce((acc, curr) => acc + curr.syllables, 0);

    return {
      lineNumber: index + 1,
      rawText: line,
      wordCount: words.length,
      syllableCount,
      words: wordInfos,
    };
  });
}

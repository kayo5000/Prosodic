/**
 * stretchedWordCollapse.ts
 *
 * Real-time Melisma & Syllable Elongation Engine for Prosodic.
 *
 * When a writer types an elongated/stretched word (e.g. "depooooositttsss"),
 * this engine:
 * 1. Detects the elongation on word delimiter (Space, Enter, Punctuation).
 * 2. Derives the canonical base spelling ("deposits").
 * 3. Calculates the elongation ratio and maps it to a performance stress score and color.
 * 4. Collapses the text buffer in the editor while preserving elongation metadata.
 */

export interface ElongatedWordMeta {
  rawStretched: string;
  collapsedWord: string;
  elongationRatio: number; // e.g., 2.5x
  stressLevel: 'mild' | 'moderate' | 'heavy';
  stressScore: number; // 0 to 100
  color: string; // Dynamic CIELAB/Tailwind-compatible hex for visualization
}

export interface CollapseResult {
  hasElongation: boolean;
  collapsedText: string;
  meta: ElongatedWordMeta | null;
}

/**
 * Common English words with legitimate double letters that should NOT be over-collapsed.
 * e.g., "cool" has "oo", "speed" has "ee", "pass" has "ss".
 * A word only triggers elongation if a character is repeated 3 or more times (>= 3),
 * or if multiple characters are repeated >= 2 times abnormally.
 */
const STRETCH_RUN_REGEX = /([a-zA-Z])\1{2,}/g;

/**
 * Color scale for vocal melisma and syllable stretch intensity.
 */
export const MELISMA_COLORS = {
  mild: '#F59E0B',     // Warm Amber (1.3x - 1.8x)
  moderate: '#FB923C', // Vivid Orange (1.8x - 2.5x)
  heavy: '#EC4899',    // High-Stress Flame Pink / Magenta (>= 2.5x)
} as const;

const COMMON_DOUBLE_LETTER_BASES = new Set([
  'cool', 'fool', 'pool', 'tool', 'school', 'look', 'book', 'good', 'food',
  'mood', 'wood', 'foot', 'root', 'boot', 'shoot', 'noon', 'moon', 'soon', 'room',
  'doom', 'boom', 'zoom', 'bloom', 'roof', 'proof', 'blood', 'flood',
  'see', 'free', 'tree', 'bee', 'fee', 'knee', 'flee', 'glee',
  'feel', 'reel', 'steel', 'wheel', 'kneel', 'heel',
  'deep', 'keep', 'sleep', 'weep', 'creep', 'sweep', 'steep',
  'meet', 'feet', 'greet', 'sheet', 'sweet', 'fleet',
  'need', 'feed', 'seed', 'weed', 'bleed', 'speed', 'greed',
  'seem', 'deem', 'teem', 'seen', 'keen', 'green', 'queen', 'screen',
  'cheer', 'peer', 'steer', 'sneer', 'beer', 'deer', 'teeth', 'cheese',
  'pass', 'bass', 'mass', 'grass', 'glass', 'class',
  'less', 'mess', 'press', 'bless', 'stress', 'dress',
  'miss', 'kiss', 'hiss', 'bliss',
  'boss', 'loss', 'cross', 'toss', 'moss',
  'tell', 'well', 'bell', 'sell', 'fall', 'call', 'ball', 'tall', 'wall',
  'will', 'kill', 'fill', 'bill', 'chill', 'skill', 'spill', 'still',
  'roll', 'toll', 'poll', 'off', 'stuff', 'cliff',
]);

/**
 * Normalizes a stretched token to its canonical dictionary candidate.
 * e.g., "depooooositttsss" -> "deposits", "swaaaaag" -> "swag", "yeeeeeaaah" -> "yeah".
 */
export function normalizeStretchedWord(word: string): string {
  if (!word) return '';

  // 1. First attempt: collapse runs of 3+ identical letters down to 1
  const singleCollapsed = word.replace(/([a-zA-Z])\1{2,}/g, '$1');

  // 2. If singleCollapsed directly matches a known word or common pattern, check double-letter candidate
  const lowerSingle = singleCollapsed.toLowerCase();
  
  // Check if replacing any collapsed run with 2 letters matches a known double-letter word
  const doubleCandidates = [
    singleCollapsed.replace(/([a-zA-Z])\1+/g, '$1$1'),
  ];
  // Check if any double candidate is a verified English double-letter word
  for (const cand of doubleCandidates) {
    if (COMMON_DOUBLE_LETTER_BASES.has(cand.toLowerCase())) {
      return cand;
    }
  }

  // Handle common slang contractions / exceptions
  if (lowerSingle === 'yea' || lowerSingle === 'yeeah' || lowerSingle === 'yeaah') return 'yeah';
  if (lowerSingle === 'noo') return 'no';
  if (lowerSingle === 'soo') return 'so';
  if (lowerSingle === 'waay') return 'way';

  return singleCollapsed;
}

/**
 * Inspects a word token and calculates elongation metrics if stretched.
 */
export function detectWordElongation(token: string): ElongatedWordMeta | null {
  const clean = token.replace(/[^a-zA-Z]/g, '');
  if (clean.length < 3) return null;

  const hasThreeRun = STRETCH_RUN_REGEX.test(clean);
  // Reset regex state after test()
  STRETCH_RUN_REGEX.lastIndex = 0;

  if (!hasThreeRun) return null;

  const collapsed = normalizeStretchedWord(clean);
  if (collapsed.toLowerCase() === clean.toLowerCase()) return null;

  const ratio = Number((clean.length / Math.max(1, collapsed.length)).toFixed(2));
  if (ratio < 1.25) return null;

  let stressLevel: ElongatedWordMeta['stressLevel'] = 'mild';
  let color: string = MELISMA_COLORS.mild;
  let stressScore = 35;

  if (ratio >= 2.5) {
    stressLevel = 'heavy';
    color = MELISMA_COLORS.heavy;
    stressScore = 95;
  } else if (ratio >= 1.8) {
    stressLevel = 'moderate';
    color = MELISMA_COLORS.moderate;
    stressScore = 70;
  }

  return {
    rawStretched: token,
    collapsedWord: token.replace(clean, collapsed),
    elongationRatio: ratio,
    stressLevel,
    stressScore,
    color,
  };
}

/**
 * Handles real-time text change during lyric editing.
 * If the user just pressed a delimiter (Space, Enter, Tab) after typing a stretched word,
 * collapses that word in-place and returns the updated text plus metadata.
 */
export function processEditorTextChange(
  currentText: string,
  previousText: string = '',
): CollapseResult {
  if (!currentText) {
    return { hasElongation: false, collapsedText: currentText, meta: null };
  }

  // Check if text ends with a delimiter or space was just inserted
  const endsWithDelimiter = /[ \t\n.,!?;:]$/.test(currentText);
  if (!endsWithDelimiter) {
    return { hasElongation: false, collapsedText: currentText, meta: null };
  }

  // Find the word immediately preceding the trailing delimiter
  const delimiterMatch = currentText.match(/([ \t\n.,!?;:]+)$/);
  const trailingDelimiters = delimiterMatch ? delimiterMatch[1] : '';
  const textBeforeDelimiter = currentText.slice(0, currentText.length - trailingDelimiters.length);

  // Split into tokens to find the last word
  const words = textBeforeDelimiter.split(/(\s+)/);
  if (words.length === 0) {
    return { hasElongation: false, collapsedText: currentText, meta: null };
  }

  const lastToken = words[words.length - 1];
  const meta = detectWordElongation(lastToken);

  if (!meta) {
    return { hasElongation: false, collapsedText: currentText, meta: null };
  }

  // Replace only the last word token with its collapsed equivalent
  words[words.length - 1] = meta.collapsedWord;
  const collapsedText = words.join('') + trailingDelimiters;

  return {
    hasElongation: true,
    collapsedText,
    meta,
  };
}

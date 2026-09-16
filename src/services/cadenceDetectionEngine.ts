export interface MotifChunk {
  text: string;
  syllableCount: number;
  type: 'short' | 'long';
}

export interface CadenceAnalytics {
  syllablesPerBar: number[];
  rhymesPerBar: number[]; // Requires rhyme engine integration
  crossBarWords: string[];
  motifs: MotifChunk[];
}

/**
 * Counts syllables in a given text string.
 * This is a basic fallback heuristic; in production, you'd likely use the rhyme detection engine.
 */
export function countSyllables(text: string): number {
  if (!text) return 0;
  const word = text.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  let count = matches ? matches.length : 1;
  
  if (word.endsWith('e') && !word.endsWith('le') && word.length > 2) {
    count--;
  }
  return Math.max(1, count);
}

/**
 * Analyzes text to find the short/long rhythmic motifs.
 * Slices by punctuation or line breaks.
 */
export function analyzePhraseMotifs(text: string): MotifChunk[] {
  // Split by punctuation: commas, periods, exclamation, or newlines, or double bars
  const rawChunks = text.split(/[,.!\n\r]+|\|\|/);
  const chunks: MotifChunk[] = [];
  
  for (const chunkText of rawChunks) {
    const clean = chunkText.trim();
    if (!clean) continue;
    
    const words = clean.split(/\s+/);
    let syllableCount = 0;
    for (const w of words) {
      syllableCount += countSyllables(w);
    }
    
    chunks.push({
      text: clean,
      syllableCount,
      type: syllableCount <= 4 ? 'short' : 'long',
    });
  }
  
  return chunks;
}

/**
 * Detects words that have been split across a barline.
 * Example: "In || fectious" -> "Infectious"
 */
export function detectCrossBarWords(text: string): string[] {
  const crossBarWords: string[] = [];
  // Regex looks for Word + spaces + || + spaces + Word
  const crossBarRegex = /([a-zA-Z]+)\s*\|\|\s*([a-zA-Z]+)/g;
  
  let match;
  while ((match = crossBarRegex.exec(text)) !== null) {
    const left = match[1];
    const right = match[2];
    const combined = left + right;
    
    // In a full implementation, you would check `combined` against a dictionary.
    // For now, we assume if someone explicitly typed letters on both sides of a barline, it's a cross-bar word.
    if (left.length > 0 && right.length > 0) {
      crossBarWords.push(combined);
    }
  }
  
  return crossBarWords;
}

/**
 * Core engine function to process the raw markdown text into analytics.
 */
export function processCadenceMarkdown(text: string): CadenceAnalytics {
  const bars = text.split('||');
  
  const syllablesPerBar = bars.map(bar => {
    const words = bar.trim().split(/\s+/);
    return words.reduce((acc, w) => acc + countSyllables(w), 0);
  });
  
  return {
    syllablesPerBar,
    rhymesPerBar: new Array(bars.length).fill(0), // Placeholder until rhyme engine hooks in
    crossBarWords: detectCrossBarWords(text),
    motifs: analyzePhraseMotifs(text),
  };
}

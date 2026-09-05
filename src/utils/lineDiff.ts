/**
 * Per-line revision capture.
 *
 * This exists because "which line did this edit touch, and what kind of edit
 * was it" only exists at the moment of typing. Stored text can be re-analysed
 * forever; the edit that produced it cannot be recovered afterwards. Anything
 * not captured here is permanently unavailable to any later analysis.
 *
 * Deliberately content-matched rather than positional. A positional diff
 * reports every following line as "modified" when one line is inserted near
 * the top, which would make revision counts per line meaningless — the exact
 * signal this file exists to preserve.
 */

export type LineEditKind = 'insert' | 'delete' | 'modify';

export interface LineEditRecord {
  lineIndex: number;
  lineHash: string;
  kind: LineEditKind;
  charsAdded: number;
  charsRemoved: number;
}

/**
 * FNV-1a, 32-bit. Deterministic and dependency-free — the same line always
 * hashes to the same value, on any device, forever. That property is what
 * lets a line be re-identified later when its index has shifted.
 */
export function hashLine(line: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < line.length; i += 1) {
    hash ^= line.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Indices of every line whose content is unchanged between the two versions. */
function matchUnchanged(before: string[], after: string[]): {
  matchedBefore: Set<number>;
  matchedAfter: Set<number>;
} {
  const pool = new Map<string, number[]>();
  before.forEach((line, index) => {
    const bucket = pool.get(line);
    if (bucket) bucket.push(index);
    else pool.set(line, [index]);
  });

  const matchedBefore = new Set<number>();
  const matchedAfter = new Set<number>();

  after.forEach((line, index) => {
    const bucket = pool.get(line);
    if (bucket && bucket.length > 0) {
      matchedBefore.add(bucket.shift() as number);
      matchedAfter.add(index);
    }
  });

  return { matchedBefore, matchedAfter };
}

/**
 * Compares two versions of a song body and returns one record per changed
 * line. Unchanged lines produce nothing — silence is the common case and it
 * should cost nothing to store.
 *
 * An unmatched line that sits at a position where the old version also had an
 * unmatched line is a rewrite of that line (`modify`). Otherwise it is new
 * (`insert`), and a leftover old line is a `delete`.
 */
export function diffLines(before: string, after: string): LineEditRecord[] {
  if (before === after) return [];

  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const { matchedBefore, matchedAfter } = matchUnchanged(beforeLines, afterLines);

  const records: LineEditRecord[] = [];
  const consumedBefore = new Set<number>();

  afterLines.forEach((line, index) => {
    if (matchedAfter.has(index)) return;

    const oldLine = beforeLines[index];
    const oldIsUnmatched = oldLine !== undefined && !matchedBefore.has(index);

    if (oldIsUnmatched) {
      consumedBefore.add(index);
      records.push({
        lineIndex: index,
        lineHash: hashLine(line),
        kind: 'modify',
        charsAdded: line.length,
        charsRemoved: oldLine.length,
      });
      return;
    }

    records.push({
      lineIndex: index,
      lineHash: hashLine(line),
      kind: 'insert',
      charsAdded: line.length,
      charsRemoved: 0,
    });
  });

  beforeLines.forEach((line, index) => {
    if (matchedBefore.has(index) || consumedBefore.has(index)) return;
    records.push({
      lineIndex: index,
      lineHash: hashLine(line),
      kind: 'delete',
      charsAdded: 0,
      charsRemoved: line.length,
    });
  });

  return records.sort((a, b) => a.lineIndex - b.lineIndex);
}

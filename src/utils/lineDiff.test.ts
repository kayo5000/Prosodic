import { diffLines, hashLine } from './lineDiff';

describe('hashLine', () => {
  test('is deterministic — the same line always hashes identically', () => {
    expect(hashLine('Pressure keeps the measure')).toBe(hashLine('Pressure keeps the measure'));
  });

  test('distinguishes lines that differ by one character', () => {
    expect(hashLine('Pressure keeps the measure')).not.toBe(hashLine('Pressure keeps the measures'));
  });

  test('handles an empty line', () => {
    expect(hashLine('')).toHaveLength(8);
  });
});

describe('diffLines', () => {
  test('unchanged text produces no records — silence costs nothing', () => {
    const text = 'one\ntwo\nthree';
    expect(diffLines(text, text)).toEqual([]);
  });

  test('rewriting one line reports exactly one modify', () => {
    const records = diffLines('one\ntwo\nthree', 'one\nTWO REWRITTEN\nthree');
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('modify');
    expect(records[0].lineIndex).toBe(1);
    expect(records[0].charsRemoved).toBe(3);
    expect(records[0].charsAdded).toBe(13);
  });

  /**
   * The reason this file is content-matched rather than positional. A
   * positional diff would call lines 1, 2 and 3 all "modified" here, which
   * would make per-line rewrite counts meaningless.
   */
  test('inserting a line at the top does NOT mark every following line modified', () => {
    const records = diffLines('one\ntwo\nthree', 'NEW FIRST\none\ntwo\nthree');
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('insert');
    expect(records[0].lineIndex).toBe(0);
  });

  test('inserting in the middle reports one insert, not a cascade', () => {
    const records = diffLines('one\ntwo\nthree', 'one\ntwo\nINSERTED\nthree');
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('insert');
  });

  test('deleting a line reports one delete', () => {
    const records = diffLines('one\ntwo\nthree', 'one\nthree');
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('delete');
    expect(records[0].charsRemoved).toBe(3);
    expect(records[0].charsAdded).toBe(0);
  });

  test('records carry a hash so a line can be re-identified after its index shifts', () => {
    const first = diffLines('', 'a memorable bar');
    const moved = diffLines('one\ntwo', 'one\ntwo\na memorable bar');
    expect(first[0].lineHash).toBe(moved[0].lineHash);
    expect(first[0].lineIndex).not.toBe(moved[0].lineIndex);
  });

  test('writing into an empty song reports inserts, not modifies', () => {
    const records = diffLines('', 'first bar\nsecond bar');
    expect(records.map((r) => r.kind)).toEqual(['modify', 'insert']);
  });

  test('records come back ordered by line index', () => {
    const records = diffLines('a\nb\nc\nd', 'a\nB2\nc\nD2');
    expect(records.map((r) => r.lineIndex)).toEqual([1, 3]);
  });

  test('duplicate identical lines are matched one-for-one, not collapsed', () => {
    // Three identical lines down to two: exactly one delete, not two.
    const records = diffLines('hook\nhook\nhook', 'hook\nhook');
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('delete');
  });
});

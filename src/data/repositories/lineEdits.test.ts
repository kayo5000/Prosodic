import { createFakeDb } from '../db/testUtils';
import type { LineEdit } from '../types';
import { countEditsByLine, insertLineEdits, listLineEditsBySongId } from './lineEdits';

const sample: LineEdit = {
  id: 'edit_1',
  songId: 'song_1',
  lineIndex: 2,
  lineHash: 'a1b2c3d4',
  kind: 'modify',
  charsAdded: 24,
  charsRemoved: 19,
  occurredAt: '2026-09-04T12:00:00.000Z',
  createdAt: '2026-09-04T12:00:00.000Z',
};

describe('lineEdits repository', () => {
  test('insertLineEdits writes every field, append-only (no ON CONFLICT)', () => {
    const { db, calls } = createFakeDb();
    insertLineEdits(db, [sample]);
    expect(calls[0].sql).toContain('INSERT INTO line_edits');
    expect(calls[0].sql).not.toContain('ON CONFLICT');
    expect(calls[0].params).toEqual([
      'edit_1',
      'song_1',
      2,
      'a1b2c3d4',
      'modify',
      24,
      19,
      '2026-09-04T12:00:00.000Z',
      '2026-09-04T12:00:00.000Z',
    ]);
  });

  test('inserts one row per edit', () => {
    const { db, calls } = createFakeDb();
    insertLineEdits(db, [sample, { ...sample, id: 'edit_2', lineIndex: 5 }]);
    expect(calls.filter((c) => c.sql.includes('INSERT INTO line_edits'))).toHaveLength(2);
  });

  test('an empty edit list writes nothing — an unchanged save costs no rows', () => {
    const { db, calls } = createFakeDb();
    insertLineEdits(db, []);
    expect(calls).toHaveLength(0);
  });

  test('listLineEditsBySongId scopes to one song, oldest first', () => {
    const { db, calls } = createFakeDb({ getAllResult: [] });
    listLineEditsBySongId(db, 'song_1');
    expect(calls[0].sql).toContain('WHERE song_id = ?');
    expect(calls[0].sql).toContain('ORDER BY occurred_at ASC');
    expect(calls[0].params).toEqual(['song_1']);
  });

  test('listLineEditsBySongId maps snake_case rows back to LineEdit', () => {
    const { db } = createFakeDb({
      getAllResult: [
        {
          id: 'edit_1',
          song_id: 'song_1',
          line_index: 2,
          line_hash: 'a1b2c3d4',
          kind: 'modify',
          chars_added: 24,
          chars_removed: 19,
          occurred_at: '2026-09-04T12:00:00.000Z',
          created_at: '2026-09-04T12:00:00.000Z',
        },
      ],
    });
    expect(listLineEditsBySongId(db, 'song_1')).toEqual([sample]);
  });

  test('countEditsByLine groups by line position', () => {
    const { db, calls } = createFakeDb({
      getAllResult: [
        { line_index: 2, edits: 9 },
        { line_index: 3, edits: 2 },
      ],
    });
    const result = countEditsByLine(db, 'song_1');
    expect(calls[0].sql).toContain('GROUP BY line_index');
    expect(result).toEqual([
      { lineIndex: 2, edits: 9 },
      { lineIndex: 3, edits: 2 },
    ]);
  });
});

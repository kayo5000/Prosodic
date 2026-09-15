import { createFakeDb } from '../db/testUtils';
import {
  insertCmuEntries,
  lookupCmuWord,
  resolveWordPhonetics,
  seedCoreCmuDictionary,
} from './cmuPhonemes';

describe('cmuPhonemes Repository & Phonetic Resolver', () => {
  it('inserts CMU phoneme records with diacritic normalization and correct parameters', () => {
    const { db, calls } = createFakeDb();

    insertCmuEntries(db, [
      {
        word: 'café',
        phonemes: ['K', 'AE0', 'F', 'EY1'],
        primaryVowel: 'EY',
        syllableCount: 2,
        isAaveVariant: false,
      },
    ]);

    expect(calls[0].sql).toContain('INSERT OR REPLACE INTO cmu_phonemes');
    expect(calls[0].params).toEqual(['cafe', 'K AE0 F EY1', 'EY', 2, 0]);
  });

  it('retrieves and deserializes CMU phoneme records', () => {
    const { db } = createFakeDb({
      getFirstResult: {
        word: 'cafe',
        phonemes: 'K AE0 F EY1',
        primary_vowel: 'EY',
        syllable_count: 2,
        is_aave_variant: 0,
      },
    });

    const res = lookupCmuWord(db, 'café');
    expect(res).not.toBeNull();
    expect(res?.word).toBe('cafe');
    expect(res?.phonemes).toEqual(['K', 'AE0', 'F', 'EY1']);
    expect(res?.primaryVowel).toBe('EY');
    expect(res?.syllableCount).toBe(2);
    expect(res?.isAaveVariant).toBe(false);
  });

  it('seeds core CMU dictionary and slang into SQLite', () => {
    const { db, calls } = createFakeDb();
    const count = seedCoreCmuDictionary(db);
    expect(count).toBeGreaterThan(50);
    expect(calls.length).toBe(count);
  });

  it('resolves slang words from the phonetic lexicon', () => {
    const { db } = createFakeDb();
    const res = resolveWordPhonetics(db, 'finna');
    expect(res.source).toBe('slang_dictionary');
    expect(res.phonemes).toEqual(['F', 'IH1', 'N', 'AH0']);
  });

  it('resolves accented loan words gracefully', () => {
    const { db } = createFakeDb();
    const res = resolveWordPhonetics(db, 'fiancé');
    expect(res.word).toBe('fiance');
    expect(res.syllableCount).toBeGreaterThan(0);
  });
});

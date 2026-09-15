import {
  analyzeLyricsLines,
  countLineSyllables,
  countWordSyllables,
} from './syllableCounter';

describe('English Syllable Counter Utility', () => {
  describe('countWordSyllables', () => {
    it('handles single-syllable rap basics', () => {
      expect(countWordSyllables('rhyme')).toBe(1);
      expect(countWordSyllables('flow')).toBe(1);
      expect(countWordSyllables('beat')).toBe(1);
      expect(countWordSyllables('bars')).toBe(1);
      expect(countWordSyllables('spit')).toBe(1);
      expect(countWordSyllables('king')).toBe(1);
    });

    it('handles slang and hip-hop contractions', () => {
      expect(countWordSyllables("i'm")).toBe(1);
      expect(countWordSyllables('tryna')).toBe(2);
      expect(countWordSyllables('finna')).toBe(2);
      expect(countWordSyllables('gonna')).toBe(2);
      expect(countWordSyllables('cause')).toBe(1);
    });

    it('handles initialisms and 24/7 accurately', () => {
      expect(countWordSyllables('24/7')).toBe(5); // twen-ty four sev-en
      expect(countWordSyllables('nyc')).toBe(3);
      expect(countWordSyllables('vip')).toBe(3);
      expect(countWordSyllables('dna')).toBe(3);
    });

    it('handles diphthongs and hiatus correctly (seeing, radio, feeling)', () => {
      expect(countWordSyllables('seeing')).toBe(2);
      expect(countWordSyllables('feeling')).toBe(2);
      expect(countWordSyllables('radio')).toBe(3);
      expect(countWordSyllables('audio')).toBe(3);
      expect(countWordSyllables('client')).toBe(2);
      expect(countWordSyllables('poetry')).toBe(3);
      expect(countWordSyllables('idea')).toBe(3);
    });

    it('handles silent e correctly', () => {
      expect(countWordSyllables('make')).toBe(1);
      expect(countWordSyllables('late')).toBe(1);
      expect(countWordSyllables('stride')).toBe(1);
      expect(countWordSyllables('table')).toBe(2);
      expect(countWordSyllables('bottle')).toBe(2);
    });

    it('handles multisyllabic complex words', () => {
      expect(countWordSyllables('prosody')).toBe(3);
      expect(countWordSyllables('cadence')).toBe(2);
      expect(countWordSyllables('rhythm')).toBe(2);
      expect(countWordSyllables('syllable')).toBe(3);
      expect(countWordSyllables('multisyllabic')).toBe(5);
    });

    it('handles punctuation cleanly', () => {
      expect(countWordSyllables('word,')).toBe(1);
      expect(countWordSyllables('"rhyme!"')).toBe(1);
      expect(countWordSyllables('...flow...')).toBe(1);
    });
  });

  describe('countLineSyllables and analyzeLyricsLines', () => {
    it('computes line totals accurately', () => {
      const line = 'I grab the mic and spit a syllable scheme';
      // I(1) grab(1) the(1) mic(1) and(1) spit(1) a(1) syl-la-ble(3) scheme(1) = 11 syllables
      expect(countLineSyllables(line)).toBe(11);
    });

    it('handles lines with 24/7', () => {
      const line = 'I grind 24/7 on the track';
      // I(1) grind(1) 24/7(5) on(1) the(1) track(1) = 10 syllables
      expect(countLineSyllables(line)).toBe(10);
    });

    it('structures multiline lyrics correctly', () => {
      const text = 'I grab the mic and spit a scheme\nNever miss a beat inside the machine';
      const analysis = analyzeLyricsLines(text);

      expect(analysis).toHaveLength(2);
      expect(analysis[0].lineNumber).toBe(1);
      expect(analysis[0].syllableCount).toBeGreaterThan(0);
      expect(analysis[1].lineNumber).toBe(2);
      expect(analysis[1].syllableCount).toBeGreaterThan(0);
    });

    it('handles empty text gracefully', () => {
      const analysis = analyzeLyricsLines('');
      expect(analysis).toHaveLength(1);
      expect(analysis[0].syllableCount).toBe(0);
      expect(analysis[0].words).toHaveLength(0);
    });
  });
});

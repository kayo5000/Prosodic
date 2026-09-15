import {
  normalizeStretchedWord,
  detectWordElongation,
  processEditorTextChange,
  MELISMA_COLORS,
} from './stretchedWordCollapse';

describe('Stretched-Word Melisma Collapse Engine', () => {
  describe('normalizeStretchedWord', () => {
    it('collapses the user example "depooooositttsss" to "deposits"', () => {
      expect(normalizeStretchedWord('depooooositttsss')).toBe('deposits');
    });

    it('collapses vowel stretch "swaaaaag" to "swag"', () => {
      expect(normalizeStretchedWord('swaaaaag')).toBe('swag');
    });

    it('collapses slang "yeeeeeaaah" to "yeah"', () => {
      expect(normalizeStretchedWord('yeeeeeaaah')).toBe('yeah');
    });

    it('collapses "nooooo" to "no" and "sooooo" to "so"', () => {
      expect(normalizeStretchedWord('nooooo')).toBe('no');
      expect(normalizeStretchedWord('sooooo')).toBe('so');
    });

    it('preserves standard English double letters like "cool", "speed", "pass"', () => {
      expect(normalizeStretchedWord('cool')).toBe('cool');
      expect(normalizeStretchedWord('speed')).toBe('speed');
      expect(normalizeStretchedWord('pass')).toBe('pass');
    });
  });

  describe('detectWordElongation', () => {
    it('detects heavy elongation on user prompt word "depooooositttsss"', () => {
      const meta = detectWordElongation('depooooositttsss');
      expect(meta).not.toBeNull();
      expect(meta?.collapsedWord).toBe('deposits');
      expect(meta?.elongationRatio).toBeGreaterThanOrEqual(2.0);
      expect(meta?.stressLevel).toBe('moderate');
      expect(meta?.color).toBe(MELISMA_COLORS.moderate);
    });

    it('returns null for normal words without repeated characters', () => {
      expect(detectWordElongation('deposits')).toBeNull();
      expect(detectWordElongation('rhythm')).toBeNull();
      expect(detectWordElongation('cadence')).toBeNull();
    });

    it('assigns heavy stress level and flame color for extreme stretches (>= 2.5x)', () => {
      const meta = detectWordElongation('yooooooooooooooooou');
      expect(meta).not.toBeNull();
      expect(meta?.stressLevel).toBe('heavy');
      expect(meta?.color).toBe(MELISMA_COLORS.heavy);
      expect(meta?.stressScore).toBe(95);
    });
  });

  describe('processEditorTextChange (Real-Time Typing Gesture)', () => {
    it('collapses stretched word when space is typed', () => {
      const current = 'I make depooooositttsss ';
      const result = processEditorTextChange(current);

      expect(result.hasElongation).toBe(true);
      expect(result.collapsedText).toBe('I make deposits ');
      expect(result.meta?.collapsedWord).toBe('deposits');
    });

    it('collapses stretched word when newline is pressed', () => {
      const current = 'Drop the beat nooooo\n';
      const result = processEditorTextChange(current);

      expect(result.hasElongation).toBe(true);
      expect(result.collapsedText).toBe('Drop the beat no\n');
    });

    it('ignores unfinished typing before space is pressed', () => {
      const current = 'I make depooooositttsss'; // Still typing
      const result = processEditorTextChange(current);

      expect(result.hasElongation).toBe(false);
      expect(result.collapsedText).toBe(current);
      expect(result.meta).toBeNull();
    });

    it('leaves standard text with spaces unaffected', () => {
      const current = 'I make deposits in the bank ';
      const result = processEditorTextChange(current);

      expect(result.hasElongation).toBe(false);
      expect(result.collapsedText).toBe(current);
    });
  });
});

import {
  analyzePerformedStress,
  StressSignalType,
} from './performedStress';

describe('performedStress Engine & 7-Mismatch Detection', () => {
  describe('Edge cases & Fallbacks', () => {
    it('returns default fallback report for empty or whitespace-only lyrics', () => {
      const emptyReport = analyzePerformedStress('');
      expect(emptyReport.metricGripScore).toBe(75);
      expect(emptyReport.inversionRate).toBe(0.2);
      expect(emptyReport.syncopationRating).toBe('Dynamic Syncopation');
      expect(emptyReport.totalDownbeatHits).toBe(0);
      expect(emptyReport.invertedDownbeats).toBe(0);
      expect(emptyReport.signalCounts.promotion).toBe(0);
      expect(emptyReport.signalCounts.demotion).toBe(0);
      expect(emptyReport.signalCounts.syncopation).toBe(0);
      expect(emptyReport.signalCounts.trochaic_inversion).toBe(0);
      expect(emptyReport.signalCounts.stress_clash).toBe(0);
      expect(emptyReport.signalCounts.stress_lapse).toBe(0);
      expect(emptyReport.signalCounts.secondary_recruitment).toBe(0);

      const whitespaceReport = analyzePerformedStress('   \n  \t ');
      expect(whitespaceReport.totalDownbeatHits).toBe(0);
    });
  });

  describe('Metric Grip & Inversion Ratings', () => {
    it('classifies content-word-heavy delivery as Strict On-Beat', () => {
      // Content words starting lines -> no downbeat inversion
      const lyrics = `Rhythm kicks hard
Drop bars loud`;
      const report = analyzePerformedStress(lyrics);

      expect(report.invertedDownbeats).toBe(0);
      expect(report.inversionRate).toBe(0);
      expect(report.metricGripScore).toBe(100);
      expect(report.syncopationRating).toBe('Strict On-Beat');
    });

    it('classifies function-word-heavy delivery with higher inversion rate', () => {
      // Starting lines and mid-bars with function words
      const lyrics = `and the is of
the but for so`;
      const report = analyzePerformedStress(lyrics);

      expect(report.invertedDownbeats).toBeGreaterThan(0);
      expect(report.inversionRate).toBeGreaterThanOrEqual(0.45);
      expect(report.syncopationRating).toBe('Off-Beat Elastic Flow');
    });
  });

  describe('The 7 Stress-Mismatch Signals', () => {
    it('detects Promotion (unstressed syllable on strong downbeat slot)', () => {
      // "The" is an unstressed function word at index 0 -> maps to grid slot 0 (strong downbeat)
      const lyrics = `The mic is on`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.promotion).toBeGreaterThan(0);
      const promo = report.signals.promotion.find((p) => p.word.toLowerCase() === 'the');
      expect(promo).toBeDefined();
      expect(promo?.gridSlot).toBe(0);
      expect(promo?.type).toBe('promotion');
    });

    it('detects Stress Clash (adjacent stressed syllables colliding)', () => {
      // "Big black truck" has consecutive monosyllabic content words (all carrying primary stress 1)
      const lyrics = `Big black truck`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.stress_clash).toBeGreaterThan(0);
      const clash = report.signals.stress_clash.find((c) => c.word.toLowerCase().includes('big black'));
      expect(clash).toBeDefined();
      expect(clash?.type).toBe('stress_clash');
    });

    it('detects Stress Lapse (3+ consecutive unstressed syllables)', () => {
      // "and in the" consists of 3 consecutive unstressed function words
      const lyrics = `and in the room`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.stress_lapse).toBeGreaterThan(0);
      const lapse = report.signals.stress_lapse[0];
      expect(lapse).toBeDefined();
      expect(lapse.type).toBe('stress_lapse');
    });

    it('detects Demotion (stressed syllable pulled off-beat into pocket window)', () => {
      // Line with 16 syllables: syllables at odd indices map to pocket slots [1, 3, 5, 7, 9, 11, 13, 15]
      // Repeating 16 stressed monosyllabic words ensures odd positions trigger demotion
      const lyrics = `run fast jump high push hard stay strong strike quick hit deep lock tight`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.demotion).toBeGreaterThan(0);
      const demotion = report.signals.demotion[0];
      expect(demotion.type).toBe('demotion');
      expect([1, 3, 5, 7, 9, 11, 13, 15]).toContain(demotion.gridSlot);
    });

    it('detects Syncopation (stressed syllable on subdivision off-beat)', () => {
      // 8 syllables line:
      // i = 0 -> slot 0 (strong)
      // i = 1 -> slot 2 (subdivision off-beat, not pocket)
      // i = 2 -> slot 4 (strong)
      // i = 3 -> slot 6 (subdivision off-beat, not pocket)
      const lyrics = `Strike hard, hit fast, push through, stay strong`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.syncopation).toBeGreaterThan(0);
      const sync = report.signals.syncopation.find((s) => [2, 6, 10, 14].includes(s.gridSlot));
      expect(sync).toBeDefined();
      expect(sync?.type).toBe('syncopation');
    });

    it('detects Secondary Recruitment (secondary stress recruited as strong beat anchor)', () => {
      // "comfortable" is in SPECIAL_WORD_SYLLABLES as 4 syllables.
      // Stress pattern: [1, 0, 2, 0]
      // In a 4-syllable line:
      // i = 0 -> slot 0 (stress 1)
      // i = 1 -> slot 4 (stress 0 -> promotion)
      // i = 2 -> slot 8 (stress 2 -> secondary recruitment!)
      // i = 3 -> slot 12 (stress 0 -> promotion)
      const lyrics = `comfortable`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.secondary_recruitment).toBeGreaterThan(0);
      const secRec = report.signals.secondary_recruitment.find((s) => s.gridSlot === 8);
      expect(secRec).toBeDefined();
      expect(secRec?.type).toBe('secondary_recruitment');
    });

    it('detects Trochaic Inversion (stressed syllable followed by unstressed landing on strong beat)', () => {
      // In "comfortable" (4 syllables):
      // i = 0: syl.stress = 1. nextSyl (i=1) has stress = 0 and lands on slot 4 (strong beat)!
      // That matches: syl.stress >= 1 && nextSyl.stress === 0 && nextIsStrong
      const lyrics = `comfortable`;
      const report = analyzePerformedStress(lyrics);

      expect(report.signalCounts.trochaic_inversion).toBeGreaterThan(0);
      const trochee = report.signals.trochaic_inversion[0];
      expect(trochee.type).toBe('trochaic_inversion');
    });

    it('maintains consistent signalCounts dictionary matching array lengths', () => {
      const lyrics = `Drop the needle on the record let the speaker bump`;
      const report = analyzePerformedStress(lyrics);

      const signalKeys: StressSignalType[] = [
        'promotion',
        'demotion',
        'syncopation',
        'trochaic_inversion',
        'stress_clash',
        'stress_lapse',
        'secondary_recruitment',
      ];

      signalKeys.forEach((key) => {
        expect(report.signalCounts[key]).toBe(report.signals[key].length);
      });
    });
  });
});

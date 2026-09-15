import { getPerceptualFamily } from '../data/perceptualFamilies';
import { computeAspirationGap } from '../utils/aspirationGap';
import { scoreConcreteness } from '../utils/concreteness';
import { scoreEarwormMetrics } from '../utils/earwormMetrics';
import { analyzePerformedStress } from '../utils/performedStress';
import { analyzeLyricsMaster } from './prosodicCore';

describe('Central Prosodic Engine (Master Brain)', () => {
  const sampleVerse = `I grab the microphone and spit a multi-syllabic scheme
Never miss a single beat inside the rhythm of the machine
The architecture is supreme my state of mind is crystal clean
I elevate above the scene and paint the vision on the screen`;

  describe('analyzeLyricsMaster', () => {
    it('executes full master suite across all 9 subsystems in a single pass', () => {
      const report = analyzeLyricsMaster(
        sampleVerse,
        90,
        '4/4',
        'Master Test Track',
        'aggressive',
      );

      // 1. Meta
      expect(report.meta.title).toBe('Master Test Track');
      expect(report.meta.bpm).toBe(90);
      expect(report.meta.totalBars).toBe(4);
      expect(report.meta.averageSps).toBeGreaterThan(2.0);

      // 2. Dissection
      expect(report.dissection.lines).toHaveLength(4);
      expect(report.dissection.dominantVowelFamily).toBeDefined();

      // 3. Rhetorical Devices
      expect(Array.isArray(report.rhetoricalDevices)).toBe(true);

      // 4. Genre & Style
      // The verdict is always present; `primaryGenre` and `macroCategory` are
      // only populated when the engine actually committed to one genre. This
      // used to assert 'Hip-Hop' unconditionally, which passed only because
      // the classifier forced a label onto every song.
      expect(['single', 'plural', 'not_measurable']).toContain(report.genre.verdict);
      expect(report.genre.candidates[0].macro).toBe('Hip-Hop');
      if (report.genre.verdict === 'single') {
        expect(report.genre.macroCategory).toBe('Hip-Hop');
      } else {
        expect(report.genre.macroCategory).toBeNull();
        expect(report.genre.reason).not.toBeNull();
      }
      expect(report.performance.vocalStyle).toBeDefined();

      // 5. Earworm & Catchiness
      expect(report.earworm.earwormScore).toBeGreaterThanOrEqual(20);
      expect(report.earworm.hookGrade).toBeDefined();

      // 6. Concreteness
      expect(report.concreteness.tangibilityScore).toBeGreaterThanOrEqual(10);
      expect(report.concreteness.sensoryDominance).toBeDefined();

      // 7. Aspiration Gap
      expect(report.aspirationGap.alignmentScore).toBeGreaterThanOrEqual(0.0);
      expect(report.aspirationGap.gapType).toBeDefined();

      // 8. Performed Stress
      expect(report.stress.metricGripScore).toBeGreaterThanOrEqual(20);
      expect(report.stress.syncopationRating).toBeDefined();

      // 9. Overall Mastery Index
      expect(report.overallMasteryIndex).toBeGreaterThanOrEqual(40);
      expect(report.overallMasteryIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('12 Perceptual Sonic Families Registry', () => {
    it('looks up curated words with O(1) speed', () => {
      const verseWord = getPerceptualFamily('verse');
      expect(verseWord?.name).toBe('R_FAMILY');

      const flowWord = getPerceptualFamily('flow');
      expect(flowWord?.name).toBe('OW_FAMILY');

      const trackWord = getPerceptualFamily('track');
      expect(trackWord?.name).toBe('AE_FAMILY');
    });
  });

  describe('Brysbaert Concreteness Engine', () => {
    it('distinguishes physical street imagery from abstract concepts', () => {
      const concreteText = 'Cadillac bullet gold chain stage microphone';
      const concreteRes = scoreConcreteness(concreteText);
      expect(concreteRes.tangibilityScore).toBeGreaterThan(70);
      expect(concreteRes.sensoryDominance).toBe('Vivid & Concrete');

      const abstractText = 'Destiny fate eternity philosophy wisdom';
      const abstractRes = scoreConcreteness(abstractText);
      expect(abstractRes.tangibilityScore).toBeLessThan(50);
      expect(abstractRes.sensoryDominance).toBe('Floaty & Abstract');
    });
  });

  describe('Phonoaffective Aspiration Gap', () => {
    it('detects inverted aspiration gap ("Hey Ya" effect)', () => {
      // Soft, slow, vulnerable metrics vs aggressive aspiration label
      const res = computeAspirationGap(
        {
          PT: 0.0,
          PP: 0.0,
          SF: 0.0,
          CM: 0.0,
          IS: 0.0,
          TP: 0.0,
          SA: 0.0,
          SD: 1.0,
        },
        'aggressive',
      );

      expect(res.gapType).toBe('inverted');
      expect(res.researchFlag).toBe(true);
      expect(res.description).toContain('Hey Ya');
    });
  });

  describe('Psychoacoustic Earworm Metrics', () => {
    it('evaluates hook catchiness and vowel reduplication', () => {
      const hookText = `Bad and boujee in the lobby
Drop the top and count the money`;
      const res = scoreEarwormMetrics(hookText);

      expect(res.earwormScore).toBeGreaterThan(30);
      expect(res.sonicReduplicationRate).toBeDefined();
      expect(res.symmetryScore).toBeGreaterThan(50);
    });
  });

  describe('Performed Stress Inversion', () => {
    it('evaluates downbeat metric grip', () => {
      const lockedText = `Spit fire hit hard break track
Run fast stand tall push back`;
      const res = analyzePerformedStress(lockedText);

      expect(res.metricGripScore).toBeGreaterThanOrEqual(70);
      expect(res.syncopationRating).toBe('Strict On-Beat');
    });
  });
});

import { analyzePerformedStress } from './performedStress';
import { dissectLyrics } from './dissector';

describe('Real-World Lyrics Verification (Craft & Flow Benchmarks)', () => {
  describe('Multi-syllable slant & internal rhyme benchmark', () => {
    const lyrics = `His palms are sweaty knees weak arms are heavy
There is vomit on his sweater already moms spaghetti
He is nervous but on the surface he looks calm and ready
To drop bombs but he keeps on forgetting`;

    it('measures forensic metrics on real multi-syllable rhyme structures', () => {
      const report = dissectLyrics(lyrics, 86, '4/4', 'Multi-Syllabic Slant Benchmark');

      // Check rhyme chains: sweaty / heavy / sweater / spaghetti / ready
      expect(report.internalRhymeDensity).toBeGreaterThan(0);
      expect(report.compoundMultisyllabicDepth).toBeGreaterThan(0);
      expect(report.dominantVowelFamily).toBe('EH_FAMILY');
      expect(report.rhymeChainCount).toBeGreaterThan(0);
    });

    it('measures performed stress signals on authentic flow', () => {
      const stress = analyzePerformedStress(lyrics);

      expect(stress.totalDownbeatHits).toBe(8); // 4 bars * 2 downbeats
      expect(stress.metricGripScore).toBeGreaterThan(0);
      expect(stress.signalCounts.stress_clash).toBeGreaterThan(0); // "knees weak", "drop bombs"
      expect(stress.signals.stress_clash.some((s) => s.word.toLowerCase().includes('knees weak') || s.word.toLowerCase().includes('drop bombs'))).toBe(true);
    });
  });

  describe('Internal rhyme & polysyllabic cadence benchmark', () => {
    const lyrics = `Thinking of a master plan
Cause ain't nothing funny but money and the hunger
I used to roll up this is a hold up
Ain't nothing funny but money in the summer`;

    it('detects internal rhymes and slant bridges on delivery', () => {
      const report = dissectLyrics(lyrics, 98, '4/4', 'Polysyllabic Cadence Benchmark');

      expect(report.internalRhymeDensity).toBeGreaterThan(0);
      expect(report.compoundMultisyllabicDepth).toBeGreaterThan(0);
    });

    it('detects authentic stress clash and lapse on delivery', () => {
      const stress = analyzePerformedStress(lyrics);

      // "Cause ain't nothing funny but money and the hunger"
      // "but money and the" has function words -> stress lapse
      expect(stress.signalCounts.stress_lapse).toBeGreaterThan(0);
    });
  });

  describe('Enjambment & Alliteration benchmark', () => {
    const lyrics = `It was all a dream
I used to read Word Up magazine
Salt n Pepa and Heavy D up in the limousine
Hangin pictures on my wall`;

    it('detects devices and enjambment across bars', () => {
      const report = dissectLyrics(lyrics, 85, '4/4', 'Enjambment Benchmark');
      expect(report.dominantVowelFamily).toBe('EE_FAMILY'); // dream, magazine, limousine
      expect(report.rhymeChainCount).toBeGreaterThan(0);
    });
  });

  describe('Rhotic Family Isolation Benchmark', () => {
    const lyrics = `I set the mic on fire when I start the car
Travel through the dark and leave a permanent scar
Deep inside the cipher where the masters are
Spitting pure wisdom that will take you far`;

    it('isolates AR_FAMILY without letting ER or AIR bleed in falsely', () => {
      const report = dissectLyrics(lyrics, 90, '4/4', 'Rhotic Isolation Benchmark');
      expect(report.dominantVowelFamily).toBe('AR_FAMILY');
      expect(report.rhymeChainCount).toBeGreaterThan(0);

      // Verify that words from other rhotic families do not falsely pair
      const line1 = report.lines[0];
      const carWord = line1.words.find((w) => w.word.toLowerCase() === 'car');
      expect(carWord?.vowelFamily).toBe('AR_FAMILY');
    });
  });

  describe('Cross-Bar Word & Cross-Bar Rhyme Benchmark', () => {
    const lyrics = `Tripping off the beat, stash the profit in a de-
posit, keep it locked and never drop it in the closet`;

    it('accurately reconstructs cross-bar word and measures cross-bar rhyme weave', () => {
      const report = dissectLyrics(lyrics, 88, '4/4', 'Cross-Bar Weave Benchmark');

      // 1. Cross-bar word detection
      expect(report.crossBarWords.length).toBe(1);
      const straddle = report.crossBarWords[0];
      expect(straddle.fullWord).toBe('deposit');
      expect(straddle.leadingFragment).toBe('de');
      expect(straddle.trailingFragment).toBe('posit');
      expect(straddle.leadingSyllables).toBe(1);
      expect(straddle.trailingSyllables).toBe(2);
      expect(straddle.fromBar).toBe(1);
      expect(straddle.toBar).toBe(2);

      // 2. Cross-bar rhyme weave
      expect(report.crossBarRhymes.length).toBeGreaterThan(0);
      expect(report.crossBarWeaveDensity).toBeGreaterThan(0);
    });
  });
});

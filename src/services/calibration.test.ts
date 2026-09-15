import { calibrateEngineOutput } from './calibration';
import { analyzeLyricsMaster } from './prosodicCore';

describe('Step 4 — Calibration Boundary Engine', () => {
  const sampleLyrics = `
    I grab the mic and spit a syllable scheme
    Never miss a beat inside of the machine
    The flow is cold and my tone is supreme
    Living out the dream inside of the cream
  `.trim();

  it('calibrates raw prosodic core and song engine output into canonical namespace', () => {
    const report = analyzeLyricsMaster(sampleLyrics, 90, '4/4', 'Test Track');
    const envelope = calibrateEngineOutput(report, 'test_session_01');

    expect(envelope.sessionId).toBe('test_session_01');
    expect(envelope.calibratedAt).toBeDefined();

    // Verify all canonical scores are bounded strictly [0, 1]
    Object.values(envelope.scores).forEach((score) => {
      expect(score.calibratedScore).toBeGreaterThanOrEqual(0.0);
      expect(score.calibratedScore).toBeLessThanOrEqual(1.0);
      expect(score.metricId).toBeDefined();
      expect(score.version).toBe(1);
    });

    // Check specific required canonical metrics
    expect(envelope.scores['rhyme.phoneme_similarity']).toBeDefined();
    expect(envelope.scores['rhyme.compound_multisyllabic_depth']).toBeDefined();
    expect(envelope.scores['cadence.spb_consistency']).toBeDefined();
    expect(envelope.scores['cadence.internal_weave_density']).toBeDefined();
    expect(envelope.scores['timbre.vowel_brightness']).toBeDefined();

    // Verify Summary stats
    expect(envelope.summary.overallCraftIndex).toBeGreaterThan(0);
    expect(envelope.summary.overallCraftIndex).toBeLessThanOrEqual(100);
    expect(envelope.summary.dominantVowelFamily).toBeDefined();
  });

  /**
   * This test previously asserted that empty lyrics produce non-NaN,
   * finite scores — and passed, because the adapter was quietly turning
   * "nothing to measure" into confident numbers. An empty document scored
   * 0.75 for syllabic symmetry. The assertion was enforcing the bug.
   *
   * The correct behaviour is an absence, not a number.
   */
  it('reports no score at all for lyrics with no content', () => {
    const report = analyzeLyricsMaster('', 90, '4/4', 'Empty');
    const envelope = calibrateEngineOutput(report, 'empty_session');

    const scores = Object.values(envelope.scores);
    expect(scores.length).toBeGreaterThan(0); // metrics are still reported...

    for (const score of scores) {
      // ...but none of them carries a fabricated value.
      expect(score.calibratedScore).toBeNull();
      expect(score.notMeasuredReason).toBe('no_content');
    }
    expect(envelope.summary.pocketAlignment).toBeNull();
  });

  it('never emits a score and an absence reason at the same time', () => {
    const report = analyzeLyricsMaster(sampleLyrics, 90, '4/4', 'Sample');
    const envelope = calibrateEngineOutput(report, 'both_session');

    for (const score of Object.values(envelope.scores)) {
      const hasValue = score.calibratedScore !== null;
      const hasReason = score.notMeasuredReason !== null;
      expect(hasValue).toBe(!hasReason);
      if (hasValue) {
        expect(Number.isFinite(score.calibratedScore as number)).toBe(true);
      }
    }
  });
});

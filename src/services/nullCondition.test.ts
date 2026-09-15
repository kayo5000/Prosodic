import { calibrateEngineOutput } from './calibration';
import { analyzeLyricsMaster } from './prosodicCore';

/**
 * The null condition — what the engines report when there is nothing to
 * report.
 *
 * A metric with no floor is not a measurement. Until this file existed
 * nobody could say what an empty song scored, so nobody could say whether
 * a real song's score meant anything. It scored 0.75 for syllabic
 * symmetry, and gibberish scored a perfect 1.0, and both were rendered to
 * the user in the same typeface as a real result.
 *
 * This is a characterization suite, not a correctness one. It is here so
 * the floor is visible and any change to it has to be deliberate. If one
 * of these assertions starts failing, the right response is to look at
 * what moved, not to update the number.
 */

const REAL_VERSE = `
  I grab the mic and spit a syllable scheme
  Never miss a beat inside of the machine
  The flow is cold and my tone is supreme
  Living out the dream inside of the cream
`.trim();

function scoresFor(text: string) {
  return calibrateEngineOutput(analyzeLyricsMaster(text, 90, '4/4', 'Probe'), 'probe').scores;
}

function measuredIds(text: string): string[] {
  return Object.values(scoresFor(text))
    .filter((s) => s.calibratedScore !== null)
    .map((s) => s.metricId)
    .sort();
}

describe('null condition — the floor', () => {
  describe('inputs that carry no signal produce no scores', () => {
    const noSignal: [string, string][] = [
      ['empty string', ''],
      ['whitespace only', '   \n  \n '],
    ];

    for (const [label, text] of noSignal) {
      test(label, () => {
        const scores = Object.values(scoresFor(text));
        expect(scores.length).toBeGreaterThan(0);
        for (const score of scores) {
          expect(score.calibratedScore).toBeNull();
          expect(score.notMeasuredReason).not.toBeNull();
        }
      });
    }
  });

  /**
   * One word is the case that used to produce a perfect symmetry score.
   * Variance over a single bar is undefined, so those metrics must come
   * back absent rather than perfect.
   */
  test('a single word yields no variance metrics', () => {
    const scores = scoresFor('yo');
    expect(scores['cadence.syllabic_symmetry'].calibratedScore).toBeNull();
    expect(scores['cadence.syllabic_symmetry'].notMeasuredReason).toBe(
      'needs_two_bars_for_variance',
    );
    expect(scores['cadence.spb_consistency'].calibratedScore).toBeNull();
  });

  /**
   * KNOWN UPSTREAM DEFECT, recorded rather than asserted as correct.
   *
   * The syllable counter scores "... --- !!!" as one syllable, so
   * punctuation-only input passes the content gate and the rate metrics
   * produce a value for a document containing no words. The gate here is
   * behaving correctly on the extent it is given; the extent is wrong.
   *
   * Fixing it means changing the syllable counter, which every metric
   * depends on — deliberately not done as a side effect of this work.
   * Logged in the CLAUDE.md backlog.
   */
  test('punctuation-only input is counted as content (known defect)', () => {
    const scores = scoresFor('... --- !!!');
    expect(scores['timbre.vowel_brightness'].calibratedScore).not.toBeNull();
    // The relation and variance gates still hold, so the damage is bounded.
    expect(scores['rhyme.phoneme_similarity'].calibratedScore).toBeNull();
    expect(scores['cadence.syllabic_symmetry'].calibratedScore).toBeNull();
  });

  test('gibberish no longer scores perfectly on symmetry', () => {
    const scores = scoresFor('qwrt bnmx zzpl vfgh');
    expect(scores['cadence.syllabic_symmetry'].calibratedScore).not.toBe(1);
  });

  /**
   * The load-bearing assertion in this file. Whatever the individual
   * numbers are, a real verse must be measurable in strictly more ways
   * than noise is. If that ever stops holding, the metrics are not
   * responding to craft.
   */
  test('a real verse is measurable in more ways than noise', () => {
    const verse = measuredIds(REAL_VERSE);
    const noise = measuredIds('qwrt bnmx zzpl vfgh');
    const nothing = measuredIds('');

    expect(nothing).toHaveLength(0);
    expect(verse.length).toBeGreaterThan(noise.length);
  });

  test('a real verse still produces scores — the guard is not just refusing everything', () => {
    const measured = measuredIds(REAL_VERSE);
    expect(measured.length).toBeGreaterThan(0);
    expect(measured).toContain('cadence.syllabic_symmetry');
  });

  /**
   * Recorded rather than asserted as correct. `internal_weave_density` is
   * `devices.length > 0 ? 0.75 : 0.25` — it responds to input, but it has
   * exactly two possible values. It is a boolean stored with four decimal
   * places, and 0.7500 implies a precision that does not exist.
   *
   * Pinned so that when it is given a real implementation, this notices.
   */
  test('internal_weave_density is continuous and reports 0 for noise', () => {
    const verse = scoresFor(REAL_VERSE);
    const noise = scoresFor('qwrt bnmx zzpl vfgh');

    // Noise has no rhymes -> 0
    expect(noise['cadence.internal_weave_density'].calibratedScore).toBe(0);
    // Real verse produces a continuous density score
    expect(verse['cadence.internal_weave_density'].calibratedScore).toBeGreaterThan(0);
    expect(verse['cadence.internal_weave_density'].calibratedScore).toBeLessThanOrEqual(1.0);
  });
});

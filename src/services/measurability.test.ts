import { extentOf, measurabilityOf } from './measurability';

describe('measurability', () => {
  test('nothing is measurable without at least one syllable', () => {
    const empty = extentOf(0, 0);
    for (const metricId of [
      'rhyme.phoneme_similarity',
      'cadence.spb_consistency',
      'timbre.vowel_brightness',
    ]) {
      expect(measurabilityOf(metricId, empty)).toEqual({
        measurable: false,
        reason: 'no_content',
      });
    }
  });

  /**
   * The variance rules are the reason gibberish used to score 1.0 for
   * "syllabic symmetry": one bar is trivially symmetrical with itself.
   * That is not a perfect score, it is an undefined question.
   */
  test('a variance metric needs two bars to compare', () => {
    expect(measurabilityOf('cadence.syllabic_symmetry', extentOf(8, 1))).toEqual({
      measurable: false,
      reason: 'needs_two_bars_for_variance',
    });
    expect(measurabilityOf('cadence.syllabic_symmetry', extentOf(8, 2))).toEqual({
      measurable: true,
    });
  });

  test('a relation metric needs two units to relate', () => {
    expect(measurabilityOf('rhyme.phoneme_similarity', extentOf(1, 1))).toEqual({
      measurable: false,
      reason: 'needs_two_units_to_relate',
    });
    expect(measurabilityOf('rhyme.phoneme_similarity', extentOf(2, 1))).toEqual({
      measurable: true,
    });
  });

  test('a rate metric needs one bar to divide by', () => {
    expect(measurabilityOf('timbre.vowel_brightness', extentOf(4, 0))).toEqual({
      measurable: false,
      reason: 'needs_one_bar_for_rate',
    });
    expect(measurabilityOf('timbre.vowel_brightness', extentOf(4, 1))).toEqual({
      measurable: true,
    });
  });

  /**
   * A tempo-dependent metric with no tempo does not degrade gracefully — it
   * reports a rate against a number nobody chose. And because a beat can be
   * counted in two lanes an octave apart, an assumed tempo can be wrong by
   * exactly 2x, which flips "dense" into "sparse" rather than blurring it.
   */
  test('a tempo-dependent metric needs a real tempo', () => {
    expect(measurabilityOf('cadence.spb_consistency', extentOf(40, 8, null))).toEqual({
      measurable: false,
      reason: 'no_tempo_set',
    });
    expect(measurabilityOf('cadence.spb_consistency', extentOf(40, 8, 90))).toEqual({
      measurable: true,
    });
  });

  test('a tempo of zero or NaN is not a tempo', () => {
    for (const bad of [0, NaN, -1]) {
      expect(measurabilityOf('cadence.spb_consistency', extentOf(40, 8, bad))).toEqual({
        measurable: false,
        reason: 'no_tempo_set',
      });
    }
  });

  test('metrics that do not divide by tempo are unaffected by its absence', () => {
    expect(measurabilityOf('cadence.syllabic_symmetry', extentOf(40, 8, null))).toEqual({
      measurable: true,
    });
  });

  /**
   * A metric added to the canonical namespace without a requirement here
   * must not be silently waved through as measurable — that is how the
   * two lists drift apart.
   */
  test('an undeclared metric is not measurable', () => {
    expect(measurabilityOf('rhyme.something_new', extentOf(40, 8))).toEqual({
      measurable: false,
      reason: 'no_requirement_declared',
    });
  });

  test('non-finite extents are treated as no content, not as infinity', () => {
    expect(measurabilityOf('rhyme.phoneme_similarity', extentOf(NaN, NaN))).toEqual({
      measurable: false,
      reason: 'no_content',
    });
  });
});

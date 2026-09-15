/**
 * Whether there is enough input to measure a metric at all.
 *
 * This exists because of a specific bug class: an engine handed an empty
 * song still returned a full, confident profile — 0.75 syllabic symmetry
 * for a document with no words in it. Nothing was wrong with the
 * arithmetic. The arithmetic ran on nothing and produced a number, and
 * every layer downstream treated that number as a measurement.
 *
 * A score of zero and the absence of a score are different facts. Storing
 * them the same way makes "you have no internal rhyme" indistinguishable
 * from "we never looked."
 *
 * The thresholds below are deliberately definitional rather than tuned.
 * Every one of them is a statement about what the operation requires to
 * be defined at all, not a judgment about how much input is "enough" to
 * be interesting. That distinction matters: a tuned threshold is another
 * arbitrary constant of the kind this module exists to remove.
 */

export type Measurability = { measurable: true } | { measurable: false; reason: string };

/** What the input actually contains, as far as the engines could tell. */
export interface InputExtent {
  totalSyllables: number;
  totalBars: number;
  /**
   * Whether a real tempo is known for this song. Not "is there a number" —
   * whether a human set one or audio detected one. A default standing in for
   * an unknown tempo is not a tempo.
   */
  hasTempo: boolean;
}

/**
 * A relation needs two terms. One syllable cannot rhyme, and one bar
 * cannot be compared to another bar.
 */
const MIN_UNITS_FOR_RELATION = 2;

/**
 * Variance over a single sample is undefined — or, worse, trivially
 * perfect. This is why gibberish scored 1.0 for "syllabic symmetry": one
 * thing is always perfectly symmetrical with itself. That is not a high
 * score, it is an unanswerable question.
 */
const MIN_UNITS_FOR_VARIANCE = 2;

/** A per-bar rate over zero bars is a division by zero. */
const MIN_BARS_FOR_RATE = 1;

/** Below one syllable there is no utterance, so nothing is measurable. */
const MIN_SYLLABLES_FOR_ANY = 1;

/**
 * Metrics whose arithmetic divides by tempo. Without a real BPM these do not
 * degrade gracefully — they silently report a rate against an invented one.
 * Worse, the two-lanes problem means an assumed tempo can be wrong by exactly
 * 2x, which flips "dense" into "sparse" rather than blurring it.
 */
const REQUIRES_TEMPO = new Set(['cadence.spb_consistency']);

/** What each canonical metric requires of the input to be defined. */
type Requirement = 'relation' | 'variance' | 'rate';

const REQUIREMENTS: Record<string, Requirement> = {
  'rhyme.phoneme_similarity': 'relation',
  'rhyme.compound_multisyllabic_depth': 'rate',
  'rhyme.interlocking_chain_depth': 'relation',
  'cadence.spb_consistency': 'variance',
  'cadence.internal_weave_density': 'rate',
  'cadence.enjambment_rate': 'rate',
  'cadence.syllabic_symmetry': 'variance',
  'timbre.vowel_brightness': 'rate',
  'timbre.consonant_percussiveness': 'rate',
};

export function extentOf(
  totalSyllables: number,
  totalBars: number,
  bpm: number | null = null,
): InputExtent {
  return {
    totalSyllables: Number.isFinite(totalSyllables) ? Math.max(0, totalSyllables) : 0,
    totalBars: Number.isFinite(totalBars) ? Math.max(0, totalBars) : 0,
    hasTempo: typeof bpm === 'number' && Number.isFinite(bpm) && bpm > 0,
  };
}

export function measurabilityOf(metricId: string, extent: InputExtent): Measurability {
  if (extent.totalSyllables < MIN_SYLLABLES_FOR_ANY) {
    return { measurable: false, reason: 'no_content' };
  }

  if (REQUIRES_TEMPO.has(metricId) && !extent.hasTempo) {
    return { measurable: false, reason: 'no_tempo_set' };
  }

  const requirement = REQUIREMENTS[metricId];
  if (!requirement) {
    // An unknown metric is not silently waved through. The canonical
    // namespace and this table are meant to stay in step; a gap means one
    // of them was edited without the other.
    return { measurable: false, reason: 'no_requirement_declared' };
  }

  switch (requirement) {
    case 'relation':
      return extent.totalSyllables >= MIN_UNITS_FOR_RELATION
        ? { measurable: true }
        : { measurable: false, reason: 'needs_two_units_to_relate' };
    case 'variance':
      return extent.totalBars >= MIN_UNITS_FOR_VARIANCE
        ? { measurable: true }
        : { measurable: false, reason: 'needs_two_bars_for_variance' };
    case 'rate':
      return extent.totalBars >= MIN_BARS_FOR_RATE
        ? { measurable: true }
        : { measurable: false, reason: 'needs_one_bar_for_rate' };
  }
}

/**
 * Every metric id that has a declared requirement.
 *
 * Exported so `namespaceSync.test.ts` can compare this list against the
 * canonical namespace — the two are kept in step by hand, and before that test
 * existed they had already drifted by ten metrics with nothing reporting it.
 */
export function declaredMetricIds(): ReadonlySet<string> {
  return new Set(Object.keys(REQUIREMENTS));
}

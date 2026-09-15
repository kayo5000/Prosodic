import type { MetricDefinition } from './types';

/**
 * Canonical Metric Catalog for Prosodic.
 * All metrics adhere to the 0.0 - 1.0 standard calibration scale,
 * normal polarity, and craft-first nomenclature (zero celebrity names).
 */
export const CANONICAL_METRIC_DEFINITIONS: Omit<MetricDefinition, 'createdAt' | 'updatedAt'>[] = [
  // 1. Rhyme & Phonetic Architecture
  {
    metricId: 'rhyme.phoneme_similarity',
    family: 'rhyme',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Phonetic Rhyme Similarity',
      shortLabel: 'Phonetic Fit',
      description: 'Phonetic vowel nucleus and coda alignment score across rhyming pairs.',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'rhyme.compound_multisyllabic_depth',
    family: 'rhyme',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Compound Multisyllabic Depth',
      shortLabel: 'Multi Depth',
      description: 'Frequency and syllable depth of compound multi-syllabic rhyme chains (3+ syllables).',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'rhyme.interlocking_chain_depth',
    family: 'rhyme',
    scoreType: 'continuous',
    unit: 'chains',
    direction: 'higher_is_better',
    aggregation: 'max',
    display: {
      label: 'Interlocking Rhyme Scheme Depth',
      shortLabel: 'Interlocking',
      description: 'Number of simultaneous, parallel multi-syllabic rhyme streams woven across the same stanza.',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'rhyme.vocabulary_recycling_rate',
    family: 'rhyme',
    scoreType: 'continuous',
    unit: 'percent',
    direction: 'lower_is_better',
    aggregation: 'mean',
    display: {
      label: 'Rhyme Recycling / Stagnation Rate',
      shortLabel: 'Recycling',
      description: 'Tendency to reuse identical rhyme word pairings rather than novel phonetic combinations.',
      format: 'percent',
    },
    version: 1,
  },
  {
    metricId: 'rhyme.mosaic_rate',
    family: 'rhyme',
    scoreType: 'continuous',
    unit: 'percent',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Mosaic Rhyme Rate',
      shortLabel: 'Mosaic Rate',
      description: 'Frequency of single multisyllabic words rhymed across multiple smaller words.',
      format: 'percent',
    },
    version: 1,
  },
  {
    metricId: 'rhyme.chain_span',
    family: 'rhyme',
    scoreType: 'continuous',
    unit: 'bars',
    direction: 'higher_is_better',
    aggregation: 'max',
    display: {
      label: 'Rhyme Chain Span',
      shortLabel: 'Chain Span',
      description: 'Consecutive bar persistence of a single anchor vowel family scheme.',
      format: 'bars',
    },
    version: 1,
  },

  // 2. Cadence & Pocket Dynamics
  {
    metricId: 'cadence.spb_consistency',
    family: 'cadence',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Syllables Per Beat Consistency',
      shortLabel: 'SPB Fit',
      description: 'Alignment within the target 2.5 - 4.5 SPB delivery pocket.',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'cadence.internal_weave_density',
    family: 'cadence',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Internal Cross-Bar Weave Density',
      shortLabel: 'Internal Weave',
      description: 'Percentage of interior words in a bar that link phonetically to interior words in adjacent bars.',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'cadence.enjambment_rate',
    family: 'cadence',
    scoreType: 'continuous',
    unit: 'percent',
    direction: 'neutral',
    aggregation: 'mean',
    display: {
      label: 'Cross-Bar Enjambment Rate',
      shortLabel: 'Over-The-Bar',
      description: 'Percentage of rhythmic phrases that cross measure boundaries rather than stopping on Beat 4.',
      format: 'percent',
    },
    version: 1,
  },
  {
    metricId: 'cadence.syllabic_symmetry',
    family: 'cadence',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'neutral',
    aggregation: 'mean',
    display: {
      label: 'Syllabic Symmetry Variance',
      shortLabel: 'Symmetry',
      description: 'Measurement of bar-to-bar syllable balance vs dynamic compression/expansion.',
      format: '0-1',
    },
    version: 1,
  },

  // 3. Timbre & Phonetic Texture
  {
    metricId: 'timbre.vowel_brightness',
    family: 'timbre',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'neutral',
    aggregation: 'mean',
    display: {
      label: 'Vowel Brightness Index',
      shortLabel: 'Brightness',
      description: 'Ratio of bright front vowels (IY, EY, AE) vs dark back vowels (UW, OW, AO, AH).',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'timbre.consonant_percussiveness',
    family: 'timbre',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'neutral',
    aggregation: 'mean',
    display: {
      label: 'Consonantal Percussiveness',
      shortLabel: 'Percussiveness',
      description: 'Ratio of percussive stops (P, T, K, B, D, G) vs smooth liquids/fricatives (L, R, M, N, S).',
      format: '0-1',
    },
    version: 1,
  },

  // 4. Literary & Rhetorical Devices
  {
    metricId: 'device.alliteration',
    family: 'device',
    scoreType: 'continuous',
    unit: 'rate_per_100',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Alliteration Rate',
      shortLabel: 'Alliteration',
      description: 'Consecutive initial consonant sound repetitions per 100 lines.',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'device.anaphora',
    family: 'device',
    scoreType: 'continuous',
    unit: 'rate_per_100',
    direction: 'neutral',
    aggregation: 'mean',
    display: {
      label: 'Anaphora Rate',
      shortLabel: 'Anaphora',
      description: 'Repetition of opening words across consecutive lines.',
      format: '0-1',
    },
    version: 1,
  },
  {
    metricId: 'device.anadiplosis',
    family: 'device',
    scoreType: 'continuous',
    unit: 'rate_per_100',
    direction: 'neutral',
    aggregation: 'mean',
    display: {
      label: 'Anadiplosis Rate',
      shortLabel: 'Anadiplosis',
      description: 'Repetition where the last word of a line becomes the first word of the next.',
      format: '0-1',
    },
    version: 1,
  },

  // 5. Audio & Instrumental Awareness
  {
    metricId: 'audio.instrumental_pocket_alignment',
    family: 'audio',
    scoreType: 'continuous',
    unit: '0-1',
    direction: 'higher_is_better',
    aggregation: 'mean',
    display: {
      label: 'Instrumental Beat Pocket Alignment',
      shortLabel: 'Beat Pocket',
      description: 'Sync accuracy of vocal onsets against imported instrumental drum transients (kick & snare).',
      format: '0-1',
    },
    version: 1,
  },

  // 6. Longitudinal Mastery Dimensions
  {
    metricId: 'mastery.dynamic_range',
    family: 'mastery',
    scoreType: 'continuous',
    unit: '0-100',
    direction: 'higher_is_better',
    aggregation: 'latest',
    display: {
      label: 'Tempo Dynamic Range',
      shortLabel: 'Dynamic Range',
      description: 'Vocal delivery and density control versatility across 70 - 160 BPM.',
      format: '0-100',
    },
    version: 1,
  },
  {
    metricId: 'mastery.endurance_stability',
    family: 'mastery',
    scoreType: 'continuous',
    unit: '0-100',
    direction: 'higher_is_better',
    aggregation: 'latest',
    display: {
      label: 'Lyrical Endurance Stability',
      shortLabel: 'Endurance',
      description: 'Consistency of rhyme density and pocket accuracy across 16+ bar long-form verses.',
      format: '0-100',
    },
    version: 1,
  },
];

/**
 * Craft-First Challenge Blueprints (Zero Celebrity Names).
 */
export interface CraftChallengeBlueprint {
  id: string;
  title: string;
  category: 'rhyme' | 'cadence' | 'constraint' | 'timbre';
  description: string;
  barsRequired: number;
  targetMetrics: {
    metricId: string;
    threshold: number;
  }[];
}

export const CRAFT_CHALLENGES: CraftChallengeBlueprint[] = [
  {
    id: 'compound_polysyllabic_gauntlet',
    title: 'The Compound Polysyllabic Gauntlet',
    category: 'rhyme',
    description: 'Write a 16-bar verse where every bar resolves in a 3+ syllable compound rhyme matching a target vowel family.',
    barsRequired: 16,
    targetMetrics: [{ metricId: 'rhyme.compound_multisyllabic_depth', threshold: 0.8 }],
  },
  {
    id: 'interlocking_multi_weave',
    title: 'The Interlocking Multi-Weave Challenge',
    category: 'rhyme',
    description: 'Weave at least 2 distinct parallel multi-syllabic rhyme schemes simultaneously across 8 bars.',
    barsRequired: 8,
    targetMetrics: [{ metricId: 'rhyme.interlocking_chain_depth', threshold: 0.75 }],
  },
  {
    id: 'high_velocity_double_time',
    title: 'The High-Velocity Double-Time Drill',
    category: 'cadence',
    description: 'Maintain a sustained 7.5 - 9.5 SPS delivery across 8 bars with zero dropped grid subdivisions.',
    barsRequired: 8,
    targetMetrics: [{ metricId: 'cadence.spb_consistency', threshold: 0.85 }],
  },
  {
    id: 'cross_bar_enjambment',
    title: 'The Cross-Bar Enjambment Challenge',
    category: 'cadence',
    description: 'Flow across measure lines by starting or resolving phrases across at least 6 bar boundaries.',
    barsRequired: 16,
    targetMetrics: [{ metricId: 'cadence.enjambment_rate', threshold: 0.4 }],
  },
  {
    id: 'anti_crutch_lipogram',
    title: 'The Anti-Crutch Discipline Challenge',
    category: 'constraint',
    description: 'Write 16 bars with zero monosyllabic end-rhymes and zero common filler words.',
    barsRequired: 16,
    targetMetrics: [{ metricId: 'rhyme.compound_multisyllabic_depth', threshold: 0.7 }],
  },
  {
    id: 'low_resonance_dark_timbre',
    title: 'The Low-Resonance Timbre Drill',
    category: 'timbre',
    description: 'Craft an ominous 12-bar verse dominated by low/back vowels (UW, OW, AO, AH) and high plosive percussion.',
    barsRequired: 12,
    targetMetrics: [
      { metricId: 'timbre.vowel_brightness', threshold: 0.3 },
      { metricId: 'timbre.consonant_percussiveness', threshold: 0.65 },
    ],
  },
];

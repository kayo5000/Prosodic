/**
 * translations.ts
 *
 * The 3-Mode Universal Translation Dictionary for Prosodic
 *
 * Provides translations across 3 global dialects:
 * 1. 'simple'    — Plain English, everyday analogies, zero jargon.
 * 2. 'hybrid'    — Dual Lens: Plain English analogy first, followed by the formal craft term.
 * 3. 'deep_craft'— Raw musicology, academic literary terms, ARPABET phonetics & math.
 */

import { logError } from '@/utils/logError';

export type ExplanationMode = 'simple' | 'hybrid' | 'deep_craft';

export interface ConceptTranslation {
  title: string;
  tagline: string;
  description: string;
  analogy?: string;
  craftTerm?: string;
  example?: string;
}

export interface DialectEntry {
  simple: ConceptTranslation;
  hybrid: ConceptTranslation;
  deep_craft: ConceptTranslation;
}

export const TRANSLATION_DICTIONARY: Record<string, DialectEntry> = {
  // ---------------------------------------------------------------------------
  // 1. Rhetorical & Literary Devices
  // ---------------------------------------------------------------------------
  Anadiplosis: {
    simple: {
      title: 'The Bounce-Pass',
      tagline: 'Catching the last word to start the next line',
      description: 'You end line 1 with a word, and immediately catch that exact same word to start line 2.',
      example: '"Turn up the heat / Heat is what I breathe"',
    },
    hybrid: {
      title: 'The Bounce-Pass (Anadiplosis)',
      tagline: 'End-of-line to start-of-line word loop',
      description: 'You catch the last word of line 1 to start line 2. In classical songwriting, this rhetorical loop is called Anadiplosis.',
      example: '"Turn up the heat / Heat is what I breathe" (Anadiplosis)',
    },
    deep_craft: {
      title: 'Anadiplosis (Rhetorical Figure)',
      tagline: 'Coda-to-onset terminal token recurrence',
      description: 'Repetition of the terminal lexical item of a clause/bar at the onset of the subsequent clause (Purdue OWL standard).',
      example: 'Terminal Bar N [heat] -> Onset Bar N+1 [heat]',
    },
  },

  Anaphora: {
    simple: {
      title: 'The Head Start Repetition',
      tagline: 'Starting consecutive lines with the same word',
      description: 'Beginning multiple lines in a row with the exact same opening word to hammer the theme home.',
      example: '"Every day I grind / Every day I pray"',
    },
    hybrid: {
      title: 'Head Start (Anaphora)',
      tagline: 'Consecutive line-opening repetition',
      description: 'Starting back-to-back lines with the same word. In rhetoric and hip-hop cadences, this is called Anaphora.',
      example: '"Every day I grind / Every day I pray"',
    },
    deep_craft: {
      title: 'Anaphora (Structural Repetition)',
      tagline: 'Initial token repetition across bar boundaries',
      description: 'Iterative repetition of initial words or phrases across consecutive poetic line onsets (Forsyth 2013).',
      example: 'Onset(Bar N) == Onset(Bar N+1) == [Every day]',
    },
  },

  Epistrophe: {
    simple: {
      title: 'The Echo Landing',
      tagline: 'Ending consecutive lines with the same word',
      description: 'Ending multiple lines with the exact same anchor word to lock in the punchline rhythm.',
      example: '"See no evil / Hear no evil / Speak no evil"',
    },
    hybrid: {
      title: 'Echo Landing (Epistrophe)',
      tagline: 'Consecutive line-ending repetition',
      description: 'Landing on the same word at the end of consecutive bars. In classical lyricism, this is called Epistrophe.',
      example: '"See no evil / Hear no evil / Speak no evil"',
    },
    deep_craft: {
      title: 'Epistrophe (Terminal Cadence Anchor)',
      tagline: 'Coda token recurrence across consecutive measures',
      description: 'Systematic repetition of the terminal word or phrase across successive syntactic line codas (Purdue OWL).',
      example: 'Terminal(Bar N) == Terminal(Bar N+1) == [evil]',
    },
  },

  Chiasmus: {
    simple: {
      title: 'The Mirror Flip',
      tagline: 'Flipping the word order in reverse (A-B then B-A)',
      description: 'Saying a phrase, then flipping it backwards on the next line for a clever twist.',
      example: '"Suit and tie, or tie and suit"',
    },
    hybrid: {
      title: 'Mirror Flip (Chiasmus)',
      tagline: 'Criss-cross sentence reversal (A-B -> B-A)',
      description: 'Reversing the order of two key concepts across adjacent lines. In literature and rap, this is called Chiasmus.',
      example: '"I\'m on my grind for the paper, got the paper on my grind"',
    },
    deep_craft: {
      title: 'Chiasmus (Inverted Parallelism)',
      tagline: 'ABBA structural syntactic reversal',
      description: 'Reversal of grammatical structures or concepts in successive clauses (e.g. A..B -> B..A).',
      example: 'Clause 1: [grind (A) ... paper (B)] -> Clause 2: [paper (B) ... grind (A)]',
    },
  },

  // ---------------------------------------------------------------------------
  // 2. Metrics & Cadence
  // ---------------------------------------------------------------------------
  SPS: {
    simple: {
      title: 'Syllable Speed',
      tagline: 'How many syllables you pack into each second',
      description: 'Under 3.0 is laid-back and chill. Over 6.0 is rapid-fire chopper flow.',
      example: '4.5 Syllables per second (Standard pocket)',
    },
    hybrid: {
      title: 'Syllable Speed (Prosodic Pressure / SPS)',
      tagline: 'Syllables Per Second delivery rate',
      description: 'Measures vocal velocity and syllable compression against the beat. High SPS indicates chopper or double-time delivery.',
      example: '6.2 SPS (High Prosodic Pressure)',
    },
    deep_craft: {
      title: 'Prosodic Pressure (SPS Density Vector)',
      tagline: 'Temporal syllable frequency rate: Σ(syllables) / duration(sec)',
      description: 'Calculates the phonological density per temporal second relative to 16th-note subdivision grid.',
      example: 'μ = 6.20 SPS, Peak = 8.40 SPS',
    },
  },

  AspirationGap: {
    simple: {
      title: 'The Hidden Meaning Gap',
      tagline: 'When your vibe says party, but your words say pain',
      description: 'The classic "Hey Ya" or "3005" effect: upbeat, bouncy music delivering secretly vulnerable or dark lyrics.',
      example: 'Bouncy beat + sad lyrics = Inverted meaning',
    },
    hybrid: {
      title: 'Hidden Meaning Gap (Phonoaffective Inversion)',
      tagline: 'Subtext divergence between delivery and lyric theme',
      description: 'Measures the emotional contrast between your stated intent and what your syllable density and consonants actually encode.',
      example: 'Inverted Gap: High energy acoustic delivery with vulnerable subtext',
    },
    deep_craft: {
      title: 'Phonoaffective Subtext Inversion (Aspiration Δ)',
      tagline: 'Mean absolute deviation: E = Σ(W_i * C_i) vs Stated Vector',
      description: 'Quantifies divergence across 8-dimensional tensor (PT, PP, SF, CM, IS, TP, SA, SD) against normative emotion priors.',
      example: 'Δ = 0.485 (Inverted Gap), ResearchFlag = True',
    },
  },

  Concreteness: {
    simple: {
      title: 'Visual Detail Score',
      tagline: 'Physical real-world things vs floaty thoughts',
      description: 'High scores mean you use real things you can touch (cars, chains, smoke). Low scores mean floaty ideas (destiny, forever).',
      example: '"Cadillac, gunsmoke, diamond" = 95/100 Concrete',
    },
    hybrid: {
      title: 'Visual Detail (Sensory Concreteness Index)',
      tagline: 'Empirical sensory tangibility score (0 - 100)',
      description: 'Evaluates physical street imagery against abstract clichés using the Brysbaert psycholinguistic scale.',
      example: 'Tangibility Score: 85/100 (Cinematic Street Detail)',
    },
    deep_craft: {
      title: 'Brysbaert Concreteness Index (BCI)',
      tagline: 'Psycholinguistic sensory tangibility rating (μ: 1.0 - 5.0)',
      description: 'Standardized empirical concreteness lexicon (Brysbaert et al. 2014) evaluating sensory tangibility vs semantic abstraction.',
      example: 'μ = 4.82, Category: High Physical Tangibility',
    },
  },

  Earworm: {
    simple: {
      title: 'Catchiness & Stickiness',
      tagline: 'How easily the chorus sticks in someone\'s head',
      description: 'High scores mean your words bounce with punchy consonants and repeating vowel rhymes that are impossible to forget.',
      example: '88/100: Instant viral earworm',
    },
    hybrid: {
      title: 'Catchiness (Psychoacoustic Earworm Index)',
      tagline: 'Vowel reduplication & percussive bounce formula',
      description: 'Combines vowel repetition across bar endings, punchy plosive consonants, and line symmetry for maximum memory retention.',
      example: 'Earworm Score: 85/100 (Viral Earworm)',
    },
    deep_craft: {
      title: 'Psychoacoustic Earworm Metric (SRI & Bouba/Kiki Ratio)',
      tagline: 'Cognitive acoustic retention index (0 - 100)',
      description: 'Multi-factor model evaluating Sonic Reduplication Index (SRI), Bouba/Kiki plosive-to-sonorant ratio, and metric isomorphism.',
      example: 'SRI = 0.75, PunchRatio = 0.58, Composite = 88.4',
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Phonology & Slang Engine
  // ---------------------------------------------------------------------------
  AAVE_CCR: {
    simple: {
      title: 'Street Rhyme Bridge',
      tagline: 'Dropping the hard last letter so words rhyme smoothly',
      description: 'Dropping the last sound on words like "past" or "cold" so they naturally rhyme with "pass" or "soul".',
      example: '"past" -> "pass" (rhymes with "class")',
    },
    hybrid: {
      title: 'Street Rhyme (Consonant Cluster Reduction)',
      tagline: 'Coda consonant softening for natural slant rhymes',
      description: 'Dropping final consonant clusters ("hand" -> "han") to unlock authentic hip-hop slant rhymes under AAVE phonology.',
      example: '"hand" -> "han" (rhymes with "man")',
    },
    deep_craft: {
      title: 'Consonant Cluster Reduction (Labov 1972 AAVE CCR)',
      tagline: 'Phonological coda reduction in reducible consonant clusters',
      description: 'Systematic phonological deletion of word-final consonant in reducible clusters ([-ST], [-ND], [-LD], [-NT], [-SK]).',
      example: '/P AE1 S T/ -> /P AE1 S/ (Rhyme partner: /K L AE1 S/)',
    },
  },
};

/**
 * Returns translation for a concept key under the specified dialect mode.
 */
export function getTranslation(key: string, mode: ExplanationMode = 'hybrid'): ConceptTranslation {
  const entry = TRANSLATION_DICTIONARY[key];
  if (!entry) {
    return {
      title: key,
      tagline: 'Lyrical metric or device',
      description: `Analysis details for ${key}.`,
    };
  }
  const translated = entry[mode];
  if (translated) return translated;
  // An unrecognised mode used to fall through to `hybrid` silently, so a
  // typo'd or newly-added mode read as a deliberate hybrid rendering. Falling
  // back is still the right behaviour — a missing translation must not blank
  // the UI — but it is now recorded rather than hidden.
  logError(`no translation for mode "${mode}"; falling back to hybrid`, null);
  return entry.hybrid;
}

/**
 * concreteness.ts
 *
 * Brysbaert Concreteness & Sensory Tangibility Engine for Prosodic.
 *
 * Scores the sensory tangibility of lyrics based on empirical psycholinguistic
 * concreteness norms (Brysbaert et al. 2014).
 *
 * Distinguishes vivid sensory physical imagery (e.g. "Cadillac", "gunsmoke", "concrete", "ice")
 * from floaty, cliché abstractions (e.g. "destiny", "ambition", "forever", "illusions").
 *
 * Source: concreteness_engine.py from the original Prosodic build.
 */

export interface ConcretenessScoreResult {
  tangibilityScore: number; // 0 to 100 (100 = highly concrete street imagery)
  concreteWords: string[];
  abstractWords: string[];
  sensoryDominance: 'Vivid & Concrete' | 'Balanced Metaphor' | 'Floaty & Abstract';
  recommendation: string;
}

// ---------------------------------------------------------------------------
// High-Frequency Concreteness Ratings Lexicon (1.0 = Abstract, 5.0 = Physical)
// ---------------------------------------------------------------------------

export const CONCRETENESS_LEXICON: Record<string, number> = {
  // Highly Concrete Objects (4.5 - 5.0)
  cadillac: 4.95,
  gun: 4.92,
  car: 4.88,
  money: 4.85,
  smoke: 4.80,
  blood: 4.95,
  brick: 4.98,
  gold: 4.90,
  diamond: 4.92,
  ice: 4.85,
  mic: 4.80,
  microphone: 4.90,
  stage: 4.75,
  paper: 4.90,
  pen: 4.92,
  street: 4.80,
  chain: 4.88,
  shoes: 4.92,
  watch: 4.85,
  wrist: 4.90,
  bottle: 4.95,
  glass: 4.90,
  water: 4.92,
  fire: 4.85,
  bullet: 4.95,
  trigger: 4.88,
  blade: 4.90,
  steel: 4.85,
  engine: 4.88,
  wheel: 4.92,
  corner: 4.60,
  block: 4.65,
  door: 4.95,
  window: 4.92,
  floor: 4.85,
  roof: 4.80,
  hands: 4.95,
  eyes: 4.90,
  lips: 4.85,
  teeth: 4.92,
  throat: 4.80,
  chest: 4.85,

  // Moderate Concreteness Actions & Modifiers (3.0 - 4.4)
  drive: 4.20,
  run: 4.10,
  walk: 4.05,
  stand: 3.90,
  fall: 3.80,
  climb: 4.10,
  strike: 4.25,
  punch: 4.40,
  shout: 4.15,
  whisper: 3.95,
  freeze: 4.10,
  burn: 4.30,
  shine: 3.90,
  glow: 3.85,
  heavy: 3.75,
  cold: 4.05,
  dark: 3.60,
  bright: 3.80,

  // Highly Abstract Concepts & Metaphors (1.0 - 2.8)
  destiny: 1.55,
  fate: 1.60,
  forever: 1.70,
  eternity: 1.65,
  ambition: 2.10,
  glory: 2.05,
  honor: 2.15,
  soul: 2.00,
  spirit: 2.05,
  mind: 2.80,
  thought: 2.45,
  illusion: 1.85,
  concept: 1.90,
  philosophy: 1.75,
  wisdom: 2.20,
  truth: 2.30,
  lie: 2.50,
  hope: 2.25,
  faith: 2.10,
  fear: 2.80,
  courage: 2.30,
  power: 2.70,
  energy: 2.65,
  vibe: 2.10,
  dream: 2.50,
  legend: 2.35,
  legacy: 2.20,
  greatness: 2.10,
  success: 2.40,
  failure: 2.35,
  perfection: 1.80,
  freedom: 2.40,
  justice: 2.30,
};

/**
 * Evaluates the sensory concreteness score of any lyric stanza.
 */
export function scoreConcreteness(text: string): ConcretenessScoreResult {
  if (!text || !text.trim()) {
    return {
      tangibilityScore: 50,
      concreteWords: [],
      abstractWords: [],
      sensoryDominance: 'Balanced Metaphor',
      recommendation: 'Add physical sensory details to ground your lyrical storytelling.',
    };
  }

  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const concreteMatches: string[] = [];
  const abstractMatches: string[] = [];
  let totalScore = 0;
  let scoredCount = 0;

  words.forEach((w) => {
    const score = CONCRETENESS_LEXICON[w];
    if (score !== undefined) {
      totalScore += score;
      scoredCount += 1;
      if (score >= 4.4) concreteMatches.push(w);
      else if (score <= 2.8) abstractMatches.push(w);
    }
  });

  // Scale 1.0 - 5.0 to 0 - 100
  const avg = scoredCount > 0 ? totalScore / scoredCount : 3.2;
  const tangibilityScore = Math.round(Math.min(100, Math.max(10, ((avg - 1.0) / 4.0) * 100)));

  let sensoryDominance: ConcretenessScoreResult['sensoryDominance'] = 'Balanced Metaphor';
  let recommendation = 'Solid balance between concrete imagery and thematic ideas.';

  if (tangibilityScore >= 70) {
    sensoryDominance = 'Vivid & Concrete';
    recommendation = 'Rich, cinematic street tangibility. Strong tactile visual imagery.';
  } else if (tangibilityScore <= 40) {
    sensoryDominance = 'Floaty & Abstract';
    recommendation = 'Lyrics lean abstract/philosophical. Ground with specific nouns, physical textures, or street details.';
  }

  return {
    tangibilityScore,
    concreteWords: Array.from(new Set(concreteMatches)),
    abstractWords: Array.from(new Set(abstractMatches)),
    sensoryDominance,
    recommendation,
  };
}

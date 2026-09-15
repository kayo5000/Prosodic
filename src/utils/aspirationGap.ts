/**
 * aspirationGap.ts
 *
 * Phonoaffective Signature Framework & Aspiration Gap Calculator.
 *
 * Computes the emotional gap between what a writer's language actually encodes
 * (the measurable sonic signature) and what the writer stated they wanted it to feel like
 * (the sonic aspiration label) — uncovering the "Hey Ya / 3005" phenomenon.
 *
 * Formula:
 * E = (PT*w1) + (PP*w2) + (SF*w3) + (CM*w4) + (IS*w5) + (TP*w6) + (SA*w7) + (SD*w8)
 *
 * Source: aspiration_gap.py from the original Prosodic build.
 */

export type AspirationLabel =
  | 'aggressive'
  | 'celebratory'
  | 'contemplative'
  | 'defiant'
  | 'desperate'
  | 'grieving'
  | 'hopeful'
  | 'hungry'
  | 'melancholic'
  | 'nostalgic'
  | 'peaceful'
  | 'proud'
  | 'raw'
  | 'triumphant'
  | 'vulnerable';

export const ASPIRATION_LABELS: AspirationLabel[] = [
  'aggressive',
  'celebratory',
  'contemplative',
  'defiant',
  'desperate',
  'grieving',
  'hopeful',
  'hungry',
  'melancholic',
  'nostalgic',
  'peaceful',
  'proud',
  'raw',
  'triumphant',
  'vulnerable',
];

interface ExpectedRange {
  PT: [number, number]; // Phonemic Texture
  PP: [number, number]; // Prosodic Pressure
  SF: [number, number]; // Semantic Field Gravity
  CM: [number, number]; // Cultural Memory
  IS: [number, number]; // Intentionality Signal
  TP: [number, number]; // Temporal Position
  SA: [number, number]; // Sonic Aspiration
  SD: [number, number]; // Subtext Delta
}

const ASPIRATION_PROFILES: Record<AspirationLabel, ExpectedRange> = {
  aggressive: {
    PT: [0.65, 1.0],
    PP: [0.60, 1.0],
    SF: [0.50, 1.0],
    CM: [0.40, 1.0],
    IS: [0.40, 1.0],
    TP: [0.0, 1.0],
    SA: [0.60, 1.0],
    SD: [0.0, 0.50],
  },
  celebratory: {
    PT: [0.30, 0.70],
    PP: [0.40, 0.80],
    SF: [0.50, 1.0],
    CM: [0.40, 1.0],
    IS: [0.0, 0.60],
    TP: [0.40, 1.0],
    SA: [0.50, 1.0],
    SD: [0.0, 0.40],
  },
  contemplative: {
    PT: [0.20, 0.60],
    PP: [0.10, 0.50],
    SF: [0.30, 0.70],
    CM: [0.20, 0.70],
    IS: [0.30, 0.80],
    TP: [0.20, 0.70],
    SA: [0.30, 0.70],
    SD: [0.20, 0.70],
  },
  defiant: {
    PT: [0.50, 1.0],
    PP: [0.50, 1.0],
    SF: [0.40, 1.0],
    CM: [0.40, 1.0],
    IS: [0.20, 0.80],
    TP: [0.20, 0.80],
    SA: [0.50, 1.0],
    SD: [0.10, 0.60],
  },
  desperate: {
    PT: [0.40, 0.80],
    PP: [0.60, 1.0],
    SF: [0.50, 1.0],
    CM: [0.20, 0.70],
    IS: [0.40, 0.90],
    TP: [0.30, 0.80],
    SA: [0.50, 1.0],
    SD: [0.30, 0.80],
  },
  grieving: {
    PT: [0.10, 0.50],
    PP: [0.10, 0.50],
    SF: [0.30, 0.80],
    CM: [0.20, 0.70],
    IS: [0.40, 1.0],
    TP: [0.20, 0.70],
    SA: [0.30, 0.80],
    SD: [0.30, 0.80],
  },
  hopeful: {
    PT: [0.20, 0.65],
    PP: [0.20, 0.60],
    SF: [0.40, 0.80],
    CM: [0.20, 0.70],
    IS: [0.20, 0.70],
    TP: [0.30, 0.80],
    SA: [0.40, 0.80],
    SD: [0.10, 0.60],
  },
  hungry: {
    PT: [0.50, 0.90],
    PP: [0.60, 1.0],
    SF: [0.40, 1.0],
    CM: [0.40, 1.0],
    IS: [0.30, 0.80],
    TP: [0.20, 0.70],
    SA: [0.50, 1.0],
    SD: [0.10, 0.50],
  },
  melancholic: {
    PT: [0.15, 0.55],
    PP: [0.10, 0.50],
    SF: [0.30, 0.70],
    CM: [0.20, 0.65],
    IS: [0.30, 0.80],
    TP: [0.20, 0.65],
    SA: [0.30, 0.70],
    SD: [0.30, 0.75],
  },
  nostalgic: {
    PT: [0.20, 0.60],
    PP: [0.15, 0.55],
    SF: [0.40, 0.80],
    CM: [0.50, 1.0],
    IS: [0.20, 0.70],
    TP: [0.20, 0.70],
    SA: [0.30, 0.70],
    SD: [0.20, 0.70],
  },
  peaceful: {
    PT: [0.10, 0.45],
    PP: [0.05, 0.40],
    SF: [0.20, 0.60],
    CM: [0.10, 0.60],
    IS: [0.10, 0.60],
    TP: [0.20, 0.70],
    SA: [0.20, 0.60],
    SD: [0.05, 0.40],
  },
  proud: {
    PT: [0.40, 0.80],
    PP: [0.40, 0.80],
    SF: [0.40, 0.90],
    CM: [0.40, 1.0],
    IS: [0.20, 0.70],
    TP: [0.30, 0.80],
    SA: [0.40, 0.90],
    SD: [0.10, 0.50],
  },
  raw: {
    PT: [0.50, 1.0],
    PP: [0.50, 1.0],
    SF: [0.50, 1.0],
    CM: [0.40, 1.0],
    IS: [0.10, 0.60],
    TP: [0.0, 1.0],
    SA: [0.50, 1.0],
    SD: [0.20, 0.80],
  },
  triumphant: {
    PT: [0.50, 0.90],
    PP: [0.50, 0.90],
    SF: [0.50, 1.0],
    CM: [0.40, 1.0],
    IS: [0.20, 0.70],
    TP: [0.50, 1.0],
    SA: [0.60, 1.0],
    SD: [0.05, 0.45],
  },
  vulnerable: {
    PT: [0.10, 0.50],
    PP: [0.10, 0.55],
    SF: [0.30, 0.75],
    CM: [0.20, 0.65],
    IS: [0.50, 1.0],
    TP: [0.10, 0.70],
    SA: [0.30, 0.75],
    SD: [0.40, 1.0],
  },
};

export const DEFAULT_SIGNATURE_WEIGHTS = {
  PT: 0.15,
  PP: 0.18,
  SF: 0.15,
  CM: 0.10,
  IS: 0.12,
  TP: 0.10,
  SA: 0.10,
  SD: 0.10,
};

export interface AspirationGapReport {
  alignmentScore: number; // 0.0 to 1.0 (1.0 = perfect alignment)
  gapType: 'controlled' | 'leaked' | 'inverted';
  researchFlag: boolean;
  divergentDimensions: string[];
  aspirationLabel: AspirationLabel;
  gapMagnitude: number;
  signatureVector: Record<string, number>;
  description: string;
}

/**
 * Computes Phonemic Texture (PT) from text consonants and vowel openness.
 */
export function computePhonemicTextureFromText(text: string): number {
  if (!text.trim()) return 0.5;

  const clean = text.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0.5;

  const hardCount = (clean.match(/[bdgkpt]/g) || []).length;
  const softCount = (clean.match(/[mnlrwyfvszh]/g) || []).length;
  const openCount = (clean.match(/[aeou]/g) || []).length;
  const total = clean.length;

  const hardRatio = hardCount / total;
  const softRatio = softCount / total;
  const openBonus = Math.min(0.1, openCount / total);

  const pt = hardRatio - softRatio * 0.5 + openBonus + 0.5;
  return Number(Math.max(0.0, Math.min(1.0, pt)).toFixed(4));
}

/**
 * Computes Prosodic Pressure (PP) from syllable density (SPS).
 */
export function computeProsodicPressureFromSps(sps: number): number {
  // 6.5 SPS = standard high pressure (1.0); 2.0 SPS = relaxed (0.2)
  const pp = Math.min(1.0, Math.max(0.05, sps / 6.5));
  return Number(pp.toFixed(4));
}

/**
 * Main Aspiration Gap Computer
 */
export function computeAspirationGap(
  signatureVector: Partial<Record<string, number>>,
  aspirationLabel: AspirationLabel = 'aggressive',
): AspirationGapReport {
  const profile = ASPIRATION_PROFILES[aspirationLabel] || ASPIRATION_PROFILES.aggressive;
  const components = ['PT', 'PP', 'SF', 'CM', 'IS', 'TP', 'SA', 'SD'] as const;

  const fullVector: Record<string, number> = {
    PT: signatureVector.PT ?? 0.5,
    PP: signatureVector.PP ?? 0.5,
    SF: signatureVector.SF ?? 0.5,
    CM: signatureVector.CM ?? 0.5,
    IS: signatureVector.IS ?? 0.5,
    TP: signatureVector.TP ?? 0.5,
    SA: signatureVector.SA ?? 0.5,
    SD: signatureVector.SD ?? 0.5,
  };

  const divergent: string[] = [];
  let totalGap = 0;

  components.forEach((comp) => {
    const val = fullVector[comp];
    const [lo, hi] = profile[comp];

    let gap = 0;
    if (val < lo) gap = lo - val;
    else if (val > hi) gap = val - hi;

    totalGap += gap;
    if (gap > 0.20) divergent.push(comp);
  });

  const gapMagnitude = Number((totalGap / components.length).toFixed(4));
  const alignmentScore = Number(Math.max(0.0, 1.0 - gapMagnitude).toFixed(4));

  let gapType: 'controlled' | 'leaked' | 'inverted' = 'controlled';
  if (gapMagnitude > 0.45) gapType = 'inverted';
  else if (gapMagnitude >= 0.20) gapType = 'leaked';

  const researchFlag = gapMagnitude > 0.35;

  let description = `Your lyrics closely match your ${aspirationLabel} intention.`;
  if (gapType === 'leaked') {
    description = `Emotional leakage detected in ${divergent.join(', ') || 'tempo/texture'} — subtle subtext contrasting ${aspirationLabel} intent.`;
  } else if (gapType === 'inverted') {
    description = `Inverted Aspiration ("Hey Ya / 3005" effect): Sonic texture directly contrasts ${aspirationLabel} lyrics.`;
  }

  return {
    alignmentScore,
    gapType,
    researchFlag,
    divergentDimensions: divergent,
    aspirationLabel,
    gapMagnitude,
    signatureVector: fullVector,
    description,
  };
}

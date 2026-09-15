/**
 * cielabSoundCalibration.ts
 *
 * Scientific Auditory Frequency <-> CIELAB Color Space Calibration Engine.
 * Implements empirical crossmodal correspondence models from:
 * 1. Anikin & Johansson (2019): "Implicit associations between individual properties of color and sound"
 *    - F0 (pitch) & Spectral Centroid -> Lightness (L*) & Saturation (C*)
 *    - Spectral energy > 800 Hz -> b* (Yellow/Blue axis)
 *    - Loudness -> Visual Saliency & Saturation
 * 2. Reymore & Lindsey (2025): "Color and tone color: audiovisual crossmodal correspondences with musical instrument timbre"
 *    - Pitch register (F2 -> F4) -> Increasing Lightness (L*)
 *    - Timbral brightness -> Color Warmth (positive warm-cool index: +a*, +b*)
 * 3. Lindborg & Friberg (2015): "Colour Association with Music Is Mediated by Emotion"
 *    - Continuous CIE Lab coordinate mapping and Delta E perceptual contrast
 * 4. TIERRA Architecture (Hardware & Software Specifications):
 *    - Mode A: L* = Fluency + Repetition, a* = Sound Symbolism (Bouba/Kiki), b* = Rhyme + Consonance
 *    - Mode B: Live acoustic biomarkers (F0, Centroid, HNR, Loudness) -> CIELAB display layer with Baseline Drift Model
 */

import * as culori from 'culori';

export interface CIELab {
  l: number; // 0 to 100 (Lightness: dark to bright)
  a: number; // -100 to +100 (Green to Red)
  b: number; // -100 to +100 (Blue to Yellow)
}

export interface CIELCh {
  l: number; // 0 to 100
  c: number; // 0 to ~130 (Chroma / Saturation)
  h: number; // 0 to 360 (Hue angle in degrees)
}

export interface RGBColor {
  r: number; // 0 to 255
  g: number; // 0 to 255
  b: number; // 0 to 255
  hex: string;
}

export type VocalRegister = 'sub_bass' | 'bass' | 'baritone' | 'tenor' | 'alto' | 'soprano' | 'whistle';

export interface FrequencyCalibrationParams {
  f0Hz: number;              // Fundamental frequency in Hz (e.g. 65 Hz to 2000 Hz)
  spectralCentroidHz?: number;// Center of spectral energy in Hz (e.g. 250 Hz to 5000 Hz)
  loudnessDb?: number;        // Signal level in dBFS / SPL (e.g. -48 dB to 0 dB, default -18)
  hnrDb?: number;             // Harmonics-to-Noise Ratio in dB (e.g. 0 to 35 dB, default 20)
  highFreqEnergyRatio?: number; // Energy > 800 Hz ratio [0..1] (default 0.5)
}

export interface LyricFlowCalibrationParams {
  fluencyScore: number;       // Processing fluency [0..1] (ease of articulation)
  repetitionRate: number;     // Recurrence rate [0..1]
  soundSymbolismScore: number;// -1.0 (sharp / kiki) to +1.0 (round / bouba)
  rhymeDensity: number;       // Rhyme density [0..1]
  consonanceScore: number;    // Consonance / coda harmony [0..1]
}

export interface CalibratedSoundColor {
  lab: CIELab;
  lch: CIELCh;
  rgb: RGBColor;
  hex: string;
  uiIdentifier: string;
  register?: VocalRegister;
  warmCoolIndex: number;      // -1.0 (cool blue) to +1.0 (warm yellow/red)
  semanticDescription: string;
}

export interface BaselineDriftReport {
  deltaE: number;             // CIEDE2000 perceptual color distance
  deltaL: number;             // Lightness drift (pitch creep / loss of upper harmonics)
  deltaC: number;             // Chroma drift (loss of vocal support / breathiness)
  driftState: 'stable' | 'expressive_drift' | 'strain_shift' | 'register_break';
  description: string;
}

// ---------------------------------------------------------------------------
// 1. Core Color Space Transformations (D65 Standard Illuminant)
// ---------------------------------------------------------------------------

/**
 * Converts CIE L*a*b* to sRGB with D65 white point reference.
 */
export function labToRgb(lab: CIELab): RGBColor {
  const culoriLab = { mode: 'lab' as const, l: lab.l, a: lab.a, b: lab.b };
  const rgb = culori.rgb(culoriLab);

  // Clamp sRGB components to [0, 1] gamut
  const rClamped = Math.max(0, Math.min(1, rgb.r ?? 0));
  const gClamped = Math.max(0, Math.min(1, rgb.g ?? 0));
  const bClamped = Math.max(0, Math.min(1, rgb.b ?? 0));

  const r = Math.round(rClamped * 255);
  const g = Math.round(gClamped * 255);
  const b = Math.round(bClamped * 255);

  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;

  return { r, g, b, hex };
}

/**
 * Converts sRGB [0..255] or hex to CIE L*a*b*.
 */
export function rgbToLab(rgb: { r: number; g: number; b: number } | string): CIELab {
  const parsed = typeof rgb === 'string'
    ? culori.parse(rgb)
    : { mode: 'rgb' as const, r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };

  const lab = culori.lab(parsed || { mode: 'rgb', r: 0, g: 0, b: 0 });
  return {
    l: Number((lab.l ?? 0).toFixed(2)),
    a: Number((lab.a ?? 0).toFixed(2)),
    b: Number((lab.b ?? 0).toFixed(2)),
  };
}

/**
 * Converts CIE L*a*b* to cylindrical CIE L*C*h° (Lightness, Chroma, Hue).
 */
export function labToLch(lab: CIELab): CIELCh {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return {
    l: Number(lab.l.toFixed(2)),
    c: Number(c.toFixed(2)),
    h: Number(h.toFixed(2)),
  };
}

/**
 * Converts cylindrical CIE L*C*h° to CIE L*a*b*.
 */
export function lchToLab(lch: CIELCh): CIELab {
  const rad = (lch.h * Math.PI) / 180;
  return {
    l: Number(lch.l.toFixed(2)),
    a: Number((lch.c * Math.cos(rad)).toFixed(2)),
    b: Number((lch.c * Math.sin(rad)).toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// 2. Perceptual Difference Metrics (Delta E)
// ---------------------------------------------------------------------------

/**
 * Computes Euclidean CIE76 color distance: ΔE = √(ΔL² + Δa² + Δb²).
 */
export function deltaE76(labA: CIELab, labB: CIELab): number {
  const dL = labA.l - labB.l;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Number(Math.sqrt(dL * dL + da * da + db * db).toFixed(2));
}

/**
 * Computes ISO/CIE CIEDE2000 (ΔE₀₀) color difference metric.
 * Accounts for non-uniformities in the human visual system (JND ≈ 2.3).
 */
export function deltaE2000(labA: CIELab, labB: CIELab): number {
  const diffFn = culori.differenceCiede2000();
  const cA = { mode: 'lab' as const, l: labA.l, a: labA.a, b: labA.b };
  const cB = { mode: 'lab' as const, l: labB.l, a: labB.a, b: labB.b };
  return Number(diffFn(cA, cB).toFixed(2));
}

// ---------------------------------------------------------------------------
// 3. Auditory Frequency & Acoustic Calibration (Mode B)
// ---------------------------------------------------------------------------

/**
 * Classifies fundamental frequency into human vocal register.
 */
export function classifyVocalRegister(f0Hz: number): VocalRegister {
  if (f0Hz < 82) return 'sub_bass';   // Below E2
  if (f0Hz < 131) return 'bass';      // E2 - C3
  if (f0Hz < 196) return 'baritone';  // C3 - G3
  if (f0Hz < 294) return 'tenor';     // G3 - D4
  if (f0Hz < 440) return 'alto';      // D4 - A4
  if (f0Hz < 1046) return 'soprano';  // A4 - C6
  return 'whistle';                   // C6+ (M4 register)
}

/**
 * Maps Auditory Sound Frequency (F0 and Spectral Centroid) to CIELAB.
 * Grounded in Anikin & Johansson (2019) and Reymore & Lindsey (2025):
 * - Lightness (L*): Logarithmic pitch height (F0) + Spectral Centroid
 * - Chroma (C*): Loudness / SPL amplitude and harmonic density
 * - Hue angle (h°): Balance of low vs high frequencies (>800 Hz -> yellow/warm, <800 Hz -> blue/cool)
 * - a*: Harmonicity / HNR (pure tone -> +a* warm red; noisy/breathy -> -a* green/cyan)
 * - b*: Spectral tilt / Centroid (>800 Hz energy -> +b* yellow; deep fundamental -> -b* blue)
 */
export function calibrateFrequencyToCielab(params: FrequencyCalibrationParams): CalibratedSoundColor {
  const f0 = Math.max(40, Math.min(2500, params.f0Hz));
  const centroid = params.spectralCentroidHz ?? f0 * 2.2;
  const loudness = params.loudnessDb ?? -18; // -48 to 0 dBFS
  const hnr = params.hnrDb ?? 20;            // 0 to 35 dB
  const highRatio = params.highFreqEnergyRatio ?? Math.min(1.0, centroid / 2500);

  // 1. Calculate Lightness L* (20 to 92 range):
  // Human pitch perception is logarithmic (semitones / MIDI pitch).
  // MIDI 36 (C2, 65.4 Hz) -> L* ≈ 30 (Dark / Rich)
  // MIDI 69 (A4, 440.0 Hz) -> L* ≈ 65 (Medium / Balanced)
  // MIDI 84 (C6, 1046.5 Hz) -> L* ≈ 85 (Bright / Brilliant)
  const midiPitch = 69 + 12 * Math.log2(f0 / 440);
  const normalizedPitch = Math.max(0, Math.min(1, (midiPitch - 36) / 54)); // C2 to F#6
  const normalizedCentroid = Math.max(0, Math.min(1, Math.log2(centroid / 200) / 4.5)); // 200Hz to 4500Hz

  // L* weighted between pitch height (60%) and spectral centroid brightness (40%)
  const l = Math.max(20, Math.min(95, 25 + normalizedPitch * 45 + normalizedCentroid * 25));

  // 2. Calculate Saturation / Chroma C* (10 to 80 range):
  // Loudness (prothetic): louder tones map to higher saturation (Anikin 2019)
  // Spectral centroid: higher harmonic brightness increases saturation (Anikin 2019)
  // HNR: clear harmonic tones have higher chroma than turbid/breathy sounds
  const normLoudness = Math.max(0, Math.min(1, (loudness + 48) / 48)); // -48dB to 0dB
  const normHnr = Math.max(0, Math.min(1, hnr / 30));
  const c = Math.max(10, Math.min(80, 15 + normLoudness * 35 + normHnr * 15 + normalizedCentroid * 15));

  // 3. Calculate Hue angle & (a*, b*) coordinates scaled by Chroma C*:
  // Empirical rule from Hamilton-Fletcher (2017) & Anikin (2019):
  // Energy > 800 Hz drives yellow (+b*); lower energy drives blue (-b*).
  // Warmth: Trumpet/Violin (+a* red/orange), Mellow/Hollow Clarinet/Flute (-a*, -b* cool).
  const warmCool = Math.max(-1.0, Math.min(1.0, (highRatio - 0.4) * 2.0));
  const rawA = (normHnr - 0.4) * 0.7 + (warmCool > 0 ? warmCool * 0.3 : -0.2);
  const rawB = warmCool;
  const mag = Math.sqrt(rawA * rawA + rawB * rawB) || 1;
  const a = (rawA / mag) * c;
  const b = (rawB / mag) * c;

  const lab: CIELab = {
    l: Number(l.toFixed(2)),
    a: Number(a.toFixed(2)),
    b: Number(b.toFixed(2)),
  };

  const lch = labToLch(lab);
  const rgb = labToRgb(lab);
  const register = classifyVocalRegister(f0);

  const semantic = `${register.toUpperCase()} | F0: ${Math.round(f0)}Hz | Centroid: ${Math.round(centroid)}Hz`;

  return {
    lab,
    lch,
    rgb,
    hex: rgb.hex,
    uiIdentifier: `cielab-f0-${Math.round(f0)}-${rgb.hex.replace('#', '')}`,
    register,
    warmCoolIndex: Number(warmCool.toFixed(2)),
    semanticDescription: semantic,
  };
}

// ---------------------------------------------------------------------------
// 4. Lyric Flow & Phonetic Calibration (Mode A)
// ---------------------------------------------------------------------------

/**
 * Maps Textual Lyric Flow metrics to CIELAB coordinates.
 * Grounded in TIERRA Mode A specification:
 * - L* (Lightness): Fluency + Repetition rate (0 to 100)
 * - a* (Green/Red): Sound Symbolism (-1.0 Kiki/sharp -> +1.0 Bouba/round)
 * - b* (Blue/Yellow): Rhyme density + Consonance (0 to 100)
 */
export function calibrateLyricFlowToCielab(params: LyricFlowCalibrationParams): CalibratedSoundColor {
  // L*: Processing Fluency & Repetition Rate (40 to 88)
  const fluencyFactor = Math.max(0, Math.min(1, params.fluencyScore));
  const repetitionFactor = Math.max(0, Math.min(1, params.repetitionRate));
  const l = 40 + (fluencyFactor * 0.6 + repetitionFactor * 0.4) * 48;

  // a*: Sound Symbolism (Kiki: sharp/unvoiced consonants -> -a* green; Bouba: round/voiced vowels -> +a* red)
  const symbolism = Math.max(-1.0, Math.min(1.0, params.soundSymbolismScore));
  const a = symbolism * 45; // -45 to +45

  // b*: Rhyme Density & Consonant Weave (High rhyme -> +b* yellow / gold; Unrhymed coda -> -b* deep blue)
  const rhyme = Math.max(0, Math.min(1, params.rhymeDensity));
  const consonance = Math.max(0, Math.min(1, params.consonanceScore));
  const b = -30 + (rhyme * 0.7 + consonance * 0.3) * 75; // -30 to +45

  const lab: CIELab = {
    l: Number(l.toFixed(2)),
    a: Number(a.toFixed(2)),
    b: Number(b.toFixed(2)),
  };

  const lch = labToLch(lab);
  const rgb = labToRgb(lab);
  const warmCool = Number((b / 45).toFixed(2));

  let label = 'Neutral Flow';
  if (symbolism > 0.3 && b > 10) label = 'Warm Bouba Resonance';
  else if (symbolism < -0.3 && b > 10) label = 'Sharp Kiki Gold';
  else if (b < -10) label = 'Cool Blue Open Bar';

  return {
    lab,
    lch,
    rgb,
    hex: rgb.hex,
    uiIdentifier: `cielab-flow-${rgb.hex.replace('#', '')}`,
    warmCoolIndex: warmCool,
    semanticDescription: label,
  };
}

// ---------------------------------------------------------------------------
// 5. Baseline Drift Model (TIERRA Mode B Live Monitor)
// ---------------------------------------------------------------------------

/**
 * Measures live vocal deviation from an artist's personal baseline in CIELAB space.
 * Uses CIEDE2000 to quantify perceptual acoustic drift.
 */
export function calculateVocalBaselineDrift(
  current: CIELab,
  baseline: CIELab,
): BaselineDriftReport {
  const dE = deltaE2000(current, baseline);
  const dL = current.l - baseline.l;
  const currentChroma = Math.sqrt(current.a * current.a + current.b * current.b);
  const baseChroma = Math.sqrt(baseline.a * baseline.a + baseline.b * baseline.b);
  const dC = currentChroma - baseChroma;

  let driftState: BaselineDriftReport['driftState'] = 'stable';
  let description = 'Vocal placement is tightly locked to healthy baseline.';

  if (dE >= 22.0) {
    driftState = 'register_break';
    description = `Substantial acoustic divergence (ΔE = ${dE}). Likely register break or acute delivery shift.`;
  } else if (dE >= 10.0) {
    driftState = 'strain_shift';
    description = `Noticeable acoustic deviation (ΔE = ${dE}). Pitch creep (+${dL.toFixed(1)} L*) or breathy decoupling detected.`;
  } else if (dE >= 3.0) {
    driftState = 'expressive_drift';
    description = `Natural musical variation (ΔE = ${dE}). Well within healthy performance envelope.`;
  }

  return {
    deltaE: dE,
    deltaL: Number(dL.toFixed(2)),
    deltaC: Number(dC.toFixed(2)),
    driftState,
    description,
  };
}

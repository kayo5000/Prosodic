export type StylePresetKey = 'spacious' | 'standard' | 'dense' | 'speed';
export type TimeSignature = '4/4' | '3/4' | '6/8';

export interface StylePreset {
  key: StylePresetKey;
  label: string;
  shortLabel: string;
  min: number;
  target: number;
  max: number;
  description: string;
}

export const STYLE_PRESETS: Record<StylePresetKey, StylePreset> = {
  spacious: {
    key: 'spacious',
    label: 'Spacious / Ballad',
    shortLabel: 'Spacious',
    min: 1.5,
    target: 2.0,
    max: 2.5,
    description: 'Vocal holds, breathing room, melodic cadence',
  },
  standard: {
    key: 'standard',
    label: 'Standard Pocket / Pop',
    shortLabel: 'Standard',
    min: 3.0,
    target: 3.5,
    max: 4.5,
    description: 'Balanced 4/4 articulation, contemporary cadence',
  },
  dense: {
    key: 'dense',
    label: 'Dense / Rap Pocket',
    shortLabel: 'Dense',
    min: 5.0,
    target: 5.5,
    max: 6.5,
    description: 'Classic 16th-note multi-syllabic boom bap & trap pocket',
  },
  speed: {
    key: 'speed',
    label: 'Speed / Chopper Flow',
    shortLabel: 'Speed',
    min: 7.5,
    target: 8.5,
    max: 9.5,
    description: 'High-velocity double-time & rapid syllabic runs',
  },
};

export interface BarMetrics {
  bpm: number;
  timeSignature: TimeSignature;
  isHalfTime: boolean;
  stylePreset: StylePresetKey;
  barDurationSeconds: number;
  beatDurationMs: number;
  minSyllables: number;
  targetSyllables: number;
  maxSyllables: number;
  rawCapacity: number;
}

export type SyllablePocketStatus = 'empty' | 'open' | 'locked' | 'fast';
export type VisualDensityMode = 'gutter' | 'heatmap' | 'both';

const BREATH_HEADROOM_FACTOR = 0.85;

/**
 * Calculates bar duration, beat duration, and dynamic syllable targets per bar
 * based on tempo (BPM), time signature, vocal delivery style preset (SPS), and half-time settings.
 */
export function getBarMetrics(
  bpm: number,
  presetKey: StylePresetKey = 'dense',
  isHalfTime: boolean = false,
  timeSignature: TimeSignature = '4/4',
): BarMetrics {
  const safeBpm = Math.max(30, Math.min(300, bpm || 120));
  const preset = STYLE_PRESETS[presetKey] ?? STYLE_PRESETS.dense;
  const barMultiplier = isHalfTime ? 2 : 1;

  // Calculate quarter-note pulse multiplier:
  // 4/4: 4 quarter notes = 240s / BPM
  // 3/4: 3 quarter notes = 180s / BPM
  // 6/8: 6 eighth notes = 3 quarter notes = 180s / BPM
  const secondsConstant = timeSignature === '3/4' || timeSignature === '6/8' ? 180 : 240;

  // SecondsPerBar = (secondsConstant * multiplier) / BPM
  const barDurationSeconds = (secondsConstant * barMultiplier) / safeBpm;
  // BeatDurationMs = (60 / BPM) * 1000
  const beatDurationMs = (60 / safeBpm) * 1000;

  // Raw Capacity = SPS * SecondsPerBar
  const rawCapacity = preset.target * barDurationSeconds;

  // Usable targets with 15% breath/rest headroom applied:
  // TargetSyllables = round(SPS * SecondsPerBar * 0.85)
  const targetSyllables = Math.round(preset.target * barDurationSeconds * BREATH_HEADROOM_FACTOR);
  const minSyllables = Math.round(preset.min * barDurationSeconds * BREATH_HEADROOM_FACTOR);
  const maxSyllables = Math.round(preset.max * barDurationSeconds * BREATH_HEADROOM_FACTOR);

  return {
    bpm: safeBpm,
    timeSignature,
    isHalfTime,
    stylePreset: presetKey,
    barDurationSeconds: Number(barDurationSeconds.toFixed(3)),
    beatDurationMs: Number(beatDurationMs.toFixed(1)),
    minSyllables,
    targetSyllables,
    maxSyllables,
    rawCapacity: Number(rawCapacity.toFixed(2)),
  };
}

/**
 * Evaluates a line's syllable count against active bar metrics:
 * - Empty (0 syllables)
 * - Open / Spacious (< minSyllables) - indicates vocal pauses / sustained notes
 * - Locked / In Pocket ([minSyllables, maxSyllables]) - right on the pocket target
 * - Fast / Overcrowded (> maxSyllables) - exceeds physical articulation threshold
 */
export function getSyllablePocketStatus(
  syllableCount: number,
  metrics: BarMetrics,
): SyllablePocketStatus {
  if (syllableCount <= 0) return 'empty';
  if (syllableCount < metrics.minSyllables) return 'open';
  if (syllableCount <= metrics.maxSyllables) return 'locked';
  return 'fast';
}

/**
 * Dynamic Heatmap Color Progression:
 * - 0 syllables: White / default text color
 * - Low / warming: Light Mint Green (#34D399)
 * - In Pocket ([min, target]): Rich Green (#10B981)
 * - Dense pocket ((target, max]): Warm Yellow / Amber (#FFFFFF)
 * - High density near threshold: Bright Orange (#F97316)
 * - Overcrowded (> max): Fiery Red (#EF4444)
 */
export function getDensityHeatColor(
  syllableCount: number,
  metrics: BarMetrics,
  defaultTextColor: string = '#FFFFFF',
): string {
  if (syllableCount <= 0) return defaultTextColor;

  const { minSyllables, targetSyllables, maxSyllables } = metrics;

  // 1. Very sparse / opening
  if (syllableCount < Math.max(2, minSyllables * 0.5)) {
    return defaultTextColor; // White baseline
  }

  // 2. Approaching pocket
  if (syllableCount < minSyllables) {
    return '#34D399'; // Mint / Light green
  }

  // 3. Perfect in-pocket zone
  if (syllableCount <= targetSyllables) {
    return '#10B981'; // Solid green
  }

  // 4. Moderate density expansion (Yellow)
  const yellowThreshold = targetSyllables + (maxSyllables - targetSyllables) * 0.5;
  if (syllableCount <= yellowThreshold) {
    return '#FBBF24'; // Yellow
  }

  // 5. High density / Approaching ceiling (Orange)
  if (syllableCount <= maxSyllables) {
    return '#F97316'; // Orange
  }

  // 6. Overcrowded (Red)
  return '#EF4444'; // Red
}

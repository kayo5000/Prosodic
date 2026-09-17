import {
  getBarMetrics,
  getDensityHeatColor,
  getSyllablePocketStatus,
  STYLE_PRESETS,
} from './tempoDensity';

describe('Tempo & Syllable Density Engine', () => {
  it('calculates 90 BPM standard rap bar metrics correctly', () => {
    const metrics = getBarMetrics(90, 'dense', false, '4/4');

    // Bar Duration = 240 / 90 = 2.667s
    expect(metrics.barDurationSeconds).toBeCloseTo(2.667, 2);
    // Beat Duration = (60 / 90) * 1000 = 666.7ms
    expect(metrics.beatDurationMs).toBeCloseTo(666.7, 1);

    // Dense preset: min: 5.0, target: 5.5, max: 6.5
    // Target = round(5.5 * 2.6666 * 0.85) = round(12.46) = 12
    expect(metrics.targetSyllables).toBe(12);
    // Min = round(5.0 * 2.6666 * 0.85) = round(11.33) = 11
    expect(metrics.minSyllables).toBe(11);
    // Max = round(6.5 * 2.6666 * 0.85) = round(14.73) = 15
    expect(metrics.maxSyllables).toBe(15);
  });

  it('supports 3/4 and 6/8 non-standard time signatures accurately', () => {
    const metrics34 = getBarMetrics(90, 'dense', false, '3/4');
    // 3/4 at 90 BPM = 180 / 90 = 2.0s
    expect(metrics34.barDurationSeconds).toBeCloseTo(2.0, 2);
    expect(metrics34.targetSyllables).toBe(Math.round(5.5 * 2.0 * 0.85)); // 9

    const metrics68 = getBarMetrics(90, 'dense', false, '6/8');
    expect(metrics68.barDurationSeconds).toBeCloseTo(2.0, 2);
  });

  it('doubles bar duration and syllable capacity in Half-Time mode', () => {
    const normal = getBarMetrics(140, 'dense', false);
    const halfTime = getBarMetrics(140, 'dense', true);

    expect(halfTime.barDurationSeconds).toBeCloseTo(normal.barDurationSeconds * 2, 2);
    expect(halfTime.targetSyllables).toBeGreaterThanOrEqual(normal.targetSyllables * 2 - 1);
  });

  it('supports all four style presets', () => {
    const presets = Object.keys(STYLE_PRESETS) as (keyof typeof STYLE_PRESETS)[];
    presets.forEach((presetKey) => {
      const metrics = getBarMetrics(100, presetKey, false);
      expect(metrics.minSyllables).toBeLessThanOrEqual(metrics.targetSyllables);
      expect(metrics.targetSyllables).toBeLessThanOrEqual(metrics.maxSyllables);
      expect(metrics.stylePreset).toBe(presetKey);
    });
  });

  it('classifies syllable pocket statuses correctly', () => {
    const metrics = getBarMetrics(90, 'dense', false); // min: 11, target: 12, max: 15

    expect(getSyllablePocketStatus(0, metrics)).toBe('empty');
    expect(getSyllablePocketStatus(5, metrics)).toBe('open');
    expect(getSyllablePocketStatus(11, metrics)).toBe('locked');
    expect(getSyllablePocketStatus(13, metrics)).toBe('locked');
    expect(getSyllablePocketStatus(15, metrics)).toBe('locked');
    expect(getSyllablePocketStatus(18, metrics)).toBe('fast');
  });

  it('generates dynamic heat colors transitioning from white to green, yellow, orange, and red', () => {
    const metrics = getBarMetrics(90, 'dense', false); // min: 11, target: 12, max: 15
    const defaultColor = '#FFFFFF';

    // 0 syllables -> default white
    expect(getDensityHeatColor(0, metrics, defaultColor)).toBe(defaultColor);
    // 2 syllables (very low) -> default white
    expect(getDensityHeatColor(2, metrics, defaultColor)).toBe(defaultColor);
    // 8 syllables (approaching) -> mint green
    expect(getDensityHeatColor(8, metrics, defaultColor)).toBe('#34D399');
    // 12 syllables (in pocket target) -> solid green
    expect(getDensityHeatColor(12, metrics, defaultColor)).toBe('#10B981');
    // 13 syllables (moderate) -> yellow
    expect(getDensityHeatColor(13, metrics, defaultColor)).toBe('#FFFFFF');
    // 15 syllables (high near ceiling) -> orange
    expect(getDensityHeatColor(15, metrics, defaultColor)).toBe('#F97316');
    // 19 syllables (overcrowded) -> red
    expect(getDensityHeatColor(19, metrics, defaultColor)).toBe('#EF4444');
  });
});

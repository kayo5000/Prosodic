/**
 * cielabSoundCalibration.test.ts
 *
 * Test suite verifying Auditory Sound Frequency <-> CIELAB Color Space Calibration.
 * Evaluates against empirical data from:
 * - Anikin & Johansson (2019)
 * - Reymore & Lindsey (2025)
 * - Lindborg & Friberg (2015)
 * - TIERRA Mode A & Mode B Specifications
 */

import {
  labToRgb,
  rgbToLab,
  labToLch,
  lchToLab,
  deltaE76,
  deltaE2000,
  classifyVocalRegister,
  calibrateFrequencyToCielab,
  calibrateLyricFlowToCielab,
  calculateVocalBaselineDrift,
} from './cielabSoundCalibration';

describe('CIELAB <-> Sound Frequency Calibration Engine', () => {
  describe('Color Space Math & D65 Illuminant Conversions', () => {
    it('converts pure white and pure black accurately', () => {
      const white = labToRgb({ l: 100, a: 0, b: 0 });
      expect(white.hex).toBe('#FFFFFF');
      expect(white.r).toBe(255);
      expect(white.g).toBe(255);
      expect(white.b).toBe(255);

      const black = labToRgb({ l: 0, a: 0, b: 0 });
      expect(black.hex).toBe('#000000');
      expect(black.r).toBe(0);
      expect(black.g).toBe(0);
      expect(black.b).toBe(0);
    });

    it('round-trips between RGB and CIELAB with high precision', () => {
      const originalHex = '#E07A5F'; // Terra Cotta
      const lab = rgbToLab(originalHex);
      expect(lab.l).toBeGreaterThan(0);
      expect(lab.l).toBeLessThan(100);

      const rgb = labToRgb(lab);
      expect(rgb.hex).toBe(originalHex);
    });

    it('converts accurately between rectangular L*a*b* and cylindrical L*C*h°', () => {
      const lab = { l: 70, a: 0, b: 40 }; // Anikin Yellow
      const lch = labToLch(lab);

      expect(lch.l).toBe(70);
      expect(lch.c).toBe(40);
      expect(lch.h).toBeCloseTo(90, 0); // 90 degrees = positive b* (Yellow)

      const convertedBack = lchToLab(lch);
      expect(convertedBack.l).toBeCloseTo(lab.l, 1);
      expect(convertedBack.a).toBeCloseTo(lab.a, 1);
      expect(convertedBack.b).toBeCloseTo(lab.b, 1);
    });

    it('calculates Delta E metrics (CIE76 and CIEDE2000)', () => {
      const labA = { l: 50, a: 20, b: 20 };
      const labB = { l: 50, a: 20, b: 20 };
      expect(deltaE76(labA, labB)).toBe(0);
      expect(deltaE2000(labA, labB)).toBe(0);

      const labDifferent = { l: 65, a: 25, b: 35 };
      const dE76 = deltaE76(labA, labDifferent);
      const dE00 = deltaE2000(labA, labDifferent);

      expect(dE76).toBeGreaterThan(10);
      expect(dE00).toBeGreaterThan(5);
    });
  });

  describe('Anikin & Johansson (2019) Acoustic Benchmarks', () => {
    it('demonstrates higher F0 (pitch) maps to higher Lightness (L*)', () => {
      // Low F0 (135 Hz) vs High F0 (238 Hz) from Table 3 in Anikin (2019)
      const lowPitch = calibrateFrequencyToCielab({ f0Hz: 135, spectralCentroidHz: 1250 });
      const highPitch = calibrateFrequencyToCielab({ f0Hz: 238, spectralCentroidHz: 1250 });

      expect(highPitch.lab.l).toBeGreaterThan(lowPitch.lab.l);
    });

    it('demonstrates higher spectral centroid increases Lightness and Saturation', () => {
      // Low spectral centroid (911 Hz) vs High spectral centroid (2170 Hz)
      const lowCentroid = calibrateFrequencyToCielab({ f0Hz: 180, spectralCentroidHz: 911 });
      const highCentroid = calibrateFrequencyToCielab({ f0Hz: 180, spectralCentroidHz: 2170 });

      expect(highCentroid.lab.l).toBeGreaterThan(lowCentroid.lab.l);
      expect(highCentroid.lch.c).toBeGreaterThan(lowCentroid.lch.c);
    });

    it('demonstrates spectral energy > 800 Hz shifts hue toward Yellow (+b*)', () => {
      // Anikin & Hamilton-Fletcher rule: high frequency energy shifts to yellow
      const darkSpectrum = calibrateFrequencyToCielab({ f0Hz: 160, highFreqEnergyRatio: 0.1 });
      const brightSpectrum = calibrateFrequencyToCielab({ f0Hz: 160, highFreqEnergyRatio: 0.85 });

      expect(brightSpectrum.lab.b).toBeGreaterThan(0); // Yellow (+b*)
      expect(darkSpectrum.lab.b).toBeLessThan(0);   // Blue (-b*)
      expect(brightSpectrum.warmCoolIndex).toBeGreaterThan(darkSpectrum.warmCoolIndex);
    });

    it('demonstrates higher loudness increases chroma / visual saturation', () => {
      const quiet = calibrateFrequencyToCielab({ f0Hz: 220, loudnessDb: -36 });
      const loud = calibrateFrequencyToCielab({ f0Hz: 220, loudnessDb: -6 });

      expect(loud.lch.c).toBeGreaterThan(quiet.lch.c);
    });
  });

  describe('Reymore & Lindsey (2025) Instrumental Timbre & Register Benchmarks', () => {
    it('demonstrates monotonic Lightness increase across vocal/instrument registers (F2 -> F3 -> F4)', () => {
      // F2 = 87.3 Hz, F3 = 174.6 Hz, F4 = 349.2 Hz
      const f2 = calibrateFrequencyToCielab({ f0Hz: 87.3 });
      const f3 = calibrateFrequencyToCielab({ f0Hz: 174.6 });
      const f4 = calibrateFrequencyToCielab({ f0Hz: 349.2 });

      expect(classifyVocalRegister(75)).toBe('sub_bass');
      expect(f2.register).toBe('bass');
      expect(f3.register).toBe('baritone');
      expect(f4.register).toBe('alto');
      expect(classifyVocalRegister(1100)).toBe('whistle');

      expect(f3.lab.l).toBeGreaterThan(f2.lab.l);
      expect(f4.lab.l).toBeGreaterThan(f3.lab.l);
    });

    it('maps bright/nasal timbre (Trumpet/Violin) to warm (+a*, +b*) and mellow (Clarinet/Flute) to cool', () => {
      // Trumpet / Violin: high spectral centroid (~2600 Hz) with high energy ratio
      const trumpetTimbre = calibrateFrequencyToCielab({
        f0Hz: 350,
        spectralCentroidHz: 2600,
        highFreqEnergyRatio: 0.85,
      });

      // Clarinet / Flute: lower centroid (~750 Hz) with rounded fundamental
      const clarinetTimbre = calibrateFrequencyToCielab({
        f0Hz: 350,
        spectralCentroidHz: 750,
        highFreqEnergyRatio: 0.25,
      });

      expect(trumpetTimbre.warmCoolIndex).toBeGreaterThan(0.5); // Warm red/yellow
      expect(trumpetTimbre.lab.b).toBeGreaterThan(0);

      expect(clarinetTimbre.warmCoolIndex).toBeLessThan(0); // Cool blue
      expect(clarinetTimbre.lab.b).toBeLessThan(0);
    });
  });

  describe('TIERRA Mode A: Lyric Flow & Phonetic CIELAB Mapping', () => {
    it('maps Bouba (round vowels) to warm +a* and Kiki (sharp plosives) to cool -a*', () => {
      const bouba = calibrateLyricFlowToCielab({
        fluencyScore: 0.8,
        repetitionRate: 0.6,
        soundSymbolismScore: 0.9, // Round / Bouba
        rhymeDensity: 0.7,
        consonanceScore: 0.6,
      });

      const kiki = calibrateLyricFlowToCielab({
        fluencyScore: 0.8,
        repetitionRate: 0.6,
        soundSymbolismScore: -0.9, // Sharp / Kiki
        rhymeDensity: 0.7,
        consonanceScore: 0.6,
      });

      expect(bouba.lab.a).toBeGreaterThan(0); // Red / warm
      expect(kiki.lab.a).toBeLessThan(0);    // Green / cyan / sharp
    });

    it('maps high rhyme density to golden yellow (+b*) and unrhymed coda to blue (-b*)', () => {
      const highRhyme = calibrateLyricFlowToCielab({
        fluencyScore: 0.7,
        repetitionRate: 0.5,
        soundSymbolismScore: 0.0,
        rhymeDensity: 0.95,
        consonanceScore: 0.9,
      });

      const openUnrhymed = calibrateLyricFlowToCielab({
        fluencyScore: 0.7,
        repetitionRate: 0.5,
        soundSymbolismScore: 0.0,
        rhymeDensity: 0.0,
        consonanceScore: 0.1,
      });

      expect(highRhyme.lab.b).toBeGreaterThan(15);  // Yellow / Gold
      expect(openUnrhymed.lab.b).toBeLessThan(-15); // Cool open blue
    });

    it('quantifies sonic contrast between adjacent bars using Delta E without value judgement', () => {
      const bar1 = calibrateLyricFlowToCielab({
        fluencyScore: 0.9,
        repetitionRate: 0.8,
        soundSymbolismScore: 0.8,
        rhymeDensity: 0.9,
        consonanceScore: 0.8,
      });

      const bar2 = calibrateLyricFlowToCielab({
        fluencyScore: 0.3,
        repetitionRate: 0.1,
        soundSymbolismScore: -0.8,
        rhymeDensity: 0.1,
        consonanceScore: 0.2,
      });

      const barContrast = deltaE2000(bar1.lab, bar2.lab);
      expect(barContrast).toBeGreaterThan(25); // Clear visual color shift demonstrating sonic contrast
    });
  });

  describe('TIERRA Mode B: Baseline Drift Model', () => {
    const healthyBaseline = calibrateFrequencyToCielab({
      f0Hz: 196, // G3
      spectralCentroidHz: 1200,
      loudnessDb: -18,
      hnrDb: 24,
    }).lab;

    it('identifies tight baseline lock as stable', () => {
      const liveHealthy = calibrateFrequencyToCielab({
        f0Hz: 198,
        spectralCentroidHz: 1220,
        loudnessDb: -18,
        hnrDb: 23,
      }).lab;

      const report = calculateVocalBaselineDrift(liveHealthy, healthyBaseline);
      expect(report.driftState).toBe('stable');
      expect(report.deltaE).toBeLessThan(3.0);
    });

    it('identifies moderate pitch modulation as expressive drift', () => {
      const expressiveTake = calibrateFrequencyToCielab({
        f0Hz: 215, // Natural melodic run
        spectralCentroidHz: 1350,
        loudnessDb: -16,
        hnrDb: 22,
      }).lab;

      const report = calculateVocalBaselineDrift(expressiveTake, healthyBaseline);
      expect(report.driftState).toBe('expressive_drift');
      expect(report.deltaE).toBeGreaterThanOrEqual(3.0);
      expect(report.deltaE).toBeLessThan(10.0);
    });

    it('detects acoustic strain and pitch creep as strain shift', () => {
      // Moderate pitch creep and tension (F0 from 196 -> 218 Hz)
      const strainedTake = calibrateFrequencyToCielab({
        f0Hz: 218,
        spectralCentroidHz: 1420,
        loudnessDb: -15,
        hnrDb: 18,
      }).lab;

      const report = calculateVocalBaselineDrift(strainedTake, healthyBaseline);
      expect(report.driftState).toBe('strain_shift');
      expect(report.deltaE).toBeGreaterThanOrEqual(10.0);
      expect(report.deltaE).toBeLessThan(22.0);
      expect(report.deltaL).toBeGreaterThan(0); // Positive L* pitch creep
    });

    it('detects severe acoustic divergence as register break', () => {
      // Acute jump to high falsetto / break (F0 from 196 -> 380 Hz)
      const breakTake = calibrateFrequencyToCielab({
        f0Hz: 380,
        spectralCentroidHz: 2800,
        loudnessDb: -6,
        hnrDb: 10,
      }).lab;

      const report = calculateVocalBaselineDrift(breakTake, healthyBaseline);
      expect(report.driftState).toBe('register_break');
      expect(report.deltaE).toBeGreaterThanOrEqual(22.0);
    });
  });
});

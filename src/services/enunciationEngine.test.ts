import {
  generateWordEnunciations,
  phonemesToIpa,
  classifyRhymeFamilyId,
} from './enunciationEngine';

describe('enunciationEngine', () => {
  describe('phonemesToIpa & classifyRhymeFamilyId', () => {
    it('converts ARPABET to IPA symbols', () => {
      const ipa = phonemesToIpa(['P', 'ER1', 'S', 'IH0', 'V', 'IH1', 'R']);
      expect(ipa).toContain('ɜːr');
      expect(ipa).toContain('r');
    });

    it('classifies VR-Family for NEAR words like persevere / adhere', () => {
      const fam = classifyRhymeFamilyId(['P', 'ER0', 'S', 'EH0', 'V', 'IH1', 'R']);
      expect(fam.id).toBe(2);
      expect(fam.name).toBe('VR-Family (NEAR)');
    });

    it('classifies ER-Family for NURSE words', () => {
      const fam = classifyRhymeFamilyId(['HH', 'ER1', 'T']);
      expect(fam.id).toBe(1);
      expect(fam.name).toBe('ER-Family (NURSE)');
    });

    it('classifies AIR-Family for SQUARE words', () => {
      const fam = classifyRhymeFamilyId(['K', 'EH1', 'R']);
      expect(fam.id).toBe(3);
      expect(fam.name).toBe('AIR-Family (SQUARE)');
    });
  });

  describe('generateWordEnunciations', () => {
    it('generates multi-syllable delivery options for "persevere"', () => {
      const variants = generateWordEnunciations('persevere');
      expect(variants.length).toBeGreaterThanOrEqual(2);

      const standard = variants.find((v) => v.id === 'standard');
      expect(standard).toBeDefined();
      expect(standard?.label).toBe('Standard Rhotic');
      expect(standard?.rhymeFamilyId).toBe(2); // VR family
    });

    it('ranks VR-Family enunciation higher when surrounding context rhymes with "adhere"', () => {
      const variantsWithContext = generateWordEnunciations('persevere', {
        surroundingWords: ['adhere', 'clear'],
        dominantFamilyId: 2,
        activeVowelFamiliesInVerse: [2],
      });

      expect(variantsWithContext.length).toBeGreaterThan(0);
      const top = variantsWithContext[0];
      expect(top.rhymeFamilyId).toBe(2);
      expect(top.likelihoodScore).toBeGreaterThanOrEqual(0.9);
      expect(top.isRecommended).toBe(true);
      expect(top.contextMatchReason).toBeDefined();
    });

    it('generates Monophthongization and CCR variants for words like "grind" / "mind"', () => {
      const variants = generateWordEnunciations('grind');
      const ccr = variants.find((v) => v.id === 'aave_ccr');
      const mono = variants.find((v) => v.id === 'monophthong');

      expect(ccr || mono).toBeDefined();
    });

    it('generates Compressed syllable variant for multi-syllabic words like "probably"', () => {
      const variants = generateWordEnunciations('probably');
      const comp = variants.find((v) => v.id === 'compressed');
      expect(comp).toBeDefined();
    });

    it('sorts variants strictly in descending order of likelihoodScore', () => {
      const variants = generateWordEnunciations('persevere', {
        surroundingWords: ['adhere'],
        dominantFamilyId: 2,
      });

      for (let i = 0; i < variants.length - 1; i += 1) {
        expect(variants[i].likelihoodScore).toBeGreaterThanOrEqual(variants[i + 1].likelihoodScore);
      }
    });

    it('handles empty or special character strings gracefully', () => {
      expect(generateWordEnunciations('')).toEqual([]);
      expect(generateWordEnunciations('   ')).toEqual([]);
      expect(generateWordEnunciations('---')).toEqual([]);
    });
  });
});

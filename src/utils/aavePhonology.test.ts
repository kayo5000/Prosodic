import {
  aaveRhymeBridge,
  consonantClusterReduction,
  getAaveVariants,
  lookupWordPhonemesWithSlang,
  monophthongization,
  rVocalization,
} from './aavePhonology';

describe('AAVE Phonology & Hip-Hop Rhyme Bridge Engine', () => {
  describe('Rule 1: Consonant Cluster Reduction (CCR)', () => {
    it('reduces -ST cluster ("past" -> "pass")', () => {
      const past = ['P', 'AE1', 'S', 'T'];
      expect(consonantClusterReduction(past)).toEqual(['P', 'AE1', 'S']);
    });

    it('reduces -ND cluster ("hand" -> "han")', () => {
      const hand = ['HH', 'AE1', 'N', 'D'];
      expect(consonantClusterReduction(hand)).toEqual(['HH', 'AE1', 'N']);
    });

    it('reduces -LD cluster ("cold" -> "col")', () => {
      const cold = ['K', 'OW1', 'L', 'D'];
      expect(consonantClusterReduction(cold)).toEqual(['K', 'OW1', 'L']);
    });

    it('returns null for single final consonant ("cat")', () => {
      const cat = ['K', 'AE1', 'T'];
      expect(consonantClusterReduction(cat)).toBeNull();
    });
  });

  describe('Rule 2: Monophthongization (/AY/ -> /AA/)', () => {
    it('monophthongizes "time" (/T AY1 M/ -> /T AA1 M/)', () => {
      const time = ['T', 'AY1', 'M'];
      expect(monophthongization(time)).toEqual(['T', 'AA1', 'M']);
    });

    it('monophthongizes "mine" (/M AY1 N/ -> /M AA1 N/)', () => {
      const mine = ['M', 'AY1', 'N'];
      expect(monophthongization(mine)).toEqual(['M', 'AA1', 'N']);
    });

    it('returns null if no AY vowel present ("deep")', () => {
      const deep = ['D', 'IY1', 'P'];
      expect(monophthongization(deep)).toBeNull();
    });
  });

  describe('Rule 3: R-Vocalization (Postvocalic R-Deletion & ER -> AH)', () => {
    it('deletes postvocalic R in "more" (/M AO1 R/ -> /M AO1/)', () => {
      const more = ['M', 'AO1', 'R'];
      expect(rVocalization(more)).toEqual(['M', 'AO1']);
    });

    it('deletes postvocalic R in "here" (/HH IY1 R/ -> /HH IY1/)', () => {
      const here = ['HH', 'IY1', 'R'];
      expect(rVocalization(here)).toEqual(['HH', 'IY1']);
    });

    it('transforms ER into AH in "bird" (/B ER1 D/ -> /B AH1 D/)', () => {
      const bird = ['B', 'ER1', 'D'];
      expect(rVocalization(bird)).toEqual(['B', 'AH1', 'D']);
    });

    it('transforms ER into AH in "hurt" (/HH ER1 T/ -> /HH AH1 T/)', () => {
      const hurt = ['HH', 'ER1', 'T'];
      expect(rVocalization(hurt)).toEqual(['HH', 'AH1', 'T']);
    });
  });

  describe('Combinatorial Variant Generator', () => {
    it('generates multi-rule variants for "mind" (monophthong + CCR)', () => {
      const mind = ['M', 'AY1', 'N', 'D'];
      const variants = getAaveVariants(mind);

      const keys = variants.map((v) => v.join(' '));
      expect(keys).toContain('M AA1 N D'); // mono
      expect(keys).toContain('M AY1 N'); // ccr
      expect(keys).toContain('M AA1 N'); // combo
    });
  });

  describe('AAVE Rhyme Bridge Engine', () => {
    it('bridges "past" and "class" through CCR', () => {
      const past = ['P', 'AE1', 'S', 'T'];
      const classWord = ['K', 'L', 'AE1', 'S'];
      expect(aaveRhymeBridge(past, classWord)).toBe(true);
    });

    it('bridges "hand" and "man" through CCR', () => {
      const hand = ['HH', 'AE1', 'N', 'D'];
      const man = ['M', 'AE1', 'N'];
      expect(aaveRhymeBridge(hand, man)).toBe(true);
    });

    it('bridges "more" and "saw" through R-Vocalization', () => {
      const more = ['M', 'AO1', 'R'];
      const saw = ['S', 'AO1'];
      expect(aaveRhymeBridge(more, saw)).toBe(true);
    });

    it('bridges "hurt" and "cut" through ER -> AH vocalization', () => {
      const hurt = ['HH', 'ER1', 'T'];
      const cut = ['K', 'AH1', 'T'];
      expect(aaveRhymeBridge(hurt, cut)).toBe(true);
    });

    it('bridges "cold" and "soul" through CCR', () => {
      const cold = ['K', 'OW1', 'L', 'D'];
      const soul = ['S', 'OW1', 'L'];
      expect(aaveRhymeBridge(cold, soul)).toBe(true);
    });
  });

  describe('Slang & Hip-Hop Lexicon Lookups', () => {
    it('looks up "finna" in slang dictionary', () => {
      const res = lookupWordPhonemesWithSlang('finna');
      expect(res.source).toBe('slang_dictionary');
      expect(res.phonemes).toEqual(['F', 'IH1', 'N', 'AH0']);
    });

    it('looks up "skrrt" in slang dictionary', () => {
      const res = lookupWordPhonemesWithSlang('skrrt');
      expect(res.source).toBe('slang_dictionary');
      expect(res.phonemes).toEqual(['S', 'K', 'R', 'ER1', 'T']);
    });

    it('looks up "rizz" in slang dictionary', () => {
      const res = lookupWordPhonemesWithSlang('rizz');
      expect(res.source).toBe('slang_dictionary');
      expect(res.phonemes).toEqual(['R', 'IH1', 'Z']);
    });
  });
});

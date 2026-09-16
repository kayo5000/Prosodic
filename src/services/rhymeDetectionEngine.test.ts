import {
  analyzeVerseRhymes,
  classifyRFamily,
  codaConsonantSimilarity,
  extractRhymeCandidates,
  findRhymeGroups,
  getWordSyllables,
  rFamilyCompatible,
  syllableRhymeScore,
} from './rhymeDetectionEngine';

describe('RhymeDetectionEngine (Vetted Port of Python Suite)', () => {
  describe('Syllabification & Stress', () => {
    it('correctly syllabifies multisyllabic words with stress', () => {
      const sylls = getWordSyllables('reverse');
      expect(sylls.length).toBeGreaterThanOrEqual(2);
      expect(sylls.some((s) => s.isStressed)).toBe(true);
    });

    it('handles single-syllable slang and core words', () => {
      const sylls = getWordSyllables('turnt');
      expect(sylls.length).toBe(1);
      expect(sylls[0].isStressed).toBe(true);
    });
  });

  describe('R-Family Classification & Hard Gates', () => {
    it('classifies ER family (Class 1)', () => {
      expect(classifyRFamily(['ER1', 'S', 'T'])).toBe(1); // worst
      expect(classifyRFamily(['ER1', 'S'])).toBe(1); // curse
    });

    it('classifies VR family (Class 2)', () => {
      expect(classifyRFamily(['IH1', 'R', 'Z'])).toBe(2); // cheers
      expect(classifyRFamily(['IY1', 'R'])).toBe(2); // appear
    });

    it('classifies EH+R family (Class 3)', () => {
      expect(classifyRFamily(['EH1', 'R'])).toBe(3); // rare / stare
    });

    it('enforces hard gate: Class 1 (ER) is NEVER compatible with Class 2 (VR) or Class 3 (EH+R)', () => {
      expect(rFamilyCompatible(1, 1)).toBe(true);
      expect(rFamilyCompatible(2, 2)).toBe(true);
      expect(rFamilyCompatible(3, 3)).toBe(true);
      expect(rFamilyCompatible(2, 3)).toBe(true);
      expect(rFamilyCompatible(1, 2)).toBe(false); // ER vs VR blocked
      expect(rFamilyCompatible(1, 3)).toBe(false); // ER vs EHR blocked
      expect(rFamilyCompatible(0, 1)).toBe(true);
    });
  });

  describe('Syllable Rhyme Scoring', () => {
    it('gives 1.0 for exact rhyme units', () => {
      expect(syllableRhymeScore(['ER1', 'S', 'T'], ['ER1', 'S', 'T'])).toBe(1.0);
    });

    it('gives 0.88 for same nucleus with matching R-context', () => {
      const score = syllableRhymeScore(['ER1', 'N', 'T'], ['ER1', 'CH']); // turnt vs merch
      expect(score).toBe(0.88);
    });

    it('gives 0.0 for unrelated vowels', () => {
      expect(syllableRhymeScore(['AE1', 'T'], ['IY1', 'P'])).toBe(0.0);
    });
  });

  describe('Verse Rhyme Analysis (Multi-Line & Color Inheritance)', () => {
    const testVerse = [
      "And I swear that it's turnt",
      "It all begins with encore cheers",
      "From those wearin' my merch",
      "Fast forward through years of rehearsal",
      "Income streams nowhere near as diverse",
      "From hearin' the chirps and naysayers",
    ];

    it('only groups rhymes that span >= 2 distinct lines', () => {
      const result = analyzeVerseRhymes(testVerse);
      expect(result.rhymeGroups.length).toBeGreaterThan(0);

      // Verify every group spans at least 2 lines
      for (const group of result.rhymeGroups) {
        const lines = new Set(group.members.map((m) => m.lineIndex));
        expect(lines.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('assigns color_id = 0 (clean neutral white) to non-rhyming words', () => {
      const result = analyzeVerseRhymes(testVerse);
      // Words like "all", "begins", "income" are not part of the multi-line end rhymes
      const tokens = result.lineTokens;
      const allTokens = tokens.flat();
      const whiteTokens = allTokens.filter((t) => t.isWord && t.colorId === 0);
      expect(whiteTokens.length).toBeGreaterThan(0);
      expect(whiteTokens[0].color).toBe('#FFFFFF');
    });

    it('applies word-level color inheritance for multisyllabic rhyming words', () => {
      const result = analyzeVerseRhymes([
        "I was standing on the corner trying to reverse",
        "Everything they said about me being diverse",
      ]);

      expect(result.rhymeGroups.length).toBeGreaterThan(0);
      const reverseColor = result.wordColorMap.get('0:8'); // reverse (index 8)
      const diverseColor = result.wordColorMap.get('1:6'); // diverse (index 6)
      expect(reverseColor).toBeGreaterThan(0);
      expect(diverseColor).toBeGreaterThan(0);
      expect(reverseColor).toBe(diverseColor);
    });
  });

  describe('J. Cole - The Fall Off / R-Family Interlocking Rhyme Suite', () => {
    const jColeLyrics = [
      'I persevere through the worst',
      'My thirst to adhere is a curse',
    ];

    it('detects two distinct R-family groups without cross-contamination', () => {
      const result = analyzeVerseRhymes(jColeLyrics);
      expect(result.rhymeGroups.length).toBe(2);

      // Verify Group 1: VR Class 2 (persevere, adhere)
      const vrGroup = result.rhymeGroups.find((g) =>
        g.members.some((m) => m.cleanWord.toLowerCase() === 'adhere')
      );
      expect(vrGroup).toBeDefined();
      const vrWords = vrGroup!.members.map((m) => m.cleanWord.toLowerCase());
      expect(vrWords).toContain('adhere');
      expect(vrWords).toContain('persevere');
      expect(vrWords).not.toContain('worst');
      expect(vrWords).not.toContain('curse');

      // Verify Group 2: ER Class 1 (worst, thirst, curse)
      const erGroup = result.rhymeGroups.find((g) =>
        g.members.some((m) => m.cleanWord.toLowerCase() === 'worst')
      );
      expect(erGroup).toBeDefined();
      const erWords = erGroup!.members.map((m) => m.cleanWord.toLowerCase());
      expect(erWords).toContain('worst');
      expect(erWords).toContain('thirst');
      expect(erWords).toContain('curse');
      expect(erWords).not.toContain('adhere');
      expect(erWords).not.toContain('persevere');
    });

    it('generates discrete atomic syllable tokens in lineSyllables (never counting whole words)', () => {
      const result = analyzeVerseRhymes(jColeLyrics);
      expect(result.lineSyllables.length).toBe(2);

      // Line 0: "I persevere through the worst" -> 7 syllables
      const line0Sylls = result.lineSyllables[0];
      expect(line0Sylls.length).toBe(7);
      const line0Texts = line0Sylls.map((s) => s.text.toLowerCase());
      expect(line0Texts).toEqual(['i', 'per', 'se', 'vere', 'through', 'the', 'worst']);

      // Syllable indices and grid positions check
      expect(line0Sylls[1].word).toBe('persevere');
      expect(line0Sylls[1].syllableIndex).toBe(0);
      expect(line0Sylls[3].word).toBe('persevere');
      expect(line0Sylls[3].syllableIndex).toBe(2);
      expect(line0Sylls[3].colorId).toBe(line0Sylls[1].colorId); // word-level color inheritance

      // Line 1: "My thirst to adhere is a curse" -> 8 syllables
      const line1Sylls = result.lineSyllables[1];
      expect(line1Sylls.length).toBe(8);
      const line1Texts = line1Sylls.map((s) => s.text.toLowerCase());
      expect(line1Texts).toEqual(['my', 'thirst', 'to', 'ad', 'here', 'is', 'a', 'curse']);

      // 16-step sixteenth-note grid check
      line1Sylls.forEach((s) => {
        expect(s.gridPosition).toBeGreaterThanOrEqual(0);
        expect(s.gridPosition).toBeLessThanOrEqual(15);
      });
    });
  });

  describe('Slang & AAVE Phonetic Resolution', () => {
    it('decomposes hip-hop slang into exact syllables', () => {
      const slangTests = [
        { word: 'finna', expectedCount: 2 },
        { word: 'tryna', expectedCount: 2 },
        { word: 'boutta', expectedCount: 2 },
        { word: 'bussin', expectedCount: 2 },
        { word: 'skrrt', expectedCount: 1 },
        { word: 'opps', expectedCount: 1 },
        { word: 'turnt', expectedCount: 1 },
        { word: 'deadass', expectedCount: 2 },
        { word: 'nocap', expectedCount: 2 },
      ];

      slangTests.forEach(({ word, expectedCount }) => {
        const sylls = getWordSyllables(word);
        expect(sylls.length).toBe(expectedCount);
      });
    });

    it('bridges multiline slang rhymes seamlessly', () => {
      const slangVerse = [
        "We in the kitchen cookin' what they callin' bussin",
        "Ain't no discussion everybody always fussin",
      ];
      const result = analyzeVerseRhymes(slangVerse);
      expect(result.rhymeGroups.length).toBeGreaterThan(0);
      const bussinColor = result.wordColorMap.get('0:8'); // bussin (index 8)
      const fussinColor = result.wordColorMap.get('1:5'); // fussin (index 5)
      expect(bussinColor).toBeGreaterThan(0);
      expect(fussinColor).toBe(bussinColor);
    });
  });

  describe('Tight Coda Scoring & False Positive Rejection', () => {
    it('accurately scores homorganic voicing pairs as tight slant rhymes', () => {
      // T vs D voicing pair (e.g. cat vs bad)
      const voicingScore = codaConsonantSimilarity(['T'], ['D']);
      expect(voicingScore).toBeGreaterThanOrEqual(0.85);

      const rhymeScore = syllableRhymeScore(['AE1', 'T'], ['AE1', 'D']);
      expect(rhymeScore).toBeGreaterThanOrEqual(0.85);
    });

    it('accurately scores nasal class codas as tight slant rhymes', () => {
      // M vs N (e.g. time vs shine)
      const nasalScore = codaConsonantSimilarity(['M'], ['N']);
      expect(nasalScore).toBeGreaterThanOrEqual(0.80);

      const rhymeScore = syllableRhymeScore(['AY1', 'M'], ['AY1', 'N']);
      expect(rhymeScore).toBeGreaterThanOrEqual(0.80);
    });

    it('strictly rejects unrelated clashing codas with the same vowel to prevent false clustering', () => {
      // T vs N (cat vs man) -> unrelated manner of articulation
      const clashingScore = codaConsonantSimilarity(['T'], ['N']);
      expect(clashingScore).toBeLessThan(0.75);

      const syllableScore = syllableRhymeScore(['AE1', 'T'], ['AE1', 'N']);
      expect(syllableScore).toBeLessThan(0.75); // Strictly below 0.75 threshold
    });

    it('rejects unrelated words like cat and man from grouping together in verses', () => {
      const unrelatedVerse = [
        'The quick cat',
        'A single man',
      ];
      const result = analyzeVerseRhymes(unrelatedVerse);
      // "cat" and "man" must NOT form a rhyme group
      expect(result.rhymeGroups).toHaveLength(0);
    });
  });

  describe('Cross-Bar Rhyme & Flow Anacrusis Detection', () => {
    it('detects cross-bar pickup phrases spanning across bar boundaries', () => {
      const biggieLyrics = [
        'Dead right you know that they be lurkin',
        'Lurkin in the dark until the clock is workin',
      ];
      const result = analyzeVerseRhymes(biggieLyrics);
      expect(result.rhymeGroups.length).toBeGreaterThan(0);
      expect(result.crossBarPhrases.length).toBeGreaterThan(0);

      const phrase = result.crossBarPhrases[0];
      expect(phrase.fromLineIndex).toBe(0);
      expect(phrase.toLineIndex).toBe(1);
      expect(phrase.isPickupAnacrusis).toBe(true);
    });
  });
});



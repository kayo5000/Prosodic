import {
  dissectLyrics,
  extractVowelFamily,
  VOWEL_FAMILIES,
  classifyRhymePair,
  isSelfRhyme,
} from './dissector';
import {
  dissectLineIntoSyllableTokens,
  getWordSyllableCharRanges,
} from './perceptualFamilies';

describe('Forensic Lyrics Dissector Engine', () => {
  describe('extractVowelFamily', () => {
    it('classifies AY family words correctly', () => {
      expect(extractVowelFamily('rhyme')).toBe('AY_FAMILY');
      expect(extractVowelFamily('fly')).toBe('AY_FAMILY');
      expect(extractVowelFamily('night')).toBe('AY_FAMILY');
      expect(extractVowelFamily('mind')).toBe('AY_FAMILY');
    });

    it('classifies EE family words correctly', () => {
      expect(extractVowelFamily('deep')).toBe('EE_FAMILY');
      expect(extractVowelFamily('scheme')).toBe('EE_FAMILY');
      expect(extractVowelFamily('dream')).toBe('EE_FAMILY');
      expect(extractVowelFamily('see')).toBe('EE_FAMILY');
    });

    it('classifies OH family words correctly', () => {
      expect(extractVowelFamily('flow')).toBe('OH_FAMILY');
      expect(extractVowelFamily('tone')).toBe('OH_FAMILY');
      expect(extractVowelFamily('know')).toBe('OH_FAMILY');
    });

    it('classifies words with diacritics without losing characters', () => {
      expect(extractVowelFamily('café')).toBe('EY_FAMILY');
      expect(extractVowelFamily('fiancé')).toBe('EY_FAMILY');
    });

    it('has all 12 vowel families registered', () => {
      expect(Object.keys(VOWEL_FAMILIES).length).toBeGreaterThanOrEqual(12);
    });

    it('separates rhotic R families into distinct Wells lexical sets', () => {
      // AIR_FAMILY (SQUARE)
      expect(extractVowelFamily('care')).toBe('AIR_FAMILY');
      expect(extractVowelFamily('share')).toBe('AIR_FAMILY');
      expect(extractVowelFamily('stare')).toBe('AIR_FAMILY');
      expect(extractVowelFamily('air')).toBe('AIR_FAMILY');

      // EER_FAMILY (NEAR)
      expect(extractVowelFamily('clear')).toBe('EER_FAMILY');
      expect(extractVowelFamily('hear')).toBe('EER_FAMILY');
      expect(extractVowelFamily('near')).toBe('EER_FAMILY');
      expect(extractVowelFamily('fear')).toBe('EER_FAMILY');

      // AR_FAMILY (START)
      expect(extractVowelFamily('car')).toBe('AR_FAMILY');
      expect(extractVowelFamily('hard')).toBe('AR_FAMILY');
      expect(extractVowelFamily('dark')).toBe('AR_FAMILY');
      expect(extractVowelFamily('star')).toBe('AR_FAMILY');

      // OR_FAMILY (NORTH/FORCE)
      expect(extractVowelFamily('more')).toBe('OR_FAMILY');
      expect(extractVowelFamily('door')).toBe('OR_FAMILY');
      expect(extractVowelFamily('floor')).toBe('OR_FAMILY');
      expect(extractVowelFamily('store')).toBe('OR_FAMILY');

      // ER_FAMILY (NURSE)
      expect(extractVowelFamily('burn')).toBe('ER_FAMILY');
      expect(extractVowelFamily('verse')).toBe('ER_FAMILY');
      expect(extractVowelFamily('word')).toBe('ER_FAMILY');
      expect(extractVowelFamily('first')).toBe('ER_FAMILY');
    });
  });

  describe('dissectLyrics', () => {
    it('performs full forensic dissection on an iconic verse', () => {
      const verse = `I grab the mic and spit a syllable scheme
Never miss a beat inside the machine
The flow is cold and my tone is supreme
Living out the dream inside of the cream`;

      const analysis = dissectLyrics(verse, 90, '4/4', 'Test Verse');

      expect(analysis.totalBars).toBe(4);
      expect(analysis.totalSyllables).toBeGreaterThan(30);
      expect(analysis.averageSps).toBeGreaterThan(2.0);
      expect(analysis.complexityScore).toBeGreaterThanOrEqual(50);
      expect(analysis.dominantVowelFamily).toBe('EE_FAMILY');
      expect(analysis.rhymeChainCount).toBeGreaterThanOrEqual(1);

      // Verify line details
      expect(analysis.lines).toHaveLength(4);
      expect(analysis.lines[0].words.length).toBeGreaterThan(0);
      expect(analysis.lines[0].sps).toBeGreaterThan(0);
    });

    it('detects alliteration correctly', () => {
      const verse = `Peter piper picked a pack of peppers`;
      const analysis = dissectLyrics(verse, 90, '4/4');

      const alliterations = analysis.devices.filter((d) => d.type === 'Alliteration');
      expect(alliterations.length).toBeGreaterThan(0);
      expect(alliterations[0].title).toContain('/P/');
    });

    it('detects anaphora across consecutive lines', () => {
      const verse = `Every time I drop a rhyme they listen
Every time I speak the diamonds glisten`;
      const analysis = dissectLyrics(verse, 90, '4/4');

      const anaphora = analysis.devices.filter((d) => d.type === 'Anaphora');
      expect(anaphora.length).toBeGreaterThan(0);
      expect(anaphora[0].words[0].toLowerCase()).toBe('every');
    });

    it('detects anadiplosis loop between lines', () => {
      const verse = `I climb to the peak of the mountain
Mountain high where the waters fountain`;
      const analysis = dissectLyrics(verse, 90, '4/4');

      const anadiplosis = analysis.devices.filter((d) => d.type === 'Anadiplosis');
      expect(anadiplosis.length).toBeGreaterThan(0);
    });

    it('calculates internal rhyme density, multisyllabic depth, and enjambment rate', () => {
      const verse = `I hold the gold and fold the cold and bold
And keep the heat inside the street you see and
We run the fun until the sun is done.`;

      const analysis = dissectLyrics(verse, 90, '4/4');
      expect(analysis.internalRhymeDensity).toBeGreaterThan(0);
      expect(analysis.enjambmentRate).toBeGreaterThan(0);
      expect(analysis.compoundMultisyllabicDepth).toBeGreaterThan(0);
    });
  });

  describe('classifyRhymePair', () => {
    it('identifies PERFECT rhymes', () => {
      expect(classifyRhymePair('mind', 'blind')).toBe('PERFECT');
      expect(classifyRhymePair('gold', 'cold')).toBe('PERFECT');
      expect(classifyRhymePair('scheme', 'scheme')).toBe('PERFECT');
    });

    it('identifies SLANT / AAVE rhymes', () => {
      expect(classifyRhymePair('past', 'class')).toBe('SLANT');
      expect(classifyRhymePair('time', 'calm')).toBe('SLANT');
    });

    it('identifies FAMILY and NEAR rhymes', () => {
      expect(classifyRhymePair('home', 'stone')).toBe('NEAR');
      expect(classifyRhymePair('deep', 'feel')).toBe('FAMILY');
    });

    it('identifies disparate words as NONE', () => {
      expect(classifyRhymePair('cat', 'blue')).toBe('NONE');
    });

    it('prevents false rhyme collisions across different rhotic families', () => {
      // Intra-family rhymes should pass
      expect(classifyRhymePair('care', 'share')).toBe('PERFECT');
      expect(classifyRhymePair('clear', 'near')).toBe('PERFECT');
      expect(classifyRhymePair('car', 'star')).toBe('PERFECT');
      expect(classifyRhymePair('more', 'door')).toBe('PERFECT');
      expect(classifyRhymePair('burn', 'turn')).toBe('PERFECT');

      // Inter-family rhotic words must NEVER falsely rhyme
      expect(classifyRhymePair('care', 'clear')).toBe('NONE'); // AIR vs EER
      expect(classifyRhymePair('car', 'door')).toBe('NONE'); // AR vs OR
      expect(classifyRhymePair('burn', 'far')).toBe('NONE'); // ER vs AR
      expect(classifyRhymePair('stare', 'steer')).toBe('NONE'); // AIR vs EER
    });
  });

  describe('Cross-Bar Words & Cross-Bar Rhymes', () => {
    it('detects hyphenated cross-bar word straddles with accurate syllable split', () => {
      const verse = `I put my cash in a de-
posit so the balance grows`;
      const analysis = dissectLyrics(verse, 90, '4/4');

      expect(analysis.crossBarWords.length).toBeGreaterThan(0);
      const straddle = analysis.crossBarWords.find((w) => w.fullWord === 'deposit');
      expect(straddle).toBeDefined();
      expect(straddle?.leadingFragment).toBe('de');
      expect(straddle?.trailingFragment).toBe('posit');
      expect(straddle?.fromBar).toBe(1);
      expect(straddle?.toBar).toBe(2);
      expect(straddle?.leadingSyllables).toBe(1);
      expect(straddle?.trailingSyllables).toBe(2);
      expect(straddle?.type).toBe('hyphenated_straddle');
    });

    it('detects inline barline markers (pipe and slash) inside words', () => {
      const verse = `I put my money in a de|posit so the balance grows
And never let it turn to ac/cident on the road`;
      const analysis = dissectLyrics(verse, 90, '4/4');

      expect(analysis.crossBarWords.length).toBeGreaterThanOrEqual(2);
      const deposit = analysis.crossBarWords.find((w) => w.fullWord === 'deposit');
      expect(deposit?.leadingSyllables).toBe(1);
      expect(deposit?.trailingSyllables).toBe(2);
      expect(deposit?.type).toBe('barline_marker');

      const accident = analysis.crossBarWords.find((w) => w.fullWord === 'accident');
      expect(accident?.leadingSyllables).toBe(1);
      expect(accident?.trailingSyllables).toBe(2);
      expect(accident?.type).toBe('barline_marker');
    });

    it('detects cross-bar rhymes linking bar coda pickup to next bar onset', () => {
      const verse = `I keep all the cash inside my pocket
Lock it down and never drop it`;
      const analysis = dissectLyrics(verse, 90, '4/4');

      expect(analysis.crossBarRhymes.length).toBeGreaterThan(0);
      const crossRhyme = analysis.crossBarRhymes.find(
        (r) => r.fromWord.toLowerCase().includes('pocket') && r.toWord.toLowerCase().includes('lock'),
      );
      expect(crossRhyme).toBeDefined();
      expect(analysis.crossBarWeaveDensity).toBeGreaterThan(0);
    });

    it('faithfully enforces the R-family gate on the ground-truth test verse', () => {
      const verse = `I perceived through the worst
My thirst to adhere is a curse
My life I see it in reverse`;

      const analysis = dissectLyrics(verse, 90, '4/4');

      // Line 1: 'perceived' must be EE_FAMILY, 'worst' is ER_FAMILY
      const line1 = analysis.lines[0];
      const perceived = line1.words.find((w) => w.word.toLowerCase() === 'perceived');
      const worst = line1.words.find((w) => w.word.toLowerCase() === 'worst');
      expect(perceived?.vowelFamily).toBe('EE_FAMILY');
      expect(worst?.vowelFamily).toBe('ER_FAMILY');

      // Line 2: 'thirst' and 'curse' are ER_FAMILY, 'adhere' MUST be EER_FAMILY
      const line2 = analysis.lines[1];
      const thirst = line2.words.find((w) => w.word.toLowerCase() === 'thirst');
      const adhere = line2.words.find((w) => w.word.toLowerCase() === 'adhere');
      const curse = line2.words.find((w) => w.word.toLowerCase() === 'curse');
      expect(thirst?.vowelFamily).toBe('ER_FAMILY');
      expect(curse?.vowelFamily).toBe('ER_FAMILY');
      expect(adhere?.vowelFamily).toBe('EER_FAMILY');

      // Line 3: 'see' is EE_FAMILY, 'reverse' is ER_FAMILY
      const line3 = analysis.lines[2];
      const see = line3.words.find((w) => w.word.toLowerCase() === 'see');
      const reverse = line3.words.find((w) => w.word.toLowerCase() === 'reverse');
      expect(see?.vowelFamily).toBe('EE_FAMILY');
      expect(reverse?.vowelFamily).toBe('ER_FAMILY');

      // Strict Invariant: 'adhere' (EER_FAMILY) CANNOT be in the same rhyme group as 'worst', 'thirst', 'curse', 'reverse'
      expect(adhere?.rhymeGroup).not.toBe(worst?.rhymeGroup);
      expect(adhere?.rhymeGroup).not.toBe(curse?.rhymeGroup);
      expect(thirst?.rhymeGroup).toBe(curse?.rhymeGroup);
      expect(worst?.rhymeGroup).toBe(curse?.rhymeGroup);
      expect(reverse?.rhymeGroup).toBe(curse?.rhymeGroup);
    });

    it('guards against self-rhymes and case/spelling variants', () => {
      expect(isSelfRhyme('Money', 'money')).toBe(true);
      expect(isSelfRhyme("runnin'", 'Running')).toBe(true);
      expect(isSelfRhyme('now', 'Now')).toBe(true);
      expect(isSelfRhyme('money', 'honey')).toBe(false);
    });
  });

  describe('Syllable-Level Rhyme Mapping Engine (domain/syllable_engine.py)', () => {
    it('splits words into precise character ranges per syllable', () => {
      // 1-syllable word
      expect(getWordSyllableCharRanges('bars', 1)).toEqual([[0, 4]]);

      // 2-syllable word: 'stressing' -> stres (0-5) / sing (5-9)
      const ranges = getWordSyllableCharRanges('stressing', 2);
      expect(ranges.length).toBe(2);
      expect('stressing'.slice(ranges[0][0], ranges[0][1])).toBe('stres');
      expect('stressing'.slice(ranges[1][0], ranges[1][1])).toBe('sing');

      // 3-syllable word: 'persevered' -> per / sev / ered
      const pRanges = getWordSyllableCharRanges('persevered', 3);
      expect(pRanges.length).toBe(3);
      expect('persevered'.slice(pRanges[0][0], pRanges[0][1])).toBe('per');
      expect('persevered'.slice(pRanges[1][0], pRanges[1][1])).toBe('sev');
      expect('persevered'.slice(pRanges[2][0], pRanges[2][1])).toBe('ered');
    });

    it('dissects lyric lines into colored syllable tokens', () => {
      const line = "And though I'm blessed I seen you stressin'";
      const tokens = dissectLineIntoSyllableTokens(line);

      expect(tokens.length).toBeGreaterThan(0);
      const wordTokens = tokens.filter((t) => t.isWord);

      // Verify each syllable has a valid vowel family and signature color
      wordTokens.forEach((token) => {
        expect(token.vowelFamily).toBeDefined();
        expect(token.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      // Syllables in 'stressin' should be classified into respective families
      const stressinSyllables = wordTokens.filter((t) =>
        ['stres', "sin'", 'sin'].includes(t.text.toLowerCase()),
      );
      expect(stressinSyllables.length).toBe(2);
    });

    it('classifies distinct syllables within the same multisyllabic word to different vowel families', () => {
      // 'persevered': 'per' (ER_FAMILY), 'se' (EH_FAMILY), 'vered' (EER_FAMILY)
      const tokens = dissectLineIntoSyllableTokens('persevered');
      const wordTokens = tokens.filter((t) => t.isWord);

      expect(wordTokens.length).toBe(3);
      expect(wordTokens[0].vowelFamily).toBe('ER_FAMILY');
      expect(wordTokens[0].color).toBe(VOWEL_FAMILIES.ER_FAMILY.color);
    });

    it('faithfully preserves text reconstruction and non-word characters', () => {
      const line = "Losin', winnin', bank account thinnin'";
      const tokens = dissectLineIntoSyllableTokens(line);
      const reconstructed = tokens.map((t) => t.text).join('');
      expect(reconstructed).toBe(line);
    });
  });
});




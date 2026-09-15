import {
  analyzeTrackUnified,
  detectRhetoricalDevices,
  classifyGenreAndStyle,
} from './unifiedSongEngine';

describe('Unified Song Engine & Rhetorical Device Classifier', () => {
  describe('Structural Repetition & Rhetorical Figures', () => {
    it('detects Epizeuxis (immediate adjacent word repetition)', () => {
      const lyrics = `Wait wait hold up let me speak`;
      const devices = detectRhetoricalDevices(lyrics);
      const epizeuxis = devices.filter((d) => d.device === 'Epizeuxis');

      expect(epizeuxis.length).toBeGreaterThan(0);
      expect(epizeuxis[0].matchedText).toContain('wait wait');
      expect(epizeuxis[0].authority).toBe('PurdueOWL');
    });

    it('detects Diacope (repetition with intervening phrase)', () => {
      const lyrics = `Run baby run through the night`;
      const devices = detectRhetoricalDevices(lyrics);
      const diacope = devices.filter((d) => d.device === 'Diacope');

      expect(diacope.length).toBeGreaterThan(0);
      expect(diacope[0].matchedText).toContain('run baby run');
    });

    it('detects Epanalepsis (first word matches last word in same bar)', () => {
      const lyrics = `King of the city becoming the King`;
      const devices = detectRhetoricalDevices(lyrics);
      const epanalepsis = devices.filter((d) => d.device === 'Epanalepsis');

      expect(epanalepsis.length).toBeGreaterThan(0);
    });

    it('detects Chiasmus (A-B-B-A inverted syntactic pattern)', () => {
      const lyrics = `Mind on money money on mind`;
      const devices = detectRhetoricalDevices(lyrics);
      const chiasmus = devices.filter((d) => d.device === 'Chiasmus');

      expect(chiasmus.length).toBeGreaterThan(0);
      expect(chiasmus[0].authority).toBe('ForsythCore');
    });

    it('detects Anaphora across consecutive lines', () => {
      const lyrics = `Every time I drop a rhyme they listen
Every time I speak the diamonds glisten`;
      const devices = detectRhetoricalDevices(lyrics);
      const anaphora = devices.filter((d) => d.device === 'Anaphora');

      expect(anaphora.length).toBeGreaterThan(0);
      expect(anaphora[0].matchedText).toContain('every');
    });

    it('detects Epistrophe across consecutive lines', () => {
      const lyrics = `I want to win tonight
She wants to win tonight`;
      const devices = detectRhetoricalDevices(lyrics);
      const epistrophe = devices.filter((d) => d.device === 'Epistrophe');

      expect(epistrophe.length).toBeGreaterThan(0);
      expect(epistrophe[0].matchedText).toContain('tonight');
    });

    it('detects Anadiplosis across consecutive lines', () => {
      const lyrics = `I climb to the peak of the mountain
Mountain high where the waters fountain`;
      const devices = detectRhetoricalDevices(lyrics);
      const anadiplosis = devices.filter((d) => d.device === 'Anadiplosis');

      expect(anadiplosis.length).toBeGreaterThan(0);
      expect(anadiplosis[0].matchedText).toContain('mountain');
    });
  });

  describe('Phonetic, Tropes & Rhythmic Figures', () => {
    it('detects Alliteration (3+ consonant hits)', () => {
      const lyrics = `Peter piper picked a pepper`;
      const devices = detectRhetoricalDevices(lyrics);
      const alliteration = devices.filter((d) => d.device === 'Alliteration');

      expect(alliteration.length).toBeGreaterThan(0);
      expect(alliteration[0].authority).toBe('OwlEyes');
    });

    it('detects Consonance (3+ terminal coda consonant hits)', () => {
      const lyrics = `The black duck fell on the pack`;
      const devices = detectRhetoricalDevices(lyrics);
      const consonance = devices.filter((d) => d.device === 'Consonance');

      expect(consonance.length).toBeGreaterThan(0);
      expect(consonance[0].matchedText).toContain('black');
      expect(consonance[0].matchedText).toContain('duck');
      expect(consonance[0].matchedText).toContain('pack');
      expect(consonance[0].authority).toBe('OwlEyes');
    });

    it('detects Tricolon (3 parallel clauses)', () => {
      const lyrics = `I came, I saw, I conquered`;
      const devices = detectRhetoricalDevices(lyrics);
      const tricolon = devices.filter((d) => d.device === 'Tricolon');

      expect(tricolon.length).toBeGreaterThan(0);
    });

    it('detects Litotes (negation + negative adjective)', () => {
      const lyrics = `This flow is not bad for a rookie`;
      const devices = detectRhetoricalDevices(lyrics);
      const litotes = devices.filter((d) => d.device === 'Litotes');

      expect(litotes.length).toBeGreaterThan(0);
      expect(litotes[0].matchedText).toContain('not bad');
    });

    it('detects Synaesthesia (cross-sensory modifier)', () => {
      const lyrics = `Spitting a cold rhythm under bright neon`;
      const devices = detectRhetoricalDevices(lyrics);
      const synaesthesia = devices.filter((d) => d.device === 'Synaesthesia');

      expect(synaesthesia.length).toBeGreaterThan(0);
      expect(synaesthesia[0].matchedText).toContain('cold rhythm');
    });

    it('detects Polysyndeton (multiple conjunctions)', () => {
      const lyrics = `I got money and power and fame and respect`;
      const devices = detectRhetoricalDevices(lyrics);
      const polysyndeton = devices.filter((d) => d.device === 'Polysyndeton');

      expect(polysyndeton.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Genre Taxonomy & Scoring Matrix', () => {
  /**
   * The best-scoring genre, regardless of whether the engine committed to it.
   *
   * These tests previously asserted `primaryGenre` directly, which passed only
   * because the old classifier always forced a single label. At 140 BPM / 5.5
   * SPS with no rhetorical devices, Southern Trap and UK/NY Drill both score
   * exactly 75 — they are genuinely indistinguishable on tempo and cadence
   * alone, and the old code broke the tie by array order and reported it at
   * 65%+ confidence. Ranking is still asserted here; committing is asserted
   * separately.
   */
  const topGenre = (r: { genre: { candidates: { name: string }[] } }): string =>
    r.genre.candidates[0]?.name ?? '';

    it('classifies Boom Bap Golden Era accurately (90 BPM, 5.0 SPS)', () => {
      const result = classifyGenreAndStyle(90, 5.0, [
        {
          barIndex: 1,
          device: 'Anadiplosis',
          matchedText: 'test',
          definition: '',
          authority: 'ForsythCore',
          confidence: 0.9,
        },
      ]);

      expect(topGenre(result)).toContain('Boom Bap');
      expect(result.genre.candidates[0].macro).toBe('Hip-Hop');
      expect(result.genre.candidates[0].era).toBe('Golden/Classic Era');
      if (result.genre.verdict === 'single') {
        expect(result.performance.pocketTendency).toBe('locked');
      } else {
        expect(result.performance.pocketTendency).toBeNull();
      }
    });

    it('classifies Southern Trap accurately (140 BPM, 5.5 SPS)', () => {
      const result = classifyGenreAndStyle(140, 5.5, [
        {
          barIndex: 1,
          device: 'Epizeuxis',
          matchedText: 'yeah yeah',
          definition: '',
          authority: 'PurdueOWL',
          confidence: 0.95,
        },
      ]);

      expect(topGenre(result)).toContain('Southern Trap');
      expect(result.genre.candidates[0].macro).toBe('Hip-Hop');
      expect(result.performance.vocalStyle).toBe('Staccato Choppy');
    });

    it('classifies Chopper Speed Flow accurately (150 BPM, 9.5 SPS)', () => {
      const result = classifyGenreAndStyle(150, 9.5, [
        {
          barIndex: 1,
          device: 'Alliteration',
          matchedText: 'rapid flow',
          definition: '',
          authority: 'OwlEyes',
          confidence: 0.88,
        },
      ]);

      expect(topGenre(result)).toContain('Chopper');
      expect(result.performance.vocalStyle).toBe('Double-Time');
    });

    it('classifies Neo-Soul accurately (80 BPM, 3.2 SPS)', () => {
      const result = classifyGenreAndStyle(80, 3.2, [
        {
          barIndex: 1,
          device: 'Synaesthesia',
          matchedText: 'sweet sound',
          definition: '',
          authority: 'OwlEyes',
          confidence: 0.89,
        },
      ]);

      expect(topGenre(result)).toContain('Neo-Soul');
      expect(result.genre.candidates[0].macro).toBe('R&B');
      // Null unless the engine committed to one genre — it is copied from the
      // matched profile, so a plural verdict has no profile to copy from.
      if (result.genre.verdict === 'single') {
        expect(result.performance.pocketTendency).toBe('laid_back');
      } else {
        expect(result.performance.pocketTendency).toBeNull();
      }
    });

    it('classifies Quiet Storm accurately (70 BPM, 1.8 SPS)', () => {
      const result = classifyGenreAndStyle(70, 1.8, []);

      expect(topGenre(result)).toContain('Quiet Storm');
      expect(result.genre.candidates[0].macro).toBe('R&B');
      expect(result.performance.vocalStyle).toBe('Falsetto/Breathy');
      expect(result.performance.breathManagementScore).toBe('Spacious/Open');
    });

    it('classifies New Jack Swing accurately (108 BPM, 4.2 SPS)', () => {
      const result = classifyGenreAndStyle(108, 4.2, [
        {
          barIndex: 1,
          device: 'Epizeuxis',
          matchedText: 'swing it swing it',
          definition: '',
          authority: 'PurdueOWL',
          confidence: 0.95,
        },
      ]);

      expect(topGenre(result)).toContain('New Jack Swing');
      expect(result.genre.candidates[0].macro).toBe('Hip-Hop/R&B Hybrid');
    });

    it('refuses to commit when two genres are indistinguishable', () => {
      // Trap (125-165 BPM, 4.0-6.5 SPS) and Drill (138-148, 4.5-6.5) both sit
      // dead centre here. No device evidence, so nothing separates them.
      const result = classifyGenreAndStyle(140, 5.5, []);

      expect(result.genre.verdict).toBe('plural');
      expect(result.genre.primaryGenre).toBeNull();
      expect(result.genre.reason).toBe('traits_of_several_genres');
      const names = result.genre.candidates.map((c) => c.name);
      expect(names).toContain('Southern Trap');
      expect(names).toContain('UK / NY Drill');
    });

    it('commits once evidence genuinely separates the candidates', () => {
      // Boom Bap's preferred devices (Anadiplosis, Tricolon, Chiasmus) are not
      // shared by the profiles nearest it on tempo and cadence, so this is a
      // case where the evidence really does pick one. Trap vs Drill is not —
      // they overlap on tempo, cadence AND devices, which is why the test
      // above stays plural no matter how much device evidence it is given.
      const result = classifyGenreAndStyle(90, 5.0, [
        { barIndex: 1, device: 'Anadiplosis', matchedText: 'a', definition: '', authority: 'PurdueOWL', confidence: 0.9 },
        { barIndex: 2, device: 'Tricolon', matchedText: 'b', definition: '', authority: 'PurdueOWL', confidence: 0.9 },
        { barIndex: 3, device: 'Chiasmus', matchedText: 'c', definition: '', authority: 'PurdueOWL', confidence: 0.9 },
        { barIndex: 4, device: 'Assonance', matchedText: 'd', definition: '', authority: 'PurdueOWL', confidence: 0.9 },
      ]);

      expect(result.genre.verdict).toBe('single');
      expect(result.genre.primaryGenre).toContain('Boom Bap');
      expect(result.genre.reason).toBeNull();
      expect(result.genre.confidenceScore).toBe(1);
    });

    it('never reports a genre with no signal at all', () => {
      const result = classifyGenreAndStyle(null, 0, []);

      expect(result.genre.verdict).toBe('not_measurable');
      expect(result.genre.primaryGenre).toBeNull();
      expect(result.genre.confidenceScore).toBeNull();
      expect(result.genre.reason).toBe('no_signal');
      expect(result.performance.pocketTendency).toBeNull();
    });

    it('caps confidence when no tempo was ever set', () => {
      // 40 of the 100 points come from tempo. Never earning them must lower
      // the ceiling, not be normalised away.
      const result = classifyGenreAndStyle(null, 5.5, []);

      expect(result.genre.signals.tempo).toBe(false);
      expect(result.genre.confidenceScore).not.toBeNull();
      expect(result.genre.confidenceScore as number).toBeLessThanOrEqual(0.6);
      expect(result.genre.reason).toBe('traits_of_several_genres_no_tempo');
    });
  });

  describe('analyzeTrackUnified (Full Pipeline)', () => {
    it('produces structured TrackAnalysisReport conforming to the exact interface', () => {
      const verse = `I grab the microphone, I spit the rhythm, I take control
Every time I speak they feel the power deep in the soul
Soul moving fast and the cadence is not bad at all
Spitting a cold rhythm until the final curtain fall`;

      const report = analyzeTrackUnified(verse, 92);

      expect(report.trackMeta.bpm).toBe(92);
      expect(report.trackMeta.barCount).toBe(4);
      expect(report.trackMeta.averageSPS).toBeGreaterThan(2.0);

      // Detected devices
      expect(report.detectedDevices.length).toBeGreaterThan(0);

      // Genre classification
      expect(report.genreClassification.primaryGenre).toBeDefined();
      expect(report.genreClassification.macroCategory).toBeDefined();
      expect(report.genreClassification.confidenceScore).toBeGreaterThan(0.5);
      expect(report.genreClassification.era).toBeDefined();

      // Performance metrics
      expect(report.performanceMetrics.pocketTendency).toBeDefined();
      expect(report.performanceMetrics.vocalStyle).toBeDefined();
      expect(report.performanceMetrics.breathManagementScore).toBeDefined();
    });
  });
});

import { extractVowelFamily } from '../utils/dissector';
import { analyzeLyricsLines } from '../utils/syllableCounter';

export type RhetoricalAuthority =
  | 'PurdueOWL'
  | 'OwlEyes'
  | 'LiteraryDevicesNet'
  | 'ForsythCore'
  | 'CMUdict';

export interface DetectedRhetoricalDevice {
  barIndex: number; // 1-indexed line number
  device: string;
  matchedText: string;
  definition: string;
  authority: RhetoricalAuthority;
  confidence: number; // 0.0 to 1.0
}

export type MacroCategory = 'Hip-Hop' | 'R&B' | 'Hip-Hop/R&B Hybrid';
export type MusicEra =
  | 'Golden/Classic Era'
  | '90s-2000s Era'
  | 'SoundCloud/Trap Era'
  | 'Modern/Alternative';

/**
 * Three outcomes, not two. "I don't know" is a result with content, not the
 * absence of one — a song that carries traits of several genres is telling
 * you something, and saying so is more honest than forcing a label.
 *
 *  single         — one genre separates clearly from the rest
 *  plural         — the song genuinely reads as several; report all of them
 *  not_measurable — not enough signal to run the comparison at all
 *
 * A `plural` verdict with no candidates, or any verdict with no reason where
 * one is required, is a bug: the engine must always be able to say *why*.
 */
export type GenreVerdict = 'single' | 'plural' | 'not_measurable';

export interface GenreCandidate {
  name: string;
  macro: MacroCategory;
  era: MusicEra;
  regionalTendency?: string;
  /** Raw match score, 0-100. */
  score: number;
}

export interface GenreClassificationResult {
  verdict: GenreVerdict;
  /** Set only when verdict is 'single'. */
  primaryGenre: string | null;
  macroCategory: MacroCategory | null;
  era: MusicEra | null;
  regionalTendency?: string;
  /**
   * Real confidence with no floor. Null when nothing could be measured.
   * Missing signals cap this rather than being normalised away — a song with
   * no tempo can never exceed 0.60, because 40 of the 100 available points
   * came from tempo and were never earned.
   */
  confidenceScore: number | null;
  /** Every genre the song carries traits of, best first. */
  candidates: GenreCandidate[];
  /** Why the engine did not commit. Null when verdict is 'single'. */
  reason: string | null;
  /** Which evidence was actually available. */
  signals: { tempo: boolean; cadence: boolean; devices: boolean };
}

export interface PerformanceMetricsReport {
  pocketTendency: 'rushing' | 'locked' | 'laid_back' | null;
  vocalStyle:
    | 'Staccato Choppy'
    | 'Melodic Runs (Melisma)'
    | 'Conversational'
    | 'Double-Time'
    | 'Falsetto/Breathy';
  breathManagementScore: 'Tight/Saturated' | 'Balanced (15% Rest)' | 'Spacious/Open';
}

export interface TrackAnalysisReport {
  trackMeta: {
    bpm: number | null;
    barCount: number;
    averageSPS: number;
  };
  detectedDevices: DetectedRhetoricalDevice[];
  genreClassification: GenreClassificationResult;
  performanceMetrics: PerformanceMetricsReport;
}

// ---------------------------------------------------------------------------
// 1. Literary & Rhetorical Device Engine Heuristics
// ---------------------------------------------------------------------------

const LITOTES_NEGATIVE_ADJECTIVES = [
  'bad', 'small', 'ugly', 'foolish', 'unhappy', 'untrue', 'unimpressive',
  'simple', 'poor', 'slow', 'weak', 'rare', 'hard', 'uncommon',
];

const SYNAESTHESIA_CROSS_SENSORY_PAIRS: [RegExp, string][] = [
  [/\b(loud|noisy|silent|quiet)\s+(color|red|blue|yellow|green|black|white|bright|dark)\b/i, 'Auditory + Visual'],
  [/\b(cold|warm|hot|freezing|chilly)\s+(rhythm|beat|cadence|sound|voice|tone)\b/i, 'Tactile/Thermal + Auditory'],
  [/\b(sweet|bitter|sour|tasty)\s+(sound|voice|rhyme|cadence|music|note)\b/i, 'Gustatory + Auditory'],
  [/\b(dark|bright|glowing|shining)\s+(sound|tone|frequency|voice|bass|kick)\b/i, 'Visual + Auditory'],
];

export function detectRhetoricalDevices(text: string): DetectedRhetoricalDevice[] {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n');
  const cleanLines = lines.map((l) => l.trim());
  const tokenizedLines = cleanLines.map((l) =>
    l
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, '')
      .split(/\s+/)
      .filter(Boolean),
  );

  const devices: DetectedRhetoricalDevice[] = [];

  // Helper to push device
  const addDevice = (
    barIndex: number,
    device: string,
    matchedText: string,
    definition: string,
    authority: RhetoricalAuthority,
    confidence: number,
  ) => {
    devices.push({
      barIndex,
      device,
      matchedText,
      definition,
      authority,
      confidence: Number(confidence.toFixed(2)),
    });
  };

  // --- Line-by-Line Single-Bar Analysis ---
  tokenizedLines.forEach((tokens, i) => {
    const barIndex = i + 1;
    const rawLine = cleanLines[i];
    if (tokens.length === 0) return;

    // 1. Epizeuxis (Immediate adjacent token repetition: "w1 w1")
    for (let t = 0; t < tokens.length - 1; t += 1) {
      if (tokens[t] === tokens[t + 1] && tokens[t].length >= 2) {
        addDevice(
          barIndex,
          'Epizeuxis',
          `"${tokens[t]} ${tokens[t + 1]}"`,
          'Immediate, emphatic repetition of adjacent identical words.',
          'PurdueOWL',
          0.95,
        );
      }
    }

    // 2. Diacope (Token repetition with 1–3 intervening words: "w1 ... w1")
    for (let t = 0; t < tokens.length; t += 1) {
      for (let span = 2; span <= 4; span += 1) {
        if (t + span < tokens.length && tokens[t] === tokens[t + span] && tokens[t].length >= 3) {
          const matched = tokens.slice(t, t + span + 1).join(' ');
          addDevice(
            barIndex,
            'Diacope',
            `"${matched}"`,
            'Repetition of a word separated by a small intervening phrase for rhythmic cadence.',
            'LiteraryDevicesNet',
            0.9,
          );
        }
      }
    }

    // 3. Epanalepsis (First token matches last token within the same bar)
    if (tokens.length >= 3 && tokens[0] === tokens[tokens.length - 1] && tokens[0].length >= 2) {
      addDevice(
        barIndex,
        'Epanalepsis',
        `"${tokens[0]} ... ${tokens[tokens.length - 1]}"`,
        'Beginning and ending a bar with the exact same anchor word.',
        'PurdueOWL',
        0.92,
      );
    }

    // 4. Chiasmus (A-B-B-A token pattern within a bar or clause)
    if (tokens.length >= 4) {
      for (let t = 0; t <= tokens.length - 4; t += 1) {
        if (
          tokens[t] === tokens[t + 3] &&
          tokens[t + 1] === tokens[t + 2] &&
          tokens[t] !== tokens[t + 1]
        ) {
          addDevice(
            barIndex,
            'Chiasmus',
            `"${tokens[t]} ${tokens[t + 1]} | ${tokens[t + 2]} ${tokens[t + 3]}"`,
            'Syntactic inverted parallel structure in an A-B-B-A arrangement.',
            'ForsythCore',
            0.96,
          );
        }
      }
    }

    // 5. Alliteration (>= 3 nearby consonant onset matches)
    const consonantClusters: Record<string, string[]> = {};
    tokens.forEach((t) => {
      const clean = t.replace(/[^a-z]/g, '');
      if (clean && !/^[aeiou]/.test(clean)) {
        const initial = clean.slice(0, 1);
        if (!consonantClusters[initial]) consonantClusters[initial] = [];
        consonantClusters[initial].push(t);
      }
    });
    Object.entries(consonantClusters).forEach(([char, words]) => {
      if (words.length >= 3) {
        addDevice(
          barIndex,
          'Alliteration',
          words.join(' • '),
          `Repetition of initial consonant sound /${char.toUpperCase()}/ across 3+ words.`,
          'OwlEyes',
          0.88,
        );
      }
    });

    // 6. Assonance (Phonetic vowel cluster repetition across >= 3 words)
    const vowelClusters: Record<string, string[]> = {};
    tokens.forEach((t) => {
      const fam = extractVowelFamily(t);
      if (fam !== 'GENERAL') {
        if (!vowelClusters[fam]) vowelClusters[fam] = [];
        vowelClusters[fam].push(t);
      }
    });
    Object.entries(vowelClusters).forEach(([fam, words]) => {
      if (words.length >= 3) {
        addDevice(
          barIndex,
          'Assonance',
          words.join(' • '),
          `Repetition of resonant vowel sound family (${fam.replace('_FAMILY', '')}) across 3+ words.`,
          'CMUdict',
          0.85,
        );
      }
    });

    // 6b. Consonance (Repetition of terminal coda consonant sounds across >= 3 words)
    const codaClusters: Record<string, string[]> = {};
    tokens.forEach((t) => {
      const clean = t.replace(/[^a-z]/g, '');
      if (clean && clean.length >= 2) {
        const codaMatch = clean.match(/[^aeiouy]+$/);
        if (codaMatch) {
          const coda = codaMatch[0];
          if (!codaClusters[coda]) codaClusters[coda] = [];
          codaClusters[coda].push(t);
        }
      }
    });
    Object.entries(codaClusters).forEach(([coda, words]) => {
      if (words.length >= 3) {
        addDevice(
          barIndex,
          'Consonance',
          words.join(' • '),
          `Repetition of terminal consonant sound /-${coda.toUpperCase()}/ across 3+ words.`,
          'OwlEyes',
          0.86,
        );
      }
    });

    // 7. Tricolon (3 parallel comma-separated rhythmic phrases)
    const commaClauses = rawLine.split(',').map((c) => c.trim()).filter(Boolean);
    if (commaClauses.length === 3) {
      addDevice(
        barIndex,
        'Tricolon',
        commaClauses.join(' , '),
        'Three parallel rhythmic clauses or phrases of equal weight.',
        'ForsythCore',
        0.9,
      );
    }

    // 8. Litotes (Negation prefix + negative adjective for ironic understatement)
    for (let t = 0; t < tokens.length - 1; t += 1) {
      const isNegation = tokens[t] === 'not' || tokens[t] === 'no' || tokens[t] === 'never';
      const nextWord = tokens[t + 1];
      if (isNegation && LITOTES_NEGATIVE_ADJECTIVES.includes(nextWord)) {
        addDevice(
          barIndex,
          'Litotes',
          `"${tokens[t]} ${nextWord}"`,
          'Deliberate double-negative understatement expressing an affirmative statement.',
          'LiteraryDevicesNet',
          0.87,
        );
      }
    }

    // 9. Synaesthesia (Cross-sensory figurative modifiers)
    SYNAESTHESIA_CROSS_SENSORY_PAIRS.forEach(([pattern, senseDesc]) => {
      const match = rawLine.match(pattern);
      if (match) {
        addDevice(
          barIndex,
          'Synaesthesia',
          `"${match[0]}"`,
          `Figurative mixing of distinct sensory experiences (${senseDesc}).`,
          'OwlEyes',
          0.89,
        );
      }
    });

    // 10. Polysyndeton & Asyndeton
    const andCount = (rawLine.match(/\b(and|or|nor)\b/gi) || []).length;
    if (andCount >= 3) {
      addDevice(
        barIndex,
        'Polysyndeton',
        `Used "${andCount}" conjunctions`,
        'Repetition of coordinating conjunctions in close succession to accelerate cadence.',
        'PurdueOWL',
        0.86,
      );
    } else if (commaClauses.length >= 3 && andCount === 0) {
      addDevice(
        barIndex,
        'Asyndeton',
        'Comma clauses without conjunctions',
        'Deliberate omission of conjunctions between phrases for rapid, punchy cadence.',
        'PurdueOWL',
        0.84,
      );
    }
  });

  // --- Multi-Bar Cross-Boundary Structural Repetitions ---
  for (let i = 0; i < tokenizedLines.length - 1; i += 1) {
    const barNum = i + 1;
    const curr = tokenizedLines[i];
    const next = tokenizedLines[i + 1];
    if (curr.length === 0 || next.length === 0) continue;

    // A. Anaphora (Repeated opening word across consecutive bars)
    if (curr[0] === next[0] && curr[0].length >= 2) {
      addDevice(
        barNum,
        'Anaphora',
        `"${curr[0]}" (Bars ${barNum}-${barNum + 1})`,
        'Repetition of the initial anchor word across successive line openings.',
        'PurdueOWL',
        0.94,
      );
    }

    // B. Epistrophe (Repeated terminal word across consecutive bars)
    const currLast = curr[curr.length - 1];
    const nextLast = next[next.length - 1];
    if (currLast === nextLast && currLast.length >= 2) {
      addDevice(
        barNum,
        'Epistrophe',
        `"${currLast}" (Bars ${barNum}-${barNum + 1})`,
        'Repetition of the terminal word at the end of consecutive bars.',
        'PurdueOWL',
        0.94,
      );
    }

    // C. Anadiplosis (Terminal token of Bar N matches opening token of Bar N+1)
    if (currLast === next[0] && currLast.length >= 2) {
      addDevice(
        barNum,
        'Anadiplosis',
        `"${currLast}" -> "${next[0]}"`,
        'The last word of a bar is immediately used to begin the following bar.',
        'ForsythCore',
        0.95,
      );
    }

    // D. Isocolon (Successive clauses of identical syllable length)
    const sylCurr = cleanLines[i].split(/\s+/).length;
    const sylNext = cleanLines[i + 1].split(/\s+/).length;
    if (sylCurr === sylNext && sylCurr >= 6 && Math.abs(curr.length - next.length) <= 1) {
      addDevice(
        barNum,
        'Isocolon',
        `Bars ${barNum} & ${barNum + 1} (${sylCurr} words)`,
        'Successive parallel bars sharing identical word length and rhythmic balance.',
        'ForsythCore',
        0.82,
      );
    }
  }

  return devices;
}

// ---------------------------------------------------------------------------
// 2. Multi-Genre Taxonomy & Scoring Matrix
// ---------------------------------------------------------------------------

interface GenreProfileCriteria {
  name: string;
  macro: MacroCategory;
  era: MusicEra;
  regionalTendency: string;
  minBpm: number;
  maxBpm: number;
  minSps: number;
  maxSps: number;
  preferredDevices: string[];
  vocalStyle: PerformanceMetricsReport['vocalStyle'];
  pocketTendency: PerformanceMetricsReport['pocketTendency'];
  breathTendency: PerformanceMetricsReport['breathManagementScore'];
}

const GENRE_PROFILES: GenreProfileCriteria[] = [
  // Hip-Hop Subgenres
  {
    name: 'Boom Bap / Golden Era',
    macro: 'Hip-Hop',
    era: 'Golden/Classic Era',
    regionalTendency: 'East Coast (New York)',
    minBpm: 84,
    maxBpm: 96,
    minSps: 4.5,
    maxSps: 6.0,
    preferredDevices: ['Anadiplosis', 'Tricolon', 'Assonance', 'Chiasmus'],
    vocalStyle: 'Conversational',
    pocketTendency: 'locked',
    breathTendency: 'Balanced (15% Rest)',
  },
  {
    name: 'Southern Trap',
    macro: 'Hip-Hop',
    era: 'SoundCloud/Trap Era',
    regionalTendency: 'Atlanta / Southern',
    minBpm: 125,
    maxBpm: 165,
    minSps: 4.0,
    maxSps: 6.5,
    preferredDevices: ['Epizeuxis', 'Diacope', 'Polysyndeton', 'Alliteration'],
    vocalStyle: 'Staccato Choppy',
    pocketTendency: 'rushing',
    breathTendency: 'Tight/Saturated',
  },
  {
    name: 'UK / NY Drill',
    macro: 'Hip-Hop',
    era: 'Modern/Alternative',
    regionalTendency: 'London / Brooklyn Drill',
    minBpm: 138,
    maxBpm: 148,
    minSps: 4.5,
    maxSps: 6.5,
    preferredDevices: ['Alliteration', 'Epizeuxis', 'Diacope'],
    vocalStyle: 'Staccato Choppy',
    pocketTendency: 'rushing',
    breathTendency: 'Tight/Saturated',
  },
  {
    name: 'Chopper / Speed Flow',
    macro: 'Hip-Hop',
    era: '90s-2000s Era',
    regionalTendency: 'Midwest (Kansas City / Chicago)',
    minBpm: 120,
    maxBpm: 180,
    minSps: 7.5,
    maxSps: 12.0,
    preferredDevices: ['Polysyndeton', 'Alliteration', 'Assonance'],
    vocalStyle: 'Double-Time',
    pocketTendency: 'rushing',
    breathTendency: 'Tight/Saturated',
  },
  {
    name: 'West Coast G-Funk',
    macro: 'Hip-Hop',
    era: '90s-2000s Era',
    regionalTendency: 'West Coast (Los Angeles / Bay Area)',
    minBpm: 88,
    maxBpm: 102,
    minSps: 3.0,
    maxSps: 4.5,
    preferredDevices: ['Assonance', 'Isocolon'],
    vocalStyle: 'Conversational',
    pocketTendency: 'laid_back',
    breathTendency: 'Balanced (15% Rest)',
  },
  {
    name: 'Emo / SoundCloud Rap',
    macro: 'Hip-Hop',
    era: 'SoundCloud/Trap Era',
    regionalTendency: 'Digital / SoundCloud Underground',
    minBpm: 110,
    maxBpm: 145,
    minSps: 2.5,
    maxSps: 4.0,
    preferredDevices: ['Litotes', 'Synaesthesia', 'Anaphora'],
    vocalStyle: 'Melodic Runs (Melisma)',
    pocketTendency: 'laid_back',
    breathTendency: 'Spacious/Open',
  },

  // R&B & Soul Subgenres
  {
    name: 'Motown / Classic Soul',
    macro: 'R&B',
    era: 'Golden/Classic Era',
    regionalTendency: 'Detroit / Philadelphia Soul',
    minBpm: 95,
    maxBpm: 130,
    minSps: 2.5,
    maxSps: 4.0,
    preferredDevices: ['Anaphora', 'Epistrophe', 'Tricolon'],
    vocalStyle: 'Melodic Runs (Melisma)',
    pocketTendency: 'locked',
    breathTendency: 'Balanced (15% Rest)',
  },
  {
    name: 'Quiet Storm / Sensual',
    macro: 'R&B',
    era: '90s-2000s Era',
    regionalTendency: 'Late Night Urban Contemporary',
    minBpm: 60,
    maxBpm: 85,
    minSps: 1.5,
    maxSps: 2.5,
    preferredDevices: ['Synaesthesia', 'Assonance', 'Epanalepsis'],
    vocalStyle: 'Falsetto/Breathy',
    pocketTendency: 'laid_back',
    breathTendency: 'Spacious/Open',
  },
  {
    name: 'New Jack Swing',
    macro: 'Hip-Hop/R&B Hybrid',
    era: '90s-2000s Era',
    regionalTendency: 'Harlem / New York',
    minBpm: 100,
    maxBpm: 118,
    minSps: 3.5,
    maxSps: 5.0,
    preferredDevices: ['Epizeuxis', 'Diacope', 'Alliteration'],
    vocalStyle: 'Melodic Runs (Melisma)',
    pocketTendency: 'locked',
    breathTendency: 'Balanced (15% Rest)',
  },
  {
    name: 'Neo-Soul',
    macro: 'R&B',
    era: '90s-2000s Era',
    regionalTendency: 'Soulquarians (Philadelphia / Atlanta)',
    minBpm: 70,
    maxBpm: 92,
    minSps: 2.5,
    maxSps: 4.2,
    preferredDevices: ['Chiasmus', 'Synaesthesia', 'Anadiplosis'],
    vocalStyle: 'Conversational',
    pocketTendency: 'laid_back',
    breathTendency: 'Balanced (15% Rest)',
  },
  {
    name: 'Alternative / Dark R&B',
    macro: 'R&B',
    era: 'Modern/Alternative',
    regionalTendency: 'Toronto / Ambient PBR&B',
    minBpm: 55,
    maxBpm: 85,
    minSps: 1.5,
    maxSps: 3.0,
    preferredDevices: ['Litotes', 'Synaesthesia', 'Epanalepsis'],
    vocalStyle: 'Falsetto/Breathy',
    pocketTendency: 'laid_back',
    breathTendency: 'Spacious/Open',
  },
  {
    name: 'Trap Soul / Hip-Hop Soul',
    macro: 'Hip-Hop/R&B Hybrid',
    era: 'SoundCloud/Trap Era',
    regionalTendency: 'Louisville / Toronto / Atlanta',
    minBpm: 110,
    maxBpm: 145,
    minSps: 3.0,
    maxSps: 5.0,
    preferredDevices: ['Epizeuxis', 'Anaphora', 'Synaesthesia'],
    vocalStyle: 'Melodic Runs (Melisma)',
    pocketTendency: 'laid_back',
    breathTendency: 'Balanced (15% Rest)',
  },
];

/**
 * A single genre must clear this to be reported alone. Product decision, not a
 * measurement — it is the top of the 60-70% band agreed for this engine, on
 * the reasoning that a wrong label costs more credibility than a plural one.
 */
const SINGLE_MATCH_MIN_CONFIDENCE = 0.7;

/**
 * If the runner-up is within this many points, the two are not separated by
 * the evidence. Definitional rather than tuned: the smallest single signal is
 * worth 25 points, so a gap under 10 means no one signal distinguishes them.
 */
const INDISTINGUISHABLE_GAP = 10;

/** Points available from each signal. Tempo is 40, cadence 35, devices 25. */
const TEMPO_POINTS = 40;

export function classifyGenreAndStyle(
  bpm: number | null,
  averageSPS: number,
  devices: DetectedRhetoricalDevice[],
): {
  genre: GenreClassificationResult;
  performance: PerformanceMetricsReport;
} {
  const deviceNames = devices.map((d) => d.device);

  // Score each genre profile against composite metrics
  const scoredProfiles = GENRE_PROFILES.map((profile) => {
    let score = 0;

    // 1. BPM fit (0 to 40 pts). No tempo means no points — not average
    // points. Absent evidence must lower confidence, never sit at neutral.
    if (bpm !== null) {
      if (bpm >= profile.minBpm && bpm <= profile.maxBpm) {
        score += TEMPO_POINTS;
      } else {
        const dist = Math.min(Math.abs(bpm - profile.minBpm), Math.abs(bpm - profile.maxBpm));
        score += Math.max(0, TEMPO_POINTS - dist * 1.5);
      }
    }

    // 2. SPS Cadence Velocity fit (0 to 35 pts)
    if (averageSPS >= profile.minSps && averageSPS <= profile.maxSps) {
      score += 35;
    } else {
      const dist = Math.min(Math.abs(averageSPS - profile.minSps), Math.abs(averageSPS - profile.maxSps));
      score += Math.max(0, 35 - dist * 10);
    }

    // 3. Rhetorical Device Affinity (0 to 25 pts)
    let deviceMatchCount = 0;
    profile.preferredDevices.forEach((pref) => {
      if (deviceNames.includes(pref)) deviceMatchCount += 1;
    });
    score += Math.min(25, deviceMatchCount * 8);

    return { profile, score };
  });

  // Sort descending by match score
  scoredProfiles.sort((a, b) => b.score - a.score);

  const signals = {
    tempo: bpm !== null,
    cadence: Number.isFinite(averageSPS) && averageSPS > 0,
    devices: devices.length > 0,
  };

  const top = scoredProfiles[0];
  const runnerUp = scoredProfiles[1];

  // Confidence is scored against all 100 available points, not against the
  // points that happened to be reachable. Missing tempo therefore caps the
  // ceiling at 0.60 instead of being normalised out of existence.
  const confidence = top ? Number(Math.min(1, Math.max(0, top.score / 100)).toFixed(2)) : null;

  const toCandidate = (p: (typeof scoredProfiles)[number]): GenreCandidate => ({
    name: p.profile.name,
    macro: p.profile.macro,
    era: p.profile.era,
    regionalTendency: p.profile.regionalTendency,
    score: Number(p.score.toFixed(1)),
  });

  let genre: GenreClassificationResult;

  if (!top || (!signals.cadence && !signals.devices)) {
    // Nothing to compare against. Distinct from "several genres fit".
    genre = {
      verdict: 'not_measurable',
      primaryGenre: null,
      macroCategory: null,
      era: null,
      confidenceScore: null,
      candidates: [],
      reason: 'no_signal',
      signals,
    };
  } else {
    const gap = runnerUp ? top.score - runnerUp.score : Infinity;
    const clearWinner =
      confidence !== null &&
      confidence >= SINGLE_MATCH_MIN_CONFIDENCE &&
      gap >= INDISTINGUISHABLE_GAP;

    if (clearWinner) {
      genre = {
        verdict: 'single',
        primaryGenre: top.profile.name,
        macroCategory: top.profile.macro,
        era: top.profile.era,
        regionalTendency: top.profile.regionalTendency,
        confidenceScore: confidence,
        candidates: [toCandidate(top)],
        reason: null,
        signals,
      };
    } else {
      // Plural. Report every genre within reach of the leader, so the user
      // sees what it actually reads as rather than a single forced guess.
      const contenders = scoredProfiles.filter((p) => top.score - p.score < INDISTINGUISHABLE_GAP);
      genre = {
        verdict: 'plural',
        primaryGenre: null,
        macroCategory: null,
        era: null,
        confidenceScore: confidence,
        candidates: (contenders.length > 1 ? contenders : scoredProfiles.slice(0, 3)).map(
          toCandidate,
        ),
        reason: !signals.tempo
          ? 'traits_of_several_genres_no_tempo'
          : 'traits_of_several_genres',
        signals,
      };
    }
  }

  const bestMatch = top ? top.profile : GENRE_PROFILES[0];

  return {
    genre,
    performance: {
      // Copied from the matched genre profile, so it is only as good as the
      // match. On a plural or unmeasurable verdict there is no single profile
      // to copy from and this must be null rather than a coin-flip.
      // (It is still a genre assumption, not a timing measurement — see the
      // pocketTendency entry in the CLAUDE.md backlog.)
      pocketTendency: genre.verdict === 'single' ? bestMatch.pocketTendency : null,
      vocalStyle: bestMatch.vocalStyle,
      breathManagementScore: bestMatch.breathTendency,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Normalized Unified Analyzer
// ---------------------------------------------------------------------------

/**
 * Unified Analyzer: Analyzes lyrics, extracts rhetorical devices,
 * computes multi-genre classification, and delivers the TrackAnalysisReport.
 */
/**
 * A tempo assumed purely so the bar grid can be drawn. It is never allowed to
 * reach a metric: `trackMeta.bpm` carries the real value (null when unknown),
 * and `measurability.ts` refuses tempo-dependent metrics without one.
 */
const LAYOUT_FALLBACK_BPM = 120;

export function analyzeTrackUnified(
  lyrics: string,
  bpm: number | null = null,
): TrackAnalysisReport {
  const lineAnalyses = analyzeLyricsLines(lyrics);
  const barCount = lineAnalyses.length;
  const totalSyllables = lineAnalyses.reduce((sum, l) => sum + l.syllableCount, 0);

  // Bar duration for 4/4 = 240 / BPM
  const hasTempo = typeof bpm === 'number' && Number.isFinite(bpm) && bpm > 0;
  // Layout only — see LAYOUT_FALLBACK_BPM.
  const safeBpm = Math.max(40, Math.min(240, hasTempo ? (bpm as number) : LAYOUT_FALLBACK_BPM));
  const barDurationSeconds = 240 / safeBpm;
  const averageSPS =
    barCount > 0 && barDurationSeconds > 0
      ? Number((totalSyllables / (barCount * barDurationSeconds)).toFixed(2))
      : 0;

  // 1. Detect Literary & Rhetorical Devices
  const detectedDevices = detectRhetoricalDevices(lyrics);

  // 2. Classify Genre and Performance Profile
  // Genre matching is given the real tempo, not the layout stand-in. Without
  // one, BPM-range matching cannot contribute evidence and must not pretend to.
  const { genre, performance } = classifyGenreAndStyle(
    hasTempo ? (bpm as number) : null,
    averageSPS,
    detectedDevices,
  );

  return {
    trackMeta: {
      bpm: hasTempo ? (bpm as number) : null,
      barCount,
      averageSPS,
    },
    detectedDevices,
    genreClassification: genre,
    performanceMetrics: performance,
  };
}

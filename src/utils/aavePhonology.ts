/**
 * aavePhonology.ts
 *
 * African American Vernacular English (AAVE) & Hip-Hop Phonological Rule Engine for Prosodic.
 *
 * Formally applies linguistic phonological rules (Labov 1972, Thomas 2007, Wolfram 1969)
 * to reveal genuine rhyme bridges and internal multi-syllabic connections that standard
 * dictionaries fail to capture.
 *
 * Core Processes:
 * 1. Consonant Cluster Reduction (CCR): "past" /P AE1 S T/ -> /P AE1 S/ (rhymes with "class")
 * 2. Monophthongization: "time" /T AY1 M/ -> /T AA1 M/ (rhymes with "calm")
 * 3. R-Vocalization (Postvocalic R-Deletion): "more" /M AO1 R/ -> /M AO1/ (rhymes with "saw"), "hurt" /ER/ -> /AH/ (rhymes with "cut")
 * 4. Slang & Hip-Hop Lexicon overrides with pre-computed phonemes.
 */

// ---------------------------------------------------------------------------
// 1. CMU Phoneme Categories
// ---------------------------------------------------------------------------

export const CMU_VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY',
  'EH', 'ER', 'EY', 'IH', 'IY',
  'OW', 'OY', 'UH', 'UW',
]);

export const CMU_CONSONANTS = new Set([
  'B', 'CH', 'D', 'DH', 'F', 'G', 'HH',
  'JH', 'K', 'L', 'M', 'N', 'NG',
  'P', 'R', 'S', 'SH', 'T', 'TH',
  'V', 'W', 'Y', 'Z', 'ZH',
]);

export function basePhoneme(phoneme: string): string {
  if (!phoneme) return '';
  return /\d$/.test(phoneme) ? phoneme.slice(0, -1) : phoneme;
}

export function stressDigit(phoneme: string): string {
  if (!phoneme) return '0';
  const match = phoneme.match(/\d$/);
  return match ? match[0] : '0';
}

export function isVowel(phoneme: string): boolean {
  return CMU_VOWELS.has(basePhoneme(phoneme));
}

export function isConsonant(phoneme: string): boolean {
  return CMU_CONSONANTS.has(basePhoneme(phoneme));
}

// ---------------------------------------------------------------------------
// 2. Rule 1: Consonant Cluster Reduction (CCR)
// ---------------------------------------------------------------------------

const REDUCIBLE_FINAL_CLUSTERS = new Set([
  'S_T', // "past" -> "pass", "mist" -> "miss"
  'N_D', // "hand" -> "han", "mind" -> "mine"
  'L_D', // "cold" -> "col", "bold" -> "bol"
  'N_T', // "want" -> "wan", "count" -> "coun"
  'S_K', // "desk" -> "des", "mask" -> "mas"
  'S_P', // "crisp" -> "cris", "grasp" -> "gras"
  'F_T', // "left" -> "lef", "soft" -> "sof"
  'K_T', // "act" -> "ac", "fact" -> "fac"
  'M_D', // "claimed" -> "claim"
  'L_T', // "belt" -> "bel", "melt" -> "mel"
  'Z_D', // "raised" -> "raise"
  'V_D', // "loved" -> "love"
  'P_T', // "kept" -> "kep"
  'T_S', // "streets" -> "street"
  'G_D', // "begged" -> "beg"
  'B_D', // "rubbed" -> "rub"
]);

export function consonantClusterReduction(phonemes: string[]): string[] | null {
  if (!phonemes || phonemes.length < 3) return null;

  const last = basePhoneme(phonemes[phonemes.length - 1]);
  const secondLast = basePhoneme(phonemes[phonemes.length - 2]);

  if (!isConsonant(last) || !isConsonant(secondLast)) return null;

  const clusterKey = `${secondLast}_${last}`;
  if (REDUCIBLE_FINAL_CLUSTERS.has(clusterKey)) {
    return phonemes.slice(0, -1);
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. Rule 2: Monophthongization (/AY/ -> /AA/)
// ---------------------------------------------------------------------------

export function monophthongization(phonemes: string[]): string[] | null {
  if (!phonemes || phonemes.length === 0) return null;

  let changed = false;
  const result: string[] = [];

  for (const ph of phonemes) {
    if (basePhoneme(ph) === 'AY') {
      result.push('AA' + stressDigit(ph));
      changed = true;
    } else {
      result.push(ph);
    }
  }

  return changed ? result : null;
}

// ---------------------------------------------------------------------------
// 4. Rule 3: R-Vocalization (Postvocalic R-Deletion & ER -> AH)
// ---------------------------------------------------------------------------

export function rVocalization(phonemes: string[]): string[] | null {
  if (!phonemes || phonemes.length === 0) return null;

  const result: string[] = [];
  let changed = false;
  let i = 0;

  while (i < phonemes.length) {
    const ph = phonemes[i];

    // ER vowel in coda position: "bird" /B ER1 D/ -> /B AH1 D/, "hurt" /HH ER1 T/ -> /HH AH1 T/
    if (basePhoneme(ph) === 'ER') {
      const s = stressDigit(ph);
      const nextBase = i + 1 < phonemes.length ? basePhoneme(phonemes[i + 1]) : null;
      if (nextBase === null || isConsonant(nextBase)) {
        result.push('AH' + s);
        changed = true;
        i += 1;
        continue;
      }
    }

    // Standalone postvocalic R: "more" /M AO1 R/ -> /M AO1/, "here" /HH IY1 R/ -> /HH IY1/
    if (basePhoneme(ph) === 'R') {
      if (result.length > 0 && isVowel(result[result.length - 1])) {
        changed = true;
        i += 1;
        continue;
      }
    }

    result.push(ph);
    i += 1;
  }

  return changed ? result : null;
}

// ---------------------------------------------------------------------------
// 5. Variant Generation (Independent & Combinatorial)
// ---------------------------------------------------------------------------

export function getAaveVariants(phonemes: string[]): string[][] {
  const variants: string[][] = [];
  const seen = new Set<string>();
  const originalKey = phonemes.join(' ');

  const addVariant = (v: string[] | null) => {
    if (!v) return;
    const key = v.join(' ');
    if (key !== originalKey && !seen.has(key)) {
      seen.add(key);
      variants.push(v);
    }
  };

  const ccr = consonantClusterReduction(phonemes);
  const mono = monophthongization(phonemes);
  const rvoc = rVocalization(phonemes);

  addVariant(ccr);
  addVariant(mono);
  addVariant(rvoc);

  // Two-rule combinations
  if (ccr) {
    addVariant(monophthongization(ccr));
    addVariant(rVocalization(ccr));
  }
  if (mono) {
    addVariant(consonantClusterReduction(mono));
    addVariant(rVocalization(mono));
  }
  if (rvoc) {
    addVariant(consonantClusterReduction(rvoc));
    addVariant(monophthongization(rvoc));
  }

  // Three-rule combination
  if (ccr && mono) {
    const combo = rVocalization(mono);
    if (combo) addVariant(consonantClusterReduction(combo));
  }

  return variants;
}

// ---------------------------------------------------------------------------
// 6. AAVE Rhyme Unit & Rhyme Bridge Matcher
// ---------------------------------------------------------------------------

export function extractRhymeUnit(phonemes: string[]): string[] {
  if (!phonemes || phonemes.length === 0) return [];

  // Find last primary or secondary stressed vowel index
  let lastStressedIndex = -1;
  for (let i = 0; i < phonemes.length; i += 1) {
    const s = stressDigit(phonemes[i]);
    if (isVowel(phonemes[i]) && (s === '1' || s === '2')) {
      lastStressedIndex = i;
    }
  }

  if (lastStressedIndex !== -1) {
    return phonemes.slice(lastStressedIndex).map(basePhoneme);
  }

  // Fallback: last vowel
  for (let i = phonemes.length - 1; i >= 0; i -= 1) {
    if (isVowel(phonemes[i])) {
      return phonemes.slice(i).map(basePhoneme);
    }
  }

  return phonemes.map(basePhoneme);
}

/**
 * Checks whether word A and word B rhyme under standard pronunciation OR
 * any valid AAVE phonological permutation.
 */
export function aaveRhymeBridge(
  phonemesA: string[],
  phonemesB: string[],
  threshold: number = 0.5,
): boolean {
  const formsA = [phonemesA, ...getAaveVariants(phonemesA)];
  const formsB = [phonemesB, ...getAaveVariants(phonemesB)];

  for (const fa of formsA) {
    const ruA = extractRhymeUnit(fa);
    for (const fb of formsB) {
      const ruB = extractRhymeUnit(fb);
      if (ruA.length === 0 || ruB.length === 0) continue;

      // Exact match
      if (ruA.join('_') === ruB.join('_')) return true;

      // Jaccard similarity match for slant bridge
      const setA = new Set(ruA);
      const setB = new Set(ruB);
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);

      if (union.size > 0 && intersection.size / union.size >= threshold) {
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// 7. Modern Slang & Colloquial Phonetic Overrides
// ---------------------------------------------------------------------------

export const SLANG_PHONETIC_LEXICON: Record<string, string[]> = {
  finna: ['F', 'IH1', 'N', 'AH0'],
  tryna: ['T', 'R', 'AY1', 'N', 'AH0'],
  boutta: ['B', 'AW1', 'T', 'AH0'],
  skrrt: ['S', 'K', 'R', 'ER1', 'T'],
  bussin: ['B', 'AH1', 'S', 'IH0', 'N'],
  fussin: ['F', 'AH1', 'S', 'IH0', 'N'],
  cookin: ['K', 'UH1', 'K', 'IH0', 'N'],
  callin: ['K', 'AO1', 'L', 'IH0', 'N'],
  runnin: ['R', 'AH1', 'N', 'IH0', 'N'],
  trippin: ['T', 'R', 'IH1', 'P', 'IH0', 'N'],
  drippin: ['D', 'R', 'IH1', 'P', 'IH0', 'N'],
  winnin: ['W', 'IH1', 'N', 'IH0', 'N'],
  losin: ['L', 'UW1', 'Z', 'IH0', 'N'],
  stressin: ['S', 'T', 'R', 'EH1', 'S', 'IH0', 'N'],
  deadass: ['D', 'EH1', 'D', 'AE2', 'S'],
  nocap: ['N', 'OW1', 'K', 'AE2', 'P'],
  rizz: ['R', 'IH1', 'Z'],
  cap: ['K', 'AE1', 'P'],
  drip: ['D', 'R', 'IH1', 'P'],
  opp: ['AA1', 'P'],
  opps: ['AA1', 'P', 'S'],
  whip: ['W', 'IH1', 'P'],
  bands: ['B', 'AE1', 'N', 'D', 'Z'],
  guap: ['G', 'W', 'AA1', 'P'],
  stacks: ['S', 'T', 'AE1', 'K', 'S'],
  ice: ['AY1', 'S'],
  clout: ['K', 'L', 'AW1', 'T'],
  fam: ['F', 'AE1', 'M'],
  nah: ['N', 'AA1'],
  bro: ['B', 'R', 'OW1'],
  bruh: ['B', 'R', 'AH1'],
  dawg: ['D', 'AO1', 'G'],
  holler: ['HH', 'AA1', 'L', 'ER0'],
  flex: ['F', 'L', 'EH1', 'K', 'S'],
  turnt: ['T', 'ER1', 'N', 'T'],
  lit: ['L', 'IH1', 'T'],
  bet: ['B', 'EH1', 'T'],
  facts: ['F', 'AE1', 'K', 'T', 'S'],
  slaps: ['S', 'L', 'AE1', 'P', 'S'],
  hits: ['HH', 'IH1', 'T', 'S'],
  fasho: ['F', 'AH0', 'SH', 'OW1'],
  aight: ['AY1', 'T'],
  ight: ['AY1', 'T'],
  lemme: ['L', 'EH1', 'M', 'IY0'],
  gimme: ['G', 'IH1', 'M', 'IY0'],
  whatcha: ['W', 'AH1', 'CH', 'AH0'],
  gotta: ['G', 'AA1', 'T', 'AH0'],
  gonna: ['G', 'AO1', 'N', 'AH0'],
  wanna: ['W', 'AA1', 'N', 'AH0'],
  shawty: ['SH', 'AO1', 'T', 'IY0'],
  inevitable: ['IH2', 'N', 'EH1', 'V', 'AH0', 'T', 'AH0', 'B', 'AH0', 'L'],
};

export const CORE_PHONETIC_LEXICON: Record<string, string[]> = {
  past: ['P', 'AE1', 'S', 'T'],
  class: ['K', 'L', 'AE1', 'S'],
  pass: ['P', 'AE1', 'S'],
  time: ['T', 'AY1', 'M'],
  calm: ['K', 'AA1', 'M'],
  cold: ['K', 'OW1', 'L', 'D'],
  gold: ['G', 'OW1', 'L', 'D'],
  hold: ['HH', 'OW1', 'L', 'D'],
  bold: ['B', 'OW1', 'L', 'D'],
  soul: ['S', 'OW1', 'L'],
  road: ['R', 'OW1', 'D'],
  mind: ['M', 'AY1', 'N', 'D'],
  blind: ['B', 'L', 'AY1', 'N', 'D'],
  find: ['F', 'AY1', 'N', 'D'],
  line: ['L', 'AY1', 'N'],
  scheme: ['S', 'K', 'IY1', 'M'],
  dream: ['D', 'R', 'IY1', 'M'],
  deep: ['D', 'IY1', 'P'],
  feel: ['F', 'IY1', 'L'],
  cat: ['K', 'AE1', 'T'],
  hat: ['HH', 'AE1', 'T'],
  bat: ['B', 'AE1', 'T'],
  blue: ['B', 'L', 'UW1'],
  true: ['T', 'R', 'UW1'],
  saw: ['S', 'AO1'],
  cut: ['K', 'AH1', 'T'],
  // Wells Lexical Sets: NORTH / FORCE (AO1 R)
  more: ['M', 'AO1', 'R'],
  door: ['D', 'AO1', 'R'],
  floor: ['F', 'L', 'AO1', 'R'],
  store: ['S', 'T', 'AO1', 'R'],
  score: ['S', 'K', 'AO1', 'R'],
  shore: ['SH', 'AO1', 'R'],
  four: ['F', 'AO1', 'R'],
  pour: ['P', 'AO1', 'R'],
  roar: ['R', 'AO1', 'R'],
  soar: ['S', 'AO1', 'R'],
  // Wells Lexical Sets: SQUARE (EH1 R)
  care: ['K', 'EH1', 'R'],
  share: ['SH', 'EH1', 'R'],
  stare: ['S', 'T', 'EH1', 'R'],
  rare: ['R', 'EH1', 'R'],
  dare: ['D', 'EH1', 'R'],
  air: ['EH1', 'R'],
  fair: ['F', 'EH1', 'R'],
  hair: ['HH', 'EH1', 'R'],
  pair: ['P', 'EH1', 'R'],
  bear: ['B', 'EH1', 'R'],
  wear: ['W', 'EH1', 'R'],
  // Wells Lexical Sets: NEAR (IH1 R)
  clear: ['K', 'L', 'IH1', 'R'],
  fear: ['F', 'IH1', 'R'],
  near: ['N', 'IH1', 'R'],
  hear: ['HH', 'IH1', 'R'],
  here: ['HH', 'IH1', 'R'],
  year: ['Y', 'IH1', 'R'],
  dear: ['D', 'IH1', 'R'],
  // Wells Lexical Sets: START (AA1 R)
  car: ['K', 'AA1', 'R'],
  far: ['F', 'AA1', 'R'],
  bar: ['B', 'AA1', 'R'],
  star: ['S', 'T', 'AA1', 'R'],
  hard: ['HH', 'AA1', 'R', 'D'],
  dark: ['D', 'AA1', 'R', 'K'],
  part: ['P', 'AA1', 'R', 'T'],
  // Wells Lexical Sets: NURSE (ER1)
  burn: ['B', 'ER1', 'N'],
  turn: ['T', 'ER1', 'N'],
  turnt: ['T', 'ER1', 'N', 'T'],
  verse: ['V', 'ER1', 'S'],
  reverse: ['R', 'IH0', 'V', 'ER1', 'S'],
  diverse: ['D', 'IH0', 'V', 'ER1', 'S'],
  converse: ['K', 'AA1', 'N', 'V', 'ER0', 'S'],
  rehearsal: ['R', 'IH0', 'HH', 'ER1', 'S', 'AH0', 'L'],
  merch: ['M', 'ER1', 'CH'],
  cheers: ['CH', 'IH1', 'R', 'Z'],
  chirp: ['CH', 'ER1', 'P'],
  chirps: ['CH', 'ER1', 'P', 'S'],
  first: ['F', 'ER1', 'S', 'T'],
  worst: ['W', 'ER1', 'S', 'T'],
  curse: ['K', 'ER1', 'S'],
  shirt: ['SH', 'ER1', 'T'],
  birth: ['B', 'ER1', 'TH'],
  word: ['W', 'ER1', 'D'],
  hurt: ['HH', 'ER1', 'T'],
  blessed: ['B', 'L', 'EH1', 'S', 'T'],
  stress: ['S', 'T', 'R', 'EH1', 'S'],
  stressin: ['S', 'T', 'R', 'EH1', 'S', 'IH0', 'N'],
  stressing: ['S', 'T', 'R', 'EH1', 'S', 'IH0', 'NG'],
  winnin: ['W', 'IH1', 'N', 'IH0', 'N'],
  winning: ['W', 'IH1', 'N', 'IH0', 'NG'],
  losin: ['L', 'UW1', 'Z', 'IH0', 'N'],
  losing: ['L', 'UW1', 'Z', 'IH0', 'NG'],
  thinnin: ['TH', 'IH1', 'N', 'IH0', 'N'],
  thinning: ['TH', 'IH1', 'N', 'IH0', 'NG'],
  naysayers: ['N', 'EY1', 'S', 'EY2', 'ER0', 'Z'],
  naysayer: ['N', 'EY1', 'S', 'EY2', 'ER0'],
  stream: ['S', 'T', 'R', 'IY1', 'M'],
  streams: ['S', 'T', 'R', 'IY1', 'M', 'Z'],
  begin: ['B', 'IH0', 'G', 'IH1', 'N'],
  begins: ['B', 'IH0', 'G', 'IH1', 'N', 'Z'],
  encore: ['AA1', 'N', 'K', 'AO2', 'R'],
  money: ['M', 'AH1', 'N', 'IY0'],
  nothing: ['N', 'AH1', 'TH', 'IH0', 'NG'],
  fire: ['F', 'AY1', 'ER0'],
  higher: ['HH', 'AY1', 'ER0'],
  streets: ['S', 'T', 'R', 'IY1', 'T', 'S'],
  beats: ['B', 'IY1', 'T', 'S'],
  persevered: ['P', 'ER0', 'S', 'AH0', 'V', 'IH1', 'R', 'D'],
  persevere: ['P', 'ER0', 'S', 'AH0', 'V', 'IH1', 'R'],
  appeared: ['AH0', 'P', 'IH1', 'R', 'D'],
  appear: ['AH0', 'P', 'IH1', 'R'],
  adhere: ['AE0', 'D', 'HH', 'IH1', 'R'],
  career: ['K', 'ER0', 'IH1', 'R'],
};

const CONSONANT_CHAR_MAP: Record<string, string> = {
  b: 'B', c: 'K', d: 'D', f: 'F', g: 'G', h: 'HH', j: 'JH',
  k: 'K', l: 'L', m: 'M', n: 'N', p: 'P', q: 'K', r: 'R',
  s: 'S', t: 'T', v: 'V', w: 'W', x: 'K', y: 'Y', z: 'Z',
};

function estimateSingleSyllablePhonemes(syllableStr: string, isPrimaryStress: boolean = true): string[] {
  const clean = syllableStr.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [];

  const vowelMatch = clean.match(/[aeiouy]+/);
  if (!vowelMatch || vowelMatch.index === undefined) {
    const singleConsonants = clean.split('').map((c) => CONSONANT_CHAR_MAP[c] || 'K');
    return singleConsonants.length > 0 ? singleConsonants : ['K', isPrimaryStress ? 'AE1' : 'AH0', 'T'];
  }

  const onsetStr = clean.slice(0, vowelMatch.index);
  const vowelStr = vowelMatch[0];
  const codaStr = clean.slice(vowelMatch.index + vowelStr.length);

  const result: string[] = [];
  const sNum = isPrimaryStress ? '1' : '0';

  // 1. Onset
  if (onsetStr) {
    if (onsetStr.startsWith('str')) result.push('S', 'T', 'R');
    else if (onsetStr.startsWith('spl')) result.push('S', 'P', 'L');
    else if (onsetStr.startsWith('skr') || onsetStr.startsWith('scr')) result.push('S', 'K', 'R');
    else if (onsetStr.startsWith('sk') || onsetStr.startsWith('sc')) result.push('S', 'K');
    else if (onsetStr.startsWith('sp')) result.push('S', 'P');
    else if (onsetStr.startsWith('st')) result.push('S', 'T');
    else if (onsetStr.startsWith('sl')) result.push('S', 'L');
    else if (onsetStr.startsWith('sm')) result.push('S', 'M');
    else if (onsetStr.startsWith('sn')) result.push('S', 'N');
    else if (onsetStr.startsWith('sw')) result.push('S', 'W');
    else if (onsetStr.startsWith('ch')) result.push('CH');
    else if (onsetStr.startsWith('sh')) result.push('SH');
    else if (onsetStr.startsWith('th')) result.push('TH');
    else if (onsetStr.startsWith('ph')) result.push('F');
    else if (onsetStr.startsWith('bl')) result.push('B', 'L');
    else if (onsetStr.startsWith('br')) result.push('B', 'R');
    else if (onsetStr.startsWith('cl')) result.push('K', 'L');
    else if (onsetStr.startsWith('cr')) result.push('K', 'R');
    else if (onsetStr.startsWith('dr')) result.push('D', 'R');
    else if (onsetStr.startsWith('fl')) result.push('F', 'L');
    else if (onsetStr.startsWith('fr')) result.push('F', 'R');
    else if (onsetStr.startsWith('gl')) result.push('G', 'L');
    else if (onsetStr.startsWith('gr')) result.push('G', 'R');
    else if (onsetStr.startsWith('pl')) result.push('P', 'L');
    else if (onsetStr.startsWith('pr')) result.push('P', 'R');
    else if (onsetStr.startsWith('tr')) result.push('T', 'R');
    else {
      for (const char of onsetStr) {
        const p = CONSONANT_CHAR_MAP[char];
        if (p) result.push(p);
      }
    }
  }

  // 2. Vowel nucleus (Rhotic Wells Sets prioritized)
  let nucleus = `AH${sNum}`;
  if (/oor|ore|oar|our$/.test(clean)) nucleus = `AO${sNum}`;
  else if (/eer|ier$|ear$/.test(clean) && !/bear|wear|pear|tear/.test(clean)) nucleus = `IH${sNum}`;
  else if (/air|are$|ear$|eir$/.test(clean)) nucleus = `EH${sNum}`;
  else if (/er|ir|ur/.test(clean)) nucleus = `ER${sNum}`;
  else if (/ar/.test(clean)) {
    result.push(`AA${sNum}`, 'R');
    nucleus = '';
  } else if (/ight|y$|ine|ime|ike|ite|ind|igh/.test(clean)) nucleus = `AY${sNum}`;
  else if (/ee|ea|ie|eat|eep|eam/.test(clean)) nucleus = `IY${sNum}`;
  else if (/ay|ai|ake|ate|ame|ane/.test(clean)) nucleus = `EY${sNum}`;
  else if (/ow|oe|oa|old|ole|one|ose|ote|ode/.test(clean)) nucleus = `OW${sNum}`;
  else if (/oo|ue|ew|uit/.test(clean)) nucleus = `UW${sNum}`;
  else if (/oy|oi/.test(clean)) nucleus = `OY${sNum}`;
  else if (/aw|au|ought|all/.test(clean)) nucleus = `AO${sNum}`;
  else if (vowelStr === 'a') nucleus = `AE${sNum}`;
  else if (vowelStr === 'e') nucleus = `EH${sNum}`;
  else if (vowelStr === 'i') nucleus = `IH${sNum}`;
  else if (vowelStr === 'o') nucleus = `AA${sNum}`;
  else if (vowelStr === 'u') nucleus = `AH${sNum}`;

  if (nucleus) result.push(nucleus);

  // 3. Coda
  if (codaStr) {
    if (codaStr.endsWith('st')) result.push('S', 'T');
    else if (codaStr.endsWith('sk')) result.push('S', 'K');
    else if (codaStr.endsWith('sp')) result.push('S', 'P');
    else if (codaStr.endsWith('ld')) result.push('L', 'D');
    else if (codaStr.endsWith('nd')) result.push('N', 'D');
    else if (codaStr.endsWith('lt')) result.push('L', 'T');
    else if (codaStr.endsWith('nt')) result.push('N', 'T');
    else if (codaStr.endsWith('ft')) result.push('F', 'T');
    else if (codaStr.endsWith('pt')) result.push('P', 'T');
    else if (codaStr.endsWith('ct')) result.push('K', 'T');
    else if (codaStr.endsWith('ck')) result.push('K');
    else if (codaStr.endsWith('ng')) result.push('NG');
    else if (codaStr.endsWith('sh')) result.push('SH');
    else if (codaStr.endsWith('ch')) result.push('CH');
    else if (codaStr.endsWith('th')) result.push('TH');
    else {
      const cleanCoda = codaStr.endsWith('e') && !codaStr.endsWith('ee') ? codaStr.slice(0, -1) : codaStr;
      for (const char of cleanCoda) {
        const p = CONSONANT_CHAR_MAP[char];
        if (p) result.push(p);
      }
    }
  }

  return result.length > 0 ? result : [`AH${sNum}`];
}

/**
 * Derives approximate ARPABET phonemes for any English word via onset-nucleus-coda decomposition.
 * Handles both monosyllabic and multisyllabic words with stress distribution.
 */
export function estimateWordPhonemes(word: string): string[] {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [];
  if (SLANG_PHONETIC_LEXICON[clean]) return SLANG_PHONETIC_LEXICON[clean];
  if (CORE_PHONETIC_LEXICON[clean]) return CORE_PHONETIC_LEXICON[clean];

  // Check prefix splitting for multisyllabic words (re-, de-, con-, in-, un-, dis-, mis-)
  const prefixMatch = clean.match(/^(re|de|con|in|un|dis|mis|pre|pro|sub|ex)(.+)$/);
  if (prefixMatch && prefixMatch[2].length >= 3 && /[aeiouy]/.test(prefixMatch[2])) {
    const pPhonemes = estimateSingleSyllablePhonemes(prefixMatch[1], false);
    const rootPhonemes = estimateWordPhonemes(prefixMatch[2]);
    return [...pPhonemes, ...rootPhonemes];
  }

  // Suffix splitting (-ing, -ed, -er, -ers, -al, -ly, -ness, -ment, -tion, -sion)
  const suffixMatch = clean.match(/^(.+)(ing|ers|er|ment|tion|sion|ness|ly|al|ful|less)$/);
  if (suffixMatch && suffixMatch[1].length >= 3 && /[aeiouy]/.test(suffixMatch[1])) {
    const rootPhonemes = estimateWordPhonemes(suffixMatch[1]);
    const sPhonemes = estimateSingleSyllablePhonemes(suffixMatch[2], false);
    return [...rootPhonemes, ...sPhonemes];
  }

  return estimateSingleSyllablePhonemes(clean, true);
}

export type PhonemeResolver = (w: string) => string[] | undefined;

export function lookupWordPhonemesWithSlang(
  rawWord: string,
  cmuLookup?: PhonemeResolver,
): { phonemes: string[]; source: 'slang_dictionary' | 'cmu_standard' | 'heuristic_fallback' } {
  const clean = rawWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!clean) return { phonemes: [], source: 'heuristic_fallback' };

  // 1. Check Slang Lexicon
  if (SLANG_PHONETIC_LEXICON[clean]) {
    return { phonemes: SLANG_PHONETIC_LEXICON[clean], source: 'slang_dictionary' };
  }

  // 2. Check CMU Dictionary / custom resolver if provided
  if (cmuLookup) {
    const cmuResult = cmuLookup(clean);
    if (cmuResult && cmuResult.length > 0) {
      return { phonemes: cmuResult, source: 'cmu_standard' };
    }
  }

  // 3. Fallback: deterministic phonetic estimation
  return {
    phonemes: estimateWordPhonemes(clean),
    source: 'heuristic_fallback',
  };
}

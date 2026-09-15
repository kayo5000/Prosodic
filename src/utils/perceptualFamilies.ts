/**
 * perceptualFamilies.ts
 *
 * Layer 1 & 2 Perceptual Vowel Family & Rhotic Classification Engine.
 * Ported directly from the vetted Prosodic Python linguistics architecture
 * (domain/perceptual_family_engine.py & domain/phoneme_engine.py).
 *
 * Core Architecture:
 * 1. Curated Registry: 12 canonical sound families + 5 Wells rhotic lexical sets.
 * 2. O(1) Precomputed Member Lexicon: 600+ hand-verified hip-hop rhyme anchors.
 * 3. R-Family Gate (classifyRFamily):
 *    - Class 1: ER (NURSE) - worst, thirst, curse, verse, reverse, hearse.
 *    - Class 2: VR (NEAR) - persevered, appeared, adhere, career, here, steer.
 *    - Class 3: EH+R (SQUARE) - rare, stare, care, there, bear.
 *    - Strict Invariant: Class 1 <-> Class 2 is HARD BLOCKED.
 * 4. Morpheme & Root Analysis: Handles prefixes/suffixes without regex false matches
 *    (e.g., -ceive -> EE_FAMILY, -here -> EER_FAMILY).
 * 5. Coda Compatibility Filter: Prevents false near-rhymes between words sharing only a vowel.
 * 6. Self-Rhyme Guard: Prevents spelling variants (Money/money, runnin'/Running) from claiming rhymes.
 */

import { countWordSyllables } from './syllableCounter';

export type VowelFamilyKey =
  | 'AY_FAMILY'   // /aɪ/ as in fly, night, sky, mind, life (AY2 in Python engine)
  | 'EE_FAMILY'   // /iː/ as in see, dream, deep, receive, perceive
  | 'EY_FAMILY'   // /eɪ/ as in state, reign, make, day, face
  | 'OH_FAMILY'   // /oʊ/ as in flow, know, tone, road, cold
  | 'OO_FAMILY'   // /uː/ as in true, crew, move, through, room
  | 'AH_FAMILY'   // /ɑː/ or /ʌ/ as in god, sun, rock, blood, love
  | 'EH_FAMILY'   // /ɛ/ as in red, breath, check, head, death
  | 'IH_FAMILY'   // /ɪ/ as in spit, hit, grid, win, think
  | 'AW_FAMILY'   // /ɔː/ or /aʊ/ as in raw, fall, crown, down, out
  | 'AE_FAMILY'   // /æ/ as in back, track, rap, trap, stand, plan
  | 'ER_FAMILY'   // /ɜːr/ as in word, burn, verse, worst, thirst, curse (NURSE)
  | 'AIR_FAMILY'  // /ɛər/ as in care, share, air, bear, stare (SQUARE)
  | 'EER_FAMILY'  // /ɪər/ as in clear, fear, here, hear, adhere, appear (NEAR)
  | 'AR_FAMILY'   // /ɑːr/ as in car, far, hard, dark, star (START)
  | 'OR_FAMILY'   // /ɔːr/ as in more, door, floor, store, war (NORTH/FORCE)
  | 'OY_FAMILY'   // /ɔɪ/ as in coin, voice, boy, joy
  | 'GENERAL';

export interface VowelFamilyMeta {
  key: VowelFamilyKey;
  label: string;
  color: string;
  phoneticSymbol: string;
}

export const VOWEL_FAMILIES: Record<VowelFamilyKey, VowelFamilyMeta> = {
  AY_FAMILY:  { key: 'AY_FAMILY',  label: 'AY Family',         color: '#60A5FA', phoneticSymbol: '/aɪ/' }, // Electric Blue
  EE_FAMILY:  { key: 'EE_FAMILY',  label: 'EE Family',         color: '#34D399', phoneticSymbol: '/iː/' }, // Emerald Green
  EY_FAMILY:  { key: 'EY_FAMILY',  label: 'EY Family',         color: '#A78BFA', phoneticSymbol: '/eɪ/' }, // Violet Purple
  OH_FAMILY:  { key: 'OH_FAMILY',  label: 'OH Family',         color: '#FBBF24', phoneticSymbol: '/oʊ/' }, // Amber Gold
  OO_FAMILY:  { key: 'OO_FAMILY',  label: 'OO Family',         color: '#38BDF8', phoneticSymbol: '/uː/' }, // Cyan
  AH_FAMILY:  { key: 'AH_FAMILY',  label: 'AH Family',         color: '#F87171', phoneticSymbol: '/ɑː/' }, // Coral Red
  EH_FAMILY:  { key: 'EH_FAMILY',  label: 'EH Family',         color: '#FB923C', phoneticSymbol: '/ɛ/' },  // Orange
  IH_FAMILY:  { key: 'IH_FAMILY',  label: 'IH Family',         color: '#4ADE80', phoneticSymbol: '/ɪ/' },  // Mint Green
  AW_FAMILY:  { key: 'AW_FAMILY',  label: 'AW Family',         color: '#E879F9', phoneticSymbol: '/ɔː/' }, // Pink Fuchsia
  AE_FAMILY:  { key: 'AE_FAMILY',  label: 'AE Family',         color: '#2DD4BF', phoneticSymbol: '/æ/' },  // Teal
  ER_FAMILY:  { key: 'ER_FAMILY',  label: 'ER (NURSE) Family', color: '#C084FC', phoneticSymbol: '/ɜːr/' }, // Lavender Purple
  AIR_FAMILY: { key: 'AIR_FAMILY', label: 'AIR (SQUARE)',      color: '#E07A5F', phoneticSymbol: '/ɛər/' }, // Terra Cotta
  EER_FAMILY: { key: 'EER_FAMILY', label: 'EER (NEAR)',        color: '#818CF8', phoneticSymbol: '/ɪər/' }, // Indigo
  AR_FAMILY:  { key: 'AR_FAMILY',  label: 'AR (START)',        color: '#F43F5E', phoneticSymbol: '/ɑːr/' }, // Rose Crimson
  OR_FAMILY:  { key: 'OR_FAMILY',  label: 'OR (NORTH/FORCE)',  color: '#D97706', phoneticSymbol: '/ɔːr/' }, // Ochre
  OY_FAMILY:  { key: 'OY_FAMILY',  label: 'OY Family',         color: '#F472B6', phoneticSymbol: '/ɔɪ/' }, // Rose
  GENERAL:    { key: 'GENERAL',    label: 'Consonant/Neutral', color: '#94A3B8', phoneticSymbol: '/-/' },  // Slate
};

// ---------------------------------------------------------------------------
// 1. Curated Perceptual Lexicon (Ported from domain/perceptual_family_engine.py)
// ---------------------------------------------------------------------------

const CURATED_LEXICON: Record<VowelFamilyKey, string[]> = {
  ER_FAMILY: [
    'worst', 'thirst', 'curse', 'verse', 'first', 'birth', 'hearse',
    'hurt', 'burst', 'nurse', 'rehearsal', 'dispersed', 'immersed',
    'reverse', 'church', 'murk', 'work', 'purpose', 'spurts', 'stir',
    'blur', 'her', 'were', 'sir', 'word', 'heard', 'bird', 'third',
    'girl', 'world', 'early', 'earth', 'worth', 'search', 'merge',
    'verge', 'emerge', 'urge', 'surge', 'purge', 'further', 'murder',
    'circle', 'circus', 'surface', 'shirts', 'girth', 'dirt', 'skirt',
    'turnt', 'merch', 'diverse', 'alert', 'smirk', 'convert', 'usurp',
    'purse', 'chirps', 'flirt', 'stern', 'burn', 'turn', 'learn', 'earn',
    'concern', 'return', 'confirm', 'firm', 'term', 'perm', 'worm',
    'squirt', 'squirm', 'lurk', 'quirk', 'jerk', 'perk', 'perch',
    'lurch', 'birch', 'slur', 'curb', 'disturb', 'blurb', 'universe',
  ],

  EER_FAMILY: [
    'adhere', 'adhered', 'adheres', 'persevered', 'persevere', 'persevering',
    'appeared', 'appear', 'appearing', 'disappear', 'disappeared',
    'steer', 'steered', 'career', 'careers', 'here', 'hear', 'hears',
    'clear', 'clears', 'cleared', 'clearly', 'fear', 'fears', 'near',
    'nears', 'nearly', 'dear', 'beer', 'peer', 'peers', 'peered',
    'cheer', 'cheers', 'cheered', 'spear', 'gear', 'sincere', 'frontier',
    'interfere', 'revere', 'severe', 'premiere', 'atmosphere', 'hemisphere',
    'year', 'years', 'tear', 'tears', 'pierce', 'piercing', 'pierced',
    'beard', 'weird', 'tier', 'tiers',
  ],

  AIR_FAMILY: [
    'care', 'cared', 'share', 'shared', 'stare', 'stared', 'stares',
    'air', 'airs', 'fair', 'hair', 'pair', 'chair', 'bear', 'bears',
    'wear', 'wears', 'swear', 'swears', 'there', 'where', 'rare',
    'dare', 'dares', 'scare', 'scared', 'spare', 'square', 'declare',
    'prepare', 'repair', 'affair', 'nightmare', 'parent', 'parents',
    'tear', 'tears', 'flare', 'glare', 'bare', 'barely', 'aware', 'unaware',
  ],

  AR_FAMILY: [
    'car', 'cars', 'far', 'bar', 'bars', 'hard', 'dark', 'park',
    'spark', 'mark', 'start', 'started', 'heart', 'part', 'parts',
    'smart', 'chart', 'yard', 'guard', 'card', 'cards', 'star',
    'stars', 'scar', 'tar', 'bizarre', 'alarm', 'farm', 'harm', 'army',
    'sharp', 'march', 'large', 'charge', 'barge',
  ],

  OR_FAMILY: [
    'more', 'door', 'doors', 'floor', 'floors', 'store', 'stores',
    'core', 'score', 'scores', 'shore', 'shores', 'tore', 'wore',
    'swore', 'for', 'war', 'wars', 'four', 'pour', 'pours', 'roar',
    'soar', 'board', 'boards', 'lord', 'cord', 'sword', 'afford',
    'ignore', 'explore', 'before', 'restore', 'born', 'torn', 'warn',
    'storm', 'form', 'norm', 'court', 'short', 'port', 'sport',
  ],

  EE_FAMILY: [
    'see', 'sees', 'seen', 'be', 'me', 'we', 'free', 'need', 'needs',
    'feel', 'feels', 'real', 'deal', 'heal', 'steel', 'deep', 'keep',
    'sleep', 'street', 'beat', 'meat', 'heat', 'dream', 'dreams',
    'team', 'scream', 'lean', 'clean', 'mean', 'scene', 'green',
    'queen', 'between', 'release', 'believe', 'believed', 'achieve',
    'achieved', 'receive', 'received', 'perceive', 'perceived',
    'deceive', 'deceived', 'conceive', 'conceived', 'receipt', 'deceit',
    'routine', 'supreme', 'scheme', 'theme', 'machine', 'screen',
    'magazine', 'limousine', 'quarantine', 'extreme', 'breeze', 'freeze',
    'peace', 'piece', 'speak', 'seek', 'peak', 'week', 'fleet', 'sweet',
    'lead', 'plead', 'bleed', 'speed', 'feed', 'seed',
  ],

  AY_FAMILY: [
    'life', 'night', 'mind', 'minds', 'time', 'times', 'right', 'light',
    'fight', 'side', 'find', 'finds', 'blind', 'behind', 'remind',
    'die', 'try', 'cry', 'fly', 'sky', 'high', 'why', 'my', 'by',
    'lie', 'tie', 'pride', 'ride', 'hide', 'guide', 'wide', 'inside',
    'outside', 'decide', 'provide', 'survive', 'arrive', 'drive',
    'alive', 'fire', 'desire', 'inspire', 'entire', 'retire', 'rhyme',
    'rhymes', 'sign', 'design', 'line', 'lines', 'shine', 'fine',
    'mine', 'nine', 'wine', 'pine', 'climb', 'prime', 'crime', 'grind',
  ],

  EY_FAMILY: [
    'day', 'days', 'way', 'ways', 'say', 'says', 'make', 'makes',
    'take', 'takes', 'place', 'face', 'change', 'same', 'name', 'names',
    'came', 'game', 'games', 'flame', 'frame', 'blame', 'claim',
    'aim', 'pain', 'rain', 'chain', 'chains', 'brain', 'gain', 'lane',
    'main', 'plain', 'train', 'wait', 'late', 'fate', 'gate', 'hate',
    'rate', 'state', 'great', 'straight', 'eight', 'reign', 'break',
    'shake', 'stake', 'bake', 'wake', 'chase', 'space', 'base', 'case',
    'safe', 'save', 'wave', 'brave', 'crave', 'slave', 'pave', 'gave',
    'cafe', 'fiance',
  ],

  OH_FAMILY: [
    'know', 'knows', 'known', 'flow', 'flows', 'show', 'shows', 'go',
    'goes', 'grow', 'grows', 'cold', 'old', 'hold', 'holds', 'soul',
    'souls', 'role', 'road', 'roads', 'code', 'mode', 'load', 'gold',
    'bold', 'fold', 'told', 'sold', 'whole', 'home', 'phone', 'stone',
    'bone', 'lone', 'tone', 'tones', 'zone', 'zones', 'alone', 'throne',
    'shown', 'blown', 'grown', 'own', 'owns', 'slow', 'glow', 'low',
    'blow', 'row', 'hope', 'rope', 'cope', 'smoke', 'broke', 'spoke',
    'choke', 'joke', 'woke', 'stroke', 'note', 'wrote', 'quote', 'vote',
  ],

  OO_FAMILY: [
    'through', 'thru', 'true', 'do', 'you', 'knew', 'grew', 'move',
    'moves', 'moved', 'prove', 'lose', 'choose', 'whose', 'blues',
    'rules', 'tools', 'cool', 'fool', 'pool', 'school', 'smooth',
    'groove', 'truth', 'youth', 'roof', 'proof', 'food', 'mood',
    'crude', 'dude', 'nude', 'rude', 'boom', 'room', 'zoom', 'doom',
    'bloom', 'consume', 'assume', 'resume', 'include', 'exclude',
    'shoot', 'boot', 'root', 'suit', 'crew', 'flew', 'drew', 'clue',
    'glue', 'blue', 'shoe',
  ],

  AH_FAMILY: [
    'blood', 'love', 'loves', 'loved', 'above', 'enough', 'tough',
    'rough', 'stuff', 'young', 'come', 'comes', 'some', 'run', 'runs',
    'gun', 'guns', 'sun', 'done', 'one', 'fun', 'none', 'ton',
    'begun', 'overcome', 'become', 'undone', 'someone', 'everyone',
    'trust', 'just', 'must', 'dust', 'bust', 'rush', 'crush', 'brush',
    'plus', 'thus', 'us', 'club', 'hub', 'rub', 'sub', 'tub', 'mud',
    'thug', 'plug', 'drug', 'hug', 'shrug', 'cut', 'gut', 'nut',
  ],

  EH_FAMILY: [
    'head', 'dead', 'said', 'bed', 'led', 'red', 'fed', 'spread',
    'thread', 'instead', 'breath', 'death', 'left', 'best', 'rest',
    'test', 'chest', 'west', 'blessed', 'stressed', 'pressed', 'mess',
    'less', 'guess', 'address', 'confess', 'success', 'express',
    'progress', 'step', 'steps', 'prep', 'rep', 'check', 'checks',
    'deck', 'neck', 'wreck', 'spec', 'connect', 'respect', 'protect',
    'heavy', 'ready', 'already', 'sweaty', 'steady', 'deadly', 'friend',
    'end', 'send', 'spend', 'blend', 'trend', 'bend', 'pen', 'ten',
  ],

  IH_FAMILY: [
    'it', 'with', 'this', 'is', 'live', 'lives', 'give', 'gives',
    'in', 'win', 'wins', 'begin', 'spin', 'thin', 'skin', 'king',
    'ring', 'sing', 'bring', 'spring', 'thing', 'things', 'swing',
    'sting', 'think', 'thinks', 'drink', 'link', 'sink', 'blink',
    'distinct', 'instinct', 'fix', 'mix', 'six', 'thick', 'trick',
    'click', 'stick', 'pick', 'kick', 'sick', 'quick', 'slick',
    'spit', 'hit', 'fit', 'bit', 'lit', 'slit', 'quit', 'admit',
    'commit', 'permit', 'limit', 'digit', 'rigid', 'bridge', 'switch',
    'bitch', 'rich', 'pitch', 'stitch', 'witch', 'wish', 'dish', 'fish',
  ],

  AW_FAMILY: [
    'down', 'found', 'ground', 'sound', 'around', 'out', 'about',
    'doubt', 'mouth', 'crowd', 'loud', 'proud', 'brown', 'town',
    'now', 'how', 'wow', 'cow', 'bow', 'power', 'hour', 'tower',
    'flower', 'shower', 'bounce', 'count', 'mount', 'announce',
    'house', 'mouse', 'cloud', 'allowed', 'crown', 'frown', 'gown',
    'south', 'shout', 'scout',
  ],

  AE_FAMILY: [
    'back', 'track', 'rap', 'trap', 'stack', 'black', 'crack', 'pack',
    'lack', 'attack', 'that', 'have', 'grab', 'bad', 'mad', 'sad',
    'glad', 'add', 'had', 'dad', 'and', 'hand', 'band', 'land',
    'sand', 'stand', 'brand', 'grand', 'plan', 'man', 'can', 'ran',
    'tan', 'van', 'fan', 'than', 'began', 'span', 'scan', 'slam',
    'jam', 'ham', 'damn', 'clam', 'exam', 'fact', 'act', 'exact',
    'impact', 'cash', 'dash', 'flash', 'smash', 'crash', 'trash',
  ],

  OY_FAMILY: [
    'boy', 'boys', 'toy', 'toys', 'joy', 'enjoy', 'coin', 'coins',
    'join', 'voice', 'voices', 'choice', 'choices', 'noise', 'point',
    'joint', 'spoil', 'oil', 'soil', 'boil', 'loyal', 'royal',
  ],

  GENERAL: [],
};

// Build high-speed O(1) reverse lookup map
const WORD_TO_FAMILY_MAP = new Map<string, VowelFamilyKey>();
Object.entries(CURATED_LEXICON).forEach(([familyKey, words]) => {
  const fam = familyKey as VowelFamilyKey;
  words.forEach((w) => {
    WORD_TO_FAMILY_MAP.set(w.toLowerCase().trim(), fam);
  });
});

// ---------------------------------------------------------------------------
// 2. R-Family Architectural Gate (classifyRFamily)
// ---------------------------------------------------------------------------

/**
 * Assigns a word to exactly one R-family class:
 * 0: Non-rhotic base (unaffected by rhotic gate)
 * 1: ER (NURSE) - worst, curse, thirst, verse, first, reverse, hearse, hurt, burn
 * 2: VR (NEAR)  - persevered, appeared, adhere, career, here, steer, fear, clear
 * 3: EH+R (SQUARE) - rare, stare, care, there, where, bear, wear
 *
 * Hard Compatibility Invariant (domain/phoneme_engine.py:178):
 * Class 1 <-> Class 2 is STRICTLY BLOCKED.
 * Class 1 <-> Class 3 is STRICTLY BLOCKED.
 */
export function classifyRFamily(rawWord: string): number {
  const word = normalizeWord(rawWord);
  if (!word || word.length < 2) return 0;

  // Check explicit curated lists first
  if (CURATED_LEXICON.ER_FAMILY.includes(word)) return 1;
  if (CURATED_LEXICON.EER_FAMILY.includes(word)) return 2;
  if (CURATED_LEXICON.AIR_FAMILY.includes(word)) return 3;

  // Root & morphological checks
  // 1. NEAR (VR) Class 2: -here, -peer, -steer, -cheer, -sphere, -vere, -pear
  if (/(here|peer|steer|cheer|sphere|vere|pear|near|fear|tear|clear|year)$/.test(word)) {
    return 2;
  }

  // 2. SQUARE (EH+R) Class 3: -are, -air, -ear (bear/wear/swear)
  if (/(care|share|stare|dare|rare|bare|fare|glare|flare|ware|air|fair|hair|pair|chair)$/.test(word)) {
    return 3;
  }

  // 3. NURSE (ER) Class 1: -verse, -curse, -first, -thirst, -burst, -hurt, -turn, -burn, -dirt, -shirt
  if (/(verse|curse|first|thirst|burst|hurt|turn|burn|dirt|shirt|skirt|birth|earth|worth|work|word|bird)$/.test(word)) {
    return 1;
  }

  return 0;
}

/**
 * Returns true if two words pass the R-family architectural gate.
 * Class 1 (ER) and Class 2 (VR) can NEVER rhyme together.
 */
export function areRClassesCompatible(classA: number, classB: number): boolean {
  if (classA === 0 || classB === 0) return true; // Non-rhotic words bypass the gate
  if (classA === 1 && classB === 2) return false; // HARD BLOCKED (thirst <-> adhere)
  if (classA === 2 && classB === 1) return false; // HARD BLOCKED (adhere <-> thirst)
  if (classA === 1 && classB === 3) return false; // HARD BLOCKED (curse <-> rare)
  if (classA === 3 && classB === 1) return false; // HARD BLOCKED (rare <-> curse)
  return true; // 1<->1, 2<->2, 3<->3, or 2<->3 (slant bridge)
}

// ---------------------------------------------------------------------------
// 3. Normalization & Morpheme-Aware Vowel Family Extractor
// ---------------------------------------------------------------------------

export function normalizeWord(rawWord: string): string {
  return rawWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim();
}

/**
 * Extracts the authoritative Vowel Sound Family for any English / Hip-Hop word:
 * 1. O(1) Curated Registry match.
 * 2. Root and morpheme structural inspection (-ceive -> EE, -here -> EER, -verse -> ER).
 * 3. Wells rhotic lexical set analysis (NURSE, NEAR, SQUARE, START, NORTH).
 * 4. Vowel digraphs & diphthongs with boundary protection.
 */
export function extractVowelFamily(rawWord: string): VowelFamilyKey {
  const word = normalizeWord(rawWord);
  if (!word || word.length < 2) return 'GENERAL';

  // 1. O(1) Registry Match
  const registered = WORD_TO_FAMILY_MAP.get(word);
  if (registered) return registered;

  // 2. High-Priority Morpheme & Root Invariants
  // A. -ceive / -ceipt / -ceit / -lieve / -chieve roots -> EE_FAMILY (/iː/)
  // Prevents naive '/ive/' regex from misclassifying perceived, receive, deceive
  if (/(ceive|ceived|ceiving|ceipt|ceit|lieve|lieved|lieving|chieve|chieved|chieving)$/.test(word)) {
    return 'EE_FAMILY';
  }

  // B. -here / -sphere / -vere / -pear roots -> EER_FAMILY (/ɪər/)
  // Prevents naive '/er$/' or '/her/' regex from misclassifying adhere, persevere, atmosphere
  if (/(here|hered|heres|sphere|spheres|vere|vered|vering|pear|peared|pearing|steer|steered)$/.test(word)) {
    return 'EER_FAMILY';
  }

  // C. -verse / -curse / -burst / -hearse roots -> ER_FAMILY (/ɜːr/)
  if (/(verse|versed|verses|curse|cursed|curses|burst|bursts|hearse|hearses)$/.test(word)) {
    return 'ER_FAMILY';
  }

  // 3. Wells Rhotic Lexical Sets (Strict word boundaries to avoid prefix pollution)
  // NEAR (/ɪər/): clear, fear, near, year, dear, beer, peer, cheer, steer, appear
  if (/^(clear|fear|near|year|dear|beer|peer|steer|cheer|appear|spear|gear|shear|smear)$/.test(word)) {
    return 'EER_FAMILY';
  }
  // SQUARE (/ɛər/): care, share, stare, air, fair, hair, pair, chair, bear, wear, swear, there, where, rare, dare
  if (/^(care|share|stare|air|fair|hair|pair|chair|bear|wear|swear|there|where|rare|dare|scare|spare|square|declare|prepare|repair|affair)$/.test(word)) {
    return 'AIR_FAMILY';
  }
  // START (/ɑːr/): car, far, bar, hard, dark, park, spark, start, heart, part, smart, chart, yard, guard, star
  if (/ar$|^(car|far|bar|hard|dark|park|spark|start|heart|part|smart|chart|yard|guard|card|star|scar|tar|bizarre|alarm|farm|harm|army)$/.test(word)) {
    return 'AR_FAMILY';
  }
  // NORTH / FORCE (/ɔːr/): more, door, floor, store, core, score, shore, for, war, four, pour, roar, soar, board, lord
  if (/ore$|^(door|floor|store|score|shore|four|pour|roar|soar|board|lord|cord|sword|afford|ignore|explore|before|restore|more|for|war|tore|wore)$/.test(word)) {
    return 'OR_FAMILY';
  }
  // NURSE (/ɜːr/): burn, turn, verse, first, word, bird, third, curse, nurse, church, girl, world, earth, hurt, burst, stir, sir, her, fur
  if (/er$|ir$|ur$|^(word|burn|turn|verse|first|third|learn|heard|work|curse|nurse|church|girl|world|earth|hurt|burst|surf|stir|sir|her|fur)$/.test(word)) {
    return 'ER_FAMILY';
  }

  // 4. Common Vowel Pattern Heuristics
  // AY (/aɪ/): night, fight, mind, find, line, shine, try, fly, sky, my, by
  if (/ight$|ite$|ike$|ime$|ine$|ire$|ize$|igh$|^(by|my|fly|sky|dry|why|try|cry|spy|ply|shy|guy|buy)$/.test(word)) {
    return 'AY_FAMILY';
  }
  // EE (/iː/): deep, feel, keep, beat, dream, clean, scene, see, free
  if (/ee|ea|eat$|eep$|eet$|eed$|eam$|^(see|be|we|me|tree|free)$/.test(word)) {
    return 'EE_FAMILY';
  }
  // EY (/eɪ/): day, make, take, came, name, rain, train, state, fate
  if (/ay$|ai|ake$|ate$|ame$|ave$|ane$|ade$|ale$|ape$|ace$|^(great|break|eight|reign)$/.test(word)) {
    return 'EY_FAMILY';
  }
  // OH (/oʊ/): know, flow, show, cold, gold, road, home, tone
  if (/ow$|oe$|oa|one$|oke$|ole$|ose$|ote$|ode$|^(know|flow|grow|slow|home|road|cold|gold)$/.test(word)) {
    return 'OH_FAMILY';
  }
  // OO (/uː/): through, true, blue, move, prove, cool, room, rule
  if (/oo|ue$|ew$|uit$|^(through|true|blue|move|prove|groove|rule|cool|fool|room|boot)$/.test(word)) {
    return 'OO_FAMILY';
  }
  // OY (/ɔɪ/): coin, voice, noise, boy, toy, joy
  if (/oy|oi/.test(word)) {
    return 'OY_FAMILY';
  }
  // AW (/ɔː/ or /aʊ/): down, town, out, shout, call, fall, raw
  if (/aw$|au|ought$|all$|^(down|town|brown|out|shout|loud|proud|crowd)$/.test(word)) {
    return 'AW_FAMILY';
  }
  // EH (/ɛ/): head, dead, check, step, pen, ten, red
  if (/e[bcdfgklmnprstvz]$|^(head|dead|read|check|step|pen|ten|set|let|red|bed|led)$/.test(word)) {
    return 'EH_FAMILY';
  }
  // IH (/ɪ/): spit, hit, grid, win, sin, bit, kick
  if (/i[bcdfgklmnprstvz]$|^(spit|hit|fit|grid|bit|mic|lick|kick|win|sin|skin|it|is|in)$/.test(word)) {
    return 'IH_FAMILY';
  }
  // AH (/ʌ/ or /ɑː/): cut, sun, run, gun, blood, god, hot
  if (/u[bcdfgklmnprstvz]$|o[bcdfgklmnprstvz]$|^(cut|sun|run|gun|blood|flood|god|hot|top|rock|love|come|some)$/.test(word)) {
    return 'AH_FAMILY';
  }

  return 'GENERAL';
}

// ---------------------------------------------------------------------------
// 4. Coda & Self-Rhyme Verification
// ---------------------------------------------------------------------------

/**
 * Checks whether two words share compatible coda consonants.
 * Resolves the finding in docs/RHYME_CADENCE_QUALITY_FINDINGS.md:
 * Blocks near-rhymes that share a vowel but have completely mismatched codas
 * (e.g. "started" /t/ vs "block" /k/, "thirst" /st/ vs "adhere" /r/).
 */
export function areCodasCompatible(
  wordA: string,
  wordB: string,
  famA: VowelFamilyKey,
  famB: VowelFamilyKey,
): boolean {
  if (famA !== famB) return false;

  const normA = normalizeWord(wordA);
  const normB = normalizeWord(wordB);
  if (normA === normB) return true;

  // Check R-Class partition
  const rA = classifyRFamily(normA);
  const rB = classifyRFamily(normB);
  if (!areRClassesCompatible(rA, rB)) return false;

  // Extract trailing 2 consonants/characters
  const codaA = normA.slice(-2);
  const codaB = normB.slice(-2);
  if (codaA === codaB) return true;

  // Single terminal consonant match (e.g. cat/hat, deep/keep)
  const lastA = normA.slice(-1);
  const lastB = normB.slice(-1);
  if (lastA === lastB) return true;

  // Both open syllables (e.g. see/free, know/flow, day/way)
  const isOpenA = /[aeiouy]$/.test(normA);
  const isOpenB = /[aeiouy]$/.test(normB);
  if (isOpenA && isOpenB) return true;

  // Rhotic coda consistency
  if (rA > 0 && rB > 0 && rA === rB) return true;

  return false;
}

/**
 * Self-rhyme guard (domain/phoneme_engine.py:278).
 * Ensures that identical words or inflectional/case variants
 * (e.g. "Money" vs "money", "runnin'" vs "Running") do NOT register as rhymes.
 */
export function isSelfRhyme(rawA: string, rawB: string): boolean {
  const normA = normalizeWord(rawA).replace(/in$/, 'ing');
  const normB = normalizeWord(rawB).replace(/in$/, 'ing');
  return normA.length > 0 && normA === normB;
}

// ---------------------------------------------------------------------------
// 5. Syllable-by-Syllable Rhyme Mapping Engine (domain/syllable_engine.py)
// ---------------------------------------------------------------------------

export interface SyllableToken {
  text: string;
  isWord: boolean;
  vowelFamily: VowelFamilyKey;
  color: string;
  syllableIndex: number;
  totalSyllables: number;
}

/**
 * Splits a word into character ranges [start, end] for each syllable,
 * matching the Python syllable engine midpoint & single-consonant coda rules.
 */
export function getWordSyllableCharRanges(word: string, numSyllables: number): Array<[number, number]> {
  const n = word.length;
  if (numSyllables <= 0) return [];
  if (numSyllables === 1) return [[0, n]];

  const wLower = word.toLowerCase();
  const vowelSet = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

  // Find start index of each vowel group
  const vowelStarts: number[] = [];
  let inVowel = false;
  for (let i = 0; i < wLower.length; i++) {
    if (vowelSet.has(wLower[i])) {
      if (!inVowel) {
        vowelStarts.push(i);
      }
      inVowel = true;
    } else {
      inVowel = false;
    }
  }

  if (vowelStarts.length < numSyllables) {
    const chunk = n / numSyllables;
    return Array.from({ length: numSyllables }, (_, i) => [
      Math.floor(i * chunk),
      i === numSyllables - 1 ? n : Math.floor((i + 1) * chunk),
    ]);
  }

  const anchors = vowelStarts.slice(0, numSyllables);

  const getVowelGroupEnd = (pos: number): number => {
    let p = pos;
    while (p < n && vowelSet.has(wLower[p])) {
      p++;
    }
    return p;
  };

  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < numSyllables; i++) {
    const start = i === 0 ? 0 : ranges[ranges.length - 1][1];
    let end: number;
    if (i === numSyllables - 1) {
      end = n;
    } else {
      const vEnd = getVowelGroupEnd(anchors[i]);
      const inter = anchors[i + 1] - vEnd;
      if (inter === 1) {
        // Single consonant between vowels -> attach as coda
        end = vEnd + 1;
      } else {
        // Multiple consonants -> split midpoint
        end = Math.floor((anchors[i] + anchors[i + 1]) / 2) + 1;
      }
    }
    ranges.push([start, Math.min(n, Math.max(start + 1, end))]);
  }
  return ranges;
}

/**
 * Extracts syllable-by-syllable tokens for a line of text,
 * associating each syllable with its exact perceptual vowel family and signature color.
 */
export function dissectLineIntoSyllableTokens(lineText: string): SyllableToken[] {
  if (!lineText) return [];

  // Match words vs non-word tokens (spaces, punctuation)
  const tokens: SyllableToken[] = [];
  const regex = /([a-zA-Z0-9'’]+)|([^a-zA-Z0-9'’]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(lineText)) !== null) {
    const fullMatch = match[0];
    const isWord = Boolean(match[1]);

    if (!isWord) {
      tokens.push({
        text: fullMatch,
        isWord: false,
        vowelFamily: 'GENERAL',
        color: 'transparent',
        syllableIndex: 0,
        totalSyllables: 0,
      });
      continue;
    }

    const cleanWord = fullMatch.replace(/[^a-zA-Z0-9']/g, '');
    const sylCount = Math.max(1, countWordSyllables(cleanWord));
    const ranges = getWordSyllableCharRanges(fullMatch, sylCount);

    ranges.forEach(([start, end], sIdx) => {
      const sylText = fullMatch.slice(start, end);
      if (!sylText) return;

      // Classify this specific syllable's vowel sound
      let fam: VowelFamilyKey = 'GENERAL';
      const rClass = classifyRFamily(sylText);
      if (rClass === 1) fam = 'ER_FAMILY';
      else if (rClass === 2) fam = 'EER_FAMILY';
      else if (rClass === 3) fam = 'AIR_FAMILY';
      else {
        fam = extractVowelFamily(sylText);
        // If syllable-level returned GENERAL, check whole word fallback
        if (fam === 'GENERAL') {
          fam = extractVowelFamily(cleanWord);
        }
      }

      const color = VOWEL_FAMILIES[fam]?.color || '#E5A50A';

      tokens.push({
        text: sylText,
        isWord: true,
        vowelFamily: fam,
        color,
        syllableIndex: sIdx,
        totalSyllables: sylCount,
      });
    });
  }

  return tokens;
}

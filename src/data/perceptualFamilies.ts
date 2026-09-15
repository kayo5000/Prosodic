/**
 * perceptualFamilies.ts
 *
 * Layer 1 of the two-layer rhyme family system for Prosodic.
 * Defines a curated registry of 12 named sonic families, each identified by an
 * ARPABET vowel nucleus and a hand-verified member list (500+ core hip-hop & R&B words).
 *
 * Source: domain/perceptual_family_engine.py from the original Prosodic build.
 */

export type PerceptualFamilyName =
  | 'R_FAMILY'   // Nucleus: ER (worst, curse, verse, first, birth) - NURSE
  | 'AIR_FAMILY' // Nucleus: EH R (care, share, stare, air, bear) - SQUARE
  | 'EER_FAMILY' // Nucleus: IH R (clear, fear, here, hear, near) - NEAR
  | 'AR_FAMILY'  // Nucleus: AA R (car, far, bar, hard, dark) - START
  | 'OR_FAMILY'  // Nucleus: AO R (more, door, floor, store, four) - NORTH/FORCE
  | 'AY_FAMILY'  // Nucleus: EY (day, way, make, place, name)
  | 'EE_FAMILY'  // Nucleus: IY (see, free, feel, real, deep)
  | 'OW_FAMILY'  // Nucleus: OW (know, flow, soul, cold, road)
  | 'AH_FAMILY'  // Nucleus: AH (blood, love, tough, run, trust)
  | 'AY2_FAMILY' // Nucleus: AY (life, night, mind, time, light)
  | 'OO_FAMILY'  // Nucleus: UW (through, true, move, cool, truth)
  | 'AW_FAMILY'  // Nucleus: AW (down, found, ground, sound, out)
  | 'AE_FAMILY'  // Nucleus: AE (back, track, rap, trap, black)
  | 'OH_FAMILY'  // Nucleus: AO (talk, call, fall, thought, law)
  | 'IH_FAMILY'  // Nucleus: IH (win, begin, spin, king, think)
  | 'EH_FAMILY'; // Nucleus: EH (head, dead, breath, best, death)

export interface PerceptualFamilyMeta {
  name: PerceptualFamilyName;
  nucleus: string;
  label: string;
  color: string;
  phoneticSymbol: string;
  anchors: string[];
  members: string[];
  boundaryWords: string[];
}

export const PERCEPTUAL_FAMILIES: Record<PerceptualFamilyName, PerceptualFamilyMeta> = {
  R_FAMILY: {
    name: 'R_FAMILY',
    nucleus: 'ER',
    label: 'ER (NURSE) Family',
    color: '#C084FC', // Lavender
    phoneticSymbol: '/ɜːr/',
    anchors: ['worst', 'curse', 'verse', 'first', 'birth'],
    boundaryWords: ['further', 'murder', 'heard', 'word'],
    members: [
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
      'squirt', 'squirm', 'lurk', 'quirk', 'jerk', 'perk', 'erk', 'irk',
      'perch', 'lurch', 'birch',
    ],
  },

  AIR_FAMILY: {
    name: 'AIR_FAMILY',
    nucleus: 'EH R',
    label: 'AIR (SQUARE) Family',
    color: '#E07A5F', // Terra Cotta
    phoneticSymbol: '/ɛər/',
    anchors: ['care', 'share', 'stare', 'air', 'bear'],
    boundaryWords: ['fair', 'hair', 'wear', 'tear'],
    members: [
      'care', 'share', 'stare', 'air', 'fair', 'hair', 'pair', 'chair',
      'bear', 'wear', 'tear', 'swear', 'there', 'where', 'rare', 'dare',
      'flare', 'glare', 'scare', 'spare', 'declare', 'prepare', 'repair',
      'affair', 'nightmare', 'beware', 'square', 'aware',
    ],
  },

  EER_FAMILY: {
    name: 'EER_FAMILY',
    nucleus: 'IH R',
    label: 'EER (NEAR) Family',
    color: '#818CF8', // Indigo
    phoneticSymbol: '/ɪər/',
    anchors: ['clear', 'fear', 'here', 'hear', 'near'],
    boundaryWords: ['dear', 'beer', 'peer', 'tier'],
    members: [
      'clear', 'fear', 'here', 'hear', 'near', 'year', 'dear', 'beer',
      'peer', 'steer', 'cheer', 'career', 'appear', 'disappear', 'severe',
      'interfere', 'sincere', 'atmosphere', 'pioneer', 'volunteer', 'frontier',
      'engineer', 'premier', 'spear', 'gear',
    ],
  },

  AR_FAMILY: {
    name: 'AR_FAMILY',
    nucleus: 'AA R',
    label: 'AR (START) Family',
    color: '#F43F5E', // Rose Crimson
    phoneticSymbol: '/ɑːr/',
    anchors: ['car', 'far', 'bar', 'hard', 'dark'],
    boundaryWords: ['park', 'smart', 'heart', 'start'],
    members: [
      'car', 'far', 'bar', 'hard', 'dark', 'park', 'spark', 'mark',
      'start', 'heart', 'part', 'art', 'smart', 'chart', 'yard', 'guard',
      'card', 'scar', 'tar', 'star', 'guitar', 'bizarre', 'bazaar', 'alarm',
      'charm', 'farm', 'harm', 'army',
    ],
  },

  OR_FAMILY: {
    name: 'OR_FAMILY',
    nucleus: 'AO R',
    label: 'OR (NORTH) Family',
    color: '#D97706', // Ochre
    phoneticSymbol: '/ɔːr/',
    anchors: ['more', 'door', 'floor', 'store', 'four'],
    boundaryWords: ['for', 'war', 'pour', 'roar'],
    members: [
      'more', 'door', 'floor', 'store', 'core', 'score', 'shore', 'tore',
      'wore', 'swore', 'for', 'war', 'four', 'pour', 'roar', 'soar',
      'board', 'lord', 'cord', 'sword', 'afford', 'ignore', 'explore',
      'before', 'restore', 'implore', 'outdoor', 'indoor',
    ],
  },

  AY_FAMILY: {
    name: 'AY_FAMILY',
    nucleus: 'EY',
    label: 'AY (Long A) Family',
    color: '#A78BFA', // Violet
    phoneticSymbol: '/eɪ/',
    anchors: ['day', 'way', 'name', 'face', 'change'],
    boundaryWords: ['great', 'straight', 'eight'],
    members: [
      'day', 'way', 'say', 'make', 'take', 'place', 'face', 'change',
      'same', 'name', 'came', 'game', 'flame', 'frame', 'blame', 'claim',
      'aim', 'pain', 'rain', 'chain', 'brain', 'gain', 'lane', 'main',
      'plain', 'train', 'wait', 'late', 'fate', 'gate', 'hate', 'rate',
      'state', 'break', 'reign', 'blade', 'shade', 'fade', 'trade', 'grade',
      'space', 'race', 'case', 'base', 'chase', 'grace', 'praise', 'blaze',
    ],
  },

  EE_FAMILY: {
    name: 'EE_FAMILY',
    nucleus: 'IY',
    label: 'EE Family',
    color: '#34D399', // Emerald
    phoneticSymbol: '/iː/',
    anchors: ['see', 'free', 'feel', 'real', 'deep'],
    boundaryWords: [
      'clear', 'here', 'fear', 'near', 'hear', 'year', 'dear', 'beer',
      'peer', 'steer', 'cheer', 'career', 'appear',
    ],
    members: [
      'see', 'be', 'me', 'free', 'need', 'feel', 'real', 'deal', 'heal',
      'steel', 'deep', 'keep', 'sleep', 'street', 'beat', 'meat', 'heat',
      'dream', 'team', 'scream', 'lean', 'clean', 'mean', 'scene',
      'green', 'queen', 'between', 'release', 'believe', 'achieve',
      'receive', 'scheme', 'theme', 'machine', 'supreme', 'routine',
      'extreme', 'screen', 'peace', 'piece', 'breathe', 'leave',
    ],
  },

  OW_FAMILY: {
    name: 'OW_FAMILY',
    nucleus: 'OW',
    label: 'OW (Long O) Family',
    color: '#FBBF24', // Amber
    phoneticSymbol: '/oʊ/',
    anchors: ['know', 'flow', 'soul', 'cold', 'road'],
    boundaryWords: ['door', 'more', 'floor', 'store'],
    members: [
      'know', 'flow', 'show', 'go', 'grow', 'cold', 'old', 'hold',
      'soul', 'role', 'road', 'code', 'mode', 'load', 'gold', 'bold',
      'fold', 'told', 'sold', 'whole', 'home', 'phone', 'stone', 'bone',
      'lone', 'tone', 'zone', 'alone', 'throne', 'shown', 'blown',
      'grown', 'own', 'blow', 'glow', 'slow', 'throw', 'chose', 'close',
      'froze', 'rose', 'coast', 'toast', 'ghost', 'most',
    ],
  },

  AH_FAMILY: {
    name: 'AH_FAMILY',
    nucleus: 'AH',
    label: 'AH (Short U) Family',
    color: '#F87171', // Coral Red
    phoneticSymbol: '/ʌ/',
    anchors: ['blood', 'love', 'tough', 'run', 'trust'],
    boundaryWords: ['month', 'front'],
    members: [
      'blood', 'love', 'above', 'enough', 'tough', 'rough', 'stuff',
      'young', 'come', 'some', 'run', 'gun', 'sun', 'done', 'one', 'fun',
      'none', 'ton', 'begun', 'overcome', 'become', 'undone', 'someone',
      'everyone', 'trust', 'just', 'must', 'dust', 'bust', 'rush',
      'crush', 'brush', 'plus', 'thus', 'us', 'club', 'hub', 'rub',
      'sub', 'tub', 'flood', 'mud', 'judge', 'grudge', 'shrug', 'hug',
    ],
  },

  AY2_FAMILY: {
    name: 'AY2_FAMILY',
    nucleus: 'AY',
    label: 'AY2 (Long I) Family',
    color: '#60A5FA', // Electric Blue
    phoneticSymbol: '/aɪ/',
    anchors: ['life', 'night', 'mind', 'time', 'light'],
    boundaryWords: ['ride', 'wide', 'provide'],
    members: [
      'life', 'night', 'mind', 'time', 'right', 'light', 'fight',
      'side', 'find', 'blind', 'behind', 'remind', 'die', 'try', 'cry',
      'fly', 'sky', 'high', 'why', 'my', 'by', 'lie', 'tie', 'pride',
      'ride', 'hide', 'guide', 'wide', 'inside', 'outside', 'decide',
      'provide', 'survive', 'arrive', 'drive', 'alive', 'fire', 'desire',
      'inspire', 'entire', 'retire', 'rhyme', 'prime', 'climb', 'crime',
      'shine', 'line', 'fine', 'mine', 'sign', 'design', 'divine',
    ],
  },

  OO_FAMILY: {
    name: 'OO_FAMILY',
    nucleus: 'UW',
    label: 'OO (Long U) Family',
    color: '#38BDF8', // Cyan
    phoneticSymbol: '/uː/',
    anchors: ['through', 'true', 'move', 'cool', 'truth'],
    boundaryWords: ['cure', 'pure', 'sure'],
    members: [
      'through', 'true', 'do', 'you', 'knew', 'grew', 'move', 'prove',
      'lose', 'choose', 'whose', 'blues', 'rules', 'tools', 'cool',
      'fool', 'pool', 'school', 'smooth', 'groove', 'truth', 'youth',
      'roof', 'proof', 'food', 'mood', 'crude', 'dude', 'nude', 'rude',
      'boom', 'room', 'zoom', 'doom', 'bloom', 'consume', 'assume',
      'resume', 'include', 'exclude', 'crew', 'blue', 'flew', 'shoe',
    ],
  },

  AW_FAMILY: {
    name: 'AW_FAMILY',
    nucleus: 'AW',
    label: 'AW (OW Dip) Family',
    color: '#E879F9', // Pink Fuchsia
    phoneticSymbol: '/aʊ/',
    anchors: ['down', 'found', 'ground', 'sound', 'out'],
    boundaryWords: ['crown', 'frown', 'gown'],
    members: [
      'down', 'found', 'ground', 'sound', 'around', 'out', 'about',
      'doubt', 'mouth', 'crowd', 'loud', 'proud', 'brown', 'town',
      'now', 'how', 'wow', 'cow', 'bow', 'power', 'hour', 'tower',
      'flower', 'shower', 'bounce', 'count', 'mount', 'announce',
      'denounce', 'pronounce', 'house', 'mouse', 'cloud', 'allowed',
      'south', 'shout', 'crown', 'drown',
    ],
  },

  AE_FAMILY: {
    name: 'AE_FAMILY',
    nucleus: 'AE',
    label: 'AE (Short A) Family',
    color: '#EAB308', // Yellow
    phoneticSymbol: '/æ/',
    anchors: ['back', 'track', 'rap', 'trap', 'black'],
    boundaryWords: ['ask', 'past', 'last'],
    members: [
      'back', 'track', 'rap', 'trap', 'stack', 'black', 'crack', 'pack',
      'lack', 'attack', 'that', 'have', 'grab', 'bad', 'mad', 'sad',
      'glad', 'add', 'had', 'dad', 'and', 'hand', 'band', 'land',
      'sand', 'stand', 'brand', 'grand', 'plan', 'man', 'can', 'ran',
      'tan', 'van', 'fan', 'than', 'began', 'span', 'scan', 'slam',
      'jam', 'ham', 'damn', 'clam', 'exam', 'smash', 'crash', 'flash',
    ],
  },

  OH_FAMILY: {
    name: 'OH_FAMILY',
    nucleus: 'AO',
    label: 'OH (Broad O) Family',
    color: '#FB923C', // Orange
    phoneticSymbol: '/ɔː/',
    anchors: ['talk', 'call', 'fall', 'thought', 'law'],
    boundaryWords: ['war', 'more', 'core', 'floor', 'store', 'door', 'four'],
    members: [
      'talk', 'walk', 'call', 'fall', 'hall', 'all', 'ball', 'caught',
      'thought', 'bought', 'brought', 'law', 'raw', 'jaw', 'draw',
      'saw', 'flaw', 'cause', 'pause', 'clause', 'small', 'tall',
      'wall', 'crawl', 'sprawl', 'install', 'recall', 'enthrall',
      'long', 'strong', 'wrong', 'song', 'belong', 'along', 'broad',
    ],
  },

  IH_FAMILY: {
    name: 'IH_FAMILY',
    nucleus: 'IH',
    label: 'IH (Short I) Family',
    color: '#4ADE80', // Mint
    phoneticSymbol: '/ɪ/',
    anchors: ['win', 'begin', 'spin', 'king', 'think'],
    boundaryWords: ['been', 'seen', 'green'],
    members: [
      'it', 'with', 'this', 'is', 'live', 'give', 'in', 'win', 'begin',
      'spin', 'thin', 'skin', 'king', 'ring', 'sing', 'bring', 'spring',
      'thing', 'swing', 'sting', 'think', 'drink', 'link', 'sink', 'blink',
      'distinct', 'instinct', 'fix', 'mix', 'six', 'thick', 'trick',
      'click', 'stick', 'pick', 'kick', 'sick', 'quick', 'slick',
      'spit', 'hit', 'fit', 'grid', 'bit', 'mic', 'brick', 'cliff',
    ],
  },

  EH_FAMILY: {
    name: 'EH_FAMILY',
    nucleus: 'EH',
    label: 'EH (Short E) Family',
    color: '#F43F5E', // Rose Crimson
    phoneticSymbol: '/ɛ/',
    anchors: ['head', 'dead', 'breath', 'best', 'death'],
    boundaryWords: ['said', 'again'],
    members: [
      'head', 'dead', 'said', 'bed', 'led', 'red', 'fed', 'spread',
      'thread', 'instead', 'breath', 'death', 'left', 'best', 'rest',
      'test', 'chest', 'west', 'blessed', 'stressed', 'pressed', 'mess',
      'less', 'guess', 'address', 'confess', 'success', 'express',
      'progress', 'step', 'prep', 'rep', 'check', 'deck', 'neck',
      'wreck', 'spec', 'connect', 'respect', 'protect', 'flesh', 'fresh',
    ],
  },
};

// ---------------------------------------------------------------------------
// Reverse Indexes for Fast O(1) Lookup
// ---------------------------------------------------------------------------

const BOUNDARY_WORD_FLAGS = new Set<string>();
const WORD_TO_FAMILY: Record<string, PerceptualFamilyName> = {};

Object.values(PERCEPTUAL_FAMILIES).forEach((fam) => {
  fam.boundaryWords.forEach((bw) => BOUNDARY_WORD_FLAGS.add(bw.toLowerCase()));
  fam.members.forEach((w) => {
    const wl = w.toLowerCase();
    if (!BOUNDARY_WORD_FLAGS.has(wl)) {
      WORD_TO_FAMILY[wl] = fam.name;
    }
  });
});

/**
 * Returns the perceptual sonic family for any word with O(1) dictionary speed.
 */
export function getPerceptualFamily(rawWord: string): PerceptualFamilyMeta | null {
  const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return null;

  const familyName = WORD_TO_FAMILY[clean];
  if (familyName && PERCEPTUAL_FAMILIES[familyName]) {
    return PERCEPTUAL_FAMILIES[familyName];
  }

  return null;
}

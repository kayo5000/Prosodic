'''
Perceptual Family Engine
Layer 1 of the two-layer rhyme family system.

Defines a curated registry of 12 named sonic families, each identified by an
ARPABET vowel nucleus and a hand-verified member list. These families are KNOWN
before reading any verse — they are defined, not computed from verse content.

Downstream engines (motif, rhyme_detection, suggestion) use these anchors for
confidence scoring, family disambiguation, and catching unregistered words that
phonetically belong to a known family.

This engine deliberately has no knowledge of verse context. It does not import
or invoke motif_engine, pocket_engine, or rhyme_detection_engine. It sits below
all of them in the dependency chain.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import logging
from phoneme_engine import rhyme_score, FUNCTION_WORDS, get_rhyme_unit
from syllable_engine import syllabify_line

log = logging.getLogger(__name__)

# ── Registry ──────────────────────────────────────────────────────────────────

PERCEPTUAL_FAMILIES = {
    'R_FAMILY': {
        'name':    'R_FAMILY',
        'nucleus': 'ER',
        'members': [
            'worst', 'thirst', 'curse', 'verse', 'first', 'birth', 'hearse',
            'hurt', 'burst', 'nurse', 'rehearsal', 'dispersed', 'immersed',
            'reverse', 'church', 'murk', 'work', 'purpose', 'spurts', 'stir',
            'blur', 'her', 'were', 'sir', 'word', 'heard', 'bird', 'third',
            'girl', 'world', 'early', 'earth', 'worth', 'search', 'merge',
            'verge', 'emerge', 'urge', 'surge', 'purge', 'further', 'murder',
            'circle', 'circus', 'surface',
            'shirts', 'girth', 'dirt', 'skirt', 'turnt', 'merch', 'diverse',
            'alert', 'smirk', 'convert', 'usurp', 'purse', 'chirps', 'flirt',
            'stern', 'burn', 'turn', 'learn', 'earn', 'concern', 'return',
            'confirm', 'firm', 'term', 'perm', 'worm', 'squirt', 'squirm',
            'lurk', 'quirk', 'jerk', 'perk', 'erk', 'irk', 'perch', 'lurch',
            'birch',
        ],
        'anchors': ['worst', 'curse', 'verse', 'first', 'birth'],
        'boundary_words': [
            'clear', 'here', 'fear', 'near', 'hear', 'year', 'dear', 'beer',
            'peer', 'steer', 'cheer', 'career', 'appear',
        ],
    },

    'AY_FAMILY': {
        'name':    'AY_FAMILY',
        'nucleus': 'EY',
        'members': [
            'day', 'way', 'say', 'make', 'take', 'place', 'face', 'change',
            'same', 'name', 'came', 'game', 'flame', 'frame', 'blame', 'claim',
            'aim', 'pain', 'rain', 'chain', 'brain', 'gain', 'lane', 'main',
            'plain', 'train', 'wait', 'late', 'fate', 'gate', 'hate', 'rate',
            'state',
        ],
        'anchors': ['day', 'way', 'name', 'face', 'change'],
        'boundary_words': ['great', 'straight', 'eight'],
    },

    'EE_FAMILY': {
        'name':    'EE_FAMILY',
        'nucleus': 'IY',
        'members': [
            'see', 'be', 'me', 'free', 'need', 'feel', 'real', 'deal', 'heal',
            'steel', 'deep', 'keep', 'sleep', 'street', 'beat', 'meat', 'heat',
            'dream', 'team', 'scream', 'lean', 'clean', 'mean', 'scene',
            'green', 'queen', 'between', 'release', 'believe', 'achieve',
            'receive',
        ],
        'anchors': ['see', 'free', 'feel', 'real', 'deep'],
        'boundary_words': [
            'clear', 'here', 'fear', 'near', 'hear', 'year', 'dear', 'beer',
            'peer', 'steer', 'cheer', 'career', 'appear',
        ],
    },

    'OW_FAMILY': {
        'name':    'OW_FAMILY',
        'nucleus': 'OW',
        'members': [
            'know', 'flow', 'show', 'go', 'grow', 'cold', 'old', 'hold',
            'soul', 'role', 'road', 'code', 'mode', 'load', 'gold', 'bold',
            'fold', 'told', 'sold', 'whole', 'home', 'phone', 'stone', 'bone',
            'lone', 'tone', 'zone', 'alone', 'throne', 'shown', 'blown',
            'grown', 'own',
        ],
        'anchors': ['know', 'flow', 'soul', 'cold', 'road'],
        'boundary_words': ['door', 'more', 'floor', 'store'],
    },

    'AH_FAMILY': {
        'name':    'AH_FAMILY',
        'nucleus': 'AH',
        'members': [
            'blood', 'love', 'above', 'enough', 'tough', 'rough', 'stuff',
            'young', 'come', 'some', 'run', 'gun', 'sun', 'done', 'one', 'fun',
            'none', 'ton', 'begun', 'overcome', 'become', 'undone', 'someone',
            'everyone', 'trust', 'just', 'must', 'dust', 'bust', 'rush',
            'crush', 'brush', 'plus', 'thus', 'us', 'club', 'hub', 'rub',
            'sub', 'tub',
        ],
        'anchors': ['blood', 'love', 'tough', 'run', 'trust'],
        'boundary_words': ['month', 'front'],
    },

    'AY2_FAMILY': {
        'name':    'AY2_FAMILY',
        'nucleus': 'AY',
        'members': [
            'life', 'night', 'mind', 'time', 'right', 'light', 'fight',
            'side', 'find', 'blind', 'behind', 'remind', 'die', 'try', 'cry',
            'fly', 'sky', 'high', 'why', 'my', 'by', 'lie', 'tie', 'pride',
            'ride', 'hide', 'guide', 'wide', 'inside', 'outside', 'decide',
            'provide', 'survive', 'arrive', 'drive', 'alive', 'fire', 'desire',
            'inspire', 'entire', 'retire',
        ],
        'anchors': ['life', 'night', 'mind', 'time', 'light'],
        'boundary_words': ['ride', 'wide', 'provide'],
    },

    'OO_FAMILY': {
        'name':    'OO_FAMILY',
        'nucleus': 'UW',
        'members': [
            'through', 'true', 'do', 'you', 'knew', 'grew', 'move', 'prove',
            'lose', 'choose', 'whose', 'blues', 'rules', 'tools', 'cool',
            'fool', 'pool', 'school', 'smooth', 'groove', 'truth', 'youth',
            'roof', 'proof', 'food', 'mood', 'crude', 'dude', 'nude', 'rude',
            'boom', 'room', 'zoom', 'doom', 'bloom', 'consume', 'assume',
            'resume', 'include', 'exclude',
        ],
        'anchors': ['through', 'true', 'move', 'cool', 'truth'],
        'boundary_words': ['cure', 'pure', 'sure'],
    },

    'AW_FAMILY': {
        'name':    'AW_FAMILY',
        'nucleus': 'AW',
        'members': [
            'down', 'found', 'ground', 'sound', 'around', 'out', 'about',
            'doubt', 'mouth', 'crowd', 'loud', 'proud', 'brown', 'town',
            'now', 'how', 'wow', 'cow', 'bow', 'power', 'hour', 'tower',
            'flower', 'shower', 'bounce', 'count', 'mount', 'announce',
            'denounce', 'pronounce', 'house', 'mouse', 'cloud', 'allowed',
        ],
        'anchors': ['down', 'found', 'ground', 'sound', 'out'],
        'boundary_words': ['crown', 'frown', 'gown'],
    },

    'AE_FAMILY': {
        'name':    'AE_FAMILY',
        'nucleus': 'AE',
        'members': [
            'back', 'track', 'rap', 'trap', 'stack', 'black', 'crack', 'pack',
            'lack', 'attack', 'that', 'have', 'grab', 'bad', 'mad', 'sad',
            'glad', 'add', 'had', 'dad', 'and', 'hand', 'band', 'land',
            'sand', 'stand', 'brand', 'grand', 'plan', 'man', 'can', 'ran',
            'tan', 'van', 'fan', 'than', 'began', 'span', 'scan', 'slam',
            'jam', 'ham', 'damn', 'clam', 'exam',
        ],
        'anchors': ['back', 'track', 'rap', 'trap', 'black'],
        'boundary_words': ['ask', 'past', 'last'],
    },

    'OH_FAMILY': {
        'name':    'OH_FAMILY',
        'nucleus': 'AO',
        'members': [
            'talk', 'walk', 'call', 'fall', 'hall', 'all', 'ball', 'caught',
            'thought', 'bought', 'brought', 'law', 'raw', 'jaw', 'draw',
            'saw', 'flaw', 'cause', 'pause', 'clause', 'small', 'tall',
            'wall', 'crawl', 'sprawl', 'install', 'recall', 'enthrall',
            'long', 'strong', 'wrong', 'song', 'belong', 'along',
        ],
        'anchors': ['talk', 'call', 'fall', 'thought', 'law'],
        'boundary_words': ['war', 'more', 'core', 'floor', 'store', 'door', 'four'],
    },

    'IH_FAMILY': {
        'name':    'IH_FAMILY',
        'nucleus': 'IH',
        'members': [
            'it', 'with', 'this', 'is', 'live', 'give', 'in', 'win', 'begin',
            'spin', 'thin', 'skin', 'been', 'seen', 'green', 'king', 'ring',
            'sing', 'bring', 'spring', 'thing', 'swing', 'sting', 'think',
            'drink', 'link', 'sink', 'blink', 'distinct', 'instinct', 'fix',
            'mix', 'six', 'thick', 'trick', 'click', 'stick', 'pick', 'kick',
            'sick', 'quick', 'slick',
        ],
        'anchors': ['win', 'begin', 'spin', 'king', 'think'],
        'boundary_words': ['been', 'seen', 'green'],
    },

    'EH_FAMILY': {
        'name':    'EH_FAMILY',
        'nucleus': 'EH',
        'members': [
            'head', 'dead', 'said', 'bed', 'led', 'red', 'fed', 'spread',
            'thread', 'instead', 'breath', 'death', 'left', 'best', 'rest',
            'test', 'chest', 'west', 'blessed', 'stressed', 'pressed', 'mess',
            'less', 'guess', 'address', 'confess', 'success', 'express',
            'progress', 'step', 'prep', 'rep', 'check', 'deck', 'neck',
            'wreck', 'spec', 'connect', 'respect', 'protect',
        ],
        'anchors': ['head', 'dead', 'breath', 'best', 'death'],
        'boundary_words': ['said', 'again'],
    },
}

# ── Reverse indexes (built once at import time) ───────────────────────────────

# All boundary words across all 12 families, as a flat set.
# Used by get_family() and tag_verse_words() to flag words needing disambiguation.
BOUNDARY_WORD_FLAGS: set = set()
for _fam in PERCEPTUAL_FAMILIES.values():
    for _bw in _fam['boundary_words']:
        BOUNDARY_WORD_FLAGS.add(_bw.lower())

# Word → family name. Excludes boundary words — those require Layer 2 scoring.
# When a word appears in multiple families' member lists (rare but possible),
# the last definition wins; boundary-word exclusion handles the ambiguous cases.
WORD_TO_FAMILY: dict = {}
for _fname, _fam in PERCEPTUAL_FAMILIES.items():
    for _w in _fam['members']:
        _wl = _w.lower()
        if _wl not in BOUNDARY_WORD_FLAGS:
            WORD_TO_FAMILY[_wl] = _fname

# Clean up module-level loop variables
del _fam, _fname, _w, _wl, _bw

# ── Public API ────────────────────────────────────────────────────────────────

def get_family(word):
    '''
    Returns the perceptual family name for word, or None.

    Boundary words always return None — they straddle two families and require
    Layer 2 phonetic scoring to resolve. Non-member words also return None.
    Input is lowercased before lookup.
    '''
    w = word.lower().strip()
    if w in BOUNDARY_WORD_FLAGS:
        return None
    result = WORD_TO_FAMILY.get(w)
    if result is not None:
        return result
    # Phonetic fallback: words not in the registry are classified by rhyme unit.
    rhyme_unit = get_rhyme_unit(w)
    if rhyme_unit and rhyme_unit[0] in ('ER1', 'ER0'):
        return 'R_FAMILY'
    return None


def score_family_membership(word, family_name):
    '''
    Phonetic distance score between word and a named perceptual family (0.0–1.0).

    Scores word against each anchor using phoneme_engine.rhyme_score() and
    returns the maximum. Intended for words NOT in the registry — neologisms,
    slang, proper nouns, and OOV words that g2p_en can approximate.

    Returns 0.0 if family_name is not in PERCEPTUAL_FAMILIES.
    '''
    fam = PERCEPTUAL_FAMILIES.get(family_name)
    if not fam:
        return 0.0
    best = 0.0
    for anchor in fam['anchors']:
        s = rhyme_score(word, anchor)
        if s > best:
            best = s
    return best


def _best_family(word):
    '''
    Returns (family_name, score) for the highest-scoring family across all 12.
    Sets family_name to None if no family clears 0.0.
    Private — used internally by tag_verse_words.
    '''
    best_name, best_score = None, 0.0
    for fname in PERCEPTUAL_FAMILIES:
        s = score_family_membership(word, fname)
        if s > best_score:
            best_score, best_name = s, fname
    return best_name, best_score


def tag_verse_words(verse_lines):
    '''
    Syllable-level perceptual family tagging for a verse.

    Calls syllabify_line() for each line and attempts family assignment for
    every syllable independently. Returns a flat list of dicts:

      { word, syllable_text, syllable_index, line_index, word_index,
        family, family_score, is_boundary, is_stressed }

    family      — family name for direct registry hits, or best-scoring family
                  if score >= 0.70, otherwise None
    family_score — 1.0 for direct registry hits, else max anchor score
    is_boundary  — True if word is in BOUNDARY_WORD_FLAGS
    is_stressed  — from syllable_engine

    Function words (FUNCTION_WORDS) are skipped entirely.

    Deduplication rule for multisyllabic words:
      Only the first syllable of each word is tagged unless a later syllable
      independently scores >= 0.70 against a STRICTLY DIFFERENT family. When
      both syllables meet that threshold, both are tagged with their respective
      families. This handles compound-phoneme words like "persevered" whose
      syllables straddle R_FAMILY and EE_FAMILY.
    '''
    results = []

    for li, line in enumerate(verse_lines):
        sylls = syllabify_line(line)

        # Track the first syllable's assigned family per word.
        # key = (line_index, word_index) → (family, score)
        word_first: dict = {}

        for s in sylls:
            word = s['word'].lower().strip()

            if word in FUNCTION_WORDS:
                continue

            wi = s['word_index']
            si = s['index']          # syllable index within this word (0-based)
            key = (li, wi)

            syllable_text = s['word'][s['char_start']:s['char_end']]
            is_boundary   = word in BOUNDARY_WORD_FLAGS
            is_stressed   = s['is_stressed']

            # ── Family and confidence score ───────────────────────────────
            if is_boundary:
                family       = None
                family_score = 0.0
            else:
                direct = get_family(word)
                if direct is not None:
                    family       = direct
                    family_score = 1.0
                else:
                    family, family_score = _best_family(word)
                    if family_score < 0.70:
                        family = None

            # ── Per-word deduplication ────────────────────────────────────
            if si == 0:
                # Always record the first syllable (even family=None).
                word_first[key] = (family, family_score)
            else:
                first_family, _ = word_first.get(key, (None, 0.0))
                if first_family is not None:
                    # First syllable claimed a family. Only include this syllable
                    # if it independently reaches 0.70 against a DIFFERENT family.
                    if family is None or family == first_family or family_score < 0.70:
                        continue
                    # Both syllables belong to different families — fall through
                    # and append this syllable with its own family assignment.
                else:
                    # First syllable had no family — adopt this one as the anchor.
                    word_first[key] = (family, family_score)

            results.append({
                'word':           word,
                'syllable_text':  syllable_text,
                'syllable_index': si,
                'line_index':     li,
                'word_index':     wi,
                'family':         family,
                'family_score':   round(family_score, 3),
                'is_boundary':    is_boundary,
                'is_stressed':    is_stressed,
            })

    return results


def score_unregistered_words(tagged_words, dominant_family):
    '''
    Scores unregistered, non-boundary words against the dominant rhyme family.

    Takes the output of tag_verse_words() and a family name string.
    For every entry where family is None and is_boundary is False, computes
    score_family_membership(word, dominant_family) and returns those scoring
    >= 0.70, deduplicated to one result per (line_index, word_index).

    Returns a list of dicts sorted by score descending:
      { word, syllable_index, line_index, word_index, score }

    This catches words like "murk", "spurts", "girth" that phonetically belong
    to R_FAMILY but haven't been added to the registry yet.
    '''
    if dominant_family not in PERCEPTUAL_FAMILIES:
        log.warning('score_unregistered_words: unknown family %r', dominant_family)
        return []

    results = []
    seen = set()  # one score per word occurrence — deduplicate by (li, wi)

    for entry in tagged_words:
        if entry['is_boundary']:
            continue
        # Skip direct registry members of this family — they're already counted.
        # Words NOT in the registry (neologisms, slang) should be re-scored even
        # if Layer 1 phonetically assigned them to dominant_family already.
        if get_family(entry['word']) == dominant_family:
            continue
        key = (entry['line_index'], entry['word_index'])
        if key in seen:
            continue
        seen.add(key)

        score = score_family_membership(entry['word'], dominant_family)
        if score >= 0.70:
            results.append({
                'word':           entry['word'],
                'syllable_index': entry['syllable_index'],
                'line_index':     entry['line_index'],
                'word_index':     entry['word_index'],
                'score':          round(score, 3),
            })

    results.sort(key=lambda r: r['score'], reverse=True)
    return results


# ── Test Block ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    verse = [
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
        "Losin', winnin', bank account thinnin'",
        "Income streams nowhere near as diverse",
        "And though I'm blessed I seen you stressin'",
        "From hearin' the chirps and naysayers",
    ]

    print('\n=== PERCEPTUAL FAMILY TAGS ===')
    tagged = tag_verse_words(verse)
    for t in tagged:
        if t['family']:
            stress = '*' if t['is_stressed'] else 'o'
            print(f'  {stress} L{t["line_index"]+1} W{t["word_index"]}  '
                  f'{t["word"]:<14}  [{t["syllable_text"]}]  '
                  f'{t["family"]}  score={t["family_score"]:.2f}')

    print('\n=== UNREGISTERED WORDS NEAR R_FAMILY ===')
    unregistered = score_unregistered_words(tagged, 'R_FAMILY')
    for u in unregistered:
        print(f'  L{u["line_index"]+1} W{u["word_index"]}  '
              f'{u["word"]:<14}  score={u["score"]:.2f}')

    print('\n=== BOUNDARY WORD CHECKS ===')
    for w in ['clear', 'here', 'year', 'career', 'great', 'said']:
        r_score  = score_family_membership(w, 'R_FAMILY')
        ee_score = score_family_membership(w, 'EE_FAMILY')
        print(f'  get_family("{w}") → {str(get_family(w)):<12}  '
              f'R={r_score:.2f}  EE={ee_score:.2f}')

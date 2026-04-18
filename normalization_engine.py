'''
Normalization Engine
Six-layer text cleaning pipeline: contraction expansion, phonological tagging,
slang mapping, numeric substitution, repeat stripping, and compound splitting.
Single source of truth for all text normalization across the suite.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import re

# ── Layer 1 — Contraction expansion ──────────────────────────────────────────

CONTRACTIONS = {
    # -in' drops (APOCOPE)
    "winnin'": 'winning',   'winnin':   'winning',
    "stressin'": 'stressing', 'stressin': 'stressing',
    "nothin'": 'nothing',   'nothin':   'nothing',
    "somethin'": 'something', 'somethin': 'something',
    "everythin'": 'everything', 'everythin': 'everything',
    "talkin'": 'talking',   'talkin':   'talking',
    "walkin'": 'walking',   'walkin':   'walking',
    "runnin'": 'running',   'runnin':   'running',
    "comin'": 'coming',     'comin':    'coming',
    "goin'": 'going',       'goin':     'going',
    "hearin'": 'hearing',   'hearin':   'hearing',
    "wearin'": 'wearing',   'wearin':   'wearing',
    "feelin'": 'feeling',   'feelin':   'feeling',
    "knowin'": 'knowing',   'knowin':   'knowing',
    "losin'": 'losing',     'losin':    'losing',
    "thinnin'": 'thinning', 'thinnin':  'thinning',
    "livin'": 'living',     'livin':    'living',
    "givin'": 'giving',     'givin':    'giving',
    # Auxiliary contractions
    'tryna':   'trying',
    'wanna':   'want to',
    'gonna':   'going to',
    'gotta':   'got to',
    'finna':   'fixing to',
    'ima':     'i am going to',
    'kinda':   'kind of',
    'sorta':   'sort of',
    'coulda':  'could have',
    'woulda':  'would have',
    'shoulda': 'should have',
    'musta':   'must have',
    'oughta':  'ought to',
    'lemme':   'let me',
    'gimme':   'give me',
    'getcha':  'get you',
    'gotcha':  'got you',
    'watcha':  'what are you',
    'betcha':  'bet you',
}

# ── Layer 3 — Slang and AAVE mapping ─────────────────────────────────────────

SLANG = {
    'turnt':   'excited',
    'lit':     'excited',
    'bussin':  'excellent',
    'lowkey':  'somewhat',
    'deadass': 'seriously',
    'nocap':   'honestly',
    'fr':      'for real',
    'ong':     'on god',
    'facts':   'true',
    'bet':     'agreed',
    'slaps':   'sounds great',
    'hits':    'sounds great',
    'fire':    'excellent',
    'cold':    'impressive',
    'sick':    'impressive',
    'hard':    'impressive',
    'clean':   'impressive',
    'fresh':   'impressive',
    'raw':     'unpolished',
    'wild':    'extreme',
    'crazy':   'extreme',
    'stupid':  'extremely',
    'nasty':   'impressive',
}

# ── Layer 4 — Numeric and symbol substitution ─────────────────────────────────

NUMERICS = {
    '4ever': 'forever',
    'b4':    'before',
    '4':     'for',
    '2':     'to',
    '&':     'and',
    '@':     'at',
    '#':     'number',
}

# ── Layer 2 — Detect phonological manipulation ────────────────────────────────

def _detect_manipulation(original, normalized):
    '''
    Heuristically tags what phonological device was applied.
    APOCOPE  — final sound dropped (winnin → winning)
    SYNCOPE  — middle sound dropped (evry → every)
    ELISION  — apostrophe indicates dropped boundary sound
    SLANG    — AAVE/slang substitution
    NUMERIC  — number/symbol substitution
    '''
    if original in SLANG:
        return 'SLANG'
    if original in NUMERICS:
        return 'NUMERIC'
    # Apostrophe = elision or apocope marker
    if "'" in original:
        return 'APOCOPE'
    # No apostrophe but expansion added letters to the end
    if len(normalized) > len(original):
        if normalized.startswith(original[:max(1, len(original) - 2)]):
            return 'APOCOPE'
        return 'SYNCOPE'
    return None

# ── Layer 5 — Repeated letter stripping ──────────────────────────────────────

def _strip_repeats(word):
    '''Reduces any run of 3+ identical consecutive letters to 2.'''
    return re.sub(r'(.)\1{2,}', r'\1\1', word)

# ── Layer 6 — Hyphenated compound splitting ───────────────────────────────────

def _split_hyphen(word):
    '''Returns list of parts if hyphenated, else None.'''
    if '-' in word:
        parts = [p for p in word.split('-') if p]
        return parts if len(parts) > 1 else None
    return None

# ── Main normalize function ───────────────────────────────────────────────────

def normalize(word):
    '''
    Runs all six normalization layers in order.

    Returns:
      normalized   — cleaned word (or list of words if hyphen-split) ready for CMU lookup
      original     — what the writer typed
      manipulation — phonological device detected, or None
      was_split    — True if word was a hyphenated compound that was split
    '''
    original = word
    manipulation = None
    was_split = False

    # Layer 4 — Numeric and symbol substitution (before character stripping
    # so that standalone symbols like & aren't erased before lookup)
    cleaned = word.strip().lower()

    if cleaned in NUMERICS:
        return {
            'normalized': NUMERICS[cleaned],
            'original': original,
            'manipulation': 'NUMERIC',
            'was_split': False,
        }

    cleaned = re.sub(r'[^\w\'\-]', '', cleaned)  # keep apostrophe and hyphen

    # Inline numeric word forms (4ever, b4) after stripping punctuation
    if cleaned in NUMERICS:
        return {
            'normalized': NUMERICS[cleaned],
            'original': original,
            'manipulation': 'NUMERIC',
            'was_split': False,
        }

    # Layer 5 — Strip repeated letters
    cleaned = _strip_repeats(cleaned)

    # Layer 6 — Hyphenated compound splitting
    parts = _split_hyphen(cleaned)
    if parts:
        return {
            'normalized': parts,
            'original': original,
            'manipulation': None,
            'was_split': True,
        }

    # Layer 1 — Contraction expansion
    if cleaned in CONTRACTIONS:
        expanded = CONTRACTIONS[cleaned]
        manipulation = _detect_manipulation(cleaned, expanded)
        return {
            'normalized': expanded,
            'original': original,
            'manipulation': manipulation,
            'was_split': False,
        }

    # Layer 3 — Slang/AAVE mapping (before generic -in rule so 'bussin' → slang, not 'bussing')
    if cleaned in SLANG:
        return {
            'normalized': SLANG[cleaned],
            'original': original,
            'manipulation': 'SLANG',
            'was_split': False,
        }

    # Generic -in' rule: any word ending in "in'" or "in" that isn't in the dict
    if cleaned.endswith("in'"):
        expanded = cleaned[:-3] + 'ing'
        manipulation = 'APOCOPE'
        return {
            'normalized': expanded,
            'original': original,
            'manipulation': manipulation,
            'was_split': False,
        }
    if cleaned.endswith("in") and len(cleaned) > 3:
        # Heuristic: if original had an apostrophe or preceding char is consonant, treat as APOCOPE
        if original.endswith("in'") or (len(cleaned) > 4 and cleaned[-3] not in 'aeiou'):
            expanded = cleaned + 'g'
            manipulation = 'APOCOPE'
            return {
                'normalized': expanded,
                'original': original,
                'manipulation': manipulation,
                'was_split': False,
            }

    # No transformation needed
    return {
        'normalized': cleaned,
        'original': original,
        'manipulation': None,
        'was_split': False,
    }

# ── TEST ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    tests = [
        # Layer 1 — Contraction expansion
        ("winnin'",    'APOCOPE: -g dropped'),
        ('stressin',   'APOCOPE: -g dropped, no apostrophe'),
        ('goin',       'APOCOPE: generic -in rule'),
        ('tryna',      'Auxiliary contraction'),
        ('coulda',     'Modal contraction'),
        ('lemme',      'Phonetic merger'),
        # Layer 3 — Slang / AAVE
        ('turnt',      'AAVE: past-tense emotional state'),
        ('bussin',     'AAVE: quality praise'),
        ('deadass',    'AAVE: sincerity marker'),
        ('fire',       'Slang: excellence (when used as praise)'),
        # Layer 4 — Numeric / symbol
        ('4ever',      'Numeric inline'),
        ('b4',         'Numeric prefix'),
        ('&',          'Symbol'),
        # Layer 5 — Repeated letters
        ('sooooo',     'Extended vowel'),
        ('reaaally',   'Extended mid-vowel'),
        ('noooo',      'Extended short word'),
        # Layer 6 — Hyphenated compound
        ('self-made',  'Compound adjective'),
        ('old-school', 'Compound noun/adj'),
    ]

    print('\n=== NORMALIZATION ENGINE TEST ===\n')
    print(f'{"INPUT":<16} {"NORMALIZED":<20} {"MANIP":<10} {"SPLIT"}  NOTE')
    print('-' * 80)
    for word, note in tests:
        result = normalize(word)
        norm = str(result['normalized'])
        manip = result['manipulation'] or '—'
        split = 'YES' if result['was_split'] else '—'
        print(f'{word:<16} {norm:<20} {manip:<10} {split:<6} {note}')

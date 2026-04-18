'''
Phoneme Engine
CMU Pronouncing Dictionary lookup with g2p-en fallback.
Contractions imported from normalization_engine — single source of truth.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import logging
import nltk
import re
from functools import lru_cache

log = logging.getLogger(__name__)

nltk.download('cmudict', quiet=True)
nltk.download('averaged_perceptron_tagger_eng', quiet=True)
from nltk.corpus import cmudict
from normalization_engine import CONTRACTIONS

# Pre-warm the NLTK perceptron tagger so it loads once at import time
# rather than on the first g2p call during a live analysis
try:
    nltk.pos_tag(['warm'])
except Exception:
    log.warning('NLTK perceptron tagger warm-up failed; first g2p call may be slow')

try:
    from g2p_en import G2p
    _g2p = G2p()
    G2P_AVAILABLE = True
except ImportError:
    _g2p = None
    G2P_AVAILABLE = False
    log.warning('g2p_en not installed; unknown words will return None instead of a fallback pronunciation')

CMU = cmudict.dict()

# ── Shared Constants ─────────────────────────────────────
FUNCTION_WORDS = {
    'i', 'a', 'the', 'in', 'on', 'of', 'to', 'and', 'or', 'but',
    'is', 'it', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if',
    'me', 'my', 'no', 'so', 'up', 'us', 'we', 'am', 'an', 'are',
    'was', 'for', 'not', 'had', 'has', 'her', 'him', 'his', 'its',
    'our', 'out', 'who', 'you', 'she', 'they', 'them', 'their',
    'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would',
    'could', 'should', 'than', 'then', 'when', 'what', 'which',
}

# ── Normalization ────────────────────────────────────────

def normalize(word):
    word = word.lower().strip()
    word = re.sub(r'[^a-z\']', '', word)
    if word in CONTRACTIONS:
        return CONTRACTIONS[word]
    if word.endswith("in'"):
        return word[:-3] + 'ing'
    return word

# ── Core Lookup ──────────────────────────────────────────
@lru_cache(maxsize=4096)
def get_phonemes(word):
    clean = normalize(word)
    if clean in CMU:
        return CMU[clean][0]
    if G2P_AVAILABLE:
        result = _g2p(clean)
        return [p.rstrip('0123456789') + (p[-1] if p[-1].isdigit() else '0')
                if any(c.isdigit() for c in p) else p for p in result]
    return None

def get_rhyme_unit(word):
    phonemes = get_phonemes(word)
    if not phonemes:
        return None
    return get_rhyme_unit_from_phonemes(phonemes)

def get_rhyme_unit_from_phonemes(phonemes):
    '''Extract rhyme unit (vowel nucleus onward) from a phoneme list.
    Used to score individual syllables rather than whole words.'''
    if not phonemes:
        return None
    last_stress_idx = None
    for i, p in enumerate(phonemes):
        if p[-1].isdigit() and int(p[-1]) >= 1:
            last_stress_idx = i
    if last_stress_idx is None:
        for i, p in enumerate(phonemes):
            if p[-1].isdigit():
                last_stress_idx = i
    if last_stress_idx is None:
        return None
    return tuple(phonemes[last_stress_idx:])

def _is_r_colored(vowel_base, rhyme_unit):
    '''
    True if this rhyme unit is R-colored:
      - vowel is ER (always R-colored by definition)
      - vowel is IH/IY/AH/UH AND the immediately following phoneme is R
    The IY case catches CMU's inconsistent coding of /ɪər/ (here, ear, year).
    '''
    if vowel_base == 'ER':
        return True
    if vowel_base in ('IH', 'IY', 'AH', 'UH'):
        return len(rhyme_unit) > 1 and rhyme_unit[1] == 'R'
    return False


def _is_eh_r(vowel_base, rhyme_unit):
    '''EH+R words: rare, stare, there, parent, era — the near-ER family.'''
    return vowel_base == 'EH' and len(rhyme_unit) > 1 and rhyme_unit[1] == 'R'


def classify_r_family(rhyme_unit):
    '''
    Assign a rhyme unit to exactly one R-family class.
    This classification happens upstream of all pairwise scoring and is the
    single authority for whether two syllables may even be compared.

    Returns:
      0  — no R-colored vowel nucleus; unaffected by the R-family gate
      1  — ER family: nucleus is ER1 or ER2 (worst, curse, shirt, birth, hurt)
           Stressed vowel and R are fused into a single phoneme.
      2  — VR family: nucleus is IH, IY, or UH and the next phoneme is R
           (persevered, appeared, adhere, career, here, steer, tears-with-IH,
            sure, pure, cure, poor, tour — UH+R included to prevent transitive
            bridging with the ER family via the R-colored bridge score)
      3  — EH+R family: nucleus is EH and the next phoneme is R
           (rare, stare, dare, care, there, tears-with-EH)

    Family compatibility (enforced as a hard gate by the caller):
      1 ↔ 1  : allowed
      2 ↔ 2  : allowed
      3 ↔ 3  : allowed
      2 ↔ 3  : allowed  (EH+R can join VR in large groups via the slant bridge)
      1 ↔ 2  : BLOCKED — absolute, no score can override
      1 ↔ 3  : BLOCKED — absolute, no score can override
      0 ↔ *  : allowed  (non-R words bypass the gate entirely)
    '''
    if not rhyme_unit:
        return 0
    nuc = rhyme_unit[0]
    vow = nuc[:-1] if nuc[-1].isdigit() else nuc

    if vow == 'ER':
        return 1

    if len(rhyme_unit) > 1 and rhyme_unit[1] == 'R':
        if vow in ('IH', 'IY', 'UH'):
            return 2
        if vow == 'EH':
            return 3

    return 0


def syllable_rhyme_score(rhyme_unit_a, rhyme_unit_b):
    '''Compare two rhyme units (tuples of phonemes) directly.

    Key design principle: all R-family bridges REQUIRE R on BOTH sides.
    This prevents IH1 words (ring, wifey, single) from joining the ER group
    just because they share a vowel base with IH+R words (adhere, steered).

    Scoring tiers:
      1.00 — exact full rhyme unit match
      0.88 — same nucleus incl. stress digit (diff coda)
      0.80 — R-colored bridge: both units are R-colored, different vowel base
             covers ER ↔ IH+R, ER ↔ IY+R (here), ER ↔ AH+R
      0.75 — same vowel base, different stress digit (ER1 vs ER2)
             ONLY if both are R-colored or neither is R-colored (no mixing)
      0.65 — EH+R ↔ ER/IH+R slant bridge (rare/curse, stare/hurt)
             gated in find_rhyme_groups Pass 4 — large families only
      0.35 — shared final consonant only
    '''
    if not rhyme_unit_a or not rhyme_unit_b:
        return 0.0
    if rhyme_unit_a == rhyme_unit_b:
        return 1.0

    nuc_a = rhyme_unit_a[0]
    nuc_b = rhyme_unit_b[0]

    vow_a = nuc_a[:-1] if nuc_a[-1].isdigit() else nuc_a
    vow_b = nuc_b[:-1] if nuc_b[-1].isdigit() else nuc_b

    a_r   = _is_r_colored(vow_a, rhyme_unit_a)
    b_r   = _is_r_colored(vow_b, rhyme_unit_b)
    a_ehr = _is_eh_r(vow_a, rhyme_unit_a)
    b_ehr = _is_eh_r(vow_b, rhyme_unit_b)

    # Exact nucleus match — only 0.88 when both are in the same R-context.
    # adhere (IH1-R) and wifey (IH1) share nucleus IH1 but live in completely
    # different sonic spaces — one is R-colored, the other is not.
    if nuc_a == nuc_b:
        same_r_context = (a_r == b_r) and (a_ehr == b_ehr)
        if same_r_context:
            return 0.88
        # Different R-context despite matching nucleus → much weaker
        return 0.35

    # R-colored bridge: BOTH must be R-colored (ER ↔ IH+R, ER ↔ IY+R, etc.)
    # AND codas after the R-colored portion must match.
    # ER encodes R in the vowel itself → coda = rhyme_unit[1:]
    # IH+R / IY+R / AH+R → R is at index 1, coda = rhyme_unit[2:]
    # This blocks "thirst" (ER1 S T) ↔ "adhere" (IH1 R) — different codas.
    # "her" (ER1) ↔ "appear" (IH1 R) still bridge because both codas are ().
    if a_r and b_r:
        # ER encodes R inside the vowel → coda starts at index 1
        # IH+R/IY+R/AH+R → R is explicit at index 1, coda starts at index 2
        a_coda = rhyme_unit_a[1:] if vow_a == 'ER' else rhyme_unit_a[2:]
        b_coda = rhyme_unit_b[1:] if vow_b == 'ER' else rhyme_unit_b[2:]
        if a_coda == b_coda:
            return 0.80
        # Coda mismatch (e.g. "thirst" ER+ST vs "adhere" IH+R) — never a real rhyme
        return 0.50

    # Same vowel base — only 0.75 if both share the same R-context
    if vow_a == vow_b:
        same_r_context = (a_r == b_r) and (a_ehr == b_ehr)
        if same_r_context:
            return 0.75
        return 0.35

    # EH+R ↔ ER family slant bridge (rare/curse, stare/hurt, parent/birth)
    # 0.65 is below RHYME_THRESHOLD — only fires in gated Pass 4
    if (a_ehr and b_r) or (b_ehr and a_r):
        return 0.65

    if len(rhyme_unit_a) > 1 and len(rhyme_unit_b) > 1:
        if rhyme_unit_a[-1] == rhyme_unit_b[-1]:
            return 0.35
    return 0.0

def rhyme_score(word_a, word_b):
    if word_a == word_b:
        return 0.0
    rhyme_a = get_rhyme_unit(word_a)
    rhyme_b = get_rhyme_unit(word_b)
    if not rhyme_a or not rhyme_b:
        return 0.0
    if rhyme_a == rhyme_b:
        return 1.0
    nuc_a = rhyme_a[0]
    nuc_b = rhyme_b[0]
    if nuc_a == nuc_b:
        # R-coloring is a perceptual boundary even when the nucleus matches.
        # IH1+R ("persevered") ≠ IH1+N ("begin") and
        # EH1+R ("tears") ≠ EH1+D ("dead") — mirrors syllable_rhyme_score logic.
        vow   = nuc_a[:-1] if nuc_a[-1].isdigit() else nuc_a
        a_r   = _is_r_colored(vow, rhyme_a)
        b_r   = _is_r_colored(vow, rhyme_b)
        a_ehr = _is_eh_r(vow, rhyme_a)
        b_ehr = _is_eh_r(vow, rhyme_b)
        if (a_r != b_r) or (a_ehr != b_ehr):
            return 0.35
        return 0.88
    vow_a = nuc_a[:-1] if nuc_a[-1].isdigit() else nuc_a
    vow_b = nuc_b[:-1] if nuc_b[-1].isdigit() else nuc_b
    if vow_a == vow_b:
        return 0.75
    if len(rhyme_a) > 1 and len(rhyme_b) > 1:
        if rhyme_a[-1] == rhyme_b[-1]:
            return 0.35
    return 0.0

# ── Test Block ───────────────────────────────────────────
if __name__ == '__main__':
    test_words = ['worst', 'curse', 'reverse', 'money', 'nothing',
                  "winnin'", "stressin'", 'fire', 'higher']
    print('\n=== PHONEME LOOKUP ===')
    for word in test_words:
        phonemes = get_phonemes(word)
        stress = get_stress_map(word)
        rhyme = get_rhyme_unit(word)
        print(f'{word:<14} phonemes: {phonemes}')
        print(f'{"":<14} stress:   {stress}')
        print(f'{"":<14} rhyme:    {rhyme}')
        print()

    print('\n=== RHYME SCORES ===')
    pairs = [
        ('worst', 'curse'),
        ('worst', 'reverse'),
        ('money', 'nothing'),
        ("winnin'", "stressin'"),
        ('fire', 'higher'),
        ('streets', 'beats'),
    ]
    for a, b in pairs:
        score = rhyme_score(a, b)
        bar = '#' * int(score * 20)
        print(f'{a:<14} + {b:<14} = {score*100:.0f}%  {bar}')

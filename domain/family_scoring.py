'''
domain/family_scoring.py

Extracted verbatim from api.py's /autofill and /suggest-family route
bodies (Phase 1d, Clean Architecture reorg — see docs/BUILD_PLAN.md).
Both routes contained real, substantial phonetic scoring algorithms —
rhyme-unit comparison, an EH+R slant-tier gate keyed to family size,
R-family compatibility checks — directly inline in the Flask route,
never in any domain module, never independently testable, and with
zero test coverage before this extraction (confirmed via grep across
tests/, not assumed). One of the two even carries a comment noting it
deliberately MIRRORS a gate that already exists in
domain/rhyme_detection_engine.py ("Pass 4 gate") — a real duplicate-
logic risk sitting in a route body instead of next to the logic it
mirrors.

Both functions score a target (a whole verse, or a single word)
against caller-provided "families" — arbitrary {color_id, sample_words}
groups, NOT the verse's own internally-detected rhyme families (that's
rhyme_detection_engine.py's job). This is the mobile/web client's own
saved color-family data being scored against, which is why this can't
just delegate to rhyme_detection_engine.py outright — it's a related
but genuinely distinct operation.

Logic unchanged from the original inline versions — every threshold,
gate, and sort order preserved exactly. Route-level concerns (how many
results to return, e.g. /suggest-family's top-3 truncation) deliberately
stayed in api.py — that's a presentation/API-contract decision, not a
scoring one.
'''
from domain.phoneme_engine import (
    get_phonemes, get_rhyme_unit_from_phonemes, syllable_rhyme_score, classify_r_family,
)
from domain.rhyme_detection_engine import r_family_compatible

# EH+R slant (score == 0.65) only allowed for families with 3+ established
# sample words (mirrors Pass 4's own gate in rhyme_detection_engine.py —
# see the module docstring above for why this is a duplicate worth
# flagging, not silently accepted as coincidence).
SLANT_MIN_FAMILY_SIZE = 3


def score_verse_against_families(verse_lines, families, threshold=0.60):
    '''
    Scores every content word in verse_lines against existing color
    families. Returns assignments for every word that scores >=
    threshold, sorted by score descending. Caller (the route) decides
    which words to actually apply (e.g. only currently-uncolored ones).

    families: [{color_id, sample_words: [str, ...]}]
    Returns: [{word, line_index, word_index, color_id, score}, ...]
    '''
    if not verse_lines or not families:
        return []

    # Pre-compute rhyme_units for each family's sample words once.
    family_data = []
    for fam in families:
        rus = []
        for sw in fam.get('sample_words', [])[:8]:
            p = get_phonemes(sw)
            if p:
                ru = get_rhyme_unit_from_phonemes(p)
                if ru:
                    rus.append(ru)
        if rus:
            family_data.append({
                'color_id': fam['color_id'],
                'rhyme_units': rus,
                'size': len(fam.get('sample_words', [])),
            })

    assignments = []
    for li, line in enumerate(verse_lines):
        words = line.split()
        for wi, token in enumerate(words):
            clean = token.strip('.,!?;:"\'-').lower()
            if not clean:
                continue
            p = get_phonemes(clean)
            if not p:
                continue
            target_ru = get_rhyme_unit_from_phonemes(p)
            if not target_ru:
                continue
            best_cid, best_score = None, 0.0
            for fam in family_data:
                for ru in fam['rhyme_units']:
                    s = syllable_rhyme_score(target_ru, ru)
                    if 0.64 <= s <= 0.66 and fam['size'] < SLANT_MIN_FAMILY_SIZE:
                        continue
                    if s > best_score:
                        best_score, best_cid = s, fam['color_id']
            if best_cid and best_score >= threshold:
                assignments.append({
                    'word':       clean,
                    'line_index': li,
                    'word_index': wi,
                    'color_id':   best_cid,
                    'score':      round(best_score, 3),
                })

    assignments.sort(key=lambda a: a['score'], reverse=True)
    return assignments


def score_word_against_families(word, families):
    '''
    Scores a single word's rhyme unit against each family's sample
    words. Returns matches scoring >= 0.55 (includes slant bridges),
    sorted by score descending — the ROUTE decides how many to actually
    return (currently top-3, see api.py's /suggest-family).

    families: [{color_id, sample_words: [str, ...]}]
    Returns: [{color_id, score}, ...]
    '''
    word = (word or '').strip()
    if not word:
        return []

    target_phonemes = get_phonemes(word)
    if not target_phonemes:
        return []

    target_ru = get_rhyme_unit_from_phonemes(target_phonemes)
    if not target_ru:
        return []

    target_r_class = classify_r_family(target_ru)

    suggestions = []
    for fam in families:
        color_id = fam.get('color_id')
        sample_words = fam.get('sample_words', [])
        if not sample_words:
            continue
        best = 0.0
        for sw in sample_words[:8]:
            sw_phonemes = get_phonemes(sw)
            if not sw_phonemes:
                continue
            sw_ru = get_rhyme_unit_from_phonemes(sw_phonemes)
            if not sw_ru:
                continue
            if not r_family_compatible(target_r_class, classify_r_family(sw_ru)):
                continue
            score = syllable_rhyme_score(target_ru, sw_ru)
            if score > best:
                best = score
        if best >= 0.55:
            suggestions.append({'color_id': color_id, 'score': round(best, 3)})

    suggestions.sort(key=lambda s: s['score'], reverse=True)
    return suggestions

'''
Pattern Reader Engine
Layer 2 of the two-layer rhyme family system.

Consumes the syllable-level tags from perceptual_family_engine and determines
which sonic families the artist is ACTIVELY DEPLOYING — not words that happen
to overlap a family, but families being used with structural intent.

Activation is measured by a three-factor activity score (member density, line
spread, stress saturation). Unregistered words are pulled in via phonetic
scoring before activity is computed. Boundary words are disambiguated after
confirmed-active families are known, preventing them from inflating inactive
families.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import logging
from collections import defaultdict

from perceptual_family_engine import (
    PERCEPTUAL_FAMILIES,
    BOUNDARY_WORD_FLAGS,            # noqa: F401 — re-exported for callers
    score_unregistered_words,
    score_family_membership,
)
from phoneme_engine import FUNCTION_WORDS   # available to callers; tags already filtered
import syllable_engine                       # stress data accessed via tagged_words;
                                             # imported per engine suite convention

log = logging.getLogger(__name__)

# Reverse index: boundary_word (lowercase) → [family_name, ...]
# Built once at import time so disambiguation is O(1) per word rather than
# scanning all 12 families on every boundary token.
_BOUNDARY_TO_FAMILIES: dict = defaultdict(list)
for _fname, _fam in PERCEPTUAL_FAMILIES.items():
    for _bw in _fam['boundary_words']:
        _BOUNDARY_TO_FAMILIES[_bw.lower()].append(_fname)
del _fname, _fam, _bw


# ── Main callable ─────────────────────────────────────────────────────────────

def read_patterns(tagged_words, verse_lines):
    '''
    Determines which perceptual families the artist is actively deploying.

    Parameters
    ----------
    tagged_words : list[dict]
        Output of perceptual_family_engine.tag_verse_words().
        Each entry: { word, syllable_text, syllable_index, line_index,
                      word_index, family, family_score, is_boundary, is_stressed }
    verse_lines : list[str]
        Original lyric lines. Used only to compute total_lines for scoring.

    Returns
    -------
    dict with keys:
        dominant_families   list[str]  — top 1 or 2 family names by activity
        active_families     list[str]  — all confirmed active families, desc order
        parallel_pocketing  bool       — True when top two are within 15%
        family_map          dict[str → family_detail_dict]

    family_detail_dict keys:
        members              list[{ word, syllable_text, line_index, word_index }]
        line_distribution    list[int] — sorted unique line indices with members
        stress_hits          int
        activity_score       float
        boundary_words_found list[str] — boundary words assigned to this family
    '''
    total_lines = len(verse_lines)
    if total_lines == 0:
        return {
            'dominant_families':  [],
            'active_families':    [],
            'parallel_pocketing': False,
            'family_map':         {},
        }

    # ── Lookup tables built from tagged_words ─────────────────────────────────

    # stressed_positions: set of (line_index, word_index) where any syllable
    # is stressed. Used to recover is_stressed for unregistered-word entries
    # (score_unregistered_words output omits the field).
    stressed_positions: set = set()

    # tagged_by_syll_key: (line_index, word_index, syllable_index) → entry
    # Used to recover syllable_text for unregistered words found by scoring.
    tagged_by_syll_key: dict = {}

    for e in tagged_words:
        if e['is_stressed']:
            stressed_positions.add((e['line_index'], e['word_index']))
        tagged_by_syll_key[(e['line_index'], e['word_index'], e['syllable_index'])] = e

    # ── Step 1: Group tagged syllables by family ──────────────────────────────
    # Boundary words (family=None, is_boundary=True) are excluded here and
    # handled separately in Step 5 after active families are confirmed.
    family_raw: dict = defaultdict(list)
    for entry in tagged_words:
        if entry['family'] is None or entry['is_boundary']:
            continue
        family_raw[entry['family']].append(entry)

    # ── Step 2: Enrich with unregistered words ────────────────────────────────
    # For each family that already has >= 2 direct registry hits (family_score
    # == 1.0), call score_unregistered_words to find verse words that phonetically
    # belong but aren't in the registry yet (neologisms, slang, OOV forms).
    for family_name in list(family_raw.keys()):
        members = family_raw[family_name]
        direct_hits = sum(1 for m in members if m['family_score'] == 1.0)
        if direct_hits < 2:
            continue

        existing_positions = {(m['line_index'], m['word_index']) for m in members}
        unregistered = score_unregistered_words(tagged_words, family_name)

        for u in unregistered:
            pos = (u['line_index'], u['word_index'])
            if pos in existing_positions:
                continue
            existing_positions.add(pos)

            # Recover syllable_text and is_stressed from the original tagged entry.
            # The unregistered word IS present in tagged_words with family=None,
            # so this lookup will succeed for any word in the verse.
            syll_entry    = tagged_by_syll_key.get(
                (u['line_index'], u['word_index'], u['syllable_index'])
            )
            syllable_text = syll_entry['syllable_text'] if syll_entry else u['word']
            is_stressed   = pos in stressed_positions

            family_raw[family_name].append({
                'word':           u['word'],
                'syllable_text':  syllable_text,
                'syllable_index': u['syllable_index'],
                'line_index':     u['line_index'],
                'word_index':     u['word_index'],
                'family':         family_name,
                'family_score':   u['score'],
                'is_boundary':    False,
                'is_stressed':    is_stressed,
            })

    # ── Step 3: Compute activity scores ──────────────────────────────────────
    # norm_ceiling: dynamic upper bound on member count so short verses
    # aren't penalized relative to long ones.
    #   8-line verse  → ceiling = 10   (minimum floor)
    #   36-line verse → ceiling = 14.4
    norm_ceiling = max(10.0, total_lines * 0.4)

    family_details: dict = {}
    for family_name, members in family_raw.items():
        member_count = len(members)
        unique_lines = sorted({m['line_index'] for m in members})
        stress_hits  = sum(1 for m in members if m['is_stressed'])

        member_count_norm = min(member_count, norm_ceiling) / norm_ceiling
        line_spread       = len(unique_lines) / total_lines
        stress_ratio      = stress_hits / member_count if member_count > 0 else 0.0

        activity_score = (
            member_count_norm * 0.40 +
            line_spread       * 0.35 +
            stress_ratio      * 0.25
        )

        family_details[family_name] = {
            'members': [
                {
                    'word':          m['word'],
                    'syllable_text': m['syllable_text'],
                    'line_index':    m['line_index'],
                    'word_index':    m['word_index'],
                }
                for m in members
            ],
            'line_distribution':    unique_lines,
            'stress_hits':          stress_hits,
            'activity_score':       round(activity_score, 4),
            'boundary_words_found': [],
        }

    # ── Step 4: Confirm active families (activity_score >= 0.25) ─────────────
    confirmed: dict = {
        name: detail
        for name, detail in family_details.items()
        if detail['activity_score'] >= 0.25
    }

    # ── Step 5: Boundary word disambiguation ─────────────────────────────────
    # Process each boundary-word position exactly once (a multisyllabic boundary
    # word like "career" might appear as multiple syllable entries — dedup by
    # (line_index, word_index)).
    seen_boundary_positions: set = set()
    for entry in tagged_words:
        if not entry['is_boundary']:
            continue
        pos = (entry['line_index'], entry['word_index'])
        if pos in seen_boundary_positions:
            continue
        seen_boundary_positions.add(pos)

        word             = entry['word']
        candidate_fnames = _BOUNDARY_TO_FAMILIES.get(word, [])
        if not candidate_fnames:
            continue

        # Among candidate families that ARE confirmed active, take the best scorer.
        # This prevents boundary words from inflating families with no real activity.
        best_family, best_score = None, 0.0
        for fname in candidate_fnames:
            if fname not in confirmed:
                continue
            s = score_family_membership(word, fname)
            if s > best_score:
                best_score, best_family = s, fname

        if best_family is None:
            continue  # neither candidate family is active — leave unassigned

        family_details[best_family]['members'].append({
            'word':          word,
            'syllable_text': entry['syllable_text'],
            'line_index':    entry['line_index'],
            'word_index':    entry['word_index'],
        })
        bwf = family_details[best_family]['boundary_words_found']
        if word not in bwf:
            bwf.append(word)

    # ── Step 6: Dominant family logic ────────────────────────────────────────
    sorted_active = sorted(
        confirmed.items(),
        key=lambda kv: kv[1]['activity_score'],
        reverse=True,
    )

    dominant_families:  list = []
    parallel_pocketing: bool = False

    if sorted_active:
        top_name, top_detail   = sorted_active[0]
        top_score              = top_detail['activity_score']

        if len(sorted_active) >= 2:
            second_name, second_detail = sorted_active[1]
            second_score               = second_detail['activity_score']

            # "more than 10% above" → top > second * 1.10
            # 10% gap is enough to call single dominance in English verse; a
            # 15% gate was too loose and allowed ambient vowel families (IH is
            # common in English prose) to trigger false parallel pocketing.
            if top_score > second_score * 1.10:
                dominant_families = [top_name]
            else:
                dominant_families  = [top_name, second_name]
                parallel_pocketing = True
        else:
            dominant_families = [top_name]

    return {
        'dominant_families':  dominant_families,
        'active_families':    [name for name, _ in sorted_active],
        'parallel_pocketing': parallel_pocketing,
        'family_map':         family_details,
    }


# ── Describe ──────────────────────────────────────────────────────────────────

def describe_pattern(pattern_result):
    '''
    Returns a one-to-two sentence human-readable summary of read_patterns output.

    Formats:
      No active families:
        "No dominant family detected."

      Parallel pocketing (top two within 15%):
        "Parallel pocketing detected: R_FAMILY and EH_FAMILY running simultaneously.
         R_FAMILY: worst, curse, verse. EH_FAMILY: blessed, stressed, breath."

      Single dominant:
        "Dominant family: R_FAMILY (worst, curse, verse, birth).
         Active across 6 of 8 lines. 5 stress hits. Activity score: 0.73."
    '''
    dominant   = pattern_result.get('dominant_families', [])
    parallel   = pattern_result.get('parallel_pocketing', False)
    fmap       = pattern_result.get('family_map', {})
    active_all = pattern_result.get('active_families', [])

    if not dominant:
        return 'No dominant family detected.'

    # Infer total_lines from the highest line_index seen across all members.
    # This is an approximation — lines with no family members won't be counted,
    # but for display purposes it is close enough.
    all_line_indices = [
        m['line_index']
        for detail in fmap.values()
        for m in detail['members']
    ]
    total_lines_inferred = max(all_line_indices) + 1 if all_line_indices else 0

    def _top_words(family_name, n):
        '''First n unique words from this family's member list, in appearance order.'''
        detail = fmap.get(family_name, {})
        seen: list = []
        for m in detail.get('members', []):
            w = m['word']
            if w not in seen:
                seen.append(w)
            if len(seen) == n:
                break
        return seen

    if parallel:
        fa, fb   = dominant[0], dominant[1]
        words_a  = ', '.join(_top_words(fa, 3)) or '\u2014'
        words_b  = ', '.join(_top_words(fb, 3)) or '\u2014'
        return (
            f'Parallel pocketing detected: {fa} and {fb} running simultaneously. '
            f'{fa}: {words_a}. {fb}: {words_b}.'
        )

    name   = dominant[0]
    detail = fmap.get(name, {})
    words  = ', '.join(_top_words(name, 4)) or '\u2014'
    lines  = len(detail.get('line_distribution', []))
    score  = detail.get('activity_score', 0.0)
    stress = detail.get('stress_hits', 0)

    return (
        f'Dominant family: {name} ({words}). '
        f'Active across {lines} of {total_lines_inferred} lines. '
        f'{stress} stress hits. '
        f'Activity score: {score:.2f}.'
    )


# ── Test Block ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    from perceptual_family_engine import tag_verse_words

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

    tagged = tag_verse_words(verse)
    result = read_patterns(tagged, verse)

    print('\n=== ACTIVE FAMILIES ===')
    for fname in result['active_families']:
        d = result['family_map'][fname]
        words = [m['word'] for m in d['members']]
        print(f'  {fname:<14}  score={d["activity_score"]:.3f}  '
              f'lines={len(d["line_distribution"])}  stress={d["stress_hits"]}  '
              f'members={words}')

    print(f'\n  parallel_pocketing: {result["parallel_pocketing"]}')
    print(f'  dominant_families:  {result["dominant_families"]}')

    print('\n=== DESCRIPTION ===')
    print(' ', describe_pattern(result))

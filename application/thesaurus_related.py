'''
application/thesaurus_related.py

Extracted verbatim from api.py's /thesaurus/related route body (Phase
1d, Clean Architecture reorg). Coordinates a domain computation
(domain.motif_engine.build_motif_map, to find the verse's active rhyme
families) with two infrastructure reads (thesaurus_engine.py,
concreteness_engine.py) to produce one combined view — "here's this
word's synonyms, each tagged with whether it also rhymes with something
already in the verse" — the textbook shape of a use case, same as
suggest_enrichment.py in this same package. Zero test coverage existed
for this before extraction (confirmed via grep, not assumed).

Logic unchanged from the original inline version.
'''
from thesaurus_engine import lookup as thesaurus_lookup
from concreteness_engine import get_concreteness
from domain.phoneme_engine import get_rhyme_unit, syllable_rhyme_score
from domain.motif_engine import build_motif_map
from domain.prosodic_config import NEAR_RHYME_SAME_VOWEL_SCORE


def get_related_synonyms(word, verse_lines):
    '''
    Returns { found: bool, synonyms: [...] } — synonyms tagged with
    also_rhymes (does this synonym rhyme with one of the verse's active
    families) and concreteness. Sorted with also_rhymes=True first.

    verse_lines is optional — an empty/falsy value just means no
    family_units get computed, so also_rhymes is always False (matches
    the original inline behavior exactly: family_units stays [] when
    verse_lines is falsy).
    '''
    result = thesaurus_lookup(word)
    if not result['found']:
        return {'found': False, 'synonyms': []}

    family_units = []
    if verse_lines:
        motif_result = build_motif_map(verse_lines, None)
        for group in motif_result['motif_groups']:
            for member in group['members']:
                ru = get_rhyme_unit(member['word'])
                if ru:
                    family_units.append(ru)
                    break

    tagged = []
    for syn in result['synonyms']:
        syn_ru = get_rhyme_unit(syn)
        also_rhymes = bool(syn_ru) and any(
            syllable_rhyme_score(syn_ru, fu) >= NEAR_RHYME_SAME_VOWEL_SCORE for fu in family_units
        )
        tagged.append({'word': syn, 'also_rhymes': also_rhymes, 'concreteness': get_concreteness(syn)})

    tagged.sort(key=lambda s: s['also_rhymes'], reverse=True)
    return {'found': True, 'synonyms': tagged}

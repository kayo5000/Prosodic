'''
Tests for domain/family_scoring.py — genuinely zero coverage existed for
this logic before it was extracted from api.py's /autofill and
/suggest-family route bodies (Phase 1d, Clean Architecture reorg;
confirmed via grep across tests/ before writing this file, not
assumed). Real phonetic scoring algorithms (rhyme-unit comparison, the
EH+R slant-tier gate, R-family compatibility) had been living only
inline in two Flask routes, untestable independently of an HTTP
request.
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.family_scoring import score_verse_against_families, score_word_against_families

# "done"/"gun" share a real rhyme unit (AH1, N); "cat" doesn't — confirmed
# via get_rhyme_unit before writing these tests, not guessed.
FAMILY_AH1_N = {'color_id': 1, 'sample_words': ['done', 'gun', 'son']}


def test_score_verse_assigns_words_matching_a_family():
    result = score_verse_against_families(
        ['I never thought I would run', 'Chasing something till I\'m done'],
        [FAMILY_AH1_N],
    )
    words = {a['word'] for a in result}
    assert 'run' in words
    assert 'done' in words
    for a in result:
        assert a['color_id'] == 1
        assert a['score'] >= 0.60  # default threshold


def test_score_verse_empty_inputs_return_empty():
    assert score_verse_against_families([], [FAMILY_AH1_N]) == []
    assert score_verse_against_families(['a line'], []) == []


def test_score_verse_respects_custom_threshold():
    # "done" is one of the family's own sample words, so it scores a
    # real 1.0 (exact match) — threshold has to exceed the maximum
    # possible score to prove nothing qualifies, not just be "high".
    verse = ['Chasing something till I\'m done']
    result = score_verse_against_families(verse, [FAMILY_AH1_N], threshold=1.001)
    assert result == []


def test_score_verse_sorted_by_score_descending():
    result = score_verse_against_families(
        ['I ran and thought about a gun and a son and being done'],
        [FAMILY_AH1_N],
    )
    scores = [a['score'] for a in result]
    assert scores == sorted(scores, reverse=True)


def test_score_word_matches_a_compatible_family():
    result = score_word_against_families('sun', [FAMILY_AH1_N])
    assert len(result) == 1
    assert result[0]['color_id'] == 1
    assert result[0]['score'] >= 0.55


def test_score_word_no_match_returns_empty():
    result = score_word_against_families('cat', [FAMILY_AH1_N])
    assert result == []


def test_score_word_empty_word_returns_empty():
    assert score_word_against_families('', [FAMILY_AH1_N]) == []
    assert score_word_against_families('   ', [FAMILY_AH1_N]) == []


def test_score_word_family_with_no_sample_words_skipped():
    result = score_word_against_families('sun', [{'color_id': 1, 'sample_words': []}])
    assert result == []


def test_score_word_multiple_families_sorted_by_score():
    families = [
        {'color_id': 1, 'sample_words': ['done', 'gun']},
        {'color_id': 2, 'sample_words': ['cat', 'hat', 'bat']},  # AE1,T — real match for "sat"
    ]
    result = score_word_against_families('sat', families)
    # "sat" rhymes with the AE1/T family (color 2), not the AH1/N one
    assert any(r['color_id'] == 2 for r in result)
    scores = [r['score'] for r in result]
    assert scores == sorted(scores, reverse=True)

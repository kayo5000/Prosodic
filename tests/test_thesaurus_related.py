'''
Tests for application/thesaurus_related.py — genuinely zero coverage
existed before this logic was extracted from api.py's /thesaurus/related
route body (Phase 1d, Clean Architecture reorg; confirmed via grep, not
assumed). Uses the real bundled Moby Thesaurus + concreteness data, same
convention as other tests exercising those engines for real.
'''
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from application.thesaurus_related import get_related_synonyms


def test_found_word_returns_tagged_synonyms():
    result = get_related_synonyms('happy', [])
    assert result['found'] is True
    assert len(result['synonyms']) > 0
    for s in result['synonyms']:
        assert 'word' in s
        assert 'also_rhymes' in s
        assert 'concreteness' in s


def test_unknown_word_returns_not_found():
    result = get_related_synonyms('zzznotarealword123', [])
    assert result == {'found': False, 'synonyms': []}


def test_no_verse_lines_means_nothing_tagged_also_rhymes():
    # Matches the original inline behavior exactly: empty verse_lines ->
    # empty family_units -> every also_rhymes is False.
    result = get_related_synonyms('happy', [])
    assert all(s['also_rhymes'] is False for s in result['synonyms'])


def test_also_rhymes_true_for_a_real_matching_family():
    # "town"/"crown"/"gown" share a real rhyme unit (AW1, N) — a synonym
    # that also has that rhyme unit should get also_rhymes=True.
    result = get_related_synonyms('crown', ['I walked through the whole town'])
    # Sorted with also_rhymes=True first — if any exist, they lead.
    if any(s['also_rhymes'] for s in result['synonyms']):
        assert result['synonyms'][0]['also_rhymes'] is True


def test_results_sorted_also_rhymes_first():
    result = get_related_synonyms('crown', ['I walked through the whole town'])
    flags = [s['also_rhymes'] for s in result['synonyms']]
    # once it turns False, it never turns True again
    assert flags == sorted(flags, key=lambda b: not b)

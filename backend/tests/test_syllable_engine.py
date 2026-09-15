'''
Tests for syllable_engine.py — in particular the third graceful-degradation
tier added for words that neither the CMU dictionary nor g2p_en can handle.
Before this fix, get_syllables() returned None for such a word, and
syllabify_line() silently dropped it from the stream entirely (not just
undercounted its syllables — the word stopped existing anywhere downstream:
wrong word_index/stream_index for everything after it, invisible to every
engine that reads the stream).
'''
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import domain.syllable_engine as syllable_engine
from domain.syllable_engine import (
    get_syllables, get_syllable_count, syllabify_line,
    _estimate_syllable_count_from_letters,
)


# ── Normal path (CMU/g2p succeed) — unaffected by the fallback addition ──

def test_real_word_syllable_count():
    assert get_syllable_count('reverse') == 2
    assert get_syllable_count('motivation') == 4


def test_real_word_syllables_not_marked_estimated():
    sylls = get_syllables('reverse')
    assert all(not s.get('estimated') for s in sylls)


def test_syllabify_line_normal_verse_unaffected():
    line = "And though I'm blessed I seen you stressin'"
    stream = syllabify_line(line)
    assert len(stream) > 0
    assert all(not s.get('estimated') for s in stream)


# ── The letters-based estimator itself ───────────────────────────────────

def test_estimate_empty_word_is_zero():
    assert _estimate_syllable_count_from_letters('') == 0


def test_estimate_pure_number_is_one():
    assert _estimate_syllable_count_from_letters('2024') == 1


def test_estimate_counts_vowel_groups():
    assert _estimate_syllable_count_from_letters('cat') == 1
    assert _estimate_syllable_count_from_letters('date') == 1  # trailing silent e dropped
    assert _estimate_syllable_count_from_letters('table') == 2  # "-le" exempted from the silent-e rule
    assert _estimate_syllable_count_from_letters('banana') == 3


def test_estimate_never_returns_zero_for_real_letters():
    # Even a pathological all-consonant string still gets a floor of 1 —
    # a wrong-but-present guess beats vanishing from the stream.
    assert _estimate_syllable_count_from_letters('bcdfg') == 1


# ── The actual worst case: CMU miss AND g2p unavailable/failed ──────────
# Forced via monkeypatch rather than hunting for a word that naturally
# defeats g2p_en's neural predictor (which handles almost anything) —
# this is the one case the whole fallback tier exists for, so it needs a
# real, reliable way to trigger it in a test, not a hopeful example word.

def test_unresolvable_word_gets_estimated_syllables_not_none(monkeypatch):
    monkeypatch.setattr(syllable_engine, 'get_phonemes', lambda word: None)
    sylls = get_syllables('zynthoravix')
    assert sylls is not None
    assert len(sylls) > 0
    assert all(s['estimated'] for s in sylls)
    assert all(s['phonemes'] == [] for s in sylls), (
        'estimated syllables must not carry fake phoneme data — rhyme '
        'detection should stay correctly blind to them, not guess wrong'
    )


def test_unresolvable_word_survives_in_the_stream(monkeypatch):
    monkeypatch.setattr(syllable_engine, 'get_phonemes', lambda word: None)
    line = "This zynthoravix flow is different"
    stream = syllabify_line(line)
    words = {s['word'] for s in stream}
    assert 'zynthoravix' in words, (
        'an out-of-vocabulary word must not silently vanish from the '
        'syllable stream — every downstream engine reads this stream'
    )


def test_unresolvable_word_gets_correct_word_index(monkeypatch):
    # Confirms word_index continuity isn't broken by the previously-missing
    # word — every word after it used to be silently reachable at the
    # WRONG index once the OOV word vanished.
    monkeypatch.setattr(syllable_engine, 'get_phonemes', lambda word: None)
    line = "This zynthoravix flow"
    stream = syllabify_line(line)
    flow_syllables = [s for s in stream if s['word'] == 'flow']
    assert flow_syllables and flow_syllables[0]['word_index'] == 2


def test_empty_token_still_produces_no_syllables(monkeypatch):
    # A token that's pure punctuation after stripping (e.g. "...") should
    # still be skipped, not turned into a fake 1-syllable "word".
    monkeypatch.setattr(syllable_engine, 'get_phonemes', lambda word: None)
    assert get_syllables('') == []

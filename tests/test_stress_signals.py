"""Tests for stress_signals.py — the stress/rhythm craft-signal taxonomy
(Part B of the stress-inversion/cadence fix).

Uses hand-built synthetic syllable data (not real CMU lookups) for the
per-signal-type classification tests, so each test isolates exactly one
branch of the classifier deterministically. The real-CMU, real-pipeline
path is covered separately by tests/test_pocket_engine.py and the
end-to-end assertions in test_api.py (POST /analyze cadence_signals).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.song_context import SongContext

import stress_signals as ss


def _syl(word, wi, si, gi, pos, perf, lex):
    return {
        'word': word, 'word_index': wi, 'syllable_index': si,
        'global_syll_idx': gi, 'grid_position': pos,
        'performed_stress': perf, 'lexical_stress': lex,
    }


# ── individual signal types ──────────────────────────────────────────────

def test_promotion_weak_syllable_on_strong_beat():
    data = [_syl('the', 0, 0, 0, 8, 2, 0)]   # lexically weak, grid says primary
    sigs = ss.detect_line_signals(data)
    assert any(s['type'] == 'promotion' for s in sigs)


def test_demotion_near_miss():
    # stressed syllable, grid unstressed (perf=0), but pos=5 is within
    # POCKET_WINDOW(1) of pocket position 4 -> demotion, not syncopation
    data = [_syl('word', 0, 0, 0, 5, 0, 1)]
    sigs = ss.detect_line_signals(data)
    types = [s['type'] for s in sigs]
    assert 'demotion' in types
    assert 'syncopation' not in types


def test_syncopation_true_off_grid():
    # stressed syllable landing at pos=2, far (dist 2) from any strong/pocket beat
    data = [_syl('word', 0, 0, 0, 2, 0, 1)]
    sigs = ss.detect_line_signals(data)
    types = [s['type'] for s in sigs]
    assert 'syncopation' in types
    assert 'demotion' not in types


def test_trochaic_inversion_strong_weak_in_iambic_slot():
    # grid rises (perf 1 -> 2, an iambic-shaped slot); word gives STRONG-weak
    a = _syl('GET', 0, 0, 0, 4, 1, 1)
    b = _syl('ting', 0, 1, 1, 8, 2, 0)
    sigs = ss.detect_line_signals([a, b])
    assert any(s['type'] == 'trochaic_inversion' for s in sigs)


def test_stress_clash_adjacent_stressed_syllables():
    a = _syl('THIR', 0, 0, 0, 0, 2, 1)
    b = _syl('MEN', 1, 0, 1, 4, 1, 1)
    sigs = ss.detect_line_signals([a, b])
    assert any(s['type'] == 'stress_clash' for s in sigs)


def test_stress_lapse_three_plus_unstressed_in_a_row():
    data = [
        _syl('and', 0, 0, 0, 0, 0, 0),
        _syl('a',   1, 0, 1, 1, 0, 0),
        _syl('the', 2, 0, 2, 2, 0, 0),
        _syl('DOG', 3, 0, 3, 4, 1, 1),
    ]
    sigs = ss.detect_line_signals(data)
    lapse = [s for s in sigs if s['type'] == 'stress_lapse']
    assert len(lapse) == 1
    assert lapse[0]['run_length'] == 3


def test_no_lapse_below_threshold():
    data = [
        _syl('and', 0, 0, 0, 0, 0, 0),
        _syl('a',   1, 0, 1, 1, 0, 0),
        _syl('DOG', 2, 0, 2, 4, 1, 1),
    ]
    sigs = ss.detect_line_signals(data)
    assert not any(s['type'] == 'stress_lapse' for s in sigs)


def test_secondary_recruitment():
    # word "COMprehend": primary (lex=1) far from any beat, secondary (lex=2) on a pocket slot
    primary   = _syl('comprehend', 0, 0, 0, 2, 0, 1)   # far from beat
    secondary = _syl('comprehend', 0, 1, 1, 4, 1, 2)   # exactly on pocket
    sigs = ss.detect_line_signals([primary, secondary])
    assert any(s['type'] == 'secondary_recruitment' for s in sigs)


def test_level_stress_ambiguity_uses_cmu_variant_disagreement(monkeypatch):
    # simulate a word where CMU's pronunciation variants disagree on which
    # syllable is primary-stressed
    monkeypatch.setattr(ss, 'get_lexical_stress_variants',
                         lambda w: [[1, 0], [0, 1]])
    sigs = ss.detect_ambiguous_words(['contested'])
    assert len(sigs) == 1
    assert sigs[0]['type'] == 'level_stress_ambiguity'


def test_level_stress_ambiguity_absent_when_variants_agree(monkeypatch):
    monkeypatch.setattr(ss, 'get_lexical_stress_variants',
                         lambda w: [[1, 0], [1, 0]])
    sigs = ss.detect_ambiguous_words(['agreed'])
    assert sigs == []


# ── function-word suppression ────────────────────────────────────────────

def test_function_word_suppressed_unless_on_pocket():
    # "that" off-pocket should NOT count as lexically stressed for clash purposes
    off_pocket = _syl('that', 0, 0, 0, 8, 0, 1)
    assert ss._effective_lexical_stress(off_pocket) == 0

    on_pocket = _syl('that', 0, 0, 0, 4, 1, 1)
    assert ss._effective_lexical_stress(on_pocket) == 1


def test_function_words_dont_manufacture_clashes():
    # two adjacent monosyllabic function words, both nominally lex=1,
    # neither on a pocket position -> should NOT register a clash
    a = _syl('it', 0, 0, 0, 6, 0, 1)
    b = _syl('is', 1, 0, 1, 7, 0, 1)
    sigs = ss.detect_line_signals([a, b])
    assert not any(s['type'] == 'stress_clash' for s in sigs)


# ── deliberateness gate — the critical design constraint ────────────────

def test_deliberateness_never_bare_deliberate():
    """No signal, under any input, may ever carry the literal string
    'deliberate' — only 'uncertain' / 'likely_automatic' / 'possible_deliberate'."""
    data = [
        _syl('THIR', 0, 0, 0, 0, 2, 1),
        _syl('MEN',  1, 0, 1, 4, 1, 1),
        _syl('the',  2, 0, 2, 8, 2, 0),
    ]
    sigs = ss.detect_line_signals(data, word_recurrence={'the': 5})
    for s in sigs:
        if 'deliberateness' in s:
            assert s['deliberateness'] in (
                ss.DELIBERATE_UNCERTAIN, ss.DELIBERATE_AUTOMATIC, ss.DELIBERATE_POSSIBLE,
            )
            assert s['deliberateness'] != 'deliberate'


def test_clash_adjacent_mismatch_is_likely_automatic():
    # 'MEN' is both stress-clash-adjacent to 'THIR' AND demoted (lex=1, perf=0)
    a = _syl('THIR', 0, 0, 0, 0, 2, 1)
    b = _syl('MEN',  1, 0, 1, 1, 0, 1)   # adjacent + demoted, off strong grid
    sigs = ss.detect_line_signals([a, b])
    demotions = [s for s in sigs if s['type'] in ('demotion', 'syncopation')]
    assert demotions
    assert all(s['deliberateness'] == ss.DELIBERATE_AUTOMATIC for s in demotions)


def test_recurring_word_upgrades_to_possible_deliberate():
    data = [_syl('echo', 0, 0, 0, 2, 0, 1)]  # syncopation, no clash context
    sigs = ss.detect_line_signals(data, word_recurrence={'echo': 3})
    assert sigs
    assert sigs[0]['deliberateness'] == ss.DELIBERATE_POSSIBLE


def test_isolated_mismatch_defaults_to_uncertain():
    data = [_syl('echo', 0, 0, 0, 2, 0, 1)]
    sigs = ss.detect_line_signals(data)  # no recurrence map at all
    assert sigs
    assert sigs[0]['deliberateness'] == ss.DELIBERATE_UNCERTAIN


# ── analyze_verse_stream gating ──────────────────────────────────────────

def test_analyze_verse_stream_gates_on_missing_bpm():
    result = ss.analyze_verse_stream([{'line_index': 0, 'word': 'x'}], None)
    assert result['signals'] == []
    assert result['lines_analyzed'] == 0
    assert set(result['signal_counts'].keys()) == set(ss.SIGNAL_TYPES)


def test_analyze_verse_stream_empty_stream():
    result = ss.analyze_verse_stream([], SongContext(bpm=90))
    assert result == {
        'signals': [], 'lines_analyzed': 0,
        'signal_counts': {t: 0 for t in ss.SIGNAL_TYPES},
    }


def test_signal_counts_always_has_all_taxonomy_keys():
    """Even when nothing fires, every key must be present at 0 — a caller
    checking cadence_signals['signal_counts']['syncopation'] should never
    KeyError just because this verse had none."""
    from feedback_engine import assemble_feedback
    fb = assemble_feedback(['a a a'], SongContext(bpm=90))
    assert set(fb['cadence_signals']['signal_counts'].keys()) == set(ss.SIGNAL_TYPES)

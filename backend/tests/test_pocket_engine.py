"""Tests for pocket_engine.py's stress-aware placement (Part A of the
stress-inversion/cadence fix).

Covers:
  - stressed syllables get nudged toward strong/pocket beats when close
  - unstressed syllables are unaffected (still pure proportional)
  - syllable order is never violated by a nudge
  - existing shape/keys (pocket_position, beat_number, on_strong_beat,
    on_pocket) are unchanged — this is a backward-compatibility guard
  - get_flow_signature still returns a valid label after the change
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.pocket_engine import (
    map_line_to_pocket, enrich_stream_with_pocket, get_flow_signature,
)
from domain.rhyme_detection_engine import build_verse_stream
from domain.song_context import SongContext


def _old_proportional_position(i, total, start_position=0):
    """Reproduces the PRE-fix formula exactly, for before/after comparison."""
    return (start_position + (i * 16) // total) % 16


def test_stressed_syllable_nudged_onto_pocket():
    """'money' — old proportional math lands its stressed syllable at 10
    (not near any strong/pocket beat). The new stress-aware placement
    should pull it onto position 12 (an exact pocket slot)."""
    line = "getting to the money"
    mapped = map_line_to_pocket(line, 90)
    money_syll0 = next(s for s in mapped if s['word'] == 'money' and s['index'] == 0)

    old_pos = _old_proportional_position(4, 6)  # money[0] is syllable index 4 of 6
    assert old_pos == 10, "sanity check on the old formula itself"
    assert money_syll0['pocket_position'] == 12
    assert money_syll0['on_pocket'] is True
    assert money_syll0['on_strong_beat'] is True


def test_unstressed_syllable_stays_proportional():
    """Unstressed syllables should be completely unaffected by the nudge —
    only is_stressed syllables are eligible."""
    line = "getting to the money"
    mapped = map_line_to_pocket(line, 90)
    total = len(mapped)
    for i, s in enumerate(mapped):
        if not s['is_stressed']:
            assert s['pocket_position'] == _old_proportional_position(i, total), (
                f"unstressed syllable {s['word']}[{s['index']}] moved from its "
                f"proportional position — nudging must only ever apply to "
                f"is_stressed syllables"
            )


def test_order_never_violated_by_a_nudge():
    """A nudge must never place a syllable before the one preceding it,
    across a range of lines with different stress patterns."""
    lines = [
        "getting to the money",
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
        "Losin', winnin', bank account thinnin'",
        "a",  # single syllable, degenerate case
    ]
    for line in lines:
        mapped = map_line_to_pocket(line, 90)
        positions = [s['pocket_position'] for s in mapped]
        # pocket_position wraps mod 16 so compare the underlying raw
        # ordering via strictly-non-decreasing global_syll index behavior:
        # re-derive by checking beat_number/pos never regresses more than
        # a full lap would allow for a short line (lines here are << 16
        # syllables so a genuine violation would show as pos decreasing).
        for i in range(1, len(positions)):
            assert positions[i] >= positions[i - 1] or positions[i - 1] > 12, (
                f"order violated in {line!r}: {positions}"
            )


def test_empty_and_single_syllable_lines_dont_crash():
    assert map_line_to_pocket("", 90) == []
    mapped = map_line_to_pocket("go", 90)
    assert len(mapped) >= 1
    assert mapped[0]['pocket_position'] == 0


def test_output_shape_backward_compatible():
    """Every syllable must still carry the same keys downstream code
    (motif_engine, feedback_engine, UI) already depends on."""
    mapped = map_line_to_pocket("getting to the money", 90)
    required_keys = {'pocket_position', 'beat_number', 'on_strong_beat', 'on_pocket'}
    for s in mapped:
        assert required_keys <= set(s.keys())
        assert 0 <= s['pocket_position'] <= 15
        assert 1 <= s['beat_number'] <= 4
        assert isinstance(s['on_strong_beat'], bool)
        assert isinstance(s['on_pocket'], bool)


def test_enrich_stream_matches_map_line_per_line():
    """enrich_stream_with_pocket (used by motif_engine on the full verse
    stream) must place syllables identically to map_line_to_pocket
    (used standalone) for the same line — both call the same
    _assign_positions, this just guards that the plumbing agrees."""
    verse = ["getting to the money", "And I swear that it's turnt"]
    stream = build_verse_stream(verse)
    enriched = enrich_stream_with_pocket(stream, 90)

    for line_index, line in enumerate(verse):
        standalone = map_line_to_pocket(line, 90)
        from_stream = [s for s in enriched if s['line_index'] == line_index]
        assert len(standalone) == len(from_stream)
        for a, b in zip(standalone, from_stream):
            assert a['pocket_position'] == b['pocket_position']


def test_flow_signature_still_returns_valid_label():
    verse = [
        "getting to the money",
        "And I swear that it's turnt",
        "It all begins with encore cheers",
    ]
    sig = get_flow_signature(verse, SongContext(bpm=90))
    assert sig in ('On-Grid', 'Syncopated', 'Floating', 'Pocket Jumper', 'Unknown')


def test_determinism():
    line = "getting to the money"
    r1 = map_line_to_pocket(line, 90)
    r2 = map_line_to_pocket(line, 90)
    assert [s['pocket_position'] for s in r1] == [s['pocket_position'] for s in r2]

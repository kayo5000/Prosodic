'''
Tests for pocket_engine.py's tempo-aware placement — the Beat Room fix.

Before this fix, map_line_to_pocket/enrich_stream_with_pocket accepted a
real bpm parameter but never read its value for any position math; every
line was spread proportionally across a fixed 16-slot grid regardless of
tempo. This proves the fix is real: a fast song and a slow song with the
IDENTICAL lyrics now produce measurably different placements, and the
model's own 90 BPM reference point is proven to reproduce the exact old
behavior (so tests/test_pocket_engine.py's existing bpm=90 tests staying
green isn't a coincidence — it's what the model is supposed to do there).
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pocket_engine import map_line_to_pocket, _tempo_adjusted_span, GRID_SIZE
from syllable_compression import syllables_per_beat


LINE = "Fast forward through years of rehearsal"


# ── The tempo model itself ────────────────────────────────────────────────

def test_span_equals_grid_size_at_and_below_reference_tempo():
    '''At the model's 90 BPM reference point (and anything slower, since
    the rate caps at 4.0 syllables/beat), span must equal GRID_SIZE exactly
    — this is what guarantees the old bpm=90 tests stay byte-identical.'''
    assert _tempo_adjusted_span(90) == GRID_SIZE
    assert _tempo_adjusted_span(70) == GRID_SIZE
    assert _tempo_adjusted_span(60) == GRID_SIZE


def test_span_shrinks_as_tempo_rises_above_reference():
    spans = [_tempo_adjusted_span(bpm) for bpm in (90, 100, 120, 140, 160, 180)]
    for earlier, later in zip(spans, spans[1:]):
        assert later <= earlier, f'span must never increase as tempo rises: {spans}'
    assert spans[0] > spans[-1], 'span at 90 BPM must be strictly greater than at 180 BPM'


def test_span_falls_back_to_grid_size_with_no_tempo():
    '''No bpm (e.g. /suggest's optional bpm) can't be tempo-aware about a
    tempo nobody gave it — must fall back to the old always-16 behavior,
    not crash or silently invent a tempo.'''
    assert _tempo_adjusted_span(None) == GRID_SIZE
    assert _tempo_adjusted_span(0) == GRID_SIZE
    assert _tempo_adjusted_span(-5) == GRID_SIZE


def test_span_matches_syllable_compression_formula_directly():
    '''Confirms this is really reusing syllable_compression.py's model, not
    a parallel reimplementation that could quietly drift from it.'''
    for bpm in (95, 120, 150, 175):
        expected = max(1, round(syllables_per_beat(bpm) * 4))
        assert _tempo_adjusted_span(bpm) == expected


# ── The actual, real, measurable placement difference ──────────────────────

def test_same_lyrics_different_tempo_produce_different_placement():
    slow = map_line_to_pocket(LINE, 90)
    fast = map_line_to_pocket(LINE, 160)
    slow_positions = [s['pocket_position'] for s in slow]
    fast_positions = [s['pocket_position'] for s in fast]
    assert slow_positions != fast_positions, (
        'identical lyrics at 90 vs 160 BPM produced identical placement — '
        'the tempo-aware fix is not actually having an effect'
    )


def test_fast_tempo_compresses_syllables_closer_together():
    '''The real craft signature of compression: at a fast tempo, syllables
    that were on distinct beats at a slow tempo land on/near the SAME
    position instead — real, direct evidence of compression, not just "the
    numbers changed somehow."'''
    slow = map_line_to_pocket(LINE, 90)
    fast = map_line_to_pocket(LINE, 160)

    def distinct_positions(mapped):
        return len({s['pocket_position'] for s in mapped})

    assert distinct_positions(fast) < distinct_positions(slow), (
        f'expected fewer distinct grid positions used at 160 BPM than 90 BPM '
        f'for the same {len(slow)} syllables — '
        f'slow used {distinct_positions(slow)}, fast used {distinct_positions(fast)}'
    )


def test_very_slow_tempo_matches_reference_tempo_exactly():
    '''Below the 90 BPM reference point the model caps at the same span as
    90 BPM itself (4.0 syllables/beat is the ceiling) — so 70 BPM and 90
    BPM should place the same lyrics identically, not just "similarly".'''
    at_90 = map_line_to_pocket(LINE, 90)
    at_70 = map_line_to_pocket(LINE, 70)
    assert [s['pocket_position'] for s in at_90] == [s['pocket_position'] for s in at_70]


def test_moderate_tempo_change_already_produces_a_real_difference():
    '''Doesn't take an extreme tempo swing — even 90 vs 95 (a difference a
    real song could plausibly have between two takes) changes the span
    (16 -> 15, confirmed in _tempo_adjusted_span's own tests), which is
    enough to shift at least one syllable's landing position on a
    real line.'''
    at_90 = map_line_to_pocket(LINE, 90)
    at_95 = map_line_to_pocket(LINE, 95)
    assert at_90 != at_95


def test_final_wrap_still_bounded_to_real_grid_regardless_of_span():
    '''Whatever span produced the spacing, every syllable must still land
    on a real, valid grid position (0-15) — span only changes the spacing
    calculation, never how many real positions exist in a bar. This is
    the "don't break the existing pocket-classification" guarantee.'''
    for bpm in (70, 90, 120, 160, 200):
        mapped = map_line_to_pocket(LINE, bpm)
        for s in mapped:
            assert 0 <= s['pocket_position'] <= 15
            assert 1 <= s['beat_number'] <= 4
            assert isinstance(s['on_strong_beat'], bool)
            assert isinstance(s['on_pocket'], bool)

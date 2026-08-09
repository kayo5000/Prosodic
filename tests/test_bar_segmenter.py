"""Tests for analysis/bar_segmenter.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.bar_segmenter import segment

_VERSE = (
    "I never ran from a fight but I been on the run\n"
    "Chasing something that I thought was gonna come undone\n"
    "In the mirror I can see a different kind of me\n"
    "And everything I ever thought was blurry's coming free"
)
_BPM = 90


def test_determinism():
    """Same input twice → identical output (bars, input_hash, method, version)."""
    r1 = segment(_VERSE, _BPM)
    r2 = segment(_VERSE, _BPM)
    assert r1["input_hash"]        == r2["input_hash"]
    assert r1["method"]            == r2["method"]
    assert r1["algorithm_version"] == r2["algorithm_version"]
    assert r1["segmentation_id"]   == r2["segmentation_id"]
    assert len(r1["bars"])         == len(r2["bars"])
    for b1, b2 in zip(r1["bars"], r2["bars"]):
        assert b1["bar_index"]    == b2["bar_index"]
        assert b1["text"]         == b2["text"]
        assert b1["start_char"]   == b2["start_char"]
        assert b1["end_char"]     == b2["end_char"]
        assert b1["start_syllable"] == b2["start_syllable"]
        assert b1["end_syllable"]   == b2["end_syllable"]


def test_input_hash_changes_with_lyrics():
    alt = _VERSE.replace("never ran", "always walked")
    r1 = segment(_VERSE, _BPM)
    r2 = segment(alt,    _BPM)
    assert r1["input_hash"] != r2["input_hash"]


def test_input_hash_changes_with_bpm():
    r1 = segment(_VERSE, 90)
    r2 = segment(_VERSE, 75)
    assert r1["input_hash"] != r2["input_hash"]


def test_required_fields_present():
    r = segment(_VERSE, _BPM)
    for key in ("segmentation_id", "method", "algorithm_version", "input_hash",
                "created_at", "bpm", "bars", "warnings"):
        assert key in r, f"Missing top-level key: {key}"
    for bar in r["bars"]:
        for key in ("bar_index", "text", "start_char", "end_char",
                    "start_syllable", "end_syllable", "line_indices",
                    "estimated_beat_coverage", "confidence", "boundary_signals"):
            assert key in bar, f"Bar missing key: {key}"


def test_method_and_version_present():
    r = segment(_VERSE, _BPM)
    assert r["method"]            == "deterministic_v1"
    assert r["algorithm_version"] == "bar_segmenter_1.0.0"


def test_line_break_signal_always_fires():
    r = segment(_VERSE, _BPM)
    for bar in r["bars"]:
        assert "line_break" in bar["boundary_signals"]


def test_low_confidence_bars_in_warnings():
    # Single very short line should produce a low-confidence bar
    tiny = "yeah"
    r = segment(tiny, _BPM)
    low_bars = [b for b in r["bars"] if b["confidence"] < 0.6]
    if low_bars:
        for bar in low_bars:
            assert any(str(bar["bar_index"]) in w for w in r["warnings"])


def test_four_line_verse_produces_four_bars():
    r = segment(_VERSE, _BPM)
    assert len(r["bars"]) == 4


def test_bar_indices_are_sequential():
    r = segment(_VERSE, _BPM)
    for i, bar in enumerate(r["bars"], start=1):
        assert bar["bar_index"] == i


def test_estimated_beat_coverage_is_positive():
    r = segment(_VERSE, _BPM)
    for bar in r["bars"]:
        assert bar["estimated_beat_coverage"] > 0

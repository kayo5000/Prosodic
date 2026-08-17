"""Tests for behavior/state_engine.py"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from behavior.state_engine import classify, _LABELS


def _snap(sid, bars):
    return {"snapshot_id": sid, "bar_features": bars}


def _flat_bar(idx, rhyme=0.1, pocket=0.5, density=0.1, energy=0.1,
              motif=None, emotional=0.2, breath=0.4, stress="10"):
    return {
        "bar_index":          idx,
        "rhyme_density":      rhyme,
        "pocket_alignment":   pocket,
        "density_score":      density,
        "energy_estimate":    energy,
        "motif_hits":         motif or [],
        "emotional_directness": emotional,
        "breath_load":        breath,
        "stress_pattern":     stress,
        "syllable_count":     10,
        "end_rhyme_families": [],
    }


def test_flat_verse_returns_flat():
    bars = [_flat_bar(i) for i in range(1, 7)]
    result = classify(_snap("s1", bars))
    assert result["section_state"] == "Flat"


def test_rising_rhyme_and_pocket_returns_tightening():
    bars = []
    for i in range(1, 9):
        t = i / 8.0
        bars.append(_flat_bar(i, rhyme=0.1 + t * 0.6, pocket=0.3 + t * 0.5,
                               density=0.3, energy=0.5, breath=0.5))
    result = classify(_snap("s2", bars))
    assert result["section_state"] == "Tightening"


def test_exposed_verse_has_low_density_high_emotional():
    bars = [_flat_bar(i, rhyme=0.05, density=0.05, energy=0.15,
                      emotional=0.85, motif=["soul"]) for i in range(1, 6)]
    result = classify(_snap("s3", bars))
    assert result["section_state"] == "Exposed"


def test_state_path_covers_whole_verse():
    bars = [_flat_bar(i) for i in range(1, 9)]
    result = classify(_snap("s4", bars))
    # state_path should have at least one entry and cover all bars
    assert len(result["state_path"]) >= 1
    # Check no gaps: collect all bar indices mentioned
    mentioned = set()
    for seg in result["state_path"]:
        rng = seg["bars"]
        if "-" in str(rng):
            start, end = rng.split("-")
            for b in range(int(start), int(end) + 1):
                mentioned.add(b)
        else:
            mentioned.add(int(rng))
    for bar in bars:
        assert bar["bar_index"] in mentioned


def test_evidence_is_non_empty():
    bars = [_flat_bar(i) for i in range(1, 5)]
    result = classify(_snap("s5", bars))
    assert isinstance(result["evidence"], list)
    assert len(result["evidence"]) > 0


def test_result_has_required_keys():
    bars = [_flat_bar(1)]
    result = classify(_snap("s6", bars))
    for key in ("snapshot_id", "section_state", "confidence",
                "state_path", "evidence"):
        assert key in result


def test_section_state_is_one_of_six_labels():
    bars = [_flat_bar(i) for i in range(1, 5)]
    result = classify(_snap("s7", bars))
    assert result["section_state"] in _LABELS


def test_confidence_is_between_zero_and_one():
    bars = [_flat_bar(i) for i in range(1, 5)]
    result = classify(_snap("s8", bars))
    assert 0.0 <= result["confidence"] <= 1.0


def test_empty_bars_does_not_crash():
    result = classify(_snap("s9", []))
    assert result["section_state"] in _LABELS

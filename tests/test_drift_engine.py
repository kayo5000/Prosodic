"""Tests for behavior/drift_engine.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from behavior.drift_engine import compute


def _bar(idx, rhyme=0.5, pocket=0.6, density=0.4, emotional=0.4,
         breath=0.5, energy=0.5, motif=None):
    return {
        "bar_index":          idx,
        "rhyme_density":      rhyme,
        "pocket_alignment":   pocket,
        "density_score":      density,
        "emotional_directness": emotional,
        "breath_load":        breath,
        "energy_estimate":    energy,
        "assonance_score":    0.3,
        "consonance_score":   0.3,
        "syllable_count":     10,
        "internal_rhyme_count": 1,
        "semantic_shift":     0.0,
        "motif_hits":         motif or [],
    }


def _snap(sid, bars):
    return {"snapshot_id": sid, "bar_features": bars}


def _compat(level="identical", action="proceed"):
    return {"compatibility": level, "recommended_action": action}


def _align(pairs):
    return {"alignment_id": "test-align", "pairs": pairs}


def test_identical_snapshots_produce_zero_deltas():
    bars = [_bar(1), _bar(2), _bar(3)]
    pairs = [
        {"a_bar_index": i, "b_bar_index": i,
         "status": "matched", "similarity": 1.0, "anchors": []}
        for i in range(1, 4)
    ]
    result = compute(_snap("a", bars), _snap("b", bars),
                     _align(pairs), _compat())
    for change in result["per_bar_changes"]:
        for feat, delta in change.get("changes", {}).items():
            assert abs(delta) < 1e-9, f"{feat} delta should be 0, got {delta}"


def test_incompatible_snapshots_returns_error():
    bars = [_bar(1)]
    result = compute(
        _snap("a", bars), _snap("b", bars),
        _align([]),
        _compat("incompatible", "requires_resegmentation"),
    )
    assert "error" in result
    assert result["error"] == "requires_resegmentation"


def test_higher_rhyme_density_shows_positive_delta():
    bars_a = [_bar(1, rhyme=0.2), _bar(2, rhyme=0.2)]
    bars_b = [_bar(1, rhyme=0.8), _bar(2, rhyme=0.8)]
    pairs = [
        {"a_bar_index": i, "b_bar_index": i,
         "status": "matched", "similarity": 0.8, "anchors": []}
        for i in range(1, 3)
    ]
    result = compute(_snap("a", bars_a), _snap("b", bars_b),
                     _align(pairs), _compat())
    for change in result["per_bar_changes"]:
        delta = change["changes"].get("rhyme_density", 0)
        assert delta > 0


def test_inserted_bar_appears_in_insertions():
    bars_a = [_bar(1)]
    bars_b = [_bar(1), _bar(2)]
    pairs = [
        {"a_bar_index": 1, "b_bar_index": 1,
         "status": "matched", "similarity": 0.9, "anchors": []},
        {"a_bar_index": None, "b_bar_index": 2,
         "status": "inserted", "similarity": None, "anchors": []},
    ]
    result = compute(_snap("a", bars_a), _snap("b", bars_b),
                     _align(pairs), _compat())
    assert len(result["insertions"]) == 1
    assert result["insertions"][0]["b_bar_index"] == 2
    assert result["insertions"][0]["effect"]


def test_result_has_required_keys():
    bars = [_bar(1)]
    pairs = [{"a_bar_index": 1, "b_bar_index": 1,
              "status": "matched", "similarity": 1.0, "anchors": []}]
    result = compute(_snap("a", bars), _snap("b", bars),
                     _align(pairs), _compat())
    for key in ("drift_id", "snapshot_a", "snapshot_b", "alignment_id",
                "compatibility", "overall_drift", "summary_evidence",
                "per_bar_changes", "insertions", "deletions"):
        assert key in result


def test_overall_drift_is_valid_class():
    valid = {"technical_up_emotional_down", "emotional_up_technical_down",
             "density_up_clarity_down", "clarity_up_density_down",
             "strict_improvement", "strict_degradation", "lateral"}
    bars = [_bar(1)]
    pairs = [{"a_bar_index": 1, "b_bar_index": 1,
              "status": "matched", "similarity": 1.0, "anchors": []}]
    result = compute(_snap("a", bars), _snap("b", bars),
                     _align(pairs), _compat())
    assert result["overall_drift"] in valid

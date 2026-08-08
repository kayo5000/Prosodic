"""Tests for behavior/degradation_detector.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from behavior.degradation_detector import detect


def _drift(per_bar):
    return {"per_bar_changes": per_bar}


def _change(status="matched", **deltas):
    return {"a_bar_index": 1, "b_bar_index": 1, "status": status,
            "changes": deltas}


def test_technical_gain_emotional_loss():
    # rhyme goes up, emotional goes down
    result = detect(_drift([
        _change(rhyme_density=0.30, pocket_alignment=0.25,
                assonance_score=0.20, emotional_directness=-0.30,
                semantic_shift=-0.10),
        _change(rhyme_density=0.25, pocket_alignment=0.20,
                assonance_score=0.15, emotional_directness=-0.25,
                semantic_shift=-0.08),
    ]))
    assert result["tradeoff_class"] == "technical_gain_emotional_loss"


def test_strict_improvement():
    result = detect(_drift([
        _change(rhyme_density=0.20, pocket_alignment=0.15,
                density_score=0.10, emotional_directness=0.10),
        _change(rhyme_density=0.18, pocket_alignment=0.12,
                density_score=0.08, emotional_directness=0.08),
    ]))
    assert result["tradeoff_class"] == "strict_improvement"


def test_lateral_when_no_significant_change():
    result = detect(_drift([
        _change(rhyme_density=0.001, pocket_alignment=-0.001),
    ]))
    assert result["tradeoff_class"] == "lateral"


def test_result_has_required_keys():
    result = detect(_drift([_change()]))
    for key in ("tradeoff_class", "improvements", "degradations",
                "location", "summary"):
        assert key in result


def test_tradeoff_class_is_valid():
    valid = {"technical_gain_emotional_loss", "emotional_gain_technical_loss",
             "density_gain_clarity_loss", "clarity_gain_density_loss",
             "strict_improvement", "strict_degradation", "lateral"}
    result = detect(_drift([_change()]))
    assert result["tradeoff_class"] in valid


def test_improvements_and_degradations_are_lists():
    result = detect(_drift([_change(rhyme_density=0.2, emotional_directness=-0.2)]))
    assert isinstance(result["improvements"], list)
    assert isinstance(result["degradations"], list)


def test_summary_is_non_empty_string():
    result = detect(_drift([_change()]))
    assert isinstance(result["summary"], str)
    assert len(result["summary"]) > 10


def test_empty_per_bar_changes_returns_lateral():
    result = detect(_drift([]))
    assert result["tradeoff_class"] in ("lateral", "strict_improvement")

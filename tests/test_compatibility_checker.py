"""Tests for analysis/compatibility_checker.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.compatibility_checker import check


def _snap(sid, method, version):
    return {
        "snapshot_id": sid,
        "segmentation": {"method": method, "algorithm_version": version},
    }


def test_identical_returns_identical():
    a = _snap("a1", "deterministic_v1", "bar_segmenter_1.0.0")
    b = _snap("b1", "deterministic_v1", "bar_segmenter_1.0.0")
    result = check(a, b)
    assert result["compatibility"] == "identical"
    assert result["recommended_action"] == "proceed"
    assert result["snapshot_a"] == "a1"
    assert result["snapshot_b"] == "b1"


def test_same_method_different_version_returns_warning():
    a = _snap("a2", "deterministic_v1", "bar_segmenter_1.0.0")
    b = _snap("b2", "deterministic_v1", "bar_segmenter_1.1.0")
    result = check(a, b)
    assert result["compatibility"] == "compatible_with_warning"
    assert result["recommended_action"] == "proceed_with_notice"


def test_different_methods_returns_incompatible():
    a = _snap("a3", "deterministic_v1", "bar_segmenter_1.0.0")
    b = _snap("b3", "ml_v1", "bar_segmenter_1.0.0")
    result = check(a, b)
    assert result["compatibility"] == "incompatible"
    assert result["recommended_action"] == "requires_resegmentation"


def test_result_contains_all_required_keys():
    a = _snap("a4", "deterministic_v1", "bar_segmenter_1.0.0")
    b = _snap("b4", "deterministic_v1", "bar_segmenter_1.0.0")
    result = check(a, b)
    for key in ("compatibility", "snapshot_a", "snapshot_b", "reason", "recommended_action"):
        assert key in result, f"Missing key: {key}"


def test_missing_segmentation_handles_gracefully():
    a = {"snapshot_id": "a5"}
    b = {"snapshot_id": "b5"}
    result = check(a, b)
    # Both methods are None == None → identical
    assert result["compatibility"] == "identical"

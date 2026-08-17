"""Tests for analysis/bar_feature_mapper.py"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.bar_feature_mapper import map_features

_REQUIRED_FIELDS = (
    "bar_index", "syllable_count", "stress_pattern", "pocket_alignment",
    "rhyme_density", "internal_rhyme_count", "end_rhyme_families",
    "assonance_score", "consonance_score", "density_score", "motif_hits",
    "semantic_shift", "emotional_directness", "energy_estimate", "breath_load",
)


def _make_segmentation(texts):
    """Build a minimal segmentation dict from a list of bar texts."""
    bars = []
    char = 0
    for i, text in enumerate(texts):
        bars.append({
            "bar_index":    i + 1,
            "text":         text,
            "start_char":   char,
            "end_char":     char + len(text),
            "line_indices": [i],
        })
        char += len(text) + 1
    return {"bars": bars, "bpm": 90}


def _empty_engine_outputs():
    return {"rhyme_map": [], "motif_groups": [], "density_per_line": []}


def test_all_bars_produce_a_feature_vector():
    seg = _make_segmentation(["line one here", "line two here", "line three"])
    features = map_features(seg, _empty_engine_outputs())
    assert len(features) == 3


def test_all_required_fields_present():
    seg = _make_segmentation(["test line one", "test line two"])
    features = map_features(seg, _empty_engine_outputs())
    for feat in features:
        for field in _REQUIRED_FIELDS:
            assert field in feat, f"Missing field '{field}' in bar features"


def test_bar_with_no_rhymes_has_zero_rhyme_density():
    seg = _make_segmentation(["some words here now"])
    features = map_features(seg, _empty_engine_outputs())
    assert features[0]["rhyme_density"] == 0.0
    assert features[0]["end_rhyme_families"] == []


def test_bar_with_no_rhymes_has_zero_internal_rhyme_count():
    seg = _make_segmentation(["some words here now"])
    features = map_features(seg, _empty_engine_outputs())
    assert features[0]["internal_rhyme_count"] == 0


def test_all_numeric_fields_are_in_range():
    seg = _make_segmentation(["test line here", "another line here"])
    features = map_features(seg, _empty_engine_outputs())
    for feat in features:
        for field in ("pocket_alignment", "rhyme_density", "assonance_score",
                      "consonance_score", "density_score", "emotional_directness",
                      "energy_estimate", "breath_load"):
            val = feat[field]
            assert 0.0 <= val <= 1.0, f"{field}={val} out of [0,1]"


def test_bar_index_matches_segmentation():
    seg = _make_segmentation(["a", "b", "c"])
    features = map_features(seg, _empty_engine_outputs())
    for i, feat in enumerate(features, start=1):
        assert feat["bar_index"] == i


def test_motif_hits_populated_from_engine_output():
    seg = _make_segmentation(["some words", "more words"])
    engine = {
        "rhyme_map": [],
        "motif_groups": [
            {"color_id": "red", "members": [{"line_index": 0, "word": "some"}]}
        ],
        "density_per_line": [],
    }
    features = map_features(seg, engine)
    assert "red" in features[0]["motif_hits"]
    assert features[1]["motif_hits"] == []


def test_density_score_from_engine_output():
    seg = _make_segmentation(["flow words here"])
    engine = {
        "rhyme_map": [],
        "motif_groups": [],
        "density_per_line": [{"index": 0, "scores": {"internal": 80.0}}],
    }
    features = map_features(seg, engine)
    assert abs(features[0]["density_score"] - 0.8) < 0.01


def test_empty_segmentation_returns_empty_list():
    seg = {"bars": [], "bpm": 90}
    features = map_features(seg, _empty_engine_outputs())
    assert features == []

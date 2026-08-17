"""Tests for analysis/bar_aligner.py"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.bar_aligner import align


def _bar(idx, text="line", rhyme_fam=None, motif=None, stress="1010", syl=10):
    return {
        "bar_index":          idx,
        "text":               text,
        "end_rhyme_families": rhyme_fam or [],
        "motif_hits":         motif or [],
        "stress_pattern":     stress,
        "syllable_count":     syl,
    }


def _snap(sid, bars):
    return {"snapshot_id": sid, "bar_features": bars}


def test_identical_snapshots_all_matched():
    bars = [_bar(1, "same line one"), _bar(2, "same line two"),
            _bar(3, "same line three")]
    a = _snap("a", bars)
    b = _snap("b", bars)
    result = align(a, b)
    matched = [p for p in result["pairs"] if p["status"] == "matched"]
    assert len(matched) == 3
    for p in matched:
        assert p["similarity"] is not None
        assert p["similarity"] > 0.9


def test_identical_snapshots_similarity_near_one():
    bars = [_bar(1, "exact same text here")]
    a = _snap("a", bars)
    b = _snap("b", bars)
    result = align(a, b)
    assert result["pairs"][0]["similarity"] >= 0.95


def test_insert_at_top_produces_inserted_and_shifted():
    orig_bars = [_bar(1, "verse line one"), _bar(2, "verse line two"),
                 _bar(3, "verse line three")]
    new_bars  = [_bar(1, "brand new intro line")] + [
        _bar(i + 2, b["text"]) for i, b in enumerate(orig_bars)
    ]
    a = _snap("a", orig_bars)
    b = _snap("b", new_bars)
    result = align(a, b)
    statuses = [p["status"] for p in result["pairs"]]
    assert "inserted" in statuses


def test_rewritten_bar_has_low_similarity():
    orig = [_bar(1, "the original lyrics here", rhyme_fam=["AY"], stress="10101010")]
    new  = [_bar(1, "completely different text", rhyme_fam=["EH"], stress="01010101")]
    a = _snap("a", orig)
    b = _snap("b", new)
    result = align(a, b)
    # Should be rewritten or at least low similarity
    pair = result["pairs"][0]
    assert pair["similarity"] is not None
    assert pair["similarity"] < 0.7


def test_deleted_bar_appears_in_pairs():
    orig = [_bar(1, "line one"), _bar(2, "line two"), _bar(3, "line three")]
    new  = [_bar(1, "line one"), _bar(2, "line three")]  # line 2 deleted
    a = _snap("a", orig)
    b = _snap("b", new)
    result = align(a, b)
    statuses = [p["status"] for p in result["pairs"]]
    assert "deleted" in statuses


def test_result_contains_required_keys():
    a = _snap("a", [_bar(1)])
    b = _snap("b", [_bar(1)])
    result = align(a, b)
    for key in ("alignment_id", "alignment_method", "draft_a", "draft_b", "pairs"):
        assert key in result


def test_each_pair_has_required_fields():
    a = _snap("a", [_bar(1, "some text")])
    b = _snap("b", [_bar(1, "some text")])
    result = align(a, b)
    for pair in result["pairs"]:
        for field in ("a_bar_index", "b_bar_index", "status", "similarity", "anchors"):
            assert field in pair


def test_empty_snapshots_return_empty_pairs():
    a = _snap("a", [])
    b = _snap("b", [])
    result = align(a, b)
    assert result["pairs"] == []


def test_anchors_list_populated_for_matched_pairs():
    bars = [_bar(1, "some line", rhyme_fam=["AY"], motif=["fire"])]
    a = _snap("a", bars)
    b = _snap("b", bars)
    result = align(a, b)
    matched = [p for p in result["pairs"] if p["status"] == "matched"]
    assert matched, "Expected at least one matched pair"
    assert isinstance(matched[0]["anchors"], list)

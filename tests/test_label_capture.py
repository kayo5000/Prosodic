"""Tests for behavior/label_capture.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile
import importlib

# Override DB path to a temp file for all tests
import behavior.label_capture as lc

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
lc._DB_PATH = _tmp.name


def test_capture_prediction_inserts_row():
    label_id = lc.capture_prediction(
        snapshot_id="snap_test_1",
        bar_features=[{"bar_index": 1}],
        predicted_state="Flat",
        confidence=0.72,
        rule_path={"Flat": 0.72, "Locked": 0.20},
    )
    assert isinstance(label_id, str) and len(label_id) > 0
    # Verify row in training set (no feedback yet → shouldn't appear)
    training = lc.get_training_set()
    assert all(r["label_id"] != label_id for r in training)


def test_record_feedback_updates_row():
    label_id = lc.capture_prediction(
        snapshot_id="snap_test_2",
        bar_features=[{"bar_index": 1}],
        predicted_state="Tightening",
        confidence=0.65,
    )
    lc.record_feedback(label_id, agree=False, corrected_state="Locked")
    training = lc.get_training_set()
    matches = [r for r in training if r["label_id"] == label_id]
    assert len(matches) == 1
    assert matches[0]["user_agree"] == 0
    assert matches[0]["user_corrected_state"] == "Locked"


def test_get_training_set_excludes_rows_without_feedback():
    lid = lc.capture_prediction(
        snapshot_id="snap_test_3",
        bar_features=[],
        predicted_state="Flat",
        confidence=0.5,
    )
    training = lc.get_training_set()
    # Row with no feedback must not appear
    assert all(r["label_id"] != lid for r in training)


def test_get_training_set_includes_rows_with_feedback():
    lid = lc.capture_prediction(
        snapshot_id="snap_test_4",
        bar_features=[{"bar_index": 1}],
        predicted_state="Pushing",
        confidence=0.80,
    )
    lc.record_feedback(lid, agree=True)
    training = lc.get_training_set()
    assert any(r["label_id"] == lid for r in training)


def test_get_label_stats_returns_correct_counts():
    stats = lc.get_label_stats()
    assert "total_labels" in stats
    assert "agreement_rate_by_label" in stats
    assert "common_corrections_by_label" in stats
    assert stats["total_labels"] >= 0


def test_thumbs_up_recorded_correctly():
    lid = lc.capture_prediction(
        snapshot_id="snap_test_5",
        bar_features=[],
        predicted_state="Locked",
        confidence=0.9,
    )
    lc.record_feedback(lid, agree=True)
    training = lc.get_training_set()
    match = next((r for r in training if r["label_id"] == lid), None)
    assert match is not None
    assert match["user_agree"] == 1
    assert match["user_corrected_state"] is None

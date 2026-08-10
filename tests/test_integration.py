"""
Integration tests — full pipeline coverage.
Tests 1-5 and 7 run without an API key.
Test 6 (AI interpreter constraints) is skipped if ANTHROPIC_API_KEY is absent.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile
import pytest

# _HAS_API_KEY (below) needs ANTHROPIC_API_KEY in os.environ before this
# module's own import finishes — but nothing guarantees .env has been
# loaded yet at this point (only api.py calls load_dotenv(), and whether
# THAT has already run depends entirely on which test file pytest happens
# to import first during collection). Found via a real, order-dependent
# failure: this test skipped when run alone, but ran (and then failed on
# live-LLM non-determinism, the same class as the known
# test_cantos_direct_live_safety flake) inside the full suite, purely
# because some other test file's import of api.py happened to run first
# and load .env as a side effect. Loading it explicitly here makes this
# module's own skip/run decision independent of import order.
from dotenv import load_dotenv
load_dotenv()

# Override label_capture DB to a temp file
import behavior.label_capture as lc
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
lc._DB_PATH = _tmp.name

from analysis.compatibility_checker import check as compat_check
from analysis.bar_segmenter         import segment
from analysis.bar_feature_mapper    import map_features
from analysis.bar_aligner           import align
from behavior.state_engine          import classify
from behavior.drift_engine          import compute as drift_compute
from behavior.degradation_detector  import detect as degrade_detect
from behavior.ai_interpreter        import interpret, validate_output

_HAS_API_KEY = bool(os.environ.get("ANTHROPIC_API_KEY"))

# ── shared fixtures ────────────────────────────────────────────────────────────

_VERSE_A = (
    "I never ran from a fight but I been on the run\n"
    "Chasing something that I thought was gonna come undone\n"
    "In the mirror I can see a different kind of me\n"
    "And everything I ever thought was blurry's coming free"
)

_VERSE_B = (
    "I never ran from a battle but I been on the move\n"
    "Reaching for something I thought I had to prove\n"
    "In the mirror there's a stranger staring back at me\n"
    "And everything I used to know is finally breaking free"
)

_VERSE_B_WITH_INSERT = (
    "New intro line right here now\n" + _VERSE_A
)

_BPM = 90


def _make_snapshot(verse, sid):
    """Build a complete snapshot: segment → map → state."""
    seg = segment(verse, _BPM)
    eng = {"rhyme_map": [], "motif_groups": [], "density_per_line": []}
    bar_feats = map_features(seg, eng)
    return {
        "snapshot_id":  sid,
        "lyrics":       verse,
        "bpm":          _BPM,
        "segmentation": seg,
        "bar_features": bar_feats,
    }


# ── TEST 1: Single-snapshot path ──────────────────────────────────────────────

def test_1_single_snapshot_path():
    snap = _make_snapshot(_VERSE_A, "snap_1")
    result = classify(snap)

    assert result["section_state"] in (
        "Locked", "Tightening", "Pushing", "Slipping", "Flat", "Exposed"
    )
    assert len(result["state_path"]) >= 1
    assert len(result["evidence"]) >= 1

    # label_capture must have logged the prediction
    training = lc.get_training_set()
    # (no feedback yet — row exists in DB even if not in training set)
    stats = lc.get_label_stats()
    assert stats["total_labels"] >= 1


# ── TEST 2: Determinism ────────────────────────────────────────────────────────

def test_2_determinism():
    r1 = segment(_VERSE_A, _BPM)
    r2 = segment(_VERSE_A, _BPM)

    assert r1["input_hash"]        == r2["input_hash"]
    assert r1["segmentation_id"]   == r2["segmentation_id"]
    assert r1["method"]            == r2["method"]
    assert r1["algorithm_version"] == r2["algorithm_version"]
    assert len(r1["bars"])         == len(r2["bars"])

    for b1, b2 in zip(r1["bars"], r2["bars"]):
        assert b1["bar_index"]      == b2["bar_index"]
        assert b1["text"]           == b2["text"]
        assert b1["start_syllable"] == b2["start_syllable"]
        assert b1["end_syllable"]   == b2["end_syllable"]


# ── TEST 3: Cross-draft path (compatible) ─────────────────────────────────────

def test_3_cross_draft_compatible():
    snap_a = _make_snapshot(_VERSE_A, "snap_3a")
    snap_b = _make_snapshot(_VERSE_B, "snap_3b")

    compat = compat_check(snap_a, snap_b)
    assert compat["compatibility"] == "identical"
    assert compat["recommended_action"] == "proceed"

    alignment = align(snap_a, snap_b)
    assert len(alignment["pairs"]) > 0

    drift = drift_compute(snap_a, snap_b, alignment, compat)
    assert "error" not in drift
    assert len(drift["per_bar_changes"]) > 0

    degrad = degrade_detect(drift)
    assert "tradeoff_class" in degrad
    assert "summary" in degrad


# ── TEST 4: Cross-draft path (incompatible) ───────────────────────────────────

def test_4_cross_draft_incompatible():
    snap_a = _make_snapshot(_VERSE_A, "snap_4a")
    snap_b = _make_snapshot(_VERSE_B, "snap_4b")

    # Force incompatibility by patching method
    snap_b["segmentation"]["method"] = "ml_v1"

    compat = compat_check(snap_a, snap_b)
    assert compat["compatibility"] == "incompatible"
    assert compat["recommended_action"] == "requires_resegmentation"

    # drift_engine must refuse to run
    fake_alignment = {"alignment_id": "x", "pairs": []}
    result = drift_compute(snap_a, snap_b, fake_alignment, compat)
    assert "error" in result
    assert result["error"] == "requires_resegmentation"


# ── TEST 5: Phantom drift prevention ─────────────────────────────────────────

def test_5_phantom_drift_prevention():
    snap_a = _make_snapshot(_VERSE_A, "snap_5a")
    snap_b = _make_snapshot(_VERSE_B_WITH_INSERT, "snap_5b")

    compat    = compat_check(snap_a, snap_b)
    assert compat["recommended_action"] != "requires_resegmentation"

    alignment = align(snap_a, snap_b)

    # At least one inserted bar should be detected
    inserted  = [p for p in alignment["pairs"] if p["status"] == "inserted"]
    assert len(inserted) >= 1, "Expected at least one inserted bar"

    # No matched pair should show catastrophic degradation on all features
    drift = drift_compute(snap_a, snap_b, alignment, compat)
    matched = [c for c in drift["per_bar_changes"]
               if c["status"] in ("matched", "shifted_match")]

    for change in matched:
        deltas = list(change.get("changes", {}).values())
        if deltas:
            # At least one delta should be near-zero or positive
            # (inserted bar should not corrupt matched pair scores)
            assert not all(d < -0.5 for d in deltas), (
                f"All features massively negative in matched pair — "
                f"phantom drift detected: {change}"
            )

    # Insertions list should be non-empty in drift output
    assert len(drift["insertions"]) >= 1


# ── TEST 6: AI interpreter constraints ────────────────────────────────────────

@pytest.mark.skipif(not _HAS_API_KEY, reason="ANTHROPIC_API_KEY not set")
def test_6_ai_interpreter_constraints():
    state_data = {
        "section_state": "Tightening",
        "confidence":    0.82,
        "evidence": [
            "Rhyme density slope +0.18 across 8 bars",
            "Pocket alignment slope +0.12 across 8 bars",
            "Stress variance is stable while density climbs",
        ],
        "state_path": [
            {"bars": "1-4", "state": "Locked",     "confidence": 0.70},
            {"bars": "5-8", "state": "Tightening", "confidence": 0.82},
        ],
    }
    drift_data = {
        "overall_drift":    "technical_up_emotional_down",
        "summary_evidence": [
            "rhyme density moved up (mean delta +0.18)",
            "emotional directness moved down (mean delta -0.12)",
        ],
    }
    degrad_data = {
        "tradeoff_class": "technical_gain_emotional_loss",
        "improvements":   ["rhyme_density", "pocket_alignment"],
        "degradations":   ["emotional_directness"],
        "summary": (
            "Technical precision improved while emotional directness dropped — "
            "the revision may be cleaner but less urgent."
        ),
    }

    result = interpret(state=state_data, drift=drift_data, degradation=degrad_data)
    violations = validate_output(result)

    assert violations == [], (
        f"Interpreter violated constraints:\n" +
        "\n".join(violations) +
        f"\n\nOutput was:\n{result['interpretation']}"
    )
    assert len(result["based_on"]) == 3


# ── TEST 7: Label capture round-trip ─────────────────────────────────────────

def test_7_label_capture_roundtrip():
    snap = _make_snapshot(_VERSE_A, "snap_7")
    result = classify(snap)

    # State engine calls capture_prediction internally —
    # at least one row must exist in the DB
    stats = lc.get_label_stats()
    assert stats["total_labels"] >= 1

    # Manually capture a prediction to test feedback round-trip
    lid = lc.capture_prediction(
        snapshot_id="roundtrip_snap",
        bar_features=[{"bar_index": 1}],
        predicted_state="Locked",
        confidence=0.85,
    )
    assert lid

    # Provide thumbs-down + correction
    lc.record_feedback(lid, agree=False, corrected_state="Tightening")

    # Must appear in training set
    training = lc.get_training_set()
    match = next((r for r in training if r["label_id"] == lid), None)
    assert match is not None, "Corrected record not found in training set"
    assert match["user_agree"]           == 0
    assert match["user_corrected_state"] == "Tightening"
    assert match["predicted_state"]      == "Locked"

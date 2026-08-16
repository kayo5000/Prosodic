"""Tests for behavior/ai_interpreter.py

Tests that require the Anthropic API are skipped when ANTHROPIC_API_KEY
is not set in the environment.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Same order-dependent gap already found and fixed in test_integration.py
# this session: only api.py calls load_dotenv() at import time, so
# whether ANTHROPIC_API_KEY is visible here depends entirely on whether
# some OTHER test file happened to import api.py first in this pytest
# run. Found for real (not by inspection) while verifying the AI
# provider abstraction refactor — this file's 4 live tests silently
# skipped a run where the key genuinely was available, exactly the
# "sometimes silently skips a real check it should run" failure mode
# test_integration.py already had. Calling it directly, unconditionally,
# here fixes it the same way.
from dotenv import load_dotenv
load_dotenv()

import pytest
from behavior.ai_interpreter import interpret, validate_output, _sentence_count, _FORBIDDEN

_HAS_API_KEY = bool(os.environ.get("ANTHROPIC_API_KEY"))
_skip_no_key = pytest.mark.skipif(not _HAS_API_KEY, reason="ANTHROPIC_API_KEY not set")


# ── unit tests (no API call) ──────────────────────────────────────────────────

def test_sentence_counter_basic():
    assert _sentence_count("One. Two. Three.") == 3
    assert _sentence_count("One sentence here") == 1
    assert _sentence_count("Hello! How are you? Fine.") == 3


def test_validate_catches_forbidden_words():
    result = {"interpretation": "This is a good verse with powerful lines."}
    violations = validate_output(result)
    assert any("good" in v for v in violations)
    assert any("powerful" in v for v in violations)


def test_validate_catches_too_short():
    result = {"interpretation": "One sentence only."}
    violations = validate_output(result)
    assert any("short" in v.lower() or "minimum" in v.lower() for v in violations)


def test_validate_passes_clean_output():
    clean = (
        "The verse is tightening across bars 1-4. "
        "Rhyme density and pocket alignment both rise through the middle. "
        "Notice that emotional directness drops in the final two bars."
    )
    violations = validate_output({"interpretation": clean})
    assert violations == []


def test_no_input_returns_graceful_message():
    result = interpret()
    assert "interpretation" in result
    assert "based_on" in result
    assert result["based_on"] == []


def test_based_on_reflects_inputs():
    state_data = {
        "section_state": "Flat",
        "confidence": 0.6,
        "evidence": ["Mean energy estimate 0.15"],
        "state_path": [],
    }
    # Without API key, interpret() catches the exception and returns a fallback
    result = interpret(state=state_data)
    assert "state" in result["based_on"]


# ── API tests (skipped if no key) ─────────────────────────────────────────────

@_skip_no_key
def test_live_output_length():
    state_data = {
        "section_state": "Tightening",
        "confidence": 0.82,
        "evidence": [
            "Rhyme density slope +0.18 across 8 bars",
            "Pocket alignment slope +0.12 across 8 bars",
        ],
        "state_path": [{"bars": "1-4", "state": "Locked", "confidence": 0.7},
                       {"bars": "5-8", "state": "Tightening", "confidence": 0.82}],
    }
    result = interpret(state=state_data)
    count = _sentence_count(result["interpretation"])
    assert 2 <= count <= 4, f"Expected 2-4 sentences, got {count}"


@_skip_no_key
def test_live_no_forbidden_words():
    state_data = {
        "section_state": "Exposed",
        "confidence": 0.75,
        "evidence": ["Mean density 0.12 (sparse)", "Emotional directness mean 0.78"],
        "state_path": [],
    }
    result = interpret(state=state_data)
    violations = validate_output(result)
    assert violations == [], f"Constraint violations: {violations}"


@_skip_no_key
def test_live_references_a_feature():
    state_data = {
        "section_state": "Slipping",
        "confidence": 0.68,
        "evidence": [
            "Pocket alignment slope -0.08 across 6 bars",
            "Syllabic density slope +0.05",
        ],
        "state_path": [],
    }
    result = interpret(state=state_data)
    text = result["interpretation"].lower()
    feature_terms = ("rhyme", "pocket", "density", "syllable", "emotion",
                     "motif", "stress", "breath", "clarity")
    assert any(t in text for t in feature_terms), (
        f"No feature referenced in: {result['interpretation']}"
    )


@_skip_no_key
def test_live_no_ghostwriting():
    degradation = {
        "tradeoff_class": "technical_gain_emotional_loss",
        "improvements":   ["rhyme_density", "pocket_alignment"],
        "degradations":   ["emotional_directness"],
        "summary": "Technical precision improved while emotional directness dropped.",
    }
    result = interpret(degradation=degradation)
    text = result["interpretation"]
    ghostwrite_signals = ['"', "try writing", "replace", "change the line to",
                          "use the word", "write it as"]
    for sig in ghostwrite_signals:
        assert sig not in text.lower(), f"Possible ghostwriting detected: '{sig}'"

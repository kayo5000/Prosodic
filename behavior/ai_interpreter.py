"""
behavior/ai_interpreter.py

Converts structured state/drift/degradation outputs into a 2-4 sentence
artist-facing read using the Anthropic API.

Hard constraints (enforced in system prompt):
  - Only explain from structured evidence given.
  - Forbidden: powerful, good, weak, bad, great, amazing.
  - Tone: clear, respectful, artist-centered, non-authoritarian.
  - Use: "consider", "notice", "this creates" — never "you must" / "you should".
  - Never propose replacement lyrics. Explain behavior; artist writes.
  - 2-4 sentences. Never longer.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json

# No more direct `import anthropic` — routed through the AI provider
# abstraction instead (Clean Architecture reorg; see
# infrastructure/ai_providers/README.md). This also means this call site
# gets circuit-breaker protection for the first time — it had none
# before this reorg (see ClaudeProvider's own docstring for why that's a
# deliberate, disclosed improvement, not an accidental side effect).
from infrastructure.ai_providers import get_provider
from domain.ai_provider import AIMessage, ReasoningRequest

_MODEL      = "claude-sonnet-4-6"
_MAX_TOKENS = 400

_FORBIDDEN = ("powerful", "good", "weak", "bad", "great", "amazing",
              "you must", "you should", "you need to", "you have to")

_SYSTEM_PROMPT = """You are a lyric craft analyst for Prosodic, a hip-hop analysis tool.
You receive structured JSON data from analysis engines and write a 2-4 sentence artist-facing interpretation.

HARD RULES — follow exactly:
1. Explain ONLY from the structured evidence in the input. Do not invent features, patterns, or claims the data does not contain.
2. Forbidden words/phrases (do not use): powerful, good, weak, bad, great, amazing, you must, you should, you need to, you have to.
3. Tone: clear, respectful, artist-centered. Use words like "consider", "notice", "this creates", "the data shows".
4. Never propose replacement lyrics. Never ghostwrite. Describe behavior — the artist decides what to do with it.
5. Length: 2-4 sentences. Never write more than 4 sentences.
6. Reference at least one specific named feature from the input (e.g. "rhyme density", "pocket alignment", "emotional directness").
7. Do not editorialize beyond what the data supports."""


def interpret(state=None, drift=None, degradation=None):
    """Generate a 2-4 sentence artist-facing interpretation.

    Args:
        state:       state_engine output dict (optional)
        drift:       drift_engine output dict (optional)
        degradation: degradation_detector output dict (optional)

    Returns:
        {
            "interpretation": str,
            "based_on": [list of which inputs were used]
        }
    """
    payload  = {}
    based_on = []

    if state:
        payload["state"] = {
            "section_state": state.get("section_state"),
            "confidence":    state.get("confidence"),
            "evidence":      state.get("evidence", []),
            "state_path":    state.get("state_path", []),
        }
        based_on.append("state")

    if drift:
        payload["drift"] = {
            "overall_drift":    drift.get("overall_drift"),
            "summary_evidence": drift.get("summary_evidence", []),
        }
        based_on.append("drift")

    if degradation:
        payload["degradation"] = {
            "tradeoff_class": degradation.get("tradeoff_class"),
            "improvements":   degradation.get("improvements", []),
            "degradations":   degradation.get("degradations", []),
            "summary":        degradation.get("summary"),
        }
        based_on.append("degradation")

    if not payload:
        return {
            "interpretation": "No analysis data was provided.",
            "based_on": [],
        }

    user_prompt = (
        "Based on the following structured analysis data, write a 2-4 sentence "
        "interpretation for the artist. Follow all system rules exactly.\n\n"
        f"{json.dumps(payload, indent=2)}"
    )

    try:
        provider = get_provider()  # Claude today — see infrastructure/ai_providers/README.md
        result = provider.get_reasoning(ReasoningRequest(
            messages=[AIMessage(role="user", content=user_prompt)],
            system=_SYSTEM_PROMPT,
            max_tokens=_MAX_TOKENS,
            model=_MODEL,
        ))
        text = result.text.strip()
    except Exception as exc:
        text = (
            f"Interpretation unavailable ({exc.__class__.__name__}). "
            f"Section state: {state.get('section_state') if state else 'unknown'}."
        )

    return {
        "interpretation": text,
        "based_on": based_on,
    }


# ── validation helpers (used in tests) ────────────────────────────────────────

def _sentence_count(text):
    """Rough sentence count — splits on . ! ? followed by space or end."""
    import re
    parts = re.split(r'[.!?]+(?:\s|$)', text.strip())
    return len([p for p in parts if p.strip()])


def validate_output(result):
    """Return list of constraint violations. Empty list = all constraints met."""
    text       = result.get("interpretation", "")
    violations = []

    count = _sentence_count(text)
    if count < 2:
        violations.append(f"Too short: {count} sentence(s), minimum 2")
    if count > 4:
        violations.append(f"Too long: {count} sentence(s), maximum 4")

    lower = text.lower()
    for word in _FORBIDDEN:
        if word in lower:
            violations.append(f"Forbidden word/phrase used: '{word}'")

    return violations

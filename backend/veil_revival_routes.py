"""
veil_revival_routes.py

Flask Blueprint for VEIL Revival — Dead Note Resurrection.

Provides the /veil/revival/chat endpoint used by the NotepadPage
to bring abandoned notes back to life through guided VEIL conversation.

The revival system prompt instructs VEIL to:
  1. Classify the note as lyric, concept, emotional, or structural.
  2. Ask ONE targeted opening question based on that classification.
  3. Use exactly one tool at a time: literary devices, emotional
     reframing, song section templates, or concept expansion.
  4. Never write the artist's lyrics for them.
  5. Always end with a question or clear next step.

Registration:
    In api.py, add these two lines:

        from veil_revival_routes import veil_revival_bp
        app.register_blueprint(veil_revival_bp)

Design rules:
- New file only. No existing files modified.
  (UPDATE: this file itself was later modified twice, deliberately — (1)
  to add rate limiting and the shared Anthropic circuit breaker, since
  this route makes the same real, billed Anthropic calls /veil/chat does
  and had the same open cost/abuse gap; (2) the Clean Architecture reorg,
  routing the actual Anthropic call through the AI provider abstraction
  instead of constructing an anthropic.Anthropic client inline — see
  infrastructure/ai_providers/README.md. Same behavior, same circuit
  breaker, just no longer importing the vendor SDK directly.)
- Silent failures — never 500 the client on model errors.
- Docstrings on everything.
"""

from __future__ import annotations

import logging
from typing import List, Dict, Any, Literal, cast

from flask import Blueprint, request, jsonify  # type: ignore

from rate_limiter import limiter, ANTHROPIC_ROUTE_LIMITS
from infrastructure.ai_providers import get_provider
from domain.ai_provider import (
    AIMessage, ReasoningRequest,
    AIProviderNotConfiguredError, AIProviderUnavailableError,
)

_log = logging.getLogger(__name__)

veil_revival_bp = Blueprint("veil_revival", __name__)

# ---------------------------------------------------------------------------
# Revival system prompt
# ---------------------------------------------------------------------------

_REVIVAL_SYSTEM_TEMPLATE = """You are VEIL, a creative mentor inside Prosodic.
An artist has shared an abandoned note with you.

The note is titled: "{title}"

The note reads:
\"\"\"{body}\"\"\"

Your job is not to write for them.
It is to bring their own inspiration back to life.

FIRST — classify this note silently (do not announce the classification to the writer):
  lyric       — contains actual lyric lines or fragments
  concept     — a theme, idea, or subject without lyrics yet
  emotional   — a feeling state, memory, or personal experience
  structural  — a song form idea (verse/hook structure, arrangement note)

THEN — ask ONE targeted opening question based on the type:
  lyric:      Ask about the sonic intention — what should this feel like?
  concept:    Ask what personal experience made this idea feel urgent.
  emotional:  Ask what image or object represents this feeling.
  structural: Ask what emotion the structure is designed to carry.

Four tools available to you — introduce naturally, never list all at once:
  1. Literary devices    — name it, explain in one sentence, give one example line.
  2. Emotional reframing — one focused question at a time.
  3. Song section templates — help them understand what job this idea does.
  4. Concept expansion   — three directions, not finished lines.

Rules:
  - Never write their lyrics.
  - Never give more than one tool at a time.
  - Always end with a question or clear next step.
  - Keep responses short. This is a conversation, not a lecture.
  - Match their energy.
  - If the note is empty or very short, ask what sparked the idea to save it."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_system_prompt(title: str, body: str) -> str:
    """
    Build the VEIL Revival system prompt for a given note.

    Args:
        title: Note title string.
        body:  Note body text.

    Returns:
        Formatted system prompt string.
    """
    safe_title = (title or "Untitled").strip()
    safe_body = (body or "").strip() or "(empty)"
    return _REVIVAL_SYSTEM_TEMPLATE.format(
        title=safe_title,
        body=safe_body,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@veil_revival_bp.route("/veil/revival/chat", methods=["POST"])
@limiter.limit(ANTHROPIC_ROUTE_LIMITS)
def revival_chat():
    """
    Continue or begin a VEIL Revival conversation for an abandoned note.

    Request JSON:
        {
          "note": {
            "title": str,
            "body":  str
          },
          "messages": [
            { "role": "user" | "assistant", "content": str },
            ...
          ]
        }

    On the first call, pass an empty messages array — VEIL will classify
    the note and ask its opening question.

    On subsequent calls, append the user's reply to messages and POST again.

    Response JSON (success):
        { "reply": str, "note_type": str | null }

    Response JSON (error):
        { "error": str }

    note_type is only populated on the first response (classification round).
    """
    try:
        data = request.get_json(force=True, silent=True) or {}

        note = data.get("note") or {}
        title = str(note.get("title", "Untitled"))
        body = str(note.get("body", ""))
        messages: List[Dict[str, Any]] = data.get("messages") or []

        # validate message list
        clean_messages: List[Dict[str, str]] = []
        for m in messages:
            if isinstance(m, dict) and m.get("role") in ("user", "assistant"):
                clean_messages.append({
                    "role": m["role"],
                    "content": str(m.get("content", "")),
                })

        system_prompt = _build_system_prompt(title, body)

        provider = get_provider()  # Claude today — see infrastructure/ai_providers/README.md
        result = provider.get_reasoning(ReasoningRequest(
            messages=[
                # cast, not a type gap — every dict reaching here was
                # either the literal opening-prompt fallback below or
                # passed the `role in ("user", "assistant")` filter above;
                # mypy just can't carry that per-entry validation through
                # the dict's own str-typed "role" value.
                AIMessage(role=cast(Literal['user', 'assistant'], m['role']), content=m['content'])
                for m in (clean_messages if clean_messages else [
                    {"role": "user", "content": "Please begin the revival session."}
                ])
            ],
            system=system_prompt,
            max_tokens=512,
        ))

        return jsonify({"reply": result.text, "note_type": None})

    except AIProviderNotConfiguredError as exc:
        _log.warning(f"revival_chat: provider not configured: {exc}")
        return jsonify({"error": "VEIL service unavailable"}), 503

    except AIProviderUnavailableError as exc:
        _log.warning(f"revival_chat: provider unavailable, rejecting without a full attempt: {exc}")
        return jsonify({"error": "Revival is temporarily unavailable — the AI service has been failing repeatedly. Please try again shortly."}), 503

    except Exception as exc:
        _log.error(f"revival_chat error: {exc}")
        return jsonify({"error": "Revival session failed. Try again."}), 500

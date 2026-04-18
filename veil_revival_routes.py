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
- Silent failures — never 500 the client on model errors.
- Docstrings on everything.
"""

from __future__ import annotations

import os
import logging
from typing import List, Dict, Any

from flask import Blueprint, request, jsonify  # type: ignore

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

def _get_anthropic_client():
    """
    Lazily construct and return the Anthropic client.

    Returns the client instance, or None if the anthropic package is not
    installed or ANTHROPIC_API_KEY is not set.  Errors are logged.
    """
    try:
        import anthropic  # type: ignore
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            _log.warning("veil_revival: ANTHROPIC_API_KEY not set")
            return None
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        _log.warning("veil_revival: anthropic package not installed")
        return None
    except Exception as exc:
        _log.warning(f"veil_revival: client init failed: {exc}")
        return None


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
        clean_messages = []
        for m in messages:
            if isinstance(m, dict) and m.get("role") in ("user", "assistant"):
                clean_messages.append({
                    "role": m["role"],
                    "content": str(m.get("content", "")),
                })

        system_prompt = _build_system_prompt(title, body)

        client = _get_anthropic_client()
        if client is None:
            return jsonify({"error": "VEIL service unavailable"}), 503

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=system_prompt,
            messages=clean_messages if clean_messages else [
                {"role": "user", "content": "Please begin the revival session."}
            ],
        )

        reply = response.content[0].text if response.content else ""

        return jsonify({"reply": reply, "note_type": None})

    except Exception as exc:
        _log.error(f"revival_chat error: {exc}")
        return jsonify({"error": "Revival session failed. Try again."}), 500

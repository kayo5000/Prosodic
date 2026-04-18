"""
telemetry.py

Telemetry logger for Prosodic user interaction signals.

Records behavioral events as the writer uses the tool — rhyme corrections,
line rewrites, stress overrides, suggestion decisions, and more. These signals
are the weak supervision layer that will improve ML models over time by
capturing what the writer accepts, rejects, and changes.

Design principles:
- All writes are silent and non-blocking. This module never raises to the caller.
- Before/after state stored as JSON for full audit trail and diff capability.
- engine_confidence field on every event enables confidence-weighted training.
- Uses the same prosodic_features.db as feature_store.py (separate table).
- Errors logged to prosodic_errors.log.

Event taxonomy:
    rhyme_group_override    — writer manually reassigned a syllable to a different rhyme family
    line_rewritten          — writer made a substantive edit to a line (not just whitespace)
    bar_break_moved         — writer moved a bar boundary marker
    suggestion_accepted     — writer accepted a suggestion from the suggestion engine
    suggestion_rejected     — writer dismissed a suggestion
    song_marked_complete    — writer marked a section or full song as done
    stress_override         — writer manually changed a stress mark on a syllable
    section_label_changed   — writer renamed a section label
"""

import sqlite3
import json
import logging
import os
import threading
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

# ---------------------------------------------------------------------------
# Configuration — shares the same DB as feature_store
# ---------------------------------------------------------------------------

DB_PATH = os.path.join(os.path.dirname(__file__), "prosodic_features.db")
ERROR_LOG_PATH = os.path.join(os.path.dirname(__file__), "prosodic_errors.log")

_local = threading.local()

# ---------------------------------------------------------------------------
# Error logger
# ---------------------------------------------------------------------------

_error_logger = logging.getLogger("prosodic_telemetry")
_error_logger.setLevel(logging.ERROR)
if not _error_logger.handlers:
    _file_handler = logging.FileHandler(ERROR_LOG_PATH, encoding="utf-8")
    _file_handler.setFormatter(
        logging.Formatter("%(asctime)s [telemetry] %(levelname)s: %(message)s")
    )
    _error_logger.addHandler(_file_handler)


def _log_error(context: str, exc: Exception) -> None:
    """Log an error silently to prosodic_errors.log. Never raises."""
    try:
        _error_logger.error("%s — %s: %s", context, type(exc).__name__, exc)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Event type enum
# ---------------------------------------------------------------------------

class TelemetryEvent(str, Enum):
    """
    Enumeration of all valid user signal event types.

    Each event type corresponds to a specific interaction in the Prosodic
    editor that carries information about the writer's craft decisions.
    """
    RHYME_GROUP_OVERRIDE   = "rhyme_group_override"
    LINE_REWRITTEN         = "line_rewritten"
    BAR_BREAK_MOVED        = "bar_break_moved"
    SUGGESTION_ACCEPTED    = "suggestion_accepted"
    SUGGESTION_REJECTED    = "suggestion_rejected"
    SONG_MARKED_COMPLETE   = "song_marked_complete"
    STRESS_OVERRIDE        = "stress_override"
    SECTION_LABEL_CHANGED  = "section_label_changed"


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

def _get_connection() -> sqlite3.Connection:
    """
    Return a thread-local SQLite connection to prosodic_features.db.

    Creates the connection and initializes the user_signals table on first
    access per thread. Uses WAL journal mode for concurrent read performance.
    """
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _init_schema(_local.conn)
    return _local.conn


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

def _init_schema(conn: sqlite3.Connection) -> None:
    """
    Create the user_signals table if it does not already exist.

    Each row is one user interaction event with full before/after state.
    engine_confidence captures how confident the engine was in the state
    the writer is overriding — high confidence overrides are the most
    valuable training signal (writer correcting a confident wrong answer).
    """
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS user_signals (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type        TEXT NOT NULL,
            song_id           TEXT,
            section_label     TEXT,
            line_index        INTEGER,
            word_index        INTEGER,
            before_state      TEXT NOT NULL DEFAULT '{}',  -- JSON snapshot before change
            after_state       TEXT NOT NULL DEFAULT '{}',  -- JSON snapshot after change
            engine_confidence REAL NOT NULL DEFAULT 1.0,   -- confidence of overridden engine output
            session_id        TEXT,                        -- optional browser/session identifier
            metadata          TEXT NOT NULL DEFAULT '{}',  -- any extra context as JSON
            created_at        TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_user_signals_event_type
            ON user_signals(event_type);

        CREATE INDEX IF NOT EXISTS idx_user_signals_song_id
            ON user_signals(song_id);

        CREATE INDEX IF NOT EXISTS idx_user_signals_created_at
            ON user_signals(created_at);
    """)
    conn.commit()


# ---------------------------------------------------------------------------
# Timestamp helper
# ---------------------------------------------------------------------------

def _now() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Core log function
# ---------------------------------------------------------------------------

def log_event(
    event_type: TelemetryEvent,
    before_state: Dict[str, Any],
    after_state: Dict[str, Any],
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    line_index: Optional[int] = None,
    word_index: Optional[int] = None,
    session_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Record a single user interaction event to the user_signals table.

    This is the primary entry point for all telemetry writes. All parameters
    beyond event_type, before_state, and after_state are optional context
    that enriches the training signal but is not required.

    Args:
        event_type:        One of the TelemetryEvent enum values.
        before_state:      Dict snapshot of the state before the writer's change.
                           For rhyme_group_override: {'word': ..., 'old_color_id': ...}
                           For line_rewritten: {'old_text': ...}
                           For stress_override: {'syllable': ..., 'old_stress': ...}
        after_state:       Dict snapshot of the state after the writer's change.
                           Mirrors the before_state structure.
        engine_confidence: Float [0.0, 1.0]. The confidence score the engine had
                           in the output that is being overridden. A writer
                           correcting a high-confidence engine output is a
                           stronger training signal than correcting a low-confidence one.
        song_id:           ID of the song being edited, if available.
        section_label:     Label of the section being edited, if available.
        line_index:        0-based index of the line being edited, if applicable.
        word_index:        0-based index of the word being edited, if applicable.
        session_id:        Optional session/browser identifier for grouping events.
        metadata:          Any additional structured context as a dict.

    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        conn = _get_connection()
        conn.execute(
            """
            INSERT INTO user_signals
                (event_type, song_id, section_label, line_index, word_index,
                 before_state, after_state, engine_confidence,
                 session_id, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_type.value if isinstance(event_type, TelemetryEvent) else str(event_type),
                song_id,
                section_label,
                line_index,
                word_index,
                json.dumps(before_state),
                json.dumps(after_state),
                max(0.0, min(1.0, engine_confidence)),
                session_id,
                json.dumps(metadata or {}),
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("log_event", exc)


# ---------------------------------------------------------------------------
# Typed convenience functions — one per event type
# ---------------------------------------------------------------------------

def log_rhyme_group_override(
    word: str,
    old_color_id: int,
    new_color_id: int,
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    line_index: Optional[int] = None,
    word_index: Optional[int] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer manually reassigning a syllable to a different rhyme family.

    This is the highest-value signal in the system — it tells the engine
    exactly where it drew a wrong cluster boundary and what the correct
    grouping is according to the writer.

    Args:
        word:              The word whose rhyme family was reassigned.
        old_color_id:      The engine's original family assignment.
        new_color_id:      The writer's corrected family assignment.
        engine_confidence: How confident the engine was in old_color_id.
    """
    log_event(
        event_type=TelemetryEvent.RHYME_GROUP_OVERRIDE,
        before_state={"word": word, "color_id": old_color_id},
        after_state={"word": word, "color_id": new_color_id},
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=section_label,
        line_index=line_index,
        word_index=word_index,
        session_id=session_id,
    )


def log_line_rewritten(
    old_text: str,
    new_text: str,
    bar_index: int,
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    line_index: Optional[int] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a substantive line edit by the writer.

    Captures the before/after text for diffing and tracking how writers
    revise lines. High revision frequency on a line is an IS (Intentionality
    Signal) component in the Phonoaffective Signature Framework.

    Args:
        old_text:   The line text before the edit.
        new_text:   The line text after the edit.
        bar_index:  Which bar this line occupies.
    """
    log_event(
        event_type=TelemetryEvent.LINE_REWRITTEN,
        before_state={"text": old_text, "bar_index": bar_index},
        after_state={"text": new_text, "bar_index": bar_index},
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=section_label,
        line_index=line_index,
        session_id=session_id,
    )


def log_bar_break_moved(
    old_line_index: int,
    new_line_index: int,
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer moving a bar boundary marker to a different line.

    Bar boundary placement reflects the writer's mental model of how their
    lyrics map to the musical grid — valuable for Structure and Cadence models.

    Args:
        old_line_index: Line index where the bar break was before the move.
        new_line_index: Line index where the bar break was placed after the move.
    """
    log_event(
        event_type=TelemetryEvent.BAR_BREAK_MOVED,
        before_state={"line_index": old_line_index},
        after_state={"line_index": new_line_index},
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=section_label,
        session_id=session_id,
    )


def log_suggestion_accepted(
    word: str,
    rank: int,
    rhyme_score: float,
    star_rating: int,
    trigger_mode: str = "auto",
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer accepting a suggestion from the suggestion engine.

    Accepted suggestions are positive training examples for the suggestion
    ranking model. star_rating and rank together indicate relative quality.

    Args:
        word:         The accepted suggestion word.
        rank:         The suggestion's rank (1 = top) when it was accepted.
        rhyme_score:  Phonetic similarity score the engine assigned.
        star_rating:  Claude's 1–5 star rating for the suggestion.
        trigger_mode: 'auto' or 'manual'.
    """
    log_event(
        event_type=TelemetryEvent.SUGGESTION_ACCEPTED,
        before_state={},
        after_state={
            "word": word,
            "rank": rank,
            "rhyme_score": rhyme_score,
            "star_rating": star_rating,
            "trigger_mode": trigger_mode,
        },
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=section_label,
        session_id=session_id,
    )


def log_suggestion_rejected(
    word: str,
    rank: int,
    rhyme_score: float,
    star_rating: int,
    trigger_mode: str = "auto",
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer dismissing a suggestion.

    Rejected suggestions are negative training examples. Particularly
    valuable when high-ranked, high-confidence suggestions are dismissed
    — this reveals a mismatch between the engine's model and the writer's intent.

    Args:
        word:         The rejected suggestion word.
        rank:         The suggestion's rank when it was dismissed.
        rhyme_score:  Phonetic similarity score the engine assigned.
        star_rating:  Claude's 1–5 star rating for the suggestion.
        trigger_mode: 'auto' or 'manual'.
    """
    log_event(
        event_type=TelemetryEvent.SUGGESTION_REJECTED,
        before_state={
            "word": word,
            "rank": rank,
            "rhyme_score": rhyme_score,
            "star_rating": star_rating,
            "trigger_mode": trigger_mode,
        },
        after_state={},
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=section_label,
        session_id=session_id,
    )


def log_song_marked_complete(
    scope: str,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer marking a section or song as complete.

    Completion marks are structural signals — they indicate that the writer
    considers the accumulated state to be a final (or near-final) expression
    of their intent. This anchors all preceding telemetry signals as
    high-confidence ground truth for the given composition.

    Args:
        scope: 'section' or 'song' — what was marked complete.
    """
    log_event(
        event_type=TelemetryEvent.SONG_MARKED_COMPLETE,
        before_state={},
        after_state={"scope": scope},
        engine_confidence=1.0,
        song_id=song_id,
        section_label=section_label,
        session_id=session_id,
    )


def log_stress_override(
    syllable: str,
    word: str,
    old_stress: str,
    new_stress: str,
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    section_label: Optional[str] = None,
    line_index: Optional[int] = None,
    word_index: Optional[int] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer manually changing a stress mark on a syllable.

    Stress overrides are direct corrections to the performed stress analyzer.
    old_stress and new_stress use the UI color codes: 'yellow' (primary),
    'blue' (secondary), 'green' (unstressed), or None (cleared).

    Args:
        syllable:    The syllable text whose stress was changed.
        word:        The full word containing the syllable.
        old_stress:  Previous stress label ('yellow'|'blue'|'green'|None).
        new_stress:  New stress label ('yellow'|'blue'|'green'|None).
    """
    log_event(
        event_type=TelemetryEvent.STRESS_OVERRIDE,
        before_state={"syllable": syllable, "word": word, "stress": old_stress},
        after_state={"syllable": syllable, "word": word, "stress": new_stress},
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=section_label,
        line_index=line_index,
        word_index=word_index,
        session_id=session_id,
    )


def log_section_label_changed(
    old_label: str,
    new_label: str,
    engine_confidence: float = 1.0,
    song_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """
    Record a writer renaming a section label.

    Section label changes indicate how the writer conceptualizes their
    song structure — valuable weak supervision for the StructureModel.

    Args:
        old_label: The section label before the rename.
        new_label: The section label after the rename.
    """
    log_event(
        event_type=TelemetryEvent.SECTION_LABEL_CHANGED,
        before_state={"label": old_label},
        after_state={"label": new_label},
        engine_confidence=engine_confidence,
        song_id=song_id,
        section_label=old_label,
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
# Query helpers (for training pipeline and debug review)
# ---------------------------------------------------------------------------

def get_signals_by_event_type(event_type: TelemetryEvent, limit: int = 500) -> list:
    """
    Return recent signals for a given event type as plain dicts.

    Args:
        event_type: The TelemetryEvent to filter on.
        limit:      Max number of rows to return (most recent first).

    Returns:
        List of dicts. Returns empty list on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute(
            """
            SELECT * FROM user_signals
            WHERE event_type = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (event_type.value, limit),
        ).fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:
        _log_error("get_signals_by_event_type", exc)
        return []


def get_high_confidence_overrides(min_confidence: float = 0.8, limit: int = 200) -> list:
    """
    Return override events where the engine was highly confident but the
    writer still corrected it. These are the most valuable training signals.

    Args:
        min_confidence: Minimum engine_confidence threshold (default 0.8).
        limit:          Max number of rows to return.

    Returns:
        List of dicts for rhyme_group_override and stress_override events
        above the confidence threshold. Returns empty list on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute(
            """
            SELECT * FROM user_signals
            WHERE event_type IN (?, ?)
              AND engine_confidence >= ?
            ORDER BY engine_confidence DESC, created_at DESC
            LIMIT ?
            """,
            (
                TelemetryEvent.RHYME_GROUP_OVERRIDE.value,
                TelemetryEvent.STRESS_OVERRIDE.value,
                min_confidence,
                limit,
            ),
        ).fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:
        _log_error("get_high_confidence_overrides", exc)
        return []


def get_signal_summary() -> Dict[str, int]:
    """
    Return a count of signals per event type.

    Useful for monitoring training data accumulation and deciding
    when enough signals exist to warrant a model retrain.

    Returns:
        Dict mapping event_type string to count. Returns empty dict on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute(
            """
            SELECT event_type, COUNT(*) as count
            FROM user_signals
            GROUP BY event_type
            ORDER BY count DESC
            """
        ).fetchall()
        return {row["event_type"]: row["count"] for row in rows}
    except Exception as exc:
        _log_error("get_signal_summary", exc)
        return {}


# ---------------------------------------------------------------------------
# Schema initialization on module import
# ---------------------------------------------------------------------------

def _ensure_schema() -> None:
    """Trigger schema initialization on module load. Silent on failure."""
    try:
        _get_connection()
    except Exception as exc:
        _log_error("_ensure_schema", exc)


_ensure_schema()

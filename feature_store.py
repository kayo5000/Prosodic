"""
feature_store.py

SQLite-backed feature store for the Prosodic deep learning infrastructure.

Persists all analyzed linguistic objects (PhonemeSequence, LyricLine, RhymeEvent,
CadenceEvent, MotifEvent, SongSection, SongAnalysis) to prosodic_features.db for
use as training data, research export, and ML model supervision.

Design principles:
- All writes are silent and non-blocking — database errors never reach the user.
- INSERT OR REPLACE ensures idempotency on re-analysis of the same content.
- Complex fields (lists, dicts) are JSON-serialized into TEXT columns.
- All errors are appended to prosodic_errors.log for offline review.
- export_training_data() produces a clean JSON dump for ML training pipelines.
"""

import sqlite3
import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from prosodic_data_objects import (
    PhonemeSequence,
    LyricLine,
    RhymeEvent,
    CadenceEvent,
    MotifEvent,
    SongSection,
    SongAnalysis,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DB_PATH = os.path.join(os.path.dirname(__file__), "prosodic_features.db")
ERROR_LOG_PATH = os.path.join(os.path.dirname(__file__), "prosodic_errors.log")

# Thread-local storage ensures each thread gets its own connection.
# This is required for SQLite in multi-threaded Flask environments.
_local = threading.local()

# ---------------------------------------------------------------------------
# Error logger (file only — never raises to caller)
# ---------------------------------------------------------------------------

_error_logger = logging.getLogger("prosodic_feature_store")
_error_logger.setLevel(logging.ERROR)
if not _error_logger.handlers:
    _file_handler = logging.FileHandler(ERROR_LOG_PATH, encoding="utf-8")
    _file_handler.setFormatter(
        logging.Formatter("%(asctime)s [feature_store] %(levelname)s: %(message)s")
    )
    _error_logger.addHandler(_file_handler)


def _log_error(context: str, exc: Exception) -> None:
    """Log an error silently to prosodic_errors.log. Never raises."""
    try:
        _error_logger.error("%s — %s: %s", context, type(exc).__name__, exc)
    except Exception:
        pass  # If logging itself fails, swallow completely


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

def _get_connection() -> sqlite3.Connection:
    """
    Return a thread-local SQLite connection to prosodic_features.db.

    Creates the connection and initializes the schema on first access per thread.
    Uses WAL journal mode for better concurrent read performance.
    """
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
        _init_schema(_local.conn)
    return _local.conn


# ---------------------------------------------------------------------------
# Schema initialization
# ---------------------------------------------------------------------------

def _init_schema(conn: sqlite3.Connection) -> None:
    """
    Create all feature store tables if they do not already exist.

    Each data object from prosodic_data_objects.py maps to one table.
    Complex fields (lists, dicts) are stored as JSON text.
    All tables use INSERT OR REPLACE for idempotent writes.
    """
    conn.executescript("""
        -- ----------------------------------------------------------------
        -- phoneme_sequences
        -- One row per word/token phoneme resolution.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS phoneme_sequences (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            word            TEXT NOT NULL,
            phonemes        TEXT NOT NULL,       -- JSON list of CMU phoneme symbols
            syllable_count  INTEGER NOT NULL,
            stress_pattern  TEXT NOT NULL,       -- JSON list of int (0/1/2 per syllable)
            source          TEXT NOT NULL DEFAULT 'cmu',
            low_confidence  INTEGER NOT NULL DEFAULT 0,  -- boolean
            is_aave_variant INTEGER NOT NULL DEFAULT 0,  -- boolean
            created_at      TEXT NOT NULL,
            UNIQUE(word, source, is_aave_variant)
        );

        -- ----------------------------------------------------------------
        -- lyric_lines
        -- One row per analyzed lyric line, keyed by song_id + line_id.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS lyric_lines (
            id                          INTEGER PRIMARY KEY AUTOINCREMENT,
            line_id                     TEXT,
            song_id                     TEXT,
            section_label               TEXT,
            text                        TEXT NOT NULL,
            bar_index                   INTEGER NOT NULL,
            bpm                         REAL NOT NULL,
            total_syllables             INTEGER NOT NULL DEFAULT 0,
            performed_stress_inversions TEXT NOT NULL DEFAULT '[]',  -- JSON list of [word_idx, syll_idx]
            created_at                  TEXT NOT NULL,
            UNIQUE(song_id, line_id)
        );

        -- ----------------------------------------------------------------
        -- rhyme_events
        -- One row per detected rhyme pair.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS rhyme_events (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id           TEXT,
            section_label     TEXT,
            word_a            TEXT NOT NULL,
            word_b            TEXT NOT NULL,
            phonemes_a        TEXT NOT NULL,   -- JSON list
            phonemes_b        TEXT NOT NULL,   -- JSON list
            rhyme_type        TEXT NOT NULL,
            similarity_score  REAL NOT NULL,
            line_index_a      INTEGER NOT NULL,
            line_index_b      INTEGER NOT NULL,
            aave_bridge       INTEGER NOT NULL DEFAULT 0,  -- boolean
            engine_confidence REAL NOT NULL DEFAULT 1.0,
            created_at        TEXT NOT NULL,
            UNIQUE(song_id, word_a, word_b, line_index_a, line_index_b)
        );

        -- ----------------------------------------------------------------
        -- cadence_events
        -- One row per line's cadence analysis.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS cadence_events (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id            TEXT,
            section_label      TEXT,
            line_index         INTEGER NOT NULL,
            bpm                REAL NOT NULL,
            syllables_per_beat REAL NOT NULL,
            stress_pattern     TEXT NOT NULL DEFAULT '[]',  -- JSON list of int
            cadence_class      TEXT NOT NULL,
            inversion_count    INTEGER NOT NULL DEFAULT 0,
            inversion_rate     REAL NOT NULL DEFAULT 0.0,
            compression_flag   INTEGER NOT NULL DEFAULT 0,  -- boolean
            cadence_variance   REAL NOT NULL DEFAULT 0.0,
            created_at         TEXT NOT NULL,
            UNIQUE(song_id, line_index)
        );

        -- ----------------------------------------------------------------
        -- motif_events
        -- One row per detected semantic motif cluster.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS motif_events (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id          TEXT,
            section_label    TEXT,
            anchor_word      TEXT NOT NULL,
            related_words    TEXT NOT NULL DEFAULT '[]',  -- JSON list
            semantic_field   TEXT NOT NULL,
            line_indices     TEXT NOT NULL DEFAULT '[]',  -- JSON list of int
            cluster_strength REAL NOT NULL DEFAULT 0.0,
            first_appearance INTEGER NOT NULL DEFAULT 0,
            created_at       TEXT NOT NULL,
            UNIQUE(song_id, anchor_word, section_label)
        );

        -- ----------------------------------------------------------------
        -- song_sections
        -- One row per section in a song.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS song_sections (
            id                        INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id                   TEXT NOT NULL,
            label                     TEXT NOT NULL,
            bar_count                 INTEGER NOT NULL DEFAULT 0,
            bpm                       REAL NOT NULL DEFAULT 90.0,
            density_gradient          TEXT NOT NULL DEFAULT '[]',  -- JSON list of float
            arc_type                  TEXT NOT NULL DEFAULT 'flat',
            average_syllables_per_bar REAL NOT NULL DEFAULT 0.0,
            line_count                INTEGER NOT NULL DEFAULT 0,
            created_at                TEXT NOT NULL,
            UNIQUE(song_id, label)
        );

        -- ----------------------------------------------------------------
        -- song_analyses
        -- One row per full song analysis run.
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS song_analyses (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id              TEXT NOT NULL UNIQUE,
            title                TEXT NOT NULL,
            total_bars           INTEGER NOT NULL DEFAULT 0,
            bpm                  REAL NOT NULL DEFAULT 90.0,
            emotional_signature  TEXT NOT NULL DEFAULT '{}',  -- JSON dict
            aspiration_gap_score REAL,
            metadata             TEXT NOT NULL DEFAULT '{}',  -- JSON dict
            created_at           TEXT NOT NULL,
            updated_at           TEXT NOT NULL
        );
    """)
    conn.commit()


# ---------------------------------------------------------------------------
# Timestamp helper
# ---------------------------------------------------------------------------

def _now() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Write functions — one per data object type
# ---------------------------------------------------------------------------

def write_phoneme_sequence(ps: PhonemeSequence) -> None:
    """
    Persist a PhonemeSequence to the phoneme_sequences table.

    Uses INSERT OR REPLACE keyed on (word, source, is_aave_variant).
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO phoneme_sequences
                (word, phonemes, syllable_count, stress_pattern,
                 source, low_confidence, is_aave_variant, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ps.word,
                json.dumps(ps.phonemes),
                ps.syllable_count,
                json.dumps(ps.stress_pattern),
                ps.source,
                int(ps.low_confidence),
                int(ps.is_aave_variant),
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_phoneme_sequence", exc)


def write_lyric_line(ll: LyricLine, song_id: str = "") -> None:
    """
    Persist a LyricLine to the lyric_lines table.

    Keyed on (song_id, line_id). If line_id is None, uses a
    generated key from song_id + bar_index + text hash.
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        line_id = ll.line_id or f"{song_id}_{ll.bar_index}_{hash(ll.text) & 0xFFFFFFFF}"
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO lyric_lines
                (line_id, song_id, section_label, text, bar_index, bpm,
                 total_syllables, performed_stress_inversions, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                line_id,
                song_id,
                ll.section_label or "",
                ll.text,
                ll.bar_index,
                ll.bpm,
                ll.total_syllables,
                json.dumps(ll.performed_stress_inversions),
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_lyric_line", exc)


def write_rhyme_event(re: RhymeEvent, song_id: str = "", section_label: str = "") -> None:
    """
    Persist a RhymeEvent to the rhyme_events table.

    Keyed on (song_id, word_a, word_b, line_index_a, line_index_b).
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO rhyme_events
                (song_id, section_label, word_a, word_b, phonemes_a, phonemes_b,
                 rhyme_type, similarity_score, line_index_a, line_index_b,
                 aave_bridge, engine_confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                song_id,
                section_label,
                re.word_a,
                re.word_b,
                json.dumps(re.phonemes_a),
                json.dumps(re.phonemes_b),
                re.rhyme_type.value,
                re.similarity_score,
                re.line_index_a,
                re.line_index_b,
                int(re.aave_bridge),
                re.engine_confidence,
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_rhyme_event", exc)


def write_cadence_event(ce: CadenceEvent, song_id: str = "", section_label: str = "") -> None:
    """
    Persist a CadenceEvent to the cadence_events table.

    Keyed on (song_id, line_index).
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO cadence_events
                (song_id, section_label, line_index, bpm, syllables_per_beat,
                 stress_pattern, cadence_class, inversion_count, inversion_rate,
                 compression_flag, cadence_variance, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                song_id,
                section_label,
                ce.line_index,
                ce.bpm,
                ce.syllables_per_beat,
                json.dumps(ce.stress_pattern),
                ce.cadence_class.value,
                ce.inversion_count,
                ce.inversion_rate,
                int(ce.compression_flag),
                ce.cadence_variance,
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_cadence_event", exc)


def write_motif_event(me: MotifEvent, song_id: str = "", section_label: str = "") -> None:
    """
    Persist a MotifEvent to the motif_events table.

    Keyed on (song_id, anchor_word, section_label).
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO motif_events
                (song_id, section_label, anchor_word, related_words, semantic_field,
                 line_indices, cluster_strength, first_appearance, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                song_id,
                section_label,
                me.anchor_word,
                json.dumps(me.related_words),
                me.semantic_field,
                json.dumps(me.line_indices),
                me.cluster_strength,
                me.first_appearance,
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_motif_event", exc)


def write_song_section(ss: SongSection, song_id: str) -> None:
    """
    Persist a SongSection to the song_sections table.

    Keyed on (song_id, label). Also cascades writes for all lines,
    rhyme events, cadence events, and motif events in the section.
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO song_sections
                (song_id, label, bar_count, bpm, density_gradient,
                 arc_type, average_syllables_per_bar, line_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                song_id,
                ss.label,
                ss.bar_count,
                ss.bpm,
                json.dumps(ss.density_gradient),
                ss.arc_type.value,
                ss.average_syllables_per_bar,
                len(ss.lines),
                _now(),
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_song_section", exc)
        return

    # Cascade writes for child objects
    for ll in ss.lines:
        write_lyric_line(ll, song_id=song_id)
    for re in ss.rhyme_events:
        write_rhyme_event(re, song_id=song_id, section_label=ss.label)
    for ce in ss.cadence_events:
        write_cadence_event(ce, song_id=song_id, section_label=ss.label)
    for me in ss.motif_events:
        write_motif_event(me, song_id=song_id, section_label=ss.label)


def write_song_analysis(sa: SongAnalysis) -> None:
    """
    Persist a SongAnalysis to the song_analyses table.

    Keyed on song_id. Also cascades writes for all sections,
    global rhyme events, and global motif events.
    Silent on failure — errors logged to prosodic_errors.log.
    """
    try:
        now = _now()
        conn = _get_connection()
        conn.execute(
            """
            INSERT OR REPLACE INTO song_analyses
                (song_id, title, total_bars, bpm, emotional_signature,
                 aspiration_gap_score, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sa.song_id,
                sa.title,
                sa.total_bars,
                sa.bpm,
                json.dumps(sa.emotional_signature),
                sa.aspiration_gap_score,
                json.dumps(sa.metadata),
                now,
                now,
            ),
        )
        conn.commit()
    except Exception as exc:
        _log_error("write_song_analysis", exc)
        return

    # Cascade writes for all sections and global events
    for section in sa.sections:
        write_song_section(section, song_id=sa.song_id)
    for re in sa.global_rhyme_events:
        write_rhyme_event(re, song_id=sa.song_id, section_label="__global__")
    for me in sa.global_motif_events:
        write_motif_event(me, song_id=sa.song_id, section_label="__global__")


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_rhyme_events_for_song(song_id: str) -> List[Dict[str, Any]]:
    """
    Return all rhyme events for a given song_id as plain dicts.

    Used by the training data exporter to build labeled phoneme pairs.
    Returns empty list on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute(
            "SELECT * FROM rhyme_events WHERE song_id = ?", (song_id,)
        ).fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:
        _log_error("get_rhyme_events_for_song", exc)
        return []


def get_all_phoneme_sequences() -> List[Dict[str, Any]]:
    """
    Return all stored phoneme sequences as plain dicts.

    Used by export_training_data() to reconstruct word-level phoneme records.
    Returns empty list on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute("SELECT * FROM phoneme_sequences").fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:
        _log_error("get_all_phoneme_sequences", exc)
        return []


def get_all_cadence_events() -> List[Dict[str, Any]]:
    """
    Return all stored cadence events as plain dicts.

    Used by export_training_data() to build cadence pattern training sequences.
    Returns empty list on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute("SELECT * FROM cadence_events").fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:
        _log_error("get_all_cadence_events", exc)
        return []


def get_all_motif_events() -> List[Dict[str, Any]]:
    """
    Return all stored motif events as plain dicts.

    Used by export_training_data() to build semantic field training examples.
    Returns empty list on failure.
    """
    try:
        conn = _get_connection()
        rows = conn.execute("SELECT * FROM motif_events").fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:
        _log_error("get_all_motif_events", exc)
        return []


# ---------------------------------------------------------------------------
# Training data export
# ---------------------------------------------------------------------------

def export_training_data(output_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Export all feature store data as a structured dict for ML training pipelines.

    Produces four top-level keys matching the four Phase 1 model training tasks:
      - rhyme_pairs:    List of {word_a, phonemes_a, word_b, phonemes_b, rhyme_type,
                        similarity_score, aave_bridge} — feeds RhymeSimilarityModel
      - cadence_sequences: List of {stress_pattern, cadence_class, inversion_rate,
                        syllables_per_beat, bpm} — feeds CadencePatternModel
      - motif_clusters: List of {anchor_word, related_words, semantic_field,
                        cluster_strength} — feeds MotifDetectionModel
      - phoneme_vocab:  List of unique phonemes observed across all sequences

    If output_path is provided, writes JSON to that path. Also returns the dict.
    Errors are logged silently; returns empty structure on failure.

    Args:
        output_path: Optional filesystem path to write the JSON export.
                     If None, data is returned but not written.

    Returns:
        Dict with keys: rhyme_pairs, cadence_sequences, motif_clusters,
        phoneme_vocab, export_timestamp, record_counts.
    """
    try:
        rhyme_rows = []
        try:
            conn = _get_connection()
            rows = conn.execute("SELECT * FROM rhyme_events").fetchall()
            for row in rows:
                rhyme_rows.append({
                    "word_a": row["word_a"],
                    "phonemes_a": json.loads(row["phonemes_a"]),
                    "word_b": row["word_b"],
                    "phonemes_b": json.loads(row["phonemes_b"]),
                    "rhyme_type": row["rhyme_type"],
                    "similarity_score": row["similarity_score"],
                    "aave_bridge": bool(row["aave_bridge"]),
                })
        except Exception as exc:
            _log_error("export_training_data:rhyme_pairs", exc)

        cadence_rows = []
        try:
            for row in get_all_cadence_events():
                cadence_rows.append({
                    "stress_pattern": json.loads(row["stress_pattern"]),
                    "cadence_class": row["cadence_class"],
                    "inversion_rate": row["inversion_rate"],
                    "syllables_per_beat": row["syllables_per_beat"],
                    "bpm": row["bpm"],
                    "compression_flag": bool(row["compression_flag"]),
                })
        except Exception as exc:
            _log_error("export_training_data:cadence_sequences", exc)

        motif_rows = []
        try:
            for row in get_all_motif_events():
                motif_rows.append({
                    "anchor_word": row["anchor_word"],
                    "related_words": json.loads(row["related_words"]),
                    "semantic_field": row["semantic_field"],
                    "cluster_strength": row["cluster_strength"],
                })
        except Exception as exc:
            _log_error("export_training_data:motif_clusters", exc)

        phoneme_vocab = []
        try:
            phoneme_seqs = get_all_phoneme_sequences()
            seen: set = set()
            for row in phoneme_seqs:
                for p in json.loads(row["phonemes"]):
                    seen.add(p)
            phoneme_vocab = sorted(seen)
        except Exception as exc:
            _log_error("export_training_data:phoneme_vocab", exc)

        export = {
            "rhyme_pairs": rhyme_rows,
            "cadence_sequences": cadence_rows,
            "motif_clusters": motif_rows,
            "phoneme_vocab": phoneme_vocab,
            "export_timestamp": _now(),
            "record_counts": {
                "rhyme_pairs": len(rhyme_rows),
                "cadence_sequences": len(cadence_rows),
                "motif_clusters": len(motif_rows),
                "phoneme_vocab_size": len(phoneme_vocab),
            },
        }

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(export, f, indent=2)

        return export

    except Exception as exc:
        _log_error("export_training_data", exc)
        return {
            "rhyme_pairs": [],
            "cadence_sequences": [],
            "motif_clusters": [],
            "phoneme_vocab": [],
            "export_timestamp": _now(),
            "record_counts": {},
        }


# ---------------------------------------------------------------------------
# Database initialization on module import
# ---------------------------------------------------------------------------

def _ensure_db_initialized() -> None:
    """
    Trigger schema initialization on module load.

    Called once at import time so that prosodic_features.db and all tables
    exist before any write function is called. Silent on failure.
    """
    try:
        _get_connection()
    except Exception as exc:
        _log_error("_ensure_db_initialized", exc)


_ensure_db_initialized()

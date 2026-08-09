"""
cantos/db.py — shared persistence layer for the entire Cantos system.

SQLite today, deliberately structured to be swappable to Postgres later
without touching call sites in notebooks.py / disposition.py / board.py /
meetings.py / cassius.py / voice.py / direct.py:

  - ONE connection factory (get_connection()) — swap the implementation
    here; every other module in this package only ever calls this
    function, never sqlite3.connect() directly.
  - Primary/foreign keys are app-generated UUIDs (uuid4 hex strings), not
    DB autoincrement — sidesteps the AUTOINCREMENT (SQLite) vs SERIAL
    (Postgres) dialect difference entirely.
  - Timestamps are ISO8601 strings computed in Python
    (datetime.utcnow().isoformat()), never DB-side datetime('now') —
    avoids SQLite/Postgres date-function differences, and matches the
    spec's own `timestamp: iso8601` field typing exactly.
  - JSON-shaped fields (metrics, delta, views, mood_tags, basis,
    participants, declined) are stored as TEXT via json.dumps/json.loads
    — works identically on both engines. Postgres could later upgrade
    these columns to JSONB without any Python-side interface change,
    since callers already treat them as opaque JSON via to_json()/from_json().

HONEST LIMIT, not glossed over: query placeholders use SQLite's `?` style
throughout every module in this package. Postgres (via psycopg2) uses
`%s`. Since every query goes through connections from THIS file, a real
migration is a mechanical find/replace scoped to this one package — not
a full rewrite — but it is NOT zero-touch. A query-builder/ORM layer
would make it zero-touch; that's out of scope for tonight.

DB_PATH follows the same override convention already used elsewhere in
this codebase (PROSODIC_DB_PATH in api.py, DB_PATH in thesaurus_engine.py
/ concreteness_engine.py).

REMINDER, per Khris explicitly — read this before assuming this fixes
anything in production: this makes the CODE ready for real persistence.
It does NOT fix the actual problem. This SQLite file still sits on
Railway's ephemeral disk in production today and is wiped on every
redeploy, exactly like prosodic.db already is (see the deploy-storage
finding from the earlier codebase audit). That needs a Railway dashboard
action (mount a volume) or a real Postgres migration + provisioning —
neither is buildable from a chat session. See
docs/cantos/OVERNIGHT_BUILD_SUMMARY.md.
"""
import os
import sqlite3
import threading
import json
import uuid
import datetime

DB_PATH = os.environ.get('CANTOS_DB_PATH') or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'cantos_data', 'cantos.db',
)

_local = threading.local()
_schema_lock = threading.Lock()
_schema_ready_for_path = None  # tracks which DB_PATH the schema was last ensured against


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS notebook_entries (
    id          TEXT PRIMARY KEY,
    engine      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    observation TEXT NOT NULL,
    metrics     TEXT,
    delta       TEXT,
    timestamp   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notebook_engine_user
    ON notebook_entries(engine, user_id, timestamp);

CREATE TABLE IF NOT EXISTS engine_dispositions (
    engine       TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    confidence   REAL NOT NULL DEFAULT 0.5,
    pride        REAL NOT NULL DEFAULT 0.5,
    trajectory   TEXT NOT NULL DEFAULT 'flat',
    views        TEXT,
    mood_tags    TEXT,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (engine, user_id)
);

CREATE TABLE IF NOT EXISTS disposition_outcomes (
    id                TEXT PRIMARY KEY,
    engine            TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    notebook_entry_id TEXT NOT NULL,
    outcome           TEXT NOT NULL,
    evidence          TEXT,
    checked_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outcomes_engine_user
    ON disposition_outcomes(engine, user_id, checked_at);

CREATE TABLE IF NOT EXISTS board_posts (
    id          TEXT PRIMARY KEY,
    engine      TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    section     TEXT NOT NULL,
    signal      TEXT NOT NULL,
    strength    REAL NOT NULL,
    summary     TEXT,
    timestamp   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_board_session_section
    ON board_posts(session_id, section);

CREATE TABLE IF NOT EXISTS meetings (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL,
    section        TEXT NOT NULL,
    participants   TEXT NOT NULL,
    trigger        TEXT NOT NULL,
    combined_read  TEXT NOT NULL,
    declined       TEXT,
    timestamp      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meetings_session
    ON meetings(session_id);

CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    section     TEXT NOT NULL,
    message     TEXT NOT NULL,
    priority    REAL NOT NULL,
    basis       TEXT,
    surfaced    INTEGER NOT NULL DEFAULT 0,
    surfaced_at TEXT,
    timestamp   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_session
    ON notes(session_id);
"""


def get_connection():
    '''
    The one function to change for a Postgres migration. Thread-local
    connection, same pattern as thesaurus_engine.py / concreteness_engine.py
    elsewhere in this codebase.
    '''
    global _schema_ready_for_path
    if not hasattr(_local, 'conn') or _local.conn is None or getattr(_local, 'conn_path', None) != DB_PATH:
        os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn_path = DB_PATH
        with _schema_lock:
            if _schema_ready_for_path != DB_PATH:
                _local.conn.executescript(SCHEMA_SQL)
                _local.conn.commit()
                _schema_ready_for_path = DB_PATH
    return _local.conn


def reset_schema_cache():
    '''Test-only escape hatch — forces the next get_connection() call to
    re-run schema creation, e.g. after monkeypatching DB_PATH to a fresh
    tmp file.'''
    global _schema_ready_for_path
    _schema_ready_for_path = None
    if hasattr(_local, 'conn'):
        _local.conn = None


def new_id():
    return uuid.uuid4().hex


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')


def to_json(obj):
    return json.dumps(obj) if obj is not None else None


def from_json(text):
    return json.loads(text) if text else None

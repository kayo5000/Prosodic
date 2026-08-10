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
    connection, reused across every Cantos call within the SAME request
    (board.py/disposition.py/meetings.py/notebooks.py/notes.py all call
    this directly, 14 call sites total — deliberately kept as a plain
    function returning a connection, not a context manager, rather than
    changing that established calling convention across 5 files) —
    but no longer held open forever under real concurrency.

    Previously: opened once per THREAD and never closed for the life of
    the thread — safe only because Cantos is off by default and, even
    when on, this process has always run as a single gunicorn thread. Under
    gunicorn --threads N>1, a thread's connection would persist across
    completely unrelated requests indefinitely, the same class of risk
    fixed elsewhere in this session (thesaurus_engine.py,
    concreteness_engine.py, feature_store.py, telemetry.py,
    learning_engine.py, usage_history.py).

    The actual fix here is different from those six on purpose: api.py
    registers close_connection() as a Flask app.teardown_appcontext hook,
    so the thread-local connection is guaranteed closed at the end of
    EVERY request (Cantos-touching or not) instead of never — bounding
    its lifetime to one request rather than the life of the thread,
    without needing to touch 14 external call sites' calling convention.
    Verified safe under real concurrent load in
    tests/test_thread_local_connections_concurrency.py.
    '''
    global _schema_ready_for_path
    if not hasattr(_local, 'conn') or _local.conn is None or getattr(_local, 'conn_path', None) != DB_PATH:
        os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        # busy_timeout FIRST, before any other statement on this connection —
        # including the journal_mode switch below. Found via a real concurrent-
        # load test (25 threads hitting a brand-new DB file at once): with
        # journal_mode=WAL issued per-connection before busy_timeout was set,
        # many threads raced to switch mode on the same fresh file with no
        # lock-wait protection active yet, and some lost with "database is
        # locked". busy_timeout has to be live before anything that can block.
        _local.conn.execute('PRAGMA busy_timeout=5000')
        _local.conn_path = DB_PATH
        with _schema_lock:
            if _schema_ready_for_path != DB_PATH:
                # journal_mode is a database-file property, not a
                # per-connection one — once switched, every later connection
                # (this thread's future reconnects, every other thread) sees
                # WAL automatically. Issuing it here, once, inside the lock,
                # instead of once per thread outside it, is what actually
                # eliminates the race above rather than just adding a timeout
                # on top of it.
                _local.conn.execute('PRAGMA journal_mode=WAL')
                _local.conn.executescript(SCHEMA_SQL)
                _local.conn.commit()
                _schema_ready_for_path = DB_PATH
    return _local.conn


def close_connection():
    '''
    Closes and clears this thread's connection, if one exists. Registered
    in api.py as a Flask teardown_appcontext hook so it runs after every
    request, guaranteeing no Cantos connection outlives the request that
    created it. Safe to call when no connection was ever opened for this
    thread (the common case when Cantos is disabled, or the request never
    touched Cantos) — a plain no-op, not an error.
    '''
    if hasattr(_local, 'conn') and _local.conn is not None:
        _local.conn.close()
        _local.conn = None


def reset_schema_cache():
    '''Test-only escape hatch — forces the next get_connection() call to
    re-run schema creation, e.g. after monkeypatching DB_PATH to a fresh
    tmp file.'''
    global _schema_ready_for_path
    _schema_ready_for_path = None
    close_connection()


def new_id():
    return uuid.uuid4().hex


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')


def to_json(obj):
    return json.dumps(obj) if obj is not None else None


def from_json(text):
    return json.loads(text) if text else None

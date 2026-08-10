'''
Usage History
Per-user record of words/rhyme families used across analyzed verses.
Foundation for: personal word-choice fingerprint, anti-cliche detection,
and repetition warnings (see docs/FEATURE_QUEUE.md, Tier B).

Uses the same prosodic_features.db file as mastery_engine.py and
device_detection_engine.py — this is analysis-derived data, not account data
(account data lives in api.py's users table / DB_PATH).

Part of the Prosodic hip-hop lyric analysis suite.
'''
import os
import sqlite3
import threading
from contextlib import contextmanager

# Same physical DB as feature_store.py/device_detection_engine.py/
# mastery_engine.py/telemetry.py — PROSODIC_FEATURES_DB_PATH must stay
# identical across all five or they silently split onto different files.
DB_PATH = os.environ.get('PROSODIC_FEATURES_DB_PATH') or os.path.join(os.path.dirname(__file__), 'prosodic_features.db')

# journal_mode is a database-file property, not a per-connection one —
# it only needs to be switched once, ever, guarded by this lock. See the
# note in _connection() below for why this matters under concurrent load.
_wal_ready = False
_wal_lock = threading.Lock()


@contextmanager
def _connection():
    '''
    One connection per call, always closed — not a thread-local one
    reused (and never closed) for the life of the thread. WAL mode + a
    real busy_timeout so concurrent writers to this shared file (also
    written by feature_store.py/telemetry.py) wait briefly for each
    other instead of immediately raising "database is locked" under
    gunicorn --threads N>1. Verified safe under real concurrent load in
    tests/test_thread_local_connections_concurrency.py.

    busy_timeout is set FIRST, before anything else — a real
    concurrent-load test caught that setting journal_mode=WAL before
    busy_timeout let many threads race to switch mode on a brand new DB
    file with no lock-wait protection active yet, occasionally losing
    with "database is locked". WAL is switched once, ever, under
    _wal_lock, not reissued on every call.
    '''
    global _wal_ready
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA busy_timeout=5000')
    if not _wal_ready:
        with _wal_lock:
            if not _wal_ready:
                conn.execute('PRAGMA journal_mode=WAL')
                _wal_ready = True
    try:
        yield conn
    finally:
        conn.close()


def init_table():
    with _connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS word_usage (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                word        TEXT    NOT NULL,
                rhyme_unit  TEXT,
                color_id    INTEGER,
                created_at  TEXT DEFAULT (datetime('now'))
            )
        ''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_word_usage_user ON word_usage(user_id)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_word_usage_word ON word_usage(user_id, word)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_word_usage_ru ON word_usage(rhyme_unit)')
        conn.commit()


def record_usage(user_id, rhyme_map):
    '''
    rhyme_map — the same list assemble_feedback() returns. It's a per-SYLLABLE
    stream (multi-syllable words repeat their 'word' across several entries),
    so this collapses by (line_index, word_index) first — one row per actual
    word occurrence, not one per syllable.
    '''
    from phoneme_engine import get_rhyme_unit

    by_occurrence = {}  # (line_index, word_index) -> {'word', 'color_id'}
    for entry in rhyme_map:
        word = entry.get('word', '').strip().lower()
        if not word:
            continue
        key = (entry.get('line_index'), entry.get('word_index'))
        existing = by_occurrence.get(key)
        color_id = entry.get('color_id') or None
        if existing is None:
            by_occurrence[key] = {'word': word, 'color_id': color_id}
        elif color_id and not existing['color_id']:
            existing['color_id'] = color_id

    rows = []
    for occ in by_occurrence.values():
        ru = get_rhyme_unit(occ['word'])
        ru_str = '|'.join(ru) if ru else None
        rows.append((user_id, occ['word'], ru_str, occ['color_id']))

    with _connection() as conn:
        conn.executemany(
            'INSERT INTO word_usage (user_id, word, rhyme_unit, color_id) VALUES (?, ?, ?, ?)',
            rows
        )
        conn.commit()


def get_user_top_words(user_id, exclude=None, limit=10):
    '''Words this user has used most often across past analyses.'''
    exclude_set = set(w.lower() for w in (exclude or []))
    with _connection() as conn:
        rows = conn.execute(
            '''
            SELECT word, COUNT(*) as uses
            FROM word_usage
            WHERE user_id = ?
            GROUP BY word
            ORDER BY uses DESC
            LIMIT ?
            ''',
            (user_id, limit + len(exclude_set))
        ).fetchall()
    results = [{'word': r['word'], 'uses': r['uses']} for r in rows if r['word'] not in exclude_set]
    return results[:limit]


def get_rhyme_unit_frequency(rhyme_unit, exclude_user_id=None):
    '''
    How many times this rhyme unit has been used across ALL users (excluding
    the current one, if given). A rough, in-app cliche signal — how common is
    this rhyme choice among everyone using Prosodic, not just this user.
    '''
    if not rhyme_unit:
        return 0
    ru_str = '|'.join(rhyme_unit)
    with _connection() as conn:
        if exclude_user_id is not None:
            row = conn.execute(
                'SELECT COUNT(DISTINCT user_id) as n FROM word_usage WHERE rhyme_unit = ? AND user_id != ?',
                (ru_str, exclude_user_id)
            ).fetchone()
        else:
            row = conn.execute(
                'SELECT COUNT(DISTINCT user_id) as n FROM word_usage WHERE rhyme_unit = ?',
                (ru_str,)
            ).fetchone()
    return row['n'] if row else 0


def user_has_used(user_id, word):
    '''Repetition check — has this user used this word before, and how many times.'''
    with _connection() as conn:
        row = conn.execute(
            'SELECT COUNT(*) as n FROM word_usage WHERE user_id = ? AND word = ?',
            (user_id, word.strip().lower())
        ).fetchone()
    return row['n'] if row else 0

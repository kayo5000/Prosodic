'''
Learning Engine
Captures manual correction signals from the frontend and stores them in a
local SQLite database for future analysis and pattern refinement.

No model training happens here — this is pure signal accumulation.
Each correction (add or remove) records the word, its phoneme sequence,
and the direction of the user's intent.

Schema:
  global_correction_signals
    word             TEXT       — normalized word form
    phoneme_sequence TEXT       — space-joined CMU phonemes (stable identity)
    correction_type  TEXT       — 'add' | 'remove'
    color_id         INTEGER    — the color family involved (0 if remove with unknown)
    count            INTEGER    — how many times this exact signal has fired
    last_seen        TIMESTAMP  — ISO8601

Part of the Prosodic hip-hop lyric analysis suite.
'''

import os
import sqlite3
import threading
from datetime import datetime, timezone
from phoneme_engine import get_phonemes, normalize

DB_PATH = os.path.join(os.path.dirname(__file__), 'learning_signals.db')

_local = threading.local()


def _conn():
    if not hasattr(_local, 'conn') or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _init_schema(_local.conn)
    return _local.conn


def _init_schema(conn):
    conn.execute('''
        CREATE TABLE IF NOT EXISTS global_correction_signals (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            word             TEXT    NOT NULL,
            phoneme_sequence TEXT    NOT NULL,
            correction_type  TEXT    NOT NULL,
            color_id         INTEGER NOT NULL DEFAULT 0,
            count            INTEGER NOT NULL DEFAULT 1,
            last_seen        TEXT    NOT NULL,
            UNIQUE(word, correction_type, color_id)
        )
    ''')
    conn.commit()


def record_signal(word, correction_type, color_id=0):
    '''
    Record a single correction signal.

    word            — raw word as it appears in the lyric
    correction_type — 'add' (user manually colored word) or 'remove' (user stripped color)
    color_id        — the color family involved; 0 for removes where family is unknown
    '''
    clean = normalize(word)
    phonemes = get_phonemes(clean)
    phoneme_seq = ' '.join(phonemes) if phonemes else ''
    now = datetime.now(timezone.utc).isoformat()

    conn = _conn()
    conn.execute('''
        INSERT INTO global_correction_signals (word, phoneme_sequence, correction_type, color_id, count, last_seen)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(word, correction_type, color_id)
        DO UPDATE SET count = count + 1, last_seen = excluded.last_seen
    ''', (clean, phoneme_seq, correction_type, color_id, now))
    conn.commit()


def record_signals_batch(signals):
    '''
    Record multiple signals at once.
    signals — list of dicts with keys: word, correction_type, color_id (optional)
    '''
    for s in signals:
        record_signal(
            s.get('word', ''),
            s.get('correction_type', 'remove'),
            s.get('color_id', 0),
        )


def get_top_signals(limit=50):
    '''Returns the most frequently corrected words, highest count first.'''
    conn = _conn()
    rows = conn.execute('''
        SELECT word, phoneme_sequence, correction_type, color_id, count, last_seen
        FROM global_correction_signals
        ORDER BY count DESC
        LIMIT ?
    ''', (limit,)).fetchall()
    return [dict(r) for r in rows]


def get_word_history(word):
    '''Returns all correction signals for a single word.'''
    clean = normalize(word)
    conn = _conn()
    rows = conn.execute('''
        SELECT word, phoneme_sequence, correction_type, color_id, count, last_seen
        FROM global_correction_signals
        WHERE word = ?
        ORDER BY count DESC
    ''', (clean,)).fetchall()
    return [dict(r) for r in rows]


# ── Test Block ───────────────────────────────────────────
if __name__ == '__main__':
    # Simulate a few corrections
    record_signal('reverse', 'add', color_id=1)
    record_signal('reverse', 'add', color_id=1)
    record_signal('immersed', 'remove', color_id=3)
    record_signal('the', 'add', color_id=1)

    print('=== TOP SIGNALS ===')
    for s in get_top_signals(10):
        print(f'  {s["word"]:<14} {s["correction_type"]:<8} color={s["color_id"]}  count={s["count"]}')
        print(f'  {"":>14} phonemes: {s["phoneme_sequence"]}')

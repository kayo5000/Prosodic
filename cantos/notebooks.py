"""
cantos/notebooks.py — Notebook Entry persistence, Launch Spec §2.1.

Append-only. One entry per engine per session. `delta` is computed
against the previous entry for the same (engine, user_id) pair — per the
spec, this is "the mechanism behind now vs. then."

Prime Directive: an observation describes what an engine found in the
user's OWN writing (structure, pattern, change) — never a suggested
replacement line. This module stores whatever text/metrics a caller
gives it, same as feedback_engine already does for its structured output
elsewhere in this codebase; it is the callers' responsibility (future
engine wiring) to only ever pass analysis, never generated lyric content
— same boundary every other engine in this repo already respects.
"""
from cantos import db


def append_entry(engine, user_id, session_id, observation, metrics=None):
    '''
    Append a new Notebook Entry. Computes delta against this
    (engine, user_id)'s most recent prior entry automatically.

    Returns the full entry dict, including its computed delta and id.
    '''
    engine = (engine or '').strip().lower()
    if not engine or not user_id or not session_id or not observation:
        raise ValueError('engine, user_id, session_id, and observation are all required')

    conn = db.get_connection()
    prev = get_last_entry(engine, user_id)
    delta = _compute_delta(prev['metrics'] if prev else None, metrics)

    entry = {
        'id': db.new_id(),
        'engine': engine,
        'user_id': user_id,
        'session_id': session_id,
        'observation': observation,
        'metrics': metrics or {},
        'delta': delta,
        'timestamp': db.now_iso(),
    }
    conn.execute(
        'INSERT INTO notebook_entries '
        '(id, engine, user_id, session_id, observation, metrics, delta, timestamp) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (entry['id'], entry['engine'], entry['user_id'], entry['session_id'],
         entry['observation'], db.to_json(entry['metrics']), db.to_json(entry['delta']),
         entry['timestamp']),
    )
    conn.commit()
    return entry


def get_last_entry(engine, user_id):
    engine = (engine or '').strip().lower()
    conn = db.get_connection()
    row = conn.execute(
        'SELECT * FROM notebook_entries WHERE engine = ? AND user_id = ? '
        'ORDER BY timestamp DESC, rowid DESC LIMIT 1',
        (engine, user_id),
    ).fetchone()
    return _row_to_entry(row) if row else None


def get_entries(engine, user_id, limit=20):
    '''Newest-on-top, per spec §2.1 ("Newest-on-top when read").'''
    engine = (engine or '').strip().lower()
    conn = db.get_connection()
    rows = conn.execute(
        'SELECT * FROM notebook_entries WHERE engine = ? AND user_id = ? '
        'ORDER BY timestamp DESC, rowid DESC LIMIT ?',
        (engine, user_id, limit),
    ).fetchall()
    return [_row_to_entry(r) for r in rows]


def _row_to_entry(row):
    return {
        'id': row['id'],
        'engine': row['engine'],
        'user_id': row['user_id'],
        'session_id': row['session_id'],
        'observation': row['observation'],
        'metrics': db.from_json(row['metrics']) or {},
        'delta': db.from_json(row['delta']),
        'timestamp': row['timestamp'],
    }


def _compute_delta(prev_metrics, new_metrics):
    '''
    Generic numeric delta: for every key present, with a numeric value,
    in BOTH the previous and new metrics dicts, delta[key] = new - prev,
    rounded to 4 places. Non-numeric or one-sided keys are skipped rather
    than erroring — metrics shapes can legitimately evolve engine to
    engine and version to version.

    Returns None on the very first entry for this (engine, user_id), or
    if no comparable numeric keys exist at all.
    '''
    if not prev_metrics or not new_metrics:
        return None
    delta = {}
    for key, new_val in new_metrics.items():
        prev_val = prev_metrics.get(key)
        if (isinstance(new_val, (int, float)) and not isinstance(new_val, bool)
                and isinstance(prev_val, (int, float)) and not isinstance(prev_val, bool)):
            delta[key] = round(new_val - prev_val, 4)
    return delta or None

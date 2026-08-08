"""
cantos/notes.py — Note to Cassius persistence, Launch Spec §2.4.

Everything an engine or meeting wants the user to potentially hear lands
here first. This module only stores/reads notes — the actual gating
decision (which note, if any, reaches the user) is cassius.py's job,
kept separate on purpose, matching the spec's own split between "notes
exist" (§2.4) and "Cassius decides" (§5).

Prime Directive: `message` is the thing that could reach the user, in
voice — analysis/observation/pointer, never a replacement lyric. Same
boundary as every other module in this package.
"""
from cantos import db
from cantos_dev_log import log_event


def drop_note(source, session_id, section, message, priority, basis=None):
    '''
    Args:
        source: engine name, or "meeting:<meeting_id>" — per the spec's
            own shape for this field.
        message: the thing that could reach the user, in voice.
        priority: float in [0.0, 1.0].
        basis: JSON-able — links to notebook entries / deltas grounding
            the claim ("basis: json # links to notebook entries / deltas
            grounding the claim", per spec). cassius.py's eligibility
            check looks for basis={'delta': {...}} specifically.
    '''
    if not (0.0 <= priority <= 1.0):
        raise ValueError(f'priority must be in [0.0, 1.0], got {priority!r}')
    if not source or not session_id or not section or not message:
        raise ValueError('source, session_id, section, and message are all required')

    note = {
        'id': db.new_id(),
        'source': source,
        'session_id': session_id,
        'section': section,
        'message': message,
        'priority': priority,
        'basis': basis,
        'surfaced': False,
        'surfaced_at': None,
        'timestamp': db.now_iso(),
    }
    conn = db.get_connection()
    conn.execute(
        'INSERT INTO notes '
        '(id, source, session_id, section, message, priority, basis, surfaced, surfaced_at, timestamp) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (note['id'], note['source'], note['session_id'], note['section'], note['message'],
         note['priority'], db.to_json(note['basis']), 0, None, note['timestamp']),
    )
    conn.commit()

    log_label = source.upper() if not source.startswith('meeting:') else 'MEETING'
    log_event(log_label, 'dropped note', f'priority {priority:.2f} → {section}')
    return note


def get_notes(session_id, surfaced=None):
    conn = db.get_connection()
    query = 'SELECT * FROM notes WHERE session_id = ?'
    params = [session_id]
    if surfaced is not None:
        query += ' AND surfaced = ?'
        params.append(1 if surfaced else 0)
    query += ' ORDER BY timestamp ASC, rowid ASC'
    rows = conn.execute(query, params).fetchall()
    return [_row_to_note(r) for r in rows]


def mark_surfaced(note_id):
    conn = db.get_connection()
    surfaced_at = db.now_iso()
    conn.execute('UPDATE notes SET surfaced = 1, surfaced_at = ? WHERE id = ?', (surfaced_at, note_id))
    conn.commit()
    return surfaced_at


def _row_to_note(row):
    return {
        'id': row['id'],
        'source': row['source'],
        'session_id': row['session_id'],
        'section': row['section'],
        'message': row['message'],
        'priority': row['priority'],
        'basis': db.from_json(row['basis']),
        'surfaced': bool(row['surfaced']),
        'surfaced_at': row['surfaced_at'],
        'timestamp': row['timestamp'],
    }

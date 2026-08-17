"""
cantos/board.py — Board Post persistence, Launch Spec §2.2.

Written to a per-session board. Any engine can read all posts — this
module has no per-engine visibility restriction; reading is always
scoped by session_id (and optionally section/engine), never by "who's
asking." That's what makes it a shared board rather than another private
notebook.

Prime Directive: `signal` is a short machine label (e.g.
"theme_strengthening") and `summary` is at most one line describing what
was found — never a replacement lyric. Same boundary as everywhere else
in this codebase.
"""
from cantos import db
from cantos_dev_log import log_event


def post(engine, session_id, section, signal, strength, summary=None):
    '''
    Write a Board Post.

    Args:
        engine: posting engine name, normalized lowercase.
        session_id, section: what this post is about — section is a bar
            range string, e.g. "L1-8", matching the spec's example.
        signal: machine label, e.g. "theme_strengthening", "pocket_slip".
        strength: float in [0.0, 1.0] — salience/confidence.
        summary: optional one-line human-readable gloss, engine voice
            (rule-voiced templates, not built yet, would populate this).

    Returns the full post dict, and logs it to the Cantos Dev Log in
    exactly the shape the spec's own §2.5 example shows:
    "[HH:MM:SS] MOTIF read L1-8 -> posted board: theme_strengthening, strength 0.81"
    '''
    engine = (engine or '').strip().lower()
    if not engine or not session_id or not section or not signal:
        raise ValueError('engine, session_id, section, and signal are all required')
    if not (0.0 <= strength <= 1.0):
        raise ValueError(f'strength must be in [0.0, 1.0], got {strength!r}')

    post_row = {
        'id': db.new_id(),
        'engine': engine,
        'session_id': session_id,
        'section': section,
        'signal': signal,
        'strength': strength,
        'summary': summary,
        'timestamp': db.now_iso(),
    }
    conn = db.get_connection()
    conn.execute(
        'INSERT INTO board_posts '
        '(id, engine, session_id, section, signal, strength, summary, timestamp) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (post_row['id'], post_row['engine'], post_row['session_id'], post_row['section'],
         post_row['signal'], post_row['strength'], post_row['summary'], post_row['timestamp']),
    )
    conn.commit()

    log_event(engine, f'read {section}',
               f'posted board: {signal}, strength {strength:.2f}')
    return post_row


def get_posts(session_id, section=None, engine=None):
    '''
    Read Board Posts for a session — any caller (any engine) may read
    all of them; there's no per-engine visibility filter, only the
    optional section/engine args to narrow what's returned. Oldest-first
    (natural reading order for a board/feed).
    '''
    conn = db.get_connection()
    query = 'SELECT * FROM board_posts WHERE session_id = ?'
    params = [session_id]
    if section:
        query += ' AND section = ?'
        params.append(section)
    if engine:
        query += ' AND engine = ?'
        params.append((engine or '').strip().lower())
    query += ' ORDER BY timestamp ASC, rowid ASC'

    rows = conn.execute(query, params).fetchall()
    return [_row_to_post(r) for r in rows]


def get_sections_with_posts(session_id):
    '''
    Distinct sections that have 2+ posts from DIFFERENT engines — the
    raw material meetings.py's trigger logic (§4) scans. Exposed here
    rather than duplicated in meetings.py since it's a board-shaped
    query, not a meeting-shaped one.
    '''
    posts = get_posts(session_id)
    by_section: dict = {}
    for p in posts:
        by_section.setdefault(p['section'], set()).add(p['engine'])
    return {section: engines for section, engines in by_section.items() if len(engines) >= 2}


def _row_to_post(row):
    return {
        'id': row['id'],
        'engine': row['engine'],
        'session_id': row['session_id'],
        'section': row['section'],
        'signal': row['signal'],
        'strength': row['strength'],
        'summary': row['summary'],
        'timestamp': row['timestamp'],
    }

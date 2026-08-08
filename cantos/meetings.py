"""
cantos/meetings.py — Meetings + Refusals, Launch Spec §2.3 and §4.

A meeting opens when, within one session (§4):
  - 2+ engines post to the board on the SAME section, AND
  - their signals are RELATED (see SIGNAL_ADJACENCY below), AND
  - combined strength clears a threshold T_meet (default 1.2, spec's
    starting value).

When it opens, other candidate engines may be invited. An invited engine
joins only if its own read on that section clears T_join (default 0.5);
otherwise it declines with a reason, logged. Declines are real, per the
spec: "an engine whose data didn't support the play," not
conflict-for-flavor.

SIGNAL_ADJACENCY is a STARTER set. The spec gives exactly one worked
example (theme_strengthening <-> emotion_rising <-> rhyme_family_return);
everything else here is my own reasonable extension, since no engine is
actually wired to post real board signals yet (that's future work — see
docs/cantos/OVERNIGHT_BUILD_SUMMARY.md). Extend this map once real signal
vocabulary exists from wired-up engines.

This module deliberately does NOT drop a Note to Cassius when a meeting
closes — §2.4/§3 step 5 treats that as a separate action engines/meetings
CHOOSE to take, and Cassius/Notes don't exist yet at this point in the
build order. A caller wanting that behavior composes meetings.py +
cassius.py explicitly once both exist — kept decoupled on purpose.
"""
from cantos import db, board
from cantos_dev_log import log_event

T_MEET_DEFAULT = 1.2
T_JOIN_DEFAULT = 0.5

# signal -> set of signals that reinforce it. Symmetric by construction
# (see _symmetric_closure below) — you only need to list each pair once.
_ADJACENCY_PAIRS = [
    ('theme_strengthening', 'emotion_rising'),
    ('emotion_rising', 'rhyme_family_return'),
    ('theme_strengthening', 'rhyme_family_return'),
    ('pocket_slip', 'syncopation_spike'),
    ('syncopation_spike', 'flow_disruption'),
    ('pocket_slip', 'flow_disruption'),
    ('density_spike', 'multisyllabic_surge'),
    ('multisyllabic_surge', 'internal_rhyme_return'),
    ('motif_return', 'rhyme_family_return'),
]


def _symmetric_closure(pairs):
    adjacency = {}
    for a, b in pairs:
        adjacency.setdefault(a, set()).add(b)
        adjacency.setdefault(b, set()).add(a)
    return adjacency


SIGNAL_ADJACENCY = _symmetric_closure(_ADJACENCY_PAIRS)


def related(signal_a, signal_b):
    '''Two signals are related if identical, or adjacent in SIGNAL_ADJACENCY.'''
    if signal_a == signal_b:
        return True
    return signal_b in SIGNAL_ADJACENCY.get(signal_a, set())


def _find_clusters(posts):
    '''
    Connected components among posts on one section: an edge exists
    between two posts from DIFFERENT engines whose signals are related().
    Same-engine posts don't connect to each other (an engine agreeing
    with itself isn't a meeting). Returns list of post-lists.
    '''
    n = len(posts)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    for i in range(n):
        for j in range(i + 1, n):
            if posts[i]['engine'] != posts[j]['engine'] and related(posts[i]['signal'], posts[j]['signal']):
                union(i, j)

    clusters = {}
    for i in range(n):
        clusters.setdefault(find(i), []).append(posts[i])
    return list(clusters.values())


def evaluate_meetings(session_id, invite_candidates=None,
                       T_meet=T_MEET_DEFAULT, T_join=T_JOIN_DEFAULT):
    '''
    Scans the board for this session, forms any meetings that qualify,
    invites/declines candidates, persists + logs everything.

    Args:
        session_id: which session's board to scan.
        invite_candidates: optional {section: {engine: strength}} — engines
            NOT already posting on that section who could be invited, and
            their own current read (strength) on it. Without this,
            meetings still form correctly from the board alone; invites
            just extend who else gets a chance to join or decline.
        T_meet, T_join: thresholds, spec's own starting values as defaults.

    Returns list of formed meeting dicts (empty if nothing qualified).
    '''
    invite_candidates = invite_candidates or {}
    formed = []

    for section, engines_on_section in board.get_sections_with_posts(session_id).items():
        posts = board.get_posts(session_id, section=section)
        for cluster in _find_clusters(posts):
            cluster_engines = {p['engine'] for p in cluster}
            if len(cluster_engines) < 2:
                continue
            combined_strength = sum(p['strength'] for p in cluster)
            if combined_strength < T_meet:
                continue
            formed.append(_form_meeting(session_id, section, cluster,
                                         invite_candidates.get(section, {}), T_join))

    return formed


def _form_meeting(session_id, section, cluster, candidates, T_join):
    participants = sorted({p['engine'] for p in cluster})
    signals = sorted({p['signal'] for p in cluster})
    combined_strength = sum(p['strength'] for p in cluster)

    trigger = (
        f"{len(cluster)} posts related on {section} "
        f"({', '.join(signals)}), combined strength {combined_strength:.2f} >= T_meet"
    )

    declined = []
    for engine, strength in candidates.items():
        engine = (engine or '').strip().lower()
        if engine in participants:
            continue
        core_label = '+'.join(p.upper() for p in participants)
        if strength >= T_join:
            participants.append(engine)
            combined_strength += strength
            log_event(engine.upper(), f'saw {core_label} post', f'overlap {section} → JOINED')
        else:
            reason = f'own read thin ({strength:.2f}), researching'
            declined.append({'engine': engine, 'reason': reason})
            log_event(engine.upper(), 'declined further', reason)

    participants = sorted(set(participants))
    combined_read = (
        f"{'+'.join(participants)}: {' reinforced by '.join(signals)} "
        f"across {section} (combined strength {combined_strength:.2f})"
    )

    meeting = {
        'id': db.new_id(),
        'session_id': session_id,
        'section': section,
        'participants': participants,
        'trigger': trigger,
        'combined_read': combined_read,
        'declined': declined,
        'timestamp': db.now_iso(),
    }
    conn = db.get_connection()
    conn.execute(
        'INSERT INTO meetings '
        '(id, session_id, section, participants, trigger, combined_read, declined, timestamp) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (meeting['id'], meeting['session_id'], meeting['section'],
         db.to_json(meeting['participants']), meeting['trigger'], meeting['combined_read'],
         db.to_json(meeting['declined']), meeting['timestamp']),
    )
    conn.commit()

    log_event('MEETING', 'closed', f"({'+'.join(participants)}) on {section} → {meeting['combined_read']}")
    return meeting


def get_meetings(session_id, section=None):
    conn = db.get_connection()
    query = 'SELECT * FROM meetings WHERE session_id = ?'
    params = [session_id]
    if section:
        query += ' AND section = ?'
        params.append(section)
    query += ' ORDER BY timestamp ASC, rowid ASC'
    rows = conn.execute(query, params).fetchall()
    return [_row_to_meeting(r) for r in rows]


def _row_to_meeting(row):
    return {
        'id': row['id'],
        'session_id': row['session_id'],
        'section': row['section'],
        'participants': db.from_json(row['participants']) or [],
        'trigger': row['trigger'],
        'combined_read': row['combined_read'],
        'declined': db.from_json(row['declined']) or [],
        'timestamp': row['timestamp'],
    }

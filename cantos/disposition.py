"""
cantos/disposition.py — Engine Disposition, Launch Spec §2.6.

A persistent per-engine-per-user state object: confidence, pride,
trajectory, views (on studied artists/works), mood_tags. Per §2.7, a
"thought" isn't a new record type — it's a Board Post or Note whose
content got shaped by this state. This module only stores/updates the
state itself; shaping future reads with it is a job for whichever module
writes Board Posts/Notes later (not built yet — see
docs/cantos/OVERNIGHT_BUILD_SUMMARY.md).

CRITICAL constraint, enforced architecturally, not just by convention:
confidence / pride / trajectory / mood_tags update ONLY through
record_outcome() below — there is no set_confidence()/set_mood() free-for-
-all in this module's public API. Per the spec: updates happen "only when
a past call of its own provably worked out (checked via delta on a later
session) — never mood for its own sake." The only way in is a caller
supplying a concrete, checkable outcome tied to a specific past Notebook
Entry (see record_outcome()'s notebook_entry_id argument) — there is no
path to nudge these fields without one.

`views` is handled separately (update_view(), below) — read that
function's docstring for why, and for an explicit flag that this is a
judgment call made without the full §2.6 text in hand.

Still bound by the Prime Directive: confidence/pride/trajectory/mood_tags
are numbers and short labels, computed and logged — never a claim that
an engine subjectively feels anything. "Model it, never claim to feel it."
"""
import logging

from cantos import db
from cantos_dev_log import log_event

log = logging.getLogger(__name__)

DEFAULT_DISPOSITION = {
    'confidence': 0.5,
    'pride': 0.5,
    'trajectory': 'flat',
    'views': {},
    'mood_tags': [],
}

_OUTCOME_STEP = 0.05
_TRAJECTORY_WINDOW = 5   # last N outcomes considered when recomputing trajectory
VALID_OUTCOMES = ('confirmed', 'contradicted', 'inconclusive')

# outcome -> mood tag it contributes. Deliberately internal (not a public
# add_mood_tag() API) — mood_tags only ever changes as a byproduct of a
# real outcome check, same gate as confidence/pride.
_OUTCOME_MOOD_TAG = {
    'confirmed': 'assured',
    'contradicted': 'reassessing',
    'inconclusive': 'watching',
}


def get_disposition(engine, user_id):
    engine = (engine or '').strip().lower()
    conn = db.get_connection()
    row = conn.execute(
        'SELECT * FROM engine_dispositions WHERE engine = ? AND user_id = ?',
        (engine, user_id),
    ).fetchone()
    if not row:
        return dict(DEFAULT_DISPOSITION, engine=engine, user_id=user_id, updated_at=None,
                     views={}, mood_tags=[])
    return _row_to_disposition(row)


def _row_to_disposition(row):
    return {
        'engine': row['engine'],
        'user_id': row['user_id'],
        'confidence': row['confidence'],
        'pride': row['pride'],
        'trajectory': row['trajectory'],
        'views': db.from_json(row['views']) or {},
        'mood_tags': db.from_json(row['mood_tags']) or [],
        'updated_at': row['updated_at'],
    }


def _save_disposition(disposition):
    conn = db.get_connection()
    conn.execute(
        'INSERT INTO engine_dispositions '
        '(engine, user_id, confidence, pride, trajectory, views, mood_tags, updated_at) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?) '
        'ON CONFLICT(engine, user_id) DO UPDATE SET '
        'confidence=excluded.confidence, pride=excluded.pride, trajectory=excluded.trajectory, '
        'views=excluded.views, mood_tags=excluded.mood_tags, updated_at=excluded.updated_at',
        (disposition['engine'], disposition['user_id'], disposition['confidence'],
         disposition['pride'], disposition['trajectory'], db.to_json(disposition['views']),
         db.to_json(disposition['mood_tags']), disposition['updated_at']),
    )
    conn.commit()


def record_outcome(engine, user_id, notebook_entry_id, outcome, evidence=None):
    '''
    The §3 step-7 outcome-check mechanism — the ONLY way confidence,
    pride, trajectory, or mood_tags change. The caller determines the
    verdict (typically by comparing a past Notebook Entry's claim against
    a LATER entry's delta) and reports it here; this function does not
    decide what "worked out" means for any given engine's domain — that
    judgment stays with the caller. This just applies the consequence
    consistently and logs it.

    Args:
        engine, user_id: whose disposition to update.
        notebook_entry_id: id of the past Notebook Entry being checked —
            REQUIRED, so every disposition change traces back to a
            specific, inspectable past claim. No entry id, no update.
        outcome: 'confirmed' | 'contradicted' | 'inconclusive'.
        evidence: optional JSON-able dict explaining the verdict, stored
            alongside the outcome for audit.

    Returns the updated disposition dict. Every call is logged to the
    Cantos Dev Log AND to disposition_outcomes regardless of outcome —
    'inconclusive' is audit trail too, never silently dropped.
    '''
    if outcome not in VALID_OUTCOMES:
        raise ValueError(f'outcome must be one of {VALID_OUTCOMES}, got {outcome!r}')
    if not notebook_entry_id:
        raise ValueError(
            'notebook_entry_id is required — every disposition change must '
            'trace to a specific past claim, not a vibe'
        )

    engine = (engine or '').strip().lower()
    conn = db.get_connection()
    conn.execute(
        'INSERT INTO disposition_outcomes '
        '(id, engine, user_id, notebook_entry_id, outcome, evidence, checked_at) '
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        (db.new_id(), engine, user_id, notebook_entry_id, outcome,
         db.to_json(evidence), db.now_iso()),
    )
    conn.commit()

    disposition = get_disposition(engine, user_id)
    if outcome == 'confirmed':
        disposition['confidence'] = _clamp(disposition['confidence'] + _OUTCOME_STEP)
        disposition['pride'] = _clamp(disposition['pride'] + _OUTCOME_STEP)
    elif outcome == 'contradicted':
        disposition['confidence'] = _clamp(disposition['confidence'] - _OUTCOME_STEP)
        disposition['pride'] = _clamp(disposition['pride'] - _OUTCOME_STEP / 2)
    # inconclusive: confidence/pride unchanged — but trajectory and
    # mood_tags are still recomputed below, and the outcome is still
    # logged above. Nothing about "inconclusive" means "ignored."

    tags = [t for t in disposition['mood_tags'] if t != _OUTCOME_MOOD_TAG[outcome]]
    tags.insert(0, _OUTCOME_MOOD_TAG[outcome])
    disposition['mood_tags'] = tags[:5]

    disposition['trajectory'] = _recompute_trajectory(engine, user_id)
    disposition['updated_at'] = db.now_iso()
    _save_disposition(disposition)

    log_event(
        engine.upper(), 'outcome check',
        f"{outcome} -> confidence={disposition['confidence']:.2f}, "
        f"pride={disposition['pride']:.2f}, trajectory={disposition['trajectory']}",
    )
    return disposition


def _recompute_trajectory(engine, user_id):
    conn = db.get_connection()
    rows = conn.execute(
        'SELECT outcome FROM disposition_outcomes WHERE engine = ? AND user_id = ? '
        'ORDER BY checked_at DESC, rowid DESC LIMIT ?',
        (engine, user_id, _TRAJECTORY_WINDOW),
    ).fetchall()
    outcomes = [r['outcome'] for r in rows]
    if not outcomes:
        return 'flat'
    confirmed = outcomes.count('confirmed')
    contradicted = outcomes.count('contradicted')
    if confirmed > len(outcomes) / 2:
        return 'rising'
    if contradicted > len(outcomes) / 2:
        return 'falling'
    return 'flat'


def update_view(engine, user_id, subject, stance, basis):
    '''
    Record this engine's standing view on a studied artist/work.

    JUDGMENT CALL, flagged explicitly: the pasted §2.6 summary doesn't
    fully specify whether `views` updates through the same strict
    outcome-check gate as confidence/pride, or separately (an engine
    forming a view WHILE studying a work reads differently than an engine
    checking whether ITS OWN past prediction about a user's writing panned
    out — a view can reasonably form from analysis alone). This function
    takes the latter reading: not gated by record_outcome(), but still
    requires `basis` (what analysis grounds the view) so it's never a bare
    assertion, and every call is logged. Revisit if the full §2.6 text
    says otherwise.
    '''
    if not basis:
        raise ValueError('basis is required — a view must be grounded in something computed')
    disposition = get_disposition(engine, user_id)
    disposition['views'][subject] = stance
    disposition['updated_at'] = db.now_iso()
    _save_disposition(disposition)
    log_event((engine or '').strip().upper(), f'formed view on {subject}', f'{stance} — {basis}')
    return disposition


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

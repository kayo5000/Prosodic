"""
cantos/cassius.py — Cassius, the gate. Launch Spec §5.1 (daily mode only —
§5.2 direct mode is cantos/direct.py, a separate module).

Cassius holds the only line to the user. Daily mode:
  - Collects all not-yet-surfaced Notes for the session.
  - A note is ELIGIBLE only if:
      (a) it represents a meaningful change since last session
          (a non-null, non-trivial delta reachable via its basis), OR
      (b) its priority exceeds T_surface (default 0.7).
  - Among eligible notes, the top `surface_max` by priority (default 1)
    are surfaced.
  - Everything else — ineligible, or eligible but not selected — is
    WITHHELD: still stored, still logged, never deleted. Per spec: "the
    gap between generated and surfaced is the mentorship."

THRESHOLD DECISION (Khris: "not sure, make your best call" — kept 0.05,
reasoning below, not just carried over unexamined):

"Non-trivial delta" needs a numeric threshold the spec doesn't specify.
Kept at 0.05 rather than changing it, for a sharper reason than "it was
the first number I picked": 0.05 is exactly ONE outcome-step's worth of
movement in disposition.py (_OUTCOME_STEP). That gives it a real anchor
instead of being arbitrary — "meaningful change" surfacing to the user
at roughly the same magnitude as "one confirmed/contradicted call's
worth of movement" is a coherent, defensible bar, not a round number
picked for its own sake.

CAVEAT this only holds for roughly-[0,1]-normalized metrics — everything
actually flowing through this system so far IS on that scale (board post
`strength`, disposition confidence/pride, state_engine's `confidence`).
It is NOT calibrated for arbitrary-scale metrics (raw syllable counts,
0-100 percentages like density_engine's scores) — a 0.05 absolute
threshold would be nearly always "non-trivial" against a 0-100 scale and
nearly never against large raw counts. This wasn't a problem to solve
tonight since only 1 of 21 engines is wired to Notebooks and its metric
(confidence) is already 0-1. When more engines get wired (the largest
remaining piece of work per the overnight summary), whichever wiring
layer feeds their metrics in should normalize to a comparable [0,1]
range before storing, OR this threshold should become scale-aware
(e.g. relative-change-based) at that point — flagged here rather than
silently assumed to already generalize.
"""
from cantos import notes as notes_module
from cantos_dev_log import log_event

T_SURFACE_DEFAULT = 0.7
SURFACE_MAX_DEFAULT = 1
DELTA_TRIVIAL_THRESHOLD = 0.05


def has_meaningful_delta(note, threshold=DELTA_TRIVIAL_THRESHOLD):
    '''
    Looks for note['basis']['delta'] — a caller-supplied dict, typically
    lifted straight from a NotebookEntry's own `delta` field (see
    notebooks.py) — and returns True if any numeric value in it exceeds
    the triviality threshold in magnitude.
    '''
    basis = note.get('basis') or {}
    delta = basis.get('delta')
    if not delta:
        return False
    return any(
        isinstance(v, (int, float)) and not isinstance(v, bool) and abs(v) > threshold
        for v in delta.values()
    )


def is_eligible(note, T_surface=T_SURFACE_DEFAULT):
    return has_meaningful_delta(note) or note['priority'] > T_surface


def run_daily_gate(session_id, surface_max=SURFACE_MAX_DEFAULT, T_surface=T_SURFACE_DEFAULT):
    '''
    Runs the daily-mode gate once for a session. Idempotent-ish in the
    sense that it only ever looks at not-yet-surfaced notes, so calling
    it twice in a row on the same session won't re-surface anything
    already marked surfaced — but it WILL surface more notes on a second
    call if new ones were dropped in between, same as a real daily cycle
    picking up whatever's accumulated since it last ran.

    Returns {'surfaced': [note, ...], 'withheld': [note, ...]}.
    '''
    pending = notes_module.get_notes(session_id, surfaced=False)
    eligible = [n for n in pending if is_eligible(n, T_surface)]
    eligible.sort(key=lambda n: n['priority'], reverse=True)

    to_surface = eligible[:surface_max]
    surfaced_ids = {n['id'] for n in to_surface}
    withheld = [n for n in pending if n['id'] not in surfaced_ids]

    for n in to_surface:
        notes_module.mark_surfaced(n['id'])
        log_event('CASSIUS', 'surfaced note',
                   f"{n['source']} priority {n['priority']:.2f} → {n['section']}: {n['message']}")

    for n in withheld:
        reason = 'below T_surface, no meaningful delta' if not is_eligible(n, T_surface) else 'outranked by a higher-priority note'
        log_event('CASSIUS', 'withheld note', f"{n['source']} priority {n['priority']:.2f} → {reason}")

    log_event('CASSIUS', f'held {len(pending)} notes', f'surfaced {len(to_surface)} to user')

    return {'surfaced': to_surface, 'withheld': withheld}

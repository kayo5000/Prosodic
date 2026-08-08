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

JUDGMENT CALL, flagged: "non-trivial delta" needs a numeric threshold the
pasted spec summary doesn't specify. DELTA_TRIVIAL_THRESHOLD=0.05 here
matches the step size disposition.py already uses for confidence/pride
per outcome — a reasonable, documented choice, not something stated in
the spec. Revisit if Khris specifies otherwise.
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

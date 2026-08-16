"""
application/suggest_enrichment.py

Extracted verbatim from api.py's /suggest route body (Phase 1c of
docs/BUILD_PLAN.md) — not rewritten, moved. Tags each suggestion from
domain.suggestion_engine.get_suggestions() with three signals that
require reaching outside the pure domain computation: how many OTHER
users have reached for this same rhyme unit (community_uses, a cliche
signal), whether THIS user has used the word before (used_before, a
repetition warning — only meaningful when logged in), and how concrete/
vivid the word is (concreteness, 1.0 abstract - 5.0 sensory).

This coordinates a domain computation (suggestion_engine, now in
domain/) with two infrastructure reads (usage_history.py,
concreteness_engine.py — both still at repo root, not domain/, since
both touch sqlite3 directly; see docs/BUILD_PLAN.md Phase 1b's note on
why they weren't moved there) — exactly the shape a use-case layer
exists for: neither domain/ nor infrastructure/ is the right home for
"combine these for this one specific user-facing operation."

Preserved exactly from the original inline version, including its one
real quirk: the whole loop runs inside one try/except, so a failure
partway through (e.g. concreteness_engine unavailable) can leave some
suggestions tagged and others not, and the exception is swallowed
(logged, not raised) — never blocks the response, per the original
code's own comment. Not "fixed" here — that would be a behavior change,
out of scope for a reorganization pass. Flagged, not silently improved.
"""
import logging

import usage_history
from concreteness_engine import get_concreteness

log = logging.getLogger(__name__)


def enrich_suggestions(suggestions, user_id):
    """
    Mutates `suggestions` in place, adding community_uses/used_before/
    concreteness to each entry. Returns the same list (for convenience —
    callers that ignore the return value still see the mutation).

    user_id: the requesting user's id, or None for an anonymous caller
    (used_before is always 0 when None — see the original route's own
    logic, preserved here unchanged).
    """
    try:
        for s in suggestions:
            ru = s.get('rhyme_unit')
            s['community_uses'] = usage_history.get_rhyme_unit_frequency(
                tuple(ru) if ru else None, exclude_user_id=user_id
            )
            s['used_before'] = (
                usage_history.user_has_used(user_id, s['word']) if user_id is not None else 0
            )
            s['concreteness'] = get_concreteness(s['word'])
    except Exception:
        log.exception('Failed to tag community_uses/used_before/concreteness (non-fatal)')
    return suggestions

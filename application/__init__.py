"""
application/

Clean Architecture's use-case layer — sits between api.py's routes
(outermost, Flask-specific) and domain/ (innermost, framework-free).

Deliberately thin, on purpose. Phase 1c's actual finding (see
docs/BUILD_PLAN.md): api.py's routes mostly delegate straight to
domain/feedback_engine.py's assemble_feedback() and domain/
suggestion_engine.py's get_suggestions() — those two ALREADY function as
the application layer for the core analyze/suggest computation. Adding
a parallel application/ wrapper around calls that are already clean
would be ceremony, not architecture — see the module list below for
what's actually new here.

What's actually in this package is the ONE piece of real orchestration
logic Phase 1c found genuinely misplaced: /suggest's inline enrichment
block (tagging each suggestion with community_uses/used_before/
concreteness), which coordinates a domain computation (suggestion_engine)
with infrastructure reads (usage_history, concreteness_engine) for one
specific user-facing operation — the textbook definition of a use case,
and it was sitting unnamed and untested inside a Flask route body before
this. Don't add more files here speculatively; add one only when a route
body is found doing real orchestration work again, the same way this one
was found.
"""

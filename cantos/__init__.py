"""
cantos/

The Cantos system — Notebooks, Disposition, Board, Meetings, Cassius,
Voice templates, Direct mode. Built from PROSODIC_CANTOS_LAUNCH_SPEC.md
(docs/cantos/), overnight build authorized by Khris.

Nothing in this package is wired to api.py yet. Each module is
independently importable and tested; wiring to live Flask endpoints is a
deliberate next step, not done here — see
docs/cantos/OVERNIGHT_BUILD_SUMMARY.md for exactly what's built vs. not.

PRIME DIRECTIVE, enforced architecturally throughout this package:
Prosodic analyzes, never generates. Nothing in cantos/ accepts or
produces replacement lyric content. Every module that returns text to a
user assembles it from a small, fixed set of developer-authored template
strings (cantos/voice.py) chosen by rule from computed signals — never
free text, never an LLM call, never anything that could plausibly emit a
bar/line/phrase. If a future change to this package could emit lyric
content, that change is wrong and should not be merged.
"""

'''
Feature Flags
Small, explicit on/off switches for functionality that's fully built and
tested but not yet meant to be load-bearing for anything a user hits by
default.

Convention: FEATURE_<NAME>, read once at import time via os.environ,
default OFF unless explicitly enabled — same "opt-in, not opt-out" shape
already used everywhere else config gets read in this codebase
(PROSODIC_DB_PATH etc.), just for capability toggles instead of paths.

Not every dormant module gets a flag here. Distinguish "built, tested,
has a real integration point, just not switched on yet" (a flag makes
sense) from "zero importers anywhere in the repo, no integration point
exists to gate" (that's a dead-code question, not a feature-flag one —
see the open-ended sweep findings for bar_grid_linguistics.py and
fingerprint_pipeline.py, which are the latter).

Part of the Prosodic hip-hop lyric analysis suite.
'''
import os


def _flag(name, default=False):
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ('1', 'true', 'yes', 'on')


# Cantos (Notebooks/Board/Meetings/Cassius/Voice/Direct) and the
# Behavioral Layer engine it wires together (behavior/state_engine.py via
# cantos/wiring.py). Built and tested (see
# docs/cantos/OVERNIGHT_BUILD_SUMMARY.md) but never reachable through any
# route — the only way to exercise it was importing cantos.wiring
# directly. Per Khris: keep building/testing it, just don't make it
# load-bearing for anything a user hits by default yet. AI-voice/AI-
# feedback-dependent pieces specifically (cantos/direct.py's converse(),
# ai_interpreter.py) stay unwired regardless of this flag — that's a
# separate, still-standing hold, not something this flag overrides.
CANTOS_ENABLED = _flag('FEATURE_CANTOS_ENABLED', default=False)

'''
Rate Limiter
Single shared Flask-Limiter instance for every Anthropic-backed route
(/veil/chat, /veil/revival/chat) — real cost/abuse protection, not just a
future scaling nice-to-have. Every call to either route is a real, billed
Anthropic request; nothing was stopping one caller from hitting either
route in a tight loop before this.

Lives in its own module (not api.py) specifically so veil_revival_routes.py
can import it too without a circular import — api.py already imports
veil_revival_bp FROM veil_revival_routes.py, so the reverse import would
cycle if the limiter lived in api.py itself.

Limits: "5 per minute; 20 per hour", per caller. Two tiers on purpose —
the per-minute limit catches a tight-loop script fast (the more realistic
"hammering" shape); the per-hour limit caps total worst-case cost per
caller regardless of how the requests are spaced out. Both apply
independently to /veil/chat and /veil/revival/chat — they're different
features, one hitting its limit shouldn't block the other.

Storage is in-memory (storage_uri="memory://"), matching the current
single-process gunicorn deployment (see api.py's own scaling notes on
worker count). IMPORTANT, same caveat as the phoneme/thesaurus/
concreteness caches: this means limits are tracked PER WORKER PROCESS,
not globally, the moment this ever moves to `gunicorn --workers 2+`. A
caller could then get roughly N times the effective limit by fanning
requests across N workers (whichever one handles a given request tracks
its own independent count). Fine for a single-worker deployment; revisit
with a shared backend (Flask-Limiter supports Redis directly) if/when
this actually scales to multiple workers — same "don't build the shared
layer speculatively" call as the caches, for the same reason.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

ANTHROPIC_ROUTE_LIMITS = "5 per minute;20 per hour"

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    default_limits=[],  # no default cap on routes that don't opt in explicitly
)

'''
Anthropic Circuit Breaker
Thread-safe circuit breaker shared by every route that calls the Anthropic
API (/veil/chat, /veil/revival/chat) — protects against hammering a
genuinely down/erroring Anthropic with every incoming request, each one
paying its own full timeout, during an outage.

This is deliberately separate from the rate limiter (rate_limiter.py):
the rate limiter protects cost/abuse from one caller sending too many
requests; this protects the app (and every OTHER caller) from Anthropic's
own health, independent of how many distinct callers there are — a single
well-behaved user can trip this just as easily as an abusive one, because
it has nothing to do with who's asking.

State machine, the standard three states:
  CLOSED     — normal. Every call proceeds to Anthropic.
  OPEN       — Anthropic has failed FAILURE_THRESHOLD times in a row.
               Calls are rejected immediately (CircuitOpenError), without
               ever reaching Anthropic, until COOLDOWN_SECONDS has passed.
  HALF-OPEN  — cooldown has elapsed. Exactly ONE request is allowed
               through as a trial (real thread-safety here: under
               concurrent load, only one of many simultaneous requests
               may claim the trial slot — the rest still see the circuit
               as open). If the trial succeeds, the circuit closes. If it
               fails, the circuit reopens and the cooldown restarts.

Why build this now rather than defer it (this was explicitly a judgment
call, not a requirement): it's genuinely cheap — no new dependency, no
external state, a few dozen lines — and it earns its place on its own:
without it, an Anthropic outage means every single user's request hangs
for a full timeout before failing, one at a time, for as long as the
outage lasts. With it, everyone after the first few failures gets an
immediate, honest "temporarily unavailable" instead of a slow failure.
That's a real reliability/UX improvement independent of cost, not just a
nice-to-have bolted onto the rate limiter.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import threading
import time
from contextlib import contextmanager

FAILURE_THRESHOLD = 3     # consecutive failures before the circuit opens
COOLDOWN_SECONDS = 45     # how long it stays open before allowing a trial

_lock = threading.Lock()
_consecutive_failures = 0
_opened_at = None          # time.monotonic() timestamp, or None if closed
_trial_in_flight = False   # True while a half-open trial request is in progress


class CircuitOpenError(Exception):
    '''Raised instead of ever attempting the Anthropic call while the
    circuit is open. retry_after is a best-effort seconds estimate.'''
    def __init__(self, retry_after):
        self.retry_after = max(0, retry_after)
        super().__init__(
            f'Anthropic circuit breaker is open — retry in about '
            f'{self.retry_after:.0f}s'
        )


def _claim_slot():
    '''
    Returns normally if this call may proceed. Raises CircuitOpenError if
    it must not. Runs entirely under the lock so the half-open trial slot
    can only ever be claimed by one caller, even under real concurrent load.
    '''
    global _trial_in_flight
    with _lock:
        if _opened_at is None:
            return  # closed — proceed
        elapsed = time.monotonic() - _opened_at
        remaining = COOLDOWN_SECONDS - elapsed
        if remaining > 0:
            raise CircuitOpenError(remaining)
        if _trial_in_flight:
            # cooldown has elapsed, but another request already claimed
            # the one trial slot — everyone else still sees it as open
            raise CircuitOpenError(0)
        _trial_in_flight = True  # this caller gets the trial


def _report_success():
    global _consecutive_failures, _opened_at, _trial_in_flight
    with _lock:
        _consecutive_failures = 0
        _opened_at = None
        _trial_in_flight = False


def _report_failure():
    global _consecutive_failures, _opened_at, _trial_in_flight
    with _lock:
        _trial_in_flight = False
        _consecutive_failures += 1
        if _consecutive_failures >= FAILURE_THRESHOLD:
            _opened_at = time.monotonic()


@contextmanager
def guard():
    '''
    Usage:
        with anthropic_circuit_breaker.guard():
            response = client.messages.create(...)

    Raises CircuitOpenError immediately (before the wrapped code runs at
    all) if the circuit is open. Otherwise runs the wrapped block and
    automatically records success or failure based on whether it raises —
    callers never need to remember to report the outcome themselves.
    '''
    _claim_slot()
    try:
        yield
    except Exception:
        _report_failure()
        raise
    else:
        _report_success()


def status():
    '''Read-only snapshot for tests/diagnostics — never used for the
    actual gating decision (that's _claim_slot, under the lock).'''
    with _lock:
        return {
            'closed': _opened_at is None,
            'consecutive_failures': _consecutive_failures,
            'opened_at': _opened_at,
        }


def _reset_for_tests():
    '''Test-only: force the circuit back to a clean closed state.'''
    global _consecutive_failures, _opened_at, _trial_in_flight
    with _lock:
        _consecutive_failures = 0
        _opened_at = None
        _trial_in_flight = False

'''
Tests for the rate limiter actually wired into /veil/chat and
/veil/revival/chat, through the real Flask app — not just the Limiter
object in isolation.

Uses intentionally-invalid request bodies (missing 'messages') so every
call 400s fast, without ever reaching the Anthropic client or spending a
real API call — Flask-Limiter counts each ATTEMPT against the budget
before the view body runs, so this validly exercises the rate limit
without needing to mock or actually call Anthropic.

Each test uses a fresh Flask app instance (app.test_client() reused
across tests would share one in-memory limiter bucket and make tests
order-dependent) — done by resetting the shared limiter's storage
between tests instead of re-importing the whole app.
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile

_tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
_tmp.close()
os.environ['PROSODIC_DB_PATH'] = _tmp.name

import api
from rate_limiter import limiter

client = api.app.test_client()
api.app.config['TESTING'] = True


def _reset_limiter():
    # Flask-Limiter's in-memory storage — cleared between tests so one
    # test's calls don't count against the next test's budget.
    limiter.storage.reset()


def test_requests_within_the_limit_are_not_rate_limited():
    _reset_limiter()
    for _ in range(4):  # under the 5/minute burst limit
        r = client.post('/veil/chat', json={})  # invalid body, 400s fast
        assert r.status_code == 400, 'should reach the view (fail validation), not get rate-limited yet'


def test_exceeding_the_per_minute_burst_limit_returns_429():
    _reset_limiter()
    statuses = [client.post('/veil/chat', json={}).status_code for _ in range(7)]
    assert 400 in statuses, 'the early requests should still reach the view'
    assert 429 in statuses, 'exceeding 5/minute should trip the limiter'
    # once limited, the response must be the clean JSON error, not a generic 429
    r = client.post('/veil/chat', json={})
    assert r.status_code == 429
    body = r.get_json()
    assert 'error' in body
    assert 'too many requests' in body['error'].lower()


def test_veil_chat_and_revival_chat_have_independent_limit_buckets():
    '''Hitting one Anthropic route's limit must not affect the other —
    they're different features with different usage patterns.'''
    _reset_limiter()
    for _ in range(6):
        client.post('/veil/chat', json={})  # exhausts /veil/chat's bucket

    r = client.post('/veil/revival/chat', json={})
    assert r.status_code != 429, (
        '/veil/revival/chat must have its own independent limit bucket, '
        'not share /veil/chat\'s'
    )


def test_other_routes_are_not_rate_limited():
    '''The limiter is scoped to the Anthropic-backed routes only — a burst
    of /health calls (or any non-LLM route) must never be rate-limited.'''
    _reset_limiter()
    statuses = [client.get('/health').status_code for _ in range(30)]
    assert all(s == 200 for s in statuses), (
        f'non-LLM routes must never be rate-limited: {statuses}'
    )

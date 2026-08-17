'''
Tests for veil_revival_routes.py's actual /veil/revival/chat logic —
success, not-configured, circuit-open, and generic-failure paths.

Found genuinely uncovered while verifying the AI provider abstraction
refactor (this route used to construct anthropic.Anthropic inline;
now goes through infrastructure/ai_providers/): the only existing test
touching this route (test_rate_limiter.py) uses invalid payloads that
400 before ever reaching the Anthropic-calling code, so none of these
paths had a real test before this file, refactor or not. Closing that
gap here rather than leaving it — same standard as writing the
concurrency/rate-limiter/circuit-breaker tests earlier this session.
'''
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile

_tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
_tmp.close()
os.environ['PROSODIC_DB_PATH'] = _tmp.name

import pytest
import api
from rate_limiter import limiter
import infrastructure.ai_providers.claude_provider as claude_provider
import infrastructure.ai_providers.circuit_breaker as circuit_breaker

client = api.app.test_client()
api.app.config['TESTING'] = True


class _FakeBlock:
    def __init__(self, text):
        self.text = text


class _FakeResponse:
    def __init__(self, text):
        self.content = [_FakeBlock(text)] if text is not None else []


class _FakeMessages:
    def __init__(self, text=None, exc=None):
        self._text = text
        self._exc = exc

    def create(self, **kwargs):
        if self._exc:
            raise self._exc
        return _FakeResponse(self._text)


class _FakeClient:
    def __init__(self, text=None, exc=None):
        self.messages = _FakeMessages(text=text, exc=exc)


@pytest.fixture(autouse=True)
def _isolate():
    limiter.storage.reset()
    circuit_breaker._reset_for_tests()
    yield
    circuit_breaker._reset_for_tests()


def _request(note_title='My Idea', note_body='half a verse about the city', messages=None):
    return client.post('/veil/revival/chat', json={
        'note': {'title': note_title, 'body': note_body},
        'messages': messages or [],
    })


def test_successful_reply(monkeypatch):
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic',
                         lambda **kwargs: _FakeClient(text='What made you start this one?'))
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key-for-testing')

    r = _request()
    assert r.status_code == 200
    body = r.get_json()
    assert body['reply'] == 'What made you start this one?'
    assert body['note_type'] is None


def test_no_api_key_returns_service_unavailable(monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY', raising=False)

    r = _request()
    assert r.status_code == 503
    assert r.get_json()['error'] == 'VEIL service unavailable'


def test_circuit_open_returns_temporarily_unavailable_message(monkeypatch):
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic',
                         lambda **kwargs: _FakeClient(exc=RuntimeError('down')))
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key-for-testing')

    # trip the shared circuit breaker
    for _ in range(circuit_breaker.FAILURE_THRESHOLD):
        _request()

    r = _request()
    assert r.status_code == 503
    assert 'temporarily unavailable' in r.get_json()['error'].lower()


def test_generic_failure_returns_clean_500(monkeypatch):
    # A failure that ISN'T a circuit-open rejection (single failure,
    # circuit still closed) — should surface as the route's own
    # generic "try again" message, not a raw exception.
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic',
                         lambda **kwargs: _FakeClient(exc=RuntimeError('one-off glitch')))
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key-for-testing')

    r = _request()
    assert r.status_code == 500
    assert r.get_json()['error'] == 'Revival session failed. Try again.'


def test_empty_messages_sends_the_opening_prompt(monkeypatch):
    captured = {}

    class _CapturingMessages:
        def create(self, **kwargs):
            captured.update(kwargs)
            return _FakeResponse('Sure, tell me more.')

    class _CapturingClient:
        def __init__(self, **kwargs):
            self.messages = _CapturingMessages()

    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic', lambda **kwargs: _CapturingClient())
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key-for-testing')

    r = _request(messages=[])
    assert r.status_code == 200
    assert captured['messages'] == [{'role': 'user', 'content': 'Please begin the revival session.'}]
    assert captured['max_tokens'] == 512

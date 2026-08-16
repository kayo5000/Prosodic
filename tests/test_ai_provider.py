'''
Tests for the AI provider abstraction itself (domain/ai_provider.py,
infrastructure/ai_providers/*) — not covered directly by the four call-
site test files (test_cantos_direct.py etc. exercise ClaudeProvider only
indirectly, through cantos/direct.py's converse()).
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from domain.ai_provider import (
    AIMessage, ReasoningRequest,
    AIProviderError, AIProviderUnavailableError, AIProviderNotConfiguredError,
    AIProviderNotImplementedError,
)
from infrastructure.ai_providers import get_provider
from infrastructure.ai_providers.claude_provider import ClaudeProvider
from infrastructure.ai_providers.gemini_provider import GeminiProvider
from infrastructure.ai_providers.openai_provider import OpenAIProvider
import infrastructure.ai_providers.claude_provider as claude_provider
import infrastructure.ai_providers.circuit_breaker as circuit_breaker
import infrastructure.ai_providers.factory as factory


@pytest.fixture(autouse=True)
def _reset_circuit_and_cache():
    circuit_breaker._reset_for_tests()
    factory._instances.clear()  # each test gets a fresh provider instance
    yield
    circuit_breaker._reset_for_tests()
    factory._instances.clear()


# ── Exception hierarchy ──────────────────────────────────────────────────

def test_not_configured_is_a_kind_of_unavailable():
    # A caller that only catches AIProviderUnavailableError should still
    # catch the not-configured case — that's the point of the subclass.
    assert issubclass(AIProviderNotConfiguredError, AIProviderUnavailableError)
    assert issubclass(AIProviderUnavailableError, AIProviderError)
    assert issubclass(AIProviderNotImplementedError, AIProviderError)


# ── Stub providers — real class, real signature, obviously not live ─────

@pytest.mark.parametrize('provider_cls,name', [(GeminiProvider, 'gemini'), (OpenAIProvider, 'openai')])
def test_stub_providers_reject_every_capability(provider_cls, name):
    provider = provider_cls()
    assert provider.name == name
    req = ReasoningRequest(messages=[AIMessage(role='user', content='hi')])
    with pytest.raises(AIProviderNotImplementedError):
        provider.get_reasoning(req)
    with pytest.raises(AIProviderNotImplementedError):
        provider.generate_image(None)
    with pytest.raises(AIProviderNotImplementedError):
        provider.analyze_audio(None)


def test_stub_providers_import_no_vendor_sdk():
    '''The whole point of a stub — confirm no google-generativeai/openai
    dependency is even importable as an attribute of these modules.'''
    import infrastructure.ai_providers.gemini_provider as gemini_module
    import infrastructure.ai_providers.openai_provider as openai_module
    assert not hasattr(gemini_module, 'genai') and not hasattr(gemini_module, 'google')
    assert not hasattr(openai_module, 'openai')


# ── ClaudeProvider — the live one ────────────────────────────────────────

def test_claude_not_configured_without_api_key(monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY', raising=False)
    provider = ClaudeProvider()
    with pytest.raises(AIProviderNotConfiguredError):
        provider.get_reasoning(ReasoningRequest(messages=[AIMessage(role='user', content='hi')]))


def test_claude_rejects_image_and_audio():
    provider = ClaudeProvider()
    with pytest.raises(AIProviderNotImplementedError):
        provider.generate_image(None)
    with pytest.raises(AIProviderNotImplementedError):
        provider.analyze_audio(None)


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
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._exc:
            raise self._exc
        return _FakeResponse(self._text)


class _FakeClient:
    def __init__(self, text=None, exc=None):
        self.messages = _FakeMessages(text=text, exc=exc)


def test_claude_get_reasoning_success(monkeypatch):
    fake = _FakeClient(text='a real reply')
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic', lambda **kwargs: fake)
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key')

    provider = ClaudeProvider()
    result = provider.get_reasoning(ReasoningRequest(
        messages=[AIMessage(role='user', content='hello')],
        system='be helpful',
        max_tokens=123,
    ))
    assert result.text == 'a real reply'
    assert result.provider == 'claude'
    assert result.model == claude_provider.DEFAULT_MODEL

    # the actual vendor call received exactly what the request asked for
    call = fake.messages.calls[0]
    assert call['max_tokens'] == 123
    assert call['system'] == 'be helpful'
    assert call['messages'] == [{'role': 'user', 'content': 'hello'}]


def test_claude_get_reasoning_empty_content_returns_empty_string(monkeypatch):
    '''Only one of the four original call sites guarded against an empty
    response.content — applying that more defensive behavior to
    everyone through the shared adapter (see claude_provider.py).'''
    fake = _FakeClient(text=None)  # empty content
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic', lambda **kwargs: fake)
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key')

    provider = ClaudeProvider()
    result = provider.get_reasoning(ReasoningRequest(messages=[AIMessage(role='user', content='hi')]))
    assert result.text == ''


def test_claude_wraps_vendor_exception_as_ai_provider_error(monkeypatch):
    fake = _FakeClient(exc=RuntimeError('network down'))
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic', lambda **kwargs: fake)
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key')

    provider = ClaudeProvider()
    with pytest.raises(AIProviderError):
        provider.get_reasoning(ReasoningRequest(messages=[AIMessage(role='user', content='hi')]))


def test_claude_circuit_open_raises_unavailable(monkeypatch):
    '''Force the shared circuit breaker open (3 consecutive failures),
    then confirm the NEXT call fails fast as AIProviderUnavailableError
    without ever reaching the fake client again.'''
    fake = _FakeClient(exc=RuntimeError('down'))
    monkeypatch.setattr(claude_provider.anthropic, 'Anthropic', lambda **kwargs: fake)
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key')

    provider = ClaudeProvider()
    req = ReasoningRequest(messages=[AIMessage(role='user', content='hi')])
    for _ in range(circuit_breaker.FAILURE_THRESHOLD):
        with pytest.raises(AIProviderError):
            provider.get_reasoning(req)

    calls_before = len(fake.messages.calls)
    with pytest.raises(AIProviderUnavailableError):
        provider.get_reasoning(req)
    # the circuit rejected this call before ever reaching the vendor call
    assert len(fake.messages.calls) == calls_before


# ── factory ───────────────────────────────────────────────────────────────

def test_get_provider_defaults_to_claude(monkeypatch):
    monkeypatch.delenv('AI_PROVIDER', raising=False)
    assert isinstance(get_provider(), ClaudeProvider)


def test_get_provider_returns_the_same_cached_instance():
    a = get_provider('claude')
    b = get_provider('claude')
    assert a is b


def test_get_provider_unknown_name_raises():
    with pytest.raises(ValueError):
        get_provider('made-up-vendor')


def test_get_provider_gemini_and_openai_resolve_to_stubs():
    assert isinstance(get_provider('gemini'), GeminiProvider)
    assert isinstance(get_provider('openai'), OpenAIProvider)

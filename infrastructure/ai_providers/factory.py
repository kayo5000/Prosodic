"""
infrastructure/ai_providers/factory.py

The single place that decides which AIProvider implementation actually
runs. Every AI-backed feature in this app should get its provider
instance from get_provider(), never construct ClaudeProvider/
GeminiProvider/OpenAIProvider directly — that way, changing the default
(or making it configurable per-environment later) is a one-line change
here, not a hunt across every call site.

Providers are cached per name (a plain module-level dict, not a class-
based singleton pattern — there's no state worth over-engineering here).
Safe to cache: ClaudeProvider itself holds no per-instance state tied to
credentials (see claude_provider.py's own docstring on why client
construction is per-call, not per-instance) — caching the PROVIDER
object is just avoiding a trivial reallocation, not caching anything
that could go stale.
"""
import os

from infrastructure.ai_providers.claude_provider import ClaudeProvider
from infrastructure.ai_providers.gemini_provider import GeminiProvider
from infrastructure.ai_providers.openai_provider import OpenAIProvider

_PROVIDERS = {
    'claude': ClaudeProvider,
    'gemini': GeminiProvider,
    'openai': OpenAIProvider,
}

_instances = {}


def get_provider(name=None):
    """Returns a shared AIProvider instance. `name` defaults to the
    AI_PROVIDER env var, or 'claude' if that's unset — Claude is the
    only live provider today, this default is not a coincidence.
    Raises ValueError for an unknown name rather than silently falling
    back to something else."""
    name = name or os.environ.get('AI_PROVIDER', 'claude')
    if name not in _PROVIDERS:
        raise ValueError(f"Unknown AI provider '{name}'. Known: {sorted(_PROVIDERS)}")
    if name not in _instances:
        _instances[name] = _PROVIDERS[name]()
    return _instances[name]

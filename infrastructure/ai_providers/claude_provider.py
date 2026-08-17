"""
infrastructure/ai_providers/claude_provider.py

The one LIVE AI provider adapter. Wraps anthropic.Anthropic — this is the
only file in the app allowed to import the anthropic SDK directly
(besides circuit_breaker.py in this same package, which is vendor-
agnostic in its own implementation despite living here for anthropic).

Extracted, not rewritten, from four call sites that each independently
called anthropic.Anthropic(...).messages.create(...) before this reorg:
  - api.py's /veil/chat
  - veil_revival_routes.py's /veil/revival/chat
  - behavior/ai_interpreter.py's interpret()
  - cantos/direct.py's converse()
Same models, same max_tokens per call site (the CALLER decides these via
ReasoningRequest — this file doesn't hardcode a single model/token
budget for everyone), same circuit-breaker protection. Verified
behavior-preserving by reading each call site's exact original
parameters before writing this file, not from memory — see
docs/APP_UPDATE.md for the verification trail.

One real, disclosed behavior change: two of the four original call
sites (ai_interpreter.py, cantos/direct.py) had ZERO circuit-breaker
protection before this reorg — every call site that now goes through
get_reasoning() gets it automatically, sharing the same global circuit
as the two that already had it. This was already flagged as a real gap
in docs/ARCHITECTURE.md before this reorg closed it.

Client construction is deliberately per-call, not cached at __init__ —
matches ai_interpreter.py's and cantos/direct.py's original pattern
(constructing a fresh anthropic.Anthropic(api_key=...) every call), and
critically means a test that monkeypatches ANTHROPIC_API_KEY or
anthropic.Anthropic mid-suite takes effect immediately, even though a
ClaudeProvider instance itself is a cached singleton (see factory.py).
Constructing an Anthropic client is a cheap, local, non-network
operation — this costs nothing measurable per call.
"""
import os

import anthropic

from domain.ai_provider import (
    AIProvider,
    ReasoningRequest, ReasoningResult,
    ImageRequest, ImageResult,
    AudioAnalysisRequest, AudioAnalysisResult,
    AIProviderError, AIProviderUnavailableError, AIProviderNotConfiguredError,
    AIProviderNotImplementedError,
)
from infrastructure.ai_providers.circuit_breaker import guard, CircuitOpenError

# Was hardcoded independently in 4 places before this reorg (api.py,
# veil_revival_routes.py literal strings; ai_interpreter.py's _MODEL,
# reused by cantos/direct.py) — all four used the exact same string, so
# collecting it here doesn't change behavior anywhere, just removes 3
# duplicate copies of one fact.
DEFAULT_MODEL = 'claude-sonnet-4-6'


class ClaudeProvider(AIProvider):
    name = 'claude'

    def get_reasoning(self, request: ReasoningRequest) -> ReasoningResult:
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise AIProviderNotConfiguredError('ANTHROPIC_API_KEY not set')

        client = anthropic.Anthropic(api_key=api_key)
        model = request.model or DEFAULT_MODEL

        try:
            with guard():
                response = client.messages.create(
                    model=model,
                    max_tokens=request.max_tokens,
                    system=request.system if request.system is not None else '',
                    messages=[{'role': m.role, 'content': m.content} for m in request.messages],
                )
                # Guards an edge case only ONE of the four original call
                # sites (veil_revival_routes.py) actually handled — an
                # empty response.content. Applying the more defensive of
                # the two original behaviors to everyone through this
                # shared adapter, rather than preserving the
                # inconsistency (a real, disclosed improvement, not
                # invented scope — see docs/APP_UPDATE.md).
                #
                # response.content[0] is typed as a union of every Anthropic
                # content-block type (TextBlock, ThinkingBlock, ToolUseBlock,
                # ...) — only TextBlock has .text. No call site here ever
                # requests extended thinking or tool use, so in practice
                # it's always a TextBlock, but that's an assumption about
                # today's callers, not a guarantee the SDK's own types make.
                # Checked explicitly rather than asserted, so a genuinely
                # unexpected block type fails loud (a clear AIProviderError)
                # instead of either a silent wrong value or an
                # AttributeError leaking a vendor type past this adapter.
                block = response.content[0] if response.content else None
                if block is not None and not hasattr(block, 'text'):
                    raise AIProviderError(
                        f'Unexpected Anthropic response block type: {type(block).__name__} '
                        '(expected a text block — no call site requests thinking or tool use)'
                    )
                text = block.text if block is not None else ''
        except CircuitOpenError as e:
            raise AIProviderUnavailableError(str(e), retry_after=e.retry_after) from e
        except Exception as e:
            # Deliberately broad, not just anthropic.APIError — nothing
            # vendor-specific should ever escape this adapter. Callers
            # that used to distinguish anthropic.APIError from a fully
            # generic failure (api.py's /veil/chat: 502 vs 500) now both
            # land on AIProviderError (502) — see docs/APP_UPDATE.md for
            # the one narrow, disclosed status-code nuance this creates.
            raise AIProviderError(str(e)) from e

        return ReasoningResult(text=text, provider=self.name, model=model)

    def generate_image(self, request: ImageRequest) -> ImageResult:
        raise AIProviderNotImplementedError(
            'Claude (Anthropic) does not offer image generation as a vendor capability.'
        )

    def analyze_audio(self, request: AudioAnalysisRequest) -> AudioAnalysisResult:
        raise AIProviderNotImplementedError(
            'Not wired for Claude — no live feature needs audio analysis yet.'
        )

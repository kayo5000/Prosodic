"""
infrastructure/ai_providers/gemini_provider.py

STUB — not live. No google-generativeai dependency is installed or
imported anywhere in this file, on purpose. Real class, real signature,
conforms to the same AIProvider interface every other provider does, so
selecting it via factory.get_provider('gemini') works structurally —
every method just raises AIProviderNotImplementedError, clearly, instead
of silently doing nothing or crashing with an unrelated ImportError deep
in some call stack.

Why build the stub now rather than wait: so nothing in the app ever
needs to know whether a provider is real or not — get_provider('gemini')
looks and behaves identically whether Gemini is live or not, from the
caller's point of view (it just gets a clear, typed exception instead of
silence). Why NOT wire it for real yet: no live feature in this app
needs Gemini specifically (no music-audio reasoning feature exists) —
adding a second paid vendor account before there's something real
consuming it is cost/scope this app doesn't need today. See README.md
in this directory for the concrete trigger to change that.

When that day comes: add `google-generativeai` to requirements.txt,
get a real API key from Khris, implement get_reasoning() (and/or
generate_image()/analyze_audio(), whichever capability the real feature
actually needs) for real here, following the exact same pattern
claude_provider.py already establishes — never touch domain/ai_provider.py
itself for this, the interface is already provider-agnostic.
"""
from domain.ai_provider import (
    AIProvider,
    ReasoningRequest, ReasoningResult,
    ImageRequest, ImageResult,
    AudioAnalysisRequest, AudioAnalysisResult,
    AIProviderNotImplementedError,
)

_NOT_LIVE = (
    'Gemini is not a live provider yet — no google-generativeai dependency '
    'is installed. This is a structured stub (see infrastructure/ai_providers/'
    'README.md). Wire it for real when a feature actually needs Gemini '
    'specifically.'
)


class GeminiProvider(AIProvider):
    name = 'gemini'

    def get_reasoning(self, request: ReasoningRequest) -> ReasoningResult:
        raise AIProviderNotImplementedError(_NOT_LIVE)

    def generate_image(self, request: ImageRequest) -> ImageResult:
        raise AIProviderNotImplementedError(_NOT_LIVE)

    def analyze_audio(self, request: AudioAnalysisRequest) -> AudioAnalysisResult:
        raise AIProviderNotImplementedError(_NOT_LIVE)

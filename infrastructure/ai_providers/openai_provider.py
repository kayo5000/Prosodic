"""
infrastructure/ai_providers/openai_provider.py

STUB — not live. No openai dependency is installed or imported anywhere
in this file, on purpose. Same reasoning and same pattern as
gemini_provider.py in this same directory — read that file's docstring
for the full explanation, not repeated here.

When a real feature needs OpenAI specifically: add `openai` to
requirements.txt, get a real API key from Khris, implement the actual
capability here following claude_provider.py's pattern.
"""
from domain.ai_provider import (
    AIProvider,
    ReasoningRequest, ReasoningResult,
    ImageRequest, ImageResult,
    AudioAnalysisRequest, AudioAnalysisResult,
    AIProviderNotImplementedError,
)

_NOT_LIVE = (
    'OpenAI is not a live provider yet — no openai dependency is installed. '
    'This is a structured stub (see infrastructure/ai_providers/README.md). '
    'Wire it for real when a feature actually needs OpenAI specifically.'
)


class OpenAIProvider(AIProvider):
    name = 'openai'

    def get_reasoning(self, request: ReasoningRequest) -> ReasoningResult:
        raise AIProviderNotImplementedError(_NOT_LIVE)

    def generate_image(self, request: ImageRequest) -> ImageResult:
        raise AIProviderNotImplementedError(_NOT_LIVE)

    def analyze_audio(self, request: AudioAnalysisRequest) -> AudioAnalysisResult:
        raise AIProviderNotImplementedError(_NOT_LIVE)

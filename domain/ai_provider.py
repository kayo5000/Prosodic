"""
domain/ai_provider.py

The AI provider PORT — a Clean Architecture interface between the app's
actual reasoning needs (VEIL chat, structured-data interpretation, Cantos
Direct mode's conversational path) and whichever vendor happens to serve
them. Nothing outside infrastructure/ai_providers/ should import
anthropic, openai, or google.generativeai directly — everything talks to
THIS interface instead. Zero framework/vendor imports in this file, by
design — that's what makes it the innermost layer.

Three capabilities, named for what they DO rather than what any one
vendor calls them:
  - get_reasoning()   — text in, text out. What VEIL, ai_interpreter,
                         and Cantos Direct mode actually use TODAY.
  - generate_image()  — prompt in, image out. No live feature needs
                         this yet.
  - analyze_audio()   — audio in, structured analysis out. No live
                         feature needs this yet either.

Provider status (see infrastructure/ai_providers/README.md for the
full, current-as-of-build breakdown):
  - Claude  — LIVE. get_reasoning() is real. generate_image()/
              analyze_audio() raise AIProviderNotImplementedError —
              Anthropic doesn't offer either as a vendor capability at
              all, live or not.
  - Gemini  — STUB. Every method raises AIProviderNotImplementedError.
              Real class, real signature, no google-generativeai
              dependency installed or imported.
  - OpenAI  — STUB. Same as Gemini, no openai dependency installed or
              imported.

Wiring a stub for real is triggered by an actual feature needing that
specific vendor's capability — not a scope decision made speculatively
here. When that happens: get a real API key from Khris then, not before.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Literal, Optional


# ── Value objects ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class AIMessage:
    """One turn in a reasoning conversation."""
    role: Literal['user', 'assistant']
    content: str


@dataclass(frozen=True)
class ReasoningRequest:
    messages: List[AIMessage]
    system: Optional[str] = None
    max_tokens: int = 1024
    model: Optional[str] = None  # None = the provider's own current default


@dataclass(frozen=True)
class ReasoningResult:
    text: str
    provider: str
    model: str


@dataclass(frozen=True)
class ImageRequest:
    prompt: str
    size: Optional[str] = None


@dataclass(frozen=True)
class ImageResult:
    image_url: Optional[str]
    provider: str


@dataclass(frozen=True)
class AudioAnalysisRequest:
    audio_bytes: bytes
    mime_type: str = 'audio/mpeg'
    prompt: Optional[str] = None


@dataclass(frozen=True)
class AudioAnalysisResult:
    analysis: dict
    provider: str


# ── Exceptions — the ONLY exception types a caller of AIProvider should ──
# ── ever need to catch. A conforming adapter never lets a vendor-specific ─
# ── exception (anthropic.APIError, openai.APIError, ...) escape past its ─
# ── own module — it translates into one of these instead.                ─

class AIProviderError(Exception):
    """Base class for anything an AI provider adapter raises."""


class AIProviderUnavailableError(AIProviderError):
    """The provider is temporarily unavailable — rate-limited upstream,
    circuit open, a live outage. Retrying shortly is reasonable. Maps to
    a 503 at the route layer."""
    def __init__(self, message, retry_after=None):
        super().__init__(message)
        self.retry_after = retry_after


class AIProviderNotConfiguredError(AIProviderUnavailableError):
    """No API key / credentials available for this provider. A subclass
    of AIProviderUnavailableError (both mean 'can't serve this request
    right now'), kept distinct so a caller that wants a different
    message for 'never configured' vs. 'temporarily down' still can —
    catch this one first if that distinction matters to you."""


class AIProviderNotImplementedError(AIProviderError):
    """Raised by a stub provider, or a real provider's unimplemented
    capability (e.g. Claude has no image generation). This is a real,
    structured signal — a build-time/config mistake (calling a
    capability nothing ever wired), not a runtime fluke like the two
    above. Don't catch-and-retry this one; fix the caller."""


# ── The port itself ──────────────────────────────────────────────────────

class AIProvider(ABC):
    """Every AI-backed feature in this app should depend on THIS,
    never a concrete vendor SDK directly."""

    name: str  # 'claude' | 'gemini' | 'openai'

    @abstractmethod
    def get_reasoning(self, request: ReasoningRequest) -> ReasoningResult:
        """Text conversation/completion."""
        raise NotImplementedError

    @abstractmethod
    def generate_image(self, request: ImageRequest) -> ImageResult:
        """No live feature calls this yet."""
        raise NotImplementedError

    @abstractmethod
    def analyze_audio(self, request: AudioAnalysisRequest) -> AudioAnalysisResult:
        """No live feature calls this yet."""
        raise NotImplementedError

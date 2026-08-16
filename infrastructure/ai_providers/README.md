# AI Providers

One interface (`domain/ai_provider.py`), three provider classes here. Status, kept current:

| Provider | File | Status | What works |
|---|---|---|---|
| **Claude** | `claude_provider.py` | **LIVE** | `get_reasoning()` — real, wraps `anthropic.Anthropic`, circuit-breaker protected. `generate_image()`/`analyze_audio()` raise `AIProviderNotImplementedError` — Anthropic doesn't offer either as a vendor capability at all, live or not. |
| **Gemini** | `gemini_provider.py` | **STUB** | Every method raises `AIProviderNotImplementedError`. No `google-generativeai` dependency installed or imported anywhere in the file. |
| **OpenAI** | `openai_provider.py` | **STUB** | Every method raises `AIProviderNotImplementedError`. No `openai` dependency installed or imported anywhere in the file. |

## Why Gemini/OpenAI are stubs, not live

No feature in this app currently needs music-audio reasoning or image generation — the only real, live AI usage anywhere is text reasoning (VEIL chat, VEIL Revival, the structured-data interpreter, Cantos Direct mode's conversational path), and Claude already does that well. Wiring two new paid vendor accounts before there's a concrete feature consuming them is cost and scope this app doesn't need yet.

**The trigger to wire one for real: a specific feature that needs that specific vendor's capability.** Not "it would be nice to have options" — a real, named feature. When that happens:

1. Add the vendor's SDK to `requirements.txt`.
2. Get a real API key from Khris — don't assume a pricing tier or sign up for anything.
3. Implement the actual capability in that provider's file, following `claude_provider.py`'s pattern exactly (translate every vendor-specific exception into the shared `domain/ai_provider.py` exception types — never let a vendor exception escape this package).
4. Never touch `domain/ai_provider.py` itself for this — the interface is already provider-agnostic; only the adapter changes.

## Who calls this

Every AI-backed call site in the app goes through `infrastructure.ai_providers.get_provider()`, never a vendor SDK directly:

- `api.py` — `/veil/chat`
- `veil_revival_routes.py` — `/veil/revival/chat`
- `behavior/ai_interpreter.py` — `interpret()`
- `cantos/direct.py` — `converse()`

All four currently resolve to `ClaudeProvider` (the default). Switching the app-wide default provider — if that's ever a real need — is a one-line change in `factory.py`, not a hunt across these four files.

## Circuit breaker

`circuit_breaker.py` in this same directory (moved here from root `anthropic_circuit_breaker.py`) is shared, global state — every call through `ClaudeProvider.get_reasoning()` trips the same circuit, regardless of which of the four call sites above made the call. That's deliberate: it protects against Anthropic's own health, not any one caller's behavior. See the file's own docstring for the full state-machine explanation.

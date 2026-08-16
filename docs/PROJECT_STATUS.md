# Prosodic — Project Status

Honest current-state snapshot, verified against code as of 2026-08-16, not carried forward from older docs without checking. Where an older doc's finding has since been fixed, that's stated explicitly rather than silently dropped.

---

## What's built and working

### Backend — live analysis pipeline (`/analyze`, `/suggest`)

Real engines, all reachable from the live request path, all with test coverage:

`phoneme_engine.py` (CMU/G2P phoneme lookup + rhyme scoring) · `normalization_engine.py` (text canonicalization) · `syllable_engine.py` (syllable segmentation + stress) · `rhyme_detection_engine.py` (union-find rhyme grouping) · `motif_engine.py` (color-family assignment) · `density_engine.py` (internal/multisyllabic/motif density) · `pocket_engine.py` (16-step beat grid placement — genuinely tempo-aware now, see "Recently fixed" below) · `performed_stress.py` / `stress_signals.py` (lexical-vs-performed stress) · `phrase_container_engine.py` (compositional boundary detection, with confidence) · `perceptual_family_engine.py` / `pattern_reader_engine.py` (two-layer sonic family tagging) · `semantics_engine.py` (spaCy word-vector similarity, degrades gracefully without it) · `thesaurus_engine.py` (Moby Thesaurus lookup) · `concreteness_engine.py` (Brysbaert concreteness norms) · `suggestion_engine.py` (rhyme suggestion ranking) · `final_result_converter.py` (scale/polarity normalization layer) · `feedback_engine.py` (assembles everything above into the `/analyze` response).

### Backend — auth, VEIL, safety infrastructure

- JWT auth (`/auth/register`, `/auth/login`, `/auth/me`, `/auth/update`) via `users_repository.py`. Tokens valid 30 days (bumped from 1 hour tonight — see "Recently fixed").
- VEIL chat (`/veil/chat`, `/veil/revival/chat`) — real Anthropic-backed craft mentor, grounded in real thesaurus lookups for word-choice discussion rather than letting the model invent synonyms.
- Rate limiting (Flask-Limiter, 5/min + 20/hour per IP) and a circuit breaker (`anthropic_circuit_breaker.py`, opens after 3 consecutive Anthropic failures, 45s cooldown) on both Anthropic-backed routes — real cost/abuse protection, not just a try/except.
- 7 modules that used to hold a thread-local SQLite connection open forever (never explicitly closed) converted to safe-under-concurrency patterns, verified with real multi-threaded load tests (`tests/test_thread_local_connections_concurrency.py`), not just "runs once cleanly."

### Mobile app (`mobile/`) — React Native + Expo

Three real tabs, all talking to the live backend, not mocked:
- **Analyze** — verse + BPM in, color-coded rhyme map + ranked suggestions out.
- **Chat** — VEIL, full conversation history resent per turn (matches the backend's stateless contract), surfaces real rate-limit/circuit-breaker error strings instead of a generic failure.
- **Profile** — login/register/logout, JWT persisted via `expo-secure-store`.

Currently in Expo dev-preview stage (scan a QR code with Expo Go), not a store build — see "Not built" below.

### Testing

368 tests, golden-master regression coverage on the live pipeline (`tests/golden_master.py` — see `CLAUDE.md`), real concurrency tests, real end-to-end smoke tests against both a local server and the deployed Railway backend performed this session (not just unit-level).

---

## Explicitly not built / placeholder

- **`/mastery` endpoint and the mobile Mastery tab.** `/mastery` deliberately returns `{'ready': False, 'reason': ...}` instead of quietly calling `mastery_engine.py` (which is real, tested, 649 lines) — `mastery_engine.py` needs a `song_id`/song-identity concept that exists nowhere else in the app. No mobile screen was built against this for the same reason: nothing to build against yet. This is a deliberate "don't half-wire it" call, not an oversight.
- **Cantos + the behavioral layer are real but only reach 1 of ~21 engines.** `cantos/wiring.py` chains `bar_segmenter` → `bar_feature_mapper` → `behavior/state_engine.py` → a real Notebook Entry — genuinely wired and tested end-to-end. But that's one classification engine; the other ~20 analysis engines (motif, density, pocket, etc.) feed into it as raw inputs, not as their own individually-surfaced Cantos signals. Sits behind `FEATURE_CANTOS_ENABLED` (default off). Wiring the rest is its own session's worth of work, not started.
- **`cantos/direct.py`'s `converse()` and `behavior/ai_interpreter.py`** (LLM-backed features) are built and tested but deliberately held back from any default/live path per a standing instruction — not reachable from any route today.
- **App Store / Play Store accounts.** Neither exists yet. Apple Developer Program ($99/yr) and Google Play Console ($25 one-time) are only needed for real store submission, not for anything currently running.
- **No `README.md` at project root.** Known gap, not part of this doc pass (see `CLAUDE.md` for orientation instead).
- **ML models are rule-based stubs.** `ml_interface.py`/`model_registry.py` provide hot-swap infrastructure; no trained `.pt` files exist anywhere. The training-data pipeline (`feature_store.py`, `telemetry.py`, `fingerprint_pipeline.py`) is complete — models are the missing piece.

---

## Known open issues

- **Idempotency gap, confirmed still open.** `learning_engine.record_signal()` uses `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1` — resubmitting the identical correction (e.g. a client retry after a dropped response) increments the count again. No request-level dedup key exists anywhere in the app. Same gap in `usage_history.py`.
- **No custom exception hierarchy.** The whole codebase is consistently `except Exception`/`except sqlite3.Error` with `str(e)` messages — verified by grep, only one custom exception exists anywhere (`anthropic_circuit_breaker.CircuitOpenError`, added tonight, purpose-built for that one module). A real hierarchy is a large, cross-cutting refactor, flagged rather than half-done.
- **`suggestion_engine.py` is both encoder and decoder in one file.** It does real candidate generation (Layer 1 phonetic filter, Layer 2 thesaurus composite, target-word override) *and* its return value ships directly as the `/suggest` response, in the same module. Structurally the same shape `feedback_engine.py` avoids by staying a pure aggregator. Not fixed — would mean splitting into a candidate-generation module + a response-shaping module.
- **`cantos/wiring.py`'s public `record_state_snapshot(user_id, session_id, verse_text, bpm)` still takes a bare `bpm`, not `SongContext`.** It correctly wraps it in `SongContext(bpm=bpm)` one level inside before calling `assemble_feedback`, so nothing is functionally wrong — but the signature itself is a real, narrow instance of the exact "asks for BPM directly" pattern the rest of the pipeline was refactored away from.
- **Single-writer-principle violation, `mastery_engine.py` + `feature_store.py`.** Same root cause as the `/mastery` placeholder above — six tables get written to correctly, nothing reads them back into a real feature because the `song_id` concept doesn't exist. Not a bug in either module; the gap is upstream of both.
- **`_suggestion_cache` global in `suggestion_engine.py`** — a cross-user cache leak flagged in an earlier audit, still open, needs a design decision on the fix approach (not just a quick patch).

### Recently fixed (don't rediscover these)

- **`pocket_engine.py`'s "liar" smell (name implies tempo-relative timing; the math used to be tempo-blind) is fixed**, not still open. It now imports `available_syllable_slots` from `syllable_compression.py` and uses a genuinely tempo-adjusted grid span — confirmed by reading current source, not assumed from an older audit. The two leaf functions (`map_line_to_pocket`, `enrich_stream_with_pocket`) still take a bare `bpm` parameter, but it's real and load-bearing now, not the dead parameter an earlier audit flagged.
- **JWT expiry was 1 hour, now 30 days** — fine for a web tab someone re-logs into, bad for a mobile app that would drop a signed-in user mid-session. No refresh-token flow exists; this is a pragmatic stopgap, not the long-term fix.
- **The old web frontend is gone.** Deleted outright (commit `543c8e1`), not archived, per explicit instruction — mobile is the only client now. The Prosodic logo was recovered from git history before it was gone for good and is now the mobile app's icon/splash.

---

## Deployment, right now

- **Backend: live on Railway**, `https://prosodic-production.up.railway.app` — verified this session with a real `POST /analyze` request against it, not just a health-check ping.
- **Persistence state on Railway is not fully confirmed from this side.** Earlier work added a volume and set `PROSODIC_DB_PATH` via the dashboard (a manual step, not code), and the backend is confirmed live and responding — but a from-scratch "redeploy and prove data survives a redeploy" check hasn't been completed, and this session has no authenticated Railway CLI access to inspect current dashboard state directly. Treat persistence as "should be configured" rather than "proven" until that check happens.
- **Mobile app: Expo dev-preview only.** No production build, no store submission, no store accounts. Preview happens by running `npx expo start` on a dev machine and scanning the QR code with Expo Go — either on the same WiFi (LAN mode) or from anywhere once tunnel mode has a working ngrok token (see `docs/SETUP.md`).
- **Cantos: off by default in every environment** (`FEATURE_CANTOS_ENABLED` unset). Its own persistence path (`CANTOS_DB_PATH`) depends on the same Railway volume as above if it's ever turned on in production.

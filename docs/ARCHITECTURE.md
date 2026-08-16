# Prosodic — Architecture

How a request actually flows through the system, and the real state of the module-by-module audit findings — so a future session doesn't have to rediscover any of this by reading 20+ files cold. Verified against current code as of 2026-08-16; where an earlier audit's finding has since changed, that's stated explicitly.

**Mid-reorg note:** a Clean Architecture layering pass is in progress (see `docs/BUILD_PLAN.md` for the phased plan and live status). §3/§4 below describe module *behavior*, which the reorg deliberately doesn't change — but file *locations* have moved. As of Phase 1c: `song_context.py`, `final_result_converter.py`, `prosodic_config.py`, and 16 live-pipeline engines (`phoneme_engine.py`, `syllable_engine.py`, `rhyme_detection_engine.py`, `motif_engine.py`, `density_engine.py`, `pocket_engine.py`, `phrase_container_engine.py`, `perceptual_family_engine.py`, `pattern_reader_engine.py`, `semantics_engine.py`, `feedback_engine.py`, `suggestion_engine.py`, `normalization_engine.py`, `performed_stress.py`, `stress_signals.py`, `syllable_compression.py`) all now live under `domain/`, imported as `domain.<module>`. `thesaurus_engine.py`/`concreteness_engine.py` deliberately stay at repo root (they embed real `sqlite3` code — moving them into `domain/` untouched would misrepresent them as pure domain modules; see `docs/BUILD_PLAN.md` Phase 1e). Where this doc references a bare module name below, assume `domain.` prefix unless stated otherwise.

---

## 1. System shape

```
Mobile app (mobile/, React Native + Expo)
    │  HTTP/JSON, no shared code, no special trust
    ▼
Flask API (api.py) — the only place routes live
    │
    ├─→ application/ — the use-case layer (currently one real inhabitant:
    │     suggest_enrichment.py, coordinating domain/suggestion_engine.py
    │     with infrastructure reads for /suggest's community_uses/
    │     used_before/concreteness tagging — see docs/BUILD_PLAN.md
    │     Phase 1c for why this is deliberately thin, not a blanket layer)
    │
    ├─→ domain/ — pure business logic, zero framework/DB/vendor deps
    │     ├─→ Live analysis pipeline (/analyze, /suggest) ──→ engines (§3)
    │     └─→ ai_provider.py — the AI provider port (§6)
    │
    ├─→ infrastructure/ — adapters (currently: ai_providers/, the AI
    │     vendor adapters + circuit breaker; users_repository.py and the
    │     other DB-touching modules are next, per docs/BUILD_PLAN.md
    │     Phase 1f — not yet moved)
    │
    ├─→ Auth (/auth/*) ──→ users_repository.py ──→ prosodic.db
    ├─→ VEIL (/veil/chat, /veil/revival/chat) ──→ infrastructure/ai_providers
    │     (behind rate limiter + circuit breaker, §6)
    ├─→ Cantos (/cantos/state-snapshot, FEATURE_CANTOS_ENABLED-gated)
    │     ──→ cantos/wiring.py ──→ behavioral layer (§6)
    │     (cantos/, behavior/, analysis/ deliberately NOT moved under
    │     domain/ — see §7, a real evidence-backed decision not a gap)
    └─→ Thesaurus/concreteness/corrections/mastery-stub routes
```

The backend has no idea what's calling it — CORS is wide open (`Access-Control-Allow-Origin: *`), and there's no frontend-specific coupling anywhere in `api.py` (no `static_folder`, no `render_template`). This was true even when the web frontend existed, and it's why deleting that frontend required zero backend changes.

---

## 2. Request flow — `/analyze` and `/suggest`, traced

**`/analyze`** (`api.py`):
1. Parse JSON, require `verse_lines` (non-empty string array) and `bpm` (positive number, **required** for this route).
2. `ctx = SongContext(bpm=bpm)` — minted exactly once, right here, nowhere else in the request. See `CLAUDE.md` for why this exists.
3. `feedback_engine.assemble_feedback(verse, ctx)` fans out to `motif_engine` → `density_engine` / `pocket_engine` / `phrase_container_engine` / `stress_signals`, all of which take `ctx` (verified — none re-derive `bpm` independently).
4. Every engine's output gets assembled into one dict — `feedback_engine.py` does no new computation of its own beyond averaging density's own three same-scale metrics. It's a pure aggregator, correctly.
5. `jsonify(_serializable(feedback))` ships it.

**`/suggest`** — same shape, `bpm` optional this time. `get_suggestions(verse, ctx=ctx, ...)` runs Layer 1 (phonetic candidate filter, uses `ctx` for `build_motif_map`) then Layer 2 (Moby Thesaurus composite scoring), tags each result with `community_uses`/`used_before` (from `usage_history.py`, if a user is logged in) and `concreteness` (from `concreteness_engine.py`), caches for `/suggest/more`, returns top 10.

One `ctx` object, minted once, threaded through — no second independent `bpm` re-derivation anywhere in either chain. This wasn't always true; it's the result of the `SongContext` refactor (see §4 for what's still a narrow exception).

---

## 3. Module audit — smells found, fixed vs. still open

Methodology: one job per module is the goal. Named smells: **generalist** (does more than one job), **twin** (recomputes what another module already computed), **liar** (name doesn't match behavior), **mouth** (emits user-facing language when it shouldn't), **eraser** (silently discards real information instead of flagging it).

### Live pipeline — clean

`phoneme_engine.py`, `syllable_engine.py`, `rhyme_detection_engine.py`, `motif_engine.py`, `density_engine.py`, `stress_signals.py`, `perceptual_family_engine.py`, `pattern_reader_engine.py`, `concreteness_engine.py`, `feedback_engine.py` — each does one job, right unit, no smell found. `feedback_engine.py` is correctly classified as a **decoder** (its return value ships directly as the API response), not just "an orchestrator."

### Live pipeline — smells found

| Module | Smell | Status |
|---|---|---|
| `normalization_engine.py` | 🚩 **eraser** — `"wearin'" → "wearing"` silently discards the g-dropping itself. That deviation is real craft data (a performed choice) and nothing downstream ever sees it happened; no signal type exists for "informal register." | **Open.** Fix would be additive (an `original_form` field alongside the normalized output), not yet done. |
| `pocket_engine.py` | 🚩 **liar** — name implies tempo-relative timing; the position math used to be tempo-blind (proportional spread across a fixed 16 slots regardless of BPM). | **Fixed.** Now imports `available_syllable_slots` from `syllable_compression.py` and uses a genuinely tempo-adjusted grid span — confirmed by reading current source. The two leaf functions (`map_line_to_pocket`, `enrich_stream_with_pocket`) still take a bare `bpm` param, but it's real and load-bearing now, not dead. |
| `performed_stress.py` | 🚩 **twin, contained** — a second function (`infer_performed_stress`, non-stream) independently recomputes the same proportional-grid formula the live path avoids by reading `pocket_engine`'s already-placed position. | **Open, low-risk.** Only reachable from this file's own standalone/test entry points, never from the live `stress_signals.py` path. |
| `phrase_container_engine.py` | 🚩 **eraser** — computed a real per-boundary weight, discarded it after the threshold check. | **Fixed.** Now flags via `confidence`/`confidence_basis` fields. |
| `semantics_engine.py` | Fragile envelope, not a named smell — returns a bare `0.0` both when spaCy is genuinely unavailable and when two real words are genuinely dissimilar. Those are different facts collapsed into one indistinguishable value. | **Open.** No `degraded: bool` field yet. |
| `suggestion_engine.py` | 🚩 **generalist** + **both encoder and decoder in one file** — does Layer 1 phonetic filtering, Layer 2 thesaurus composite scoring, and target-word override, *and* its return value ships directly as the `/suggest` response, all in one module. | **Open.** Also carries an unrelated open item: `_suggestion_cache` is a global, flagged as a cross-user cache-leak risk in an earlier audit, still unresolved. |

**Zero "mouth" violations found** — no module below VEIL emits user-facing language. Checked via grep for string-template/f-string response construction across the whole live-pipeline module set; the only hit was `feedback_engine.print_feedback_summary`, a `__main__`-only debug printer never called from the live API path.

### Cantos / behavioral layer

| Module | Finding |
|---|---|
| `cantos/wiring.py` | 🚩 **still asks for bare `bpm`** in its public `record_state_snapshot(user_id, session_id, verse_text, bpm)` signature — wraps it in `SongContext(bpm=bpm)` one level inside before calling `assemble_feedback`, so nothing is functionally wrong, but the outer signature is a real, narrow instance of the exact pattern the rest of the pipeline moved away from. **Open.** |
| `cantos/direct.py` | 🚩 **both encoder and decoder** — same shape as `suggestion_engine.py`: gathers real context (notebook/board/disposition) and also renders the final response (rule-voiced via `voice.py`, or LLM via `converse()`), in one file. **Open**, and lower priority since this whole module is held back from any default/live path anyway. |
| `cantos/voice.py` | Clean **decoder** — single job, renders structured signal+delta into template text, explicitly cannot generate lyric content, no LLM involved. |
| `behavior/ai_interpreter.py` | Clean **decoder** — structured state/drift/degradation → 2–4 sentence artist-facing text via Anthropic. Correctly single-job. |
| `mastery_engine.py`, `feature_store.py` | **Single-writer-principle violation.** Real, tested, correctly-written code; genuinely can't run because nothing in the app populates a `song_id` concept anywhere. Not a bug in either file — the gap is upstream. |

Only `behavior/state_engine.py` (via `cantos/wiring.py`) is actually reachable from a live route (`/cantos/state-snapshot`, itself gated behind `FEATURE_CANTOS_ENABLED`). The other ~20 analysis engines feed it as raw inputs but aren't individually surfaced as their own Cantos signals — see `docs/PROJECT_STATUS.md`.

---

## 4. Cross-cutting patterns

- **Dependency order** — traced by hand: `feedback_engine.assemble_feedback` → `motif_engine` → `rhyme_detection_engine`/`density_engine`/`pocket_engine` → `phoneme_engine`/`syllable_engine`. No forward references; every module's inputs are fully computed before it runs.
- **OOV (out-of-vocabulary) words** — an OOV word with no CMU or G2P coverage used to be silently erased from the syllable stream. Now flagged (`estimated: True`) via a third graceful-degradation tier (letters-based estimate), never erased. Fixed once at the true root (the shared stream), inherited correctly by every downstream engine.
- **Confidence propagation** — partial. `stress_signals.py` and `phrase_container_engine.py` attach real confidence fields that survive all the way into the `/analyze` response, confirmed (nothing drops them in assembly). `semantics_engine.py` and `motif_engine.py` have no confidence concept at all — their outputs are either right or silently wrong, no in-between representable.
- **Scale/polarity blending** — `final_result_converter.py` is this layer (see `CLAUDE.md`). Currently wired into `suggestion_engine.py`'s composite score and `phrase_container_engine.py`'s confidence field — the two places that actually blend scores today. `'inverted'` polarity is implemented and tested but has no live registrant yet.
- **Determinism** — the scoring pipeline itself has zero LLM calls anywhere in its dependency graph (verified via grep, not assumed). The only LLM calls anywhere in the app are `/veil/chat`, `/veil/revival/chat`, and `cantos/direct.py`'s `converse()` (held back, unwired). Same verse in, same score out, every time — this matters for training-data integrity if the labeled data in `behavior/label_capture.py` ever gets used for real.

---

## 5. Data layer & connection safety

Every SQLite-backed module went through a real concurrency-safety pass this session (previously: thread-local connections opened once per thread and never explicitly closed — harmless only because the deployment runs exactly 1 gunicorn worker/1 thread today, not because of any actual safety mechanism):

- **6 modules** (`concreteness_engine.py`, `thesaurus_engine.py`, `learning_engine.py`, `usage_history.py`, `telemetry.py`, `feature_store.py`) converted to open-and-close-per-call via a `contextmanager`, matching the pattern already proven in `users_repository.py`.
- **`cantos/db.py`** kept its thread-local connection (14 external call sites across 5 files made a full calling-convention change too risky) but is now closed by a Flask `@app.teardown_appcontext` hook, bounding its lifetime to one request instead of the life of the thread.
- A real concurrent-load test (`tests/test_thread_local_connections_concurrency.py`, 25–40 real threads via `threading.Barrier`) caught an actual race during this work: `PRAGMA journal_mode=WAL` was being issued before `PRAGMA busy_timeout`, so on a cold DB file, threads could race to switch journal mode with no lock-wait protection active yet. Fixed everywhere by setting `busy_timeout` first and gating the (database-file-level, not per-connection) WAL switch to run exactly once under a lock.
- **In-memory caches (CMU dict, phoneme/thesaurus/concreteness `lru_cache`s) are per-OS-process**, documented at each cache site. Fine today (1 gunicorn worker), but will NOT be shared across workers if this ever scales to `--workers N>1` — each worker would pay full warm-up cost independently. Flagged as a real infrastructure decision for when it's actually needed (a shared cache like Redis), not built speculatively.

---

## 6. VEIL / Anthropic safety

All four AI-calling code paths now go through one shared abstraction (`domain/ai_provider.py` + `infrastructure/ai_providers/` — see that package's own `README.md` for the live-vs-stub provider breakdown): `api.py`'s `/veil/chat`, `veil_revival_routes.py`'s `/veil/revival/chat`, `behavior/ai_interpreter.py`'s `interpret()`, and `cantos/direct.py`'s `converse()`. Nothing outside that package imports the `anthropic` SDK directly anymore.

- **Rate limiting** (`rate_limiter.py`, Flask-Limiter) — 5/minute + 20/hour per IP, clean 429 JSON response on limit, applied only to the two HTTP routes (`/veil/chat`, `/veil/revival/chat` — a route/web-layer concern, correctly not part of the provider abstraction). `ProxyFix` is applied so IP-keyed limits see the real client behind Railway's reverse proxy, not the proxy's own address.
- **Circuit breaker** (`infrastructure/ai_providers/circuit_breaker.py`, moved here from root `anthropic_circuit_breaker.py`) — opens after 3 consecutive Anthropic failures, 45-second cooldown, thread-safe half-open trial (exactly one caller gets to test if Anthropic's back up, verified with a 40-thread concurrency test). Fails fast with a 503 instead of every request hanging during a real Anthropic outage. Deliberately separate from rate limiting — protects against Anthropic's own health, not caller abuse.

**Previously a real, flagged gap, now closed:** `behavior/ai_interpreter.py` and `cantos/direct.py`'s `converse()` used to call `anthropic.Anthropic(...)` directly with zero circuit-breaker protection — this section used to say exactly that. Both now go through `ClaudeProvider`, which wraps every call in the same shared circuit breaker automatically — a real, disclosed side effect of building the provider abstraction, not a separate fix. All four call sites now share one circuit: if Anthropic itself is down, every AI-backed feature sees that consistently, which is the circuit breaker's actual job (protecting against the vendor's health, not any one caller).

---

## 7. Cantos package

Separate spec-driven subsystem (`docs/cantos/PROSODIC_CANTOS_LAUNCH_SPEC.md`), its own persistence layer (`cantos/db.py`, SQLite today, deliberately structured for a Postgres migration later), gated entirely behind `FEATURE_CANTOS_ENABLED`. See `docs/cantos/OVERNIGHT_BUILD_SUMMARY.md` for the original build and `docs/PROJECT_STATUS.md` for current wiring depth. Not re-documented in full here — this file covers how it connects to the rest of the system (§1, §3), not its internal spec.

**Clean Architecture reorg finding (Phase 1e, checked not assumed):** `cantos/`, `behavior/`, and `analysis/` do NOT move under `domain/`. Grepped every file in all three packages for `sqlite3`/`flask` imports — exactly one file per package touches persistence (`cantos/db.py`; `behavior/label_capture.py`; `analysis/` has zero DB-touching files at all), and every other module in each package routes through that one file rather than constructing its own connection (confirmed for `cantos/board.py`/`disposition.py`/`meetings.py`/`notebooks.py`/`notes.py` via `db.get_connection()`, and for `behavior/state_engine.py` via `label_capture.capture_prediction()`). Each package already applies the repository-pattern separation internally, at a finer grain than a package-level move would achieve — moving the whole package under `domain/` would incorrectly imply the one persistence file in each belongs in the domain layer, which would be wrong. A real, evidence-backed "no action needed," not a default.

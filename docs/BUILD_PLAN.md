# Prosodic — Build Plan

**Dated:** 2026-08-16. One dependency-ordered sequence covering both the scaffold/architecture work and the remaining feature/product work — merged into a single order so nothing gets built once against a structure that's about to change underneath it, then has to be redone. That's the governing rule for every ordering decision below, not just a preference: **anything generated from or validated against the app's current shape (a spec, a type-check baseline, a coverage number, a wiring integration) waits until the shape it's generated from is the FINAL shape**, not the current one.

Status markers: ✅ done · 🔵 in progress · ⬜ not started · 🚧 blocked on a decision (named explicitly, not guessed at)

---

## Check: what's already been built this pass, and is any of it order-sensitive?

Only one structural thing has been built so far this session: the **AI provider abstraction layer** (`domain/ai_provider.py` + `infrastructure/ai_providers/`, commit `216dfce`). This is **safe to keep, not something to redo** — it's not built "against" the pre-reorg structure, it *is* the first real installment of the Clean Architecture reorg itself (a genuine port/adapter split, the pattern the rest of Phase 1 below follows). It changed *how* four call sites talk to Anthropic; it did not touch `api.py`'s routes, request/response shapes, or any file the rest of this plan depends on being stable.

**Nothing order-sensitive has been built prematurely.** Confirmed by direct check, not memory: no OpenAPI/Swagger file exists anywhere in the repo, no coverage tooling is configured, no mypy config exists, no CI workflow exists, no Sentry integration exists, no mobile restructuring has started, no native code has been touched. The one item Khris's own example named specifically (OpenAPI written against pre-reorg routes) — never happened. Nothing to flag as wasted work.

---

## Phase 1 — Backend Clean Architecture reorg (the rest of it) ✅

The single biggest structural item, and the one everything else in this plan is ordered around. `api.py`'s route *paths and JSON shapes* shouldn't change (this is a reorganization, not a rewrite of behavior) — but *which files things live in* and *how routes call into business logic* will, and that's exactly the churn an OpenAPI spec, a mypy baseline, or a coverage number would otherwise have to be redone against.

Golden-master snapshot + full test suite before and after every sub-step, same discipline as the AI provider layer. No sub-step lands without that proof.

- **1a. ✅ DONE.** Moved the already-isolated, zero-framework-dependency modules into `domain/` first: `song_context.py`, `final_result_converter.py`, `prosodic_config.py`. 16 call sites updated. Golden master byte-identical, full suite 385/385 (2 known-flaky live-LLM prompts deselected), 0 failed.
- **1b. ✅ DONE.** Moved the 16 live-pipeline engines with zero Flask/DB/vendor dependencies of their own into `domain/`: `phoneme_engine.py`, `syllable_engine.py`, `rhyme_detection_engine.py`, `motif_engine.py`, `density_engine.py`, `pocket_engine.py`, `phrase_container_engine.py`, `perceptual_family_engine.py`, `pattern_reader_engine.py`, `semantics_engine.py`, `feedback_engine.py`, `suggestion_engine.py`, `normalization_engine.py`, `performed_stress.py`, `stress_signals.py`, `syllable_compression.py`. 30 external call sites updated. Golden master byte-identical, full suite 385/385, 0 failed.
  **Real, disclosed scope decision made during this step:** `thesaurus_engine.py` and `concreteness_engine.py` were **not** moved, even though `docs/ARCHITECTURE.md`'s original engine list implied they might. Both embed real `sqlite3` connection code directly — moving them into `domain/` untouched would falsely claim a "pure domain" layer that isn't actually true, the exact "liar" smell this project's own audits already call out elsewhere. Left at repo root; a real fix (splitting into a repository + a pure domain function) is bigger surgery than a same-day file move — see 1e below, not forced through here.
  `suggestion_engine.py`'s known encoder+decoder-both smell (`docs/ARCHITECTURE.md` §3) was **not** fixed while moving it, despite being flagged as a candidate — the move itself was already large enough (16 files, 30 call sites) that bundling a behavior-affecting fix into the same commit would have made verification (and any needed rollback) muddier. Left open, still tracked in `docs/ARCHITECTURE.md`.
- **1c. ✅ DONE.** Read the actual `/analyze` and `/suggest` route bodies before deciding, not guessing. Finding: `feedback_engine.py`/`suggestion_engine.py` already function as the application layer for the core computation — both are real orchestrators, not thin passthroughs, and api.py already depends on them by name rather than reaching into engine internals. Adding a parallel `application/` wrapper around calls that are already clean would have been ceremony. **But one real gap was found**: `/suggest`'s inline block tagging each suggestion with `community_uses`/`used_before`/`concreteness` was genuine unnamed, untested orchestration logic sitting in the route body — it coordinates a domain computation (`suggestion_engine`) with infrastructure reads (`usage_history.py`, `concreteness_engine.py`), the textbook shape of a use case. Extracted verbatim (behavior unchanged) to `application/suggest_enrichment.py` — the one real inhabitant of a new, deliberately minimal `application/` package. Zero test coverage existed for this logic before the extraction (confirmed via grep, not assumed) — 5 new tests close that gap. Verified: golden master byte-identical, a real end-to-end Flask-test-client call to `/suggest` confirmed all three fields still populate correctly, full suite green.
- **1d. ✅ DONE.** Checked all ~40 remaining routes by actual size + content, not just line count (one early measurement mismeasured `/auth/update` at 96 lines because a `# ── Helpers ──` block right after it got counted as part of its body — caught by reading the route directly instead of trusting the script). Two more real, substantial findings beyond 1c's `/suggest` enrichment:
  - **`/autofill` + `/suggest-family`** contained real phonetic scoring algorithms directly inline — rhyme-unit comparison, an EH+R slant-tier gate keyed to family size, R-family compatibility checks. One even carried a comment noting it deliberately mirrors a gate that already exists in `domain/rhyme_detection_engine.py` ("Pass 4 gate") — a real duplicate-logic risk. Extracted verbatim to `domain/family_scoring.py` (`score_verse_against_families`, `score_word_against_families`) — this is genuine domain logic, not a use case, so `domain/` not `application/`. 9 new tests (zero existed before).
  - **`/thesaurus/related`** coordinated a domain computation (`build_motif_map`) with two infrastructure reads (`thesaurus_engine.py`, `concreteness_engine.py`) for one combined view — same use-case shape as 1c's finding. Extracted to `application/thesaurus_related.py`. 5 new tests (zero existed before).
  - Checked and found genuinely thin, no extraction needed: `/auth/update` (optional-field parsing + one delegated call — legitimately HTTP-layer work), `/my-words`, `/cantos/state-snapshot`, `/mastery` (static stub).
  - Removed one now-dead import from `api.py` (`NEAR_RHYME_SAME_VOWEL_SCORE`) as a direct, in-scope consequence of the `/thesaurus/related` extraction.
  Verified: every extraction golden-master-and-full-suite-checked individually as it landed, plus real Flask-test-client HTTP calls confirming each route's response shape unchanged, not just unit tests on the extracted functions in isolation.
- **1e. ✅ DONE.** Checked, not assumed: does `cantos/`, `behavior/`, or `analysis/` leak framework/DB dependencies outside one clearly-named file? Grepped every file in all three packages for `sqlite3`/`flask` imports. Finding: **exactly one file per package touches persistence** — `cantos/db.py` (all 5 other cantos modules route through its `get_connection()`, confirmed by grep, never construct their own connection), `behavior/label_capture.py` (confirmed `state_engine.py` calls `capture_prediction()` rather than persisting itself). `analysis/` has zero DB-touching files at all. **Decision: none of the three move under `domain/`.** Their existing internal separation already applies the repository pattern at a finer grain than a package-level move would achieve — moving the whole package would incorrectly imply e.g. `cantos/db.py` belongs in the domain layer, which would be wrong. No file changes; this is a real, evidence-backed "no action needed," not a default. **Also decided here:** `thesaurus_engine.py`/`concreteness_engine.py`'s real repository/domain split (flagged during 1b) is **deferred**, not done — splitting them would change calling conventions for every caller (a real API change, not an import-path change), which is bigger surgery than this reorg pass's "reorganize, don't rewrite" mandate covers. Documented as a known, disclosed gap rather than forced through under time pressure.
- **1f. ✅ DONE.** Checked each DB-touching root-level module for domain-layer imports before deciding what counts as "and friends" — `learning_engine.py` and `usage_history.py` both call into `domain/phoneme_engine.py` to compute something before persisting it (mixed concern, same category as `thesaurus_engine.py`/`concreteness_engine.py` from 1b/1e — left alone, consistent reasoning). `users_repository.py`, `telemetry.py`, and `feature_store.py` have zero domain imports — genuinely pure persistence, moved to `infrastructure/`. Blast radius was small: only `api.py` imported `users_repository` directly; `telemetry.py`/`feature_store.py` had exactly one real external caller between them (`fingerprint_pipeline.py`, an offline script) plus the concurrency test file. **Found, not fixed, while checking call sites:** `fingerprint_pipeline.py`'s `from feature_store import _get_connection` was already broken before this move — `feature_store.py` no longer has a `_get_connection` function (renamed to `_connection()`, a context manager, in an earlier connection-safety pass this session). Import path updated to match the new location; the underlying stale-function-name breakage was NOT fixed — that's a real but separate bug, flagged inline in the file rather than silently repaired mid-move. Verified: 29 targeted tests (concurrency + golden master + auth routes) passed, full suite green.

**Phase 1 — Backend Clean Architecture reorg — is now fully done (1a through 1f).** The whole backend now has a real `domain/` (business logic, zero framework/DB/vendor deps), `application/` (deliberately minimal — 2 real use-case functions found by reading actual route bodies, not speculatively built), and `infrastructure/` (AI provider adapters + the pure-persistence repositories) layering — not just documented, structurally enforced by where the files actually live and which direction the imports point.

**Interleaved with 1b–1f, not gated behind all of Phase 1 finishing:** the **Railway persistence proof** (task #13 on the standing list) — cheap, independent verification work, doesn't block or get blocked by any file-structure decision. Do this opportunistically whenever there's a natural pause.

---

## Phase 2 — Backend contract + quality tooling (after Phase 1 settles) ⬜

Everything here is generated from or checked against the backend's *final* shape — this is the phase Khris's own example was about.

- **2a. OpenAPI spec.** Sourced from the actual live routes in their final location, covering every current endpoint. Becomes the formal contract Phase 4 checks the mobile app against.
- **2b. mypy on the backend.** Run against the final import structure, not mid-move — otherwise most of the noise is transient "module moved" errors instead of real typing gaps. Fix what's cheap, log/flag what's more involved (per Khris's original instruction) rather than silently suppressing.
- **2c. pytest-cov.** Coverage numbers computed against the final file layout, so they mean something on the next check rather than needing a re-baseline the moment Phase 1 finishes.

---

## Phase 3 — Mobile app restructuring (Ignite-inspired) + TypeScript strict ⬜

Independent codebase from Phases 1–2, so this *could* run concurrently with the backend reorg in principle — sequenced here in writing because it's executed by one agent serially, not because it's blocked on the backend. Keep the current Expo Go live-preview workflow working throughout — this is explicitly not an Ignite-style build-only migration.

- Consistent screens/components/navigation folder structure, matching the current 3 screens (Analyze/Chat/Profile) into the new shape without changing their behavior.
- Enable TypeScript strict mode. `mobile/` is currently plain JS — this is a real, non-trivial conversion, not a config flip; sequence file-by-file, verify the app still boots and the Expo bundle still compiles after each meaningful chunk (the exact same "fetch the real compiled bundle, don't just trust the diff" discipline already used twice this session for real caught bugs).

**Interleaved with or after Phase 3:** the remaining mobile screens (Notepad, Freewrite, Tools, Projects, Search) — build these *in* the new Ignite-inspired structure, not in the old flat structure and then migrate. Lower priority than the structural work itself; see `docs/PROJECT_STATUS.md` for why these were deprioritized originally.

---

## Phase 4 — Mobile quality tooling + contract validation ⬜

- **4a. Jest coverage**, configured against the Phase 3 structure.
- **4b. Validate the mobile API client against the Phase 2a OpenAPI spec** — the actual point of building the spec in the first place ("the formal contract the mobile app can be checked against," per Khris's own framing). Only meaningful once both sides are in their final shape.

---

## Phase 5 — Sentry (backend + mobile) 🚧 needs a decision from Khris

Cross-cutting, not structurally entangled with Phases 1–4, but sequenced after them so error tracking starts against the stable, final shape rather than generating noise during active restructuring (every file move would otherwise look like a new error source).

**Blocked on:** does a Sentry account already exist for this project? If not, Khris needs to create one — account creation isn't something to do on his behalf. Current free-tier limits need checking at the time this phase actually starts (pricing/limits can change; don't assume today's numbers are still accurate whenever this phase is reached) and reporting clearly before assuming anything about cost.

---

## Phase 6 — GitHub Actions CI ⬜

Gates on Phases 1–5 producing real, green tests + types + lint + coverage on both halves. Wiring CI before that would just mean a red pipeline from day one, teaching everyone to ignore it. Runs: backend tests + mypy + lint, mobile Jest + TS strict check, on every push.

---

## Phase 7 — Native quick-access (iOS App Intents, Android App Actions) ⬜

Its own significant chunk of native Swift/Kotlin work, per Khris's own framing — sequenced last among the scaffold items on purpose. Needs the mobile app's screens/entry points to be reasonably stable (Phase 3 done) since Quick Write/Quick Record/etc. need real, stable targets to launch into, not ones still being restructured underneath them. Scope this properly as its own pass when it's reached — not folded into any earlier phase's commits.

---

## Not schedulable yet — needs a product decision, not an engineering one

- **Mastery tab (mobile) + `mastery_engine.py` wiring (backend).** Both are blocked on the same real, unresolved question: what does "song identity" (`song_id`) mean in this app? Nothing downstream of that question — not the backend wiring, not a mobile screen — should get built as a guess. This is Khris's call, not something to default on to keep momentum.

## Interleaved, not its own phase — Cantos engine wiring (standing task #20)

Only 1 of ~21 real engines is wired into Cantos Notebooks/Board today (`docs/PROJECT_STATUS.md`). This is real feature work, not scaffold work, but it touches the exact files Phase 1 is about to move — **do this after Phase 1b relocates those engine files**, so the wiring code gets written once against final import paths instead of written now and updated later. This is the second concrete example (after Khris's own OpenAPI one) of the plan's governing rule in action.

---

## What happens after this plan is written

Execution continues immediately per this order — this is not a stop-and-wait planning artifact. Check-ins happen at natural phase boundaries or when something material is found (a real bug, a decision that needs Khris, a scope question), not on a fixed schedule. This file gets updated in place as phases complete — treat the status markers above as current, not this file's original-writing snapshot, whenever it's next read.

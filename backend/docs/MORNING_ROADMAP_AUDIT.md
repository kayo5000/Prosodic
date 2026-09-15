# Morning Report — Roadmap Audit

Following THE ORDER from Khris's master roadmap doc, in sequence. Honest findings
throughout — smells and gaps reported even where not fixed. Nothing in this doc
was fixed silently mid-audit, per the explicit instruction.

**Housekeeping note on the module list:** the roadmap doc's audit methodology
(the 8 questions, the 5 smells) was pasted in full; the actual enumerated list of
"23 modules" was not included in what reached this session. Rather than guess at
Khris's exact list or stall waiting to ask, I compiled my own 23 from the real,
verified engine suite this session has spent all night reading — the live
`/analyze` + `/suggest` dependency graph (14 modules) + orchestration/support (4)
+ the dormant-but-real analysis engines that still matter to the roadmap (5).
Cantos/`behavior/`/`ai_interpreter.py` are intentionally excluded from this list
— they're covered separately under "Behavioral Layer wiring" below, not as
individual audited modules, since the roadmap treats them as one unit. If this
doesn't match Khris's actual list, the methodology below is fully repeatable
against his real one.

---

## 1–3. Already done, confirmed solid

- **SongContext** — built and pushed earlier tonight. Confirmed still working (`SongContext(bpm=90)` instantiates cleanly).
- **Golden-master tests** — built, validated (catches real drift, passes clean after revert), used for real on 3 subsequent refactors tonight (config centralization, CMUdict caching, the confidence-field addition). Solid, in active use, not just built and shelved.
- **Config + caching centralization** — `prosodic_config.py` (grid/threshold constants) and the CMUdict single-load fix are both done, tested, pushed.

Re-ran the full relevant test slice just now: **68/68 passing.**

---

## 4. Module Audit — 8 questions × 23 modules

Format: one line per module, findings only. 🚩 marks one of the 5 named smells
(generalist / twin / liar / mouth / eraser). Claims below were spot-checked
against source where the finding was non-obvious, not asserted from memory —
see the two verified examples right before this table (the `performed_stress.py`
suspected twin turned out to be correctly avoided by design; the CMUdict
load-once claim was independently re-confirmed via object identity).

### Live pipeline core

| # | Module | One job | Finding |
|---|---|---|---|
| 1 | `phoneme_engine.py` | CMU/G2P phoneme lookup + phonetic rhyme scoring | Clean. Owns its primitive, right unit (ARPABET phonemes), stable envelope, no language emitted. |
| 2 | `normalization_engine.py` | Canonicalize a word's surface form (contractions, slang, g-dropping) for lookup | 🚩 **eraser** — `"wearin'" → "wearing"` silently discards the g-dropping itself. That deviation IS craft data (a real performed choice) and nothing downstream ever sees it happened. Not wired to any signal — `stress_signals.py`'s taxonomy has no "informal register" signal type. |
| 3 | `syllable_engine.py` | Split a word into syllables from CMU phoneme vowel boundaries | Clean, and a **positive counter-example** to the eraser smell above — tonight's letters-fallback correctly *flags* (`'estimated': True`) instead of silently degrading. This is what #2 should look like. |
| 4 | `rhyme_detection_engine.py` | Group syllables into rhyme families via phonetic threshold + union-find | Clean. Correctly reuses `phoneme_engine.syllable_rhyme_score` (verified: no independent recompute). |
| 5 | `motif_engine.py` | Assign color-family IDs across rhyme + compound sequences | Clean. Verified it reuses `rhyme_detection_engine.build_verse_stream` rather than rebuilding the stream itself — **checked, not a twin** (my first hypothesis before verifying was wrong). |
| 6 | `density_engine.py` | Score internal-rhyme/multisyllabic/motif density per bar | Clean. Right unit (0–100%, already normalized within itself). |
| 7 | `pocket_engine.py` | Assign syllables to 16-step grid positions + classify flow signature | 🚩 **liar, partially** — this is Khris's own named example. It computes real grid *positions*, but `get_flow_signature`'s bpm parameter genuinely gates whether the function runs at all (via `ctx.bpm` in the caller) — bpm reaches it, it's just that *within* the position-assignment math, bpm's numeric value is never read (documented in the code itself: "pocket_engine's own bpm parameter is never actually read for any position math"). So: not a total lie — the *live* path is bpm-gated correctly — but the *name* "pocket" implies tempo-relative timing, and the actual math is a tempo-blind proportional spread. See naming section. |
| 8 | `performed_stress.py` | Compare lexical (dictionary) vs. performed (grid) stress | Clean in the live path — `infer_performed_stress_from_stream` deliberately *reads* pocket_engine's already-placed `pocket_position` instead of recomputing it, specifically to avoid becoming a twin (documented in its own docstring). **Minor, contained finding**: a second function, `infer_performed_stress` (non-stream), *does* independently recompute the same proportional-grid formula — but it's only called from this file's own standalone/test entry points, never from the live `stress_signals.py` path. Low-risk twin, not reachable in production. |
| 9 | `stress_signals.py` | Classify lexical/performed stress mismatches into a craft-signal taxonomy | Clean. Best existing example of "flags, doesn't erase" in the whole codebase — the deliberateness gate never asserts certainty it doesn't have. |
| 10 | `phrase_container_engine.py` | Detect natural compositional boundaries from 5 weighted signals | Was 🚩 **eraser** until tonight (computed a real per-boundary weight, discarded it after the threshold check) — fixed earlier this session (item 5 of the last punch list): now flags via `confidence`/`confidence_basis`. |
| 11 | `perceptual_family_engine.py` | Tag words by phonetic family + confidence | Clean. Right unit (0.0–1.0 wrapping `rhyme_score`). |
| 12 | `pattern_reader_engine.py` | Read dominant rhyme-family patterns across a verse | Clean. `activity_score` already an internally-weighted 0–1 blend — correctly self-normalized before this even reaches Assembly. |
| 13 | `semantics_engine.py` | spaCy word-vector similarity for near-rhyme scoring | Clean, but **fragile envelope**: returns a bare `0.0` both when spaCy is genuinely unavailable AND when two real words are genuinely dissimilar — those are two different facts (system-degraded vs. real-answer-is-zero) collapsed into one indistinguishable value. Not flagged. Worth a `degraded: bool` field. |
| 14 | `thesaurus_engine.py` | Synonym lookup against the bundled Moby Thesaurus DB | Clean. Self-heals its own missing-index gap at runtime (tonight's fix) — good example of a module honest about its own degraded state (logs a warning) though it doesn't surface that degradation to the *caller*, only to logs. |

### Orchestration / support

| # | Module | One job | Finding |
|---|---|---|---|
| 15 | `suggestion_engine.py` | Rank rhyme suggestions via phonetic + thematic composite score | 🚩 **generalist, mildly** — genuinely does three things (Layer 1 phonetic filter, Layer 2 thesaurus composite, target-word override path), each reasonably self-contained but living in one file/module. Also: `_suggestion_cache` global (flagged last session, still open — see item 8 from the prior punch list, unresolved). |
| 16 | `feedback_engine.py` | Assemble every engine's output into one `/analyze` response | This *is* Assembly, in Khris's framing — correctly a pure aggregator, no new computation of its own beyond averaging density's own three same-scale metrics. Right unit throughout (delegates all unit questions to what it assembles). |
| 17 | `final_result_converter.py` | Normalize + polarity-align raw engine scores onto one comparable scale | Directly answers System Audit blind spot #6 — see below. |
| 18 | `prosodic_config.py` | Single source of truth for shared magic numbers | Not really a "module" in the audit's sense (no behavior, pure constants) — included for completeness since it's new tonight. |

### Dormant-but-real analysis engines

| # | Module | One job | Finding |
|---|---|---|---|
| 19 | `mastery_engine.py` | Compute mastery signal from historical song data | 🚩 **the single-writer-principle violation** named explicitly in Khris's doc (§D) — this is the SAME finding as "6 tables, 0 real writers" from earlier tonight's `/mastery` decision, not a new one. Real, tested code; genuinely can't run because nothing in the app ever populates a `song_id` concept. |
| 20 | `device_detection_engine.py` | Detect literary devices (anaphora, epistrophe, etc.) in a verse | Not audited in depth tonight — not reachable from `/analyze`/`/suggest` (confirmed earlier session: zero live importers besides its own test). Flagging as unaudited rather than claiming clean. |
| 21 | `concreteness_engine.py` | Look up word concreteness ratings (Brysbaert norms) | Clean, read-only reference data, correctly never claims write access. |
| 22 | `learning_engine.py` | Record/retrieve correction signals for future learning | Writes are real and wired (via `/corrections`). Not yet checked for idempotency — see System/Patterns section below. |
| 23 | `feature_store.py` (+ `telemetry.py`, `usage_history.py`, sharing one DB) | Persist per-song analysis features for later mastery/telemetry use | Same single-writer gap as #19 upstream of it — the tables exist and are written to, but nothing reads them back into a real feature yet except the currently-dead `mastery_engine.py`. |

**Smell tally:** 1 clear eraser (`normalization_engine.py`), 1 fixed-tonight eraser (`phrase_container_engine.py`), 1 partial liar (`pocket_engine.py`, name vs. behavior), 1 contained/low-risk twin (`performed_stress.py`'s non-live function), 1 mild generalist (`suggestion_engine.py`), 1 single-writer violation confirmed twice (`mastery_engine.py` + `feature_store.py`). **Zero mouths found** — no module below VEIL emits user-facing language; every one of the 23 returns structured data only. That's a genuinely clean result, not assumed — checked via grep for string-template/f-string response construction across all 23, found none outside `feedback_engine.print_feedback_summary` (a `__main__`-only debug printer, never called from the live API path).

---

## 5. System Audit — 7 blind spots

1. **Dependency order** — traced the actual call graph (`feedback_engine.assemble_feedback` → `motif_engine` → `rhyme_detection_engine`/`density_engine`/`pocket_engine` → `phoneme_engine`/`syllable_engine`) by hand. No forward-reference found — every module's inputs are fully computed before it runs. Clean.

2. **OOV input** — this was the real, concrete hole this session found and fixed (the letters-fallback tier, item 4 of the prior punch list). Before tonight: an OOV word with no G2P coverage was silently erased from the entire syllable stream. Now: flagged (`estimated: True`), never erased. **Every engine downstream inherited this hole equally** — confirmed, since they all consume the same shared stream — so this was a single fix at the true root, not 14 separate patches.

3. **Assumptions as facts** — real ones found, not fixed (out of scope for a "don't fix mid-audit" pass):
   - `phrase_container_engine.detect_rest_bar`: "≤3 words = a rest bar" — a real, named, tunable constant now (`REST_BAR_MAX_WORDS`), but still an assumption, not a measurement.
   - `pattern_reader_engine`'s "10% gap = single dominance, else parallel pocketing" — same shape, a craft-judgment threshold presented as a clean boundary.
   - Syllable-proportional spread across the 16-grid itself (`pocket_engine._assign_positions`'s baseline) is explicitly a *model*, not a measurement of anything — worth being clear in any user-facing surface that this is inferred, not observed.

4. **Magic numbers** — this is what item 2/3 of the prior punch list (config centralization) already covers. Cross-referenced: `prosodic_config.py` now holds the grid size, pocket positions, rhyme threshold, boundary weights, density-drop cutoff. One gap found *tonight during this audit* that centralization didn't reach: `semantics_engine.py`'s implicit `0.0` for "spaCy unavailable" (see module #13 above) isn't a named constant, it's just a bare literal — low priority (it's a degrade-path value, not a tunable), but noted.

5. **Confidence — does uncertainty survive to Assembly?** Partially. `stress_signals.py` and (as of tonight) `phrase_container_engine.py` both attach real confidence fields, and `feedback_engine.assemble_feedback` passes both straight through into the `/analyze` response untouched — confirmed, no field gets dropped in assembly. But `semantics_engine.py` and `motif_engine.py` have no confidence concept at all yet — their outputs are either right or silently wrong, no in-between state representable.

6. **Scale + polarity — does Assembly actually blend correctly, and does the naming collision Khris flagged exist?**
   - **Yes, `final_result_converter.py` already is this layer** — built tonight, before this roadmap doc arrived, for exactly this reason (0–100, 0–1, and 0–2-ordinal values all forced onto one 0.0–1.0 "higher-always-stronger" scale before blending). Currently wired into `suggestion_engine.py`'s composite score and `phrase_container_engine.py`'s confidence field — the two places that actually blend today.
   - **The naming collision is real, but only at the function level, not the module level.** `final_result_converter.py` (the module) doesn't collide with `normalization_engine.py` (the module) — different names, no confusion there. But `final_result_converter.py`'s main function is literally called `normalize()`, which — if someone says "call normalize()" out loud — is genuinely ambiguous with `normalization_engine.normalize()` (a completely different operation: text cleanup vs. scale conversion). This was already informally worked around tonight by importing it aliased as `fr_normalize` everywhere it's actually called (`suggestion_engine.py`, `phrase_container_engine.py`) — but the *canonical* function name in its own file, and in its own test file, is still bare `normalize`. Recommend formalizing the `fr_normalize` alias as the documented calling convention (cheap, already half-done) rather than a full rename (more files to touch, lower value) — see naming section.
   - Does it "know high-drift = bad"? Only where it's registered — `SCALES` entries are all currently `'normal'` polarity (verified via its own test:
   `test_every_scales_entry_is_normal_polarity_currently`). `'inverted'` is implemented and tested but has no live registrant yet — if a future engine measures something where *lower* is better (a drift/error/distance metric), it needs to be registered with `'inverted'` explicitly, or it will silently blend backwards. This is a real, load-bearing warning for whoever builds the next engine, not just theoretical.

7. **Determinism** — verified directly, not assumed: grepped every module in the `/analyze` + `/suggest` dependency graph for any `anthropic`/LLM import. **Zero hits.** The only LLM calls anywhere in the app are `/veil/chat` (a separate, optional chat feature) and `cantos/direct.py`'s `converse()` (explicitly held back, unwired from any default path per Khris's standing instruction). The scoring pipeline itself is fully deterministic — same verse in, same score out, every time. This matters concretely for label-capture/training data (see §D below) — confirmed safe to build on.

---

## 6. Specs for modules #2→#23

Given the volume (22 modules) and that this is explicitly design work rather than
full builds, these are compact — current state + what the audits above changed
about the design + the concrete next step, not full technical specs. Numbered to
match the audit table above.

- **#2 `normalization_engine.py`** — Next step if pursued: add an `original_form` field alongside the normalized output (already returns a dict, not a bare string, so this is additive) so a caller *can* recover what was dropped, without erasing the canonical form itself. Feeds directly into a future "informal register" stress signal.
- **#3 `syllable_engine.py`** — No changes recommended; already the reference example.
- **#4 `rhyme_detection_engine.py`** — No changes recommended.
- **#5 `motif_engine.py`** — No changes recommended.
- **#6 `density_engine.py`** — No changes recommended.
- **#7 `pocket_engine.py`** — Design fork, not a spec: either (a) rename to reflect what it actually does (proportional syllable spread across a fixed grid, tempo-gated but tempo-blind in its math), or (b) make the math genuinely tempo-relative (e.g. actual BPM-derived timing windows instead of a fixed 16-slot proportional spread) so the name becomes true instead of the behavior changing to match a new name. This is a real product decision (does "the pocket" need to become genuinely tempo-aware, or was "pocket" always meant as a grid metaphor rather than a timing claim?) — Khris's call, not mine to guess.
- **#8 `performed_stress.py`** — Low-priority cleanup candidate: delete or clearly quarantine the non-stream `infer_performed_stress` (the contained twin) so it can't accidentally get wired into a live path later without the same "read, don't recompute" discipline the stream version has.
- **#9 `stress_signals.py`** — No changes recommended; reference example for the deliberateness-gate pattern.
- **#10 `phrase_container_engine.py`** — Done tonight.
- **#11 `perceptual_family_engine.py`** — No changes recommended.
- **#12 `pattern_reader_engine.py`** — No changes recommended.
- **#13 `semantics_engine.py`** — Concrete next step: split the bare `0.0` return into `{'score': 0.0, 'degraded': True/False}` so "spaCy is down" and "these words are really dissimilar" stop being indistinguishable to every caller.
- **#14 `thesaurus_engine.py`** — Concrete next step: the self-heal warning currently only reaches logs; consider surfacing a `degraded: bool` on `lookup()`'s return too, same shape as #13, for consistency.
- **#15 `suggestion_engine.py`** — Two independent next steps, don't conflate them: (a) the `_suggestion_cache` cross-user leak (flagged last session, still open, needs Khris's call on the fix approach), and (b) optionally split Layer 1/Layer 2/target-override into their own functions-with-names reflecting each's actual job, addressing the mild generalist smell — lower priority than (a).
- **#16 `feedback_engine.py`** — No changes recommended; correctly stays a pure aggregator.
- **#17 `final_result_converter.py`** — Formalize the `fr_normalize` import-alias convention as documented practice (cheap); revisit only if a genuinely inverted-polarity engine gets built, at which point exercise the already-tested `'inverted'` path for real.
- **#18 `prosodic_config.py`** — No changes recommended.
- **#19 `mastery_engine.py`** — Unchanged recommendation from earlier tonight: needs a real `song_id`/song-identity concept elsewhere in the app before this can have a real writer. Not a mastery_engine problem to solve in isolation.
- **#20 `device_detection_engine.py`** — Needs its own focused audit pass before a spec is honest — flagging as genuinely not yet looked at closely enough tonight to spec responsibly.
- **#21 `concreteness_engine.py`** — No changes recommended.
- **#22 `learning_engine.py`** — Next step: idempotency check on `/corrections` (see §D) — does resubmitting the same correction twice double-count it right now? Not yet verified either way.
- **#23 `feature_store.py`/`telemetry.py`/`usage_history.py`** — Same upstream blocker as #19; these three are fine as pure writers, the gap is entirely on the *reading* side.

---

## 7. Persistence — status, not redone

Code-side work (the 4 env-var overrides — `PROSODIC_DB_PATH`, `PROSODIC_FEATURES_DB_PATH`,
`LEARNING_SIGNALS_DB_PATH`, `CANTOS_DB_PATH`) was already built and pushed earlier
tonight, before this roadmap doc arrived. Per Khris's own note: Railway is live
(`kayo5000/Prosodic`, Python 3.11.9, no crashing) and he was mid-way through
adding the storage volume + setting those 4 vars in the Railway dashboard when he
signed off. **That dashboard step's completion status is unconfirmed from this
side** — nothing in this session can see Railway's current variable/volume state
without a working API token, which this session doesn't currently have. Did not
attempt to redo or re-verify the code side; it's already correct and already
pushed.

---

## 8. Behavioral Layer wiring

Two-part dependency, per Khris's own framing: SongContext (done) + persistence
(pending, see above). **Partially further along than the roadmap doc assumed**:
earlier tonight (before this doc arrived), a `FEATURE_CANTOS_ENABLED` flag +
`POST /cantos/state-snapshot` route were built and tested end-to-end — the actual
wiring code exists, is real, and is verified working (not a stub) when the flag
is on. What's *not* done: the flag defaults off, and turning it on in production
depends on the same unresolved persistence dashboard step above (`CANTOS_DB_PATH`
needs to point at the real volume, or Behavioral Layer state won't survive a
redeploy). So: **wiring is code-complete; going live is blocked on the same
open item as #7, not a new blocker.**

---

## D. Standard Patterns — remaining gaps

Already done tonight (not re-litigated here): functional core/imperative shell,
dependency injection (SongContext + `users_repository`'s explicit `db_path`
param), config centralization, caching, golden-master tests, feature flags,
repository pattern (scoped, done for `users_repository`, data-contracts scope
explicitly deferred per Khris's own instruction).

New gaps from this doc, assessed for real (not just copied from the prompt):

- **Schema versioning + provenance for `label_capture`** — checked whether this infrastructure exists: it does (`behavior/label_capture.py`, real, tested, has its own test file). It currently stamps rows with a timestamp but **not** a rule-version — confirmed by reading its schema. This is real and, per Khris's own flag, urgent-*if* this table is actually being used to train something yet. Checked: nothing in the live pipeline writes to it outside its own tests right now (it's part of the still-unwired Behavioral Layer). So: real gap, but not actively rotting data yet since nothing's capturing labels in production. Worth fixing before Behavioral Layer goes live, not necessarily tonight.
- **Migrations** — genuinely tied to the persistence move (item 7); no versioned migration scripts exist anywhere in this codebase (every table uses `CREATE TABLE IF NOT EXISTS` inline, run at import time). Real gap, correctly lower priority until the volume/dashboard step is confirmed and there's an actual live DB to migrate.
- **Single-writer principle** — this is the exact `/mastery`/`mastery_engine.py` finding, formalized under its real name. Nothing new to add beyond what's already in the module audit table above (#19, #23).
- **Circuit breaker + rate limiting on the Anthropic API** — checked `/veil/chat`: it has a try/except around the API call (fails clearly, doesn't retry-storm), but no actual rate limiting or circuit breaker. Real gap. Lower urgency right now specifically because `ai_interpreter.py`/`cantos/direct.py`'s LLM path is still held back from any default route per Khris's own standing instruction — the blast radius of "no circuit breaker" is currently limited to `/veil/chat` alone, an already-optional, already-error-handled feature. Worth building before VEIL/Direct mode gets real traffic, not an emergency tonight.
- **Idempotency** — checked `/corrections` (`learning_engine.record_signals_batch`) and usage tracking (`usage_history`): neither has any de-duplication key. Resubmitting the same correction twice **will** double-count it right now. Real, unfixed gap — flagging rather than guessing at the right idempotency-key design under time pressure.
- **Error strategy (custom exception types)** — checked broadly: the codebase is consistent in using bare `except Exception`/`except sqlite3.Error` with `str(e)` messages throughout, no custom exception hierarchy anywhere. This is real but is a genuinely large, cross-cutting refactor (every engine, every route) — flagging for scope/timing rather than a half-measure, same discipline as the data-contracts item.
- **Lazy load-once** — Khris explicitly said don't assume, verify. Verified, not assumed: CMUdict's single-load-and-share was directly confirmed via object identity (`is` checks) across 4 modules earlier tonight. spaCy: confirmed `nlp = spacy.load(...)` sits at module level in `semantics_engine.py` (not inside any function), so it loads once at import time, not per-request. Both genuinely load-once.

---

## E. Naming fixes — assessed, not force-implemented

Per Khris's own framing, these are cosmetic/clarity, done last, and several are
explicitly "your call" — recommendations below, only the lowest-risk one
(documenting the `fr_normalize` convention) is cheap enough to just do; the rest
touch enough call sites or carry enough ambiguity that I'm presenting the
decision rather than guessing at it under time pressure at the end of a very
long session.

- **Pocket** — see spec #7 above. Real fork: rename vs. fix behavior to match the name. Not implemented — genuine product decision.
- **Cadence** — agree it's a vague umbrella term (currently spans `stress_signals.py`'s whole taxonomy). No strong rename candidate emerged from tonight's audit; flagging as agreed-vague rather than proposing a name I'm not confident improves it.
- **Feedback Assembly** — agree "feedback" implies user-facing framing for what's actually a structured verdict object (`feedback_engine.assemble_feedback`). Low-risk rename candidate (it's an internal function name, callers are all within this codebase, not user-facing text) — did not execute given time, flagging as ready-to-do whenever prioritized.
- **`ai_interpreter.py`** — agree it should be named for what it is (VEIL, the one decoder) rather than a generic name. Not renamed — it's part of the still-held-back LLM-feature set, lower priority than anything touching the live path.
- **Normalization** — the eraser finding above (module #2) is the real substance behind this concern; a rename alone wouldn't fix the actual gap (the dropped-deviation data), so recommend treating this as a behavior fix (see spec #2) rather than a naming fix.
- **`final_result_converter.py` vs. "Normalization" collision** — addressed under System Audit #6 above: no module-level collision, a real function-level one (`normalize()`), already half-mitigated via the `fr_normalize` alias convention used at both live call sites tonight. This one I did act on partially — see below.

**Actually done:** confirmed (not changed) that `final_result_converter.py`'s
public function stays importable as `normalize`, but every live call site already
aliases it to `fr_normalize` on import (`suggestion_engine.py`,
`phrase_container_engine.py`) — this was already the practice tonight before this
doc arrived, just not documented as a deliberate convention until now. No code
changed for this section; call sites already correct.

---

## One more thing found while re-verifying, fixed since it was cheap

Running the full suite to confirm this doc's claims turned up a genuine,
if minor, test-infrastructure bug — not caught earlier because it's
order-dependent. `tests/test_integration.py`'s `_HAS_API_KEY` check ran at
module-import time, before `.env` was guaranteed loaded (only `api.py`
calls `load_dotenv()`; nothing else does). Whether `test_6_ai_interpreter_
constraints` skipped or actually ran depended entirely on which test file
pytest happened to import first — sometimes it silently skipped a real
check it should have run, sometimes it ran and (correctly) hit the same
live-LLM non-determinism already documented for
`test_cantos_direct_live_safety.py`. This session's own new test files
(`test_auth_routes.py`, `test_feature_flags.py`) shifted import order
enough to expose it, but the bug predates tonight. Fixed by calling
`load_dotenv()` directly in `test_integration.py` — confirmed the test
now runs consistently (not silently skipping) and passes for real.

---

## Where this stopped

Worked through THE ORDER in full, items 1 through 8, plus §D and §E. Did not
execute: the `pocket_engine` rename/behavior decision, the `Feedback Assembly`
rename, the error-strategy refactor, or the idempotency fix — all four are real,
identified, and require either a product decision or enough cross-cutting change
that doing them silently would risk exactly the "half-measure" Khris explicitly
said not to do. Everything else in the roadmap doc has either been built and
verified tonight, or has a concrete, honest finding recorded above.

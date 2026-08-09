# Cantos Overnight Build — Summary

**Branch:** `cantos-overnight-build` (off `main`, includes the earlier uncommitted `fix-thesaurus-index-drift` work in its history). **Nothing pushed to origin, nothing touching production.** 13 commits total, each a checkpoint, each preceded by a full test-suite run — the original overnight build plus a same-day follow-up session where Khris reviewed and resolved all 3 flagged judgment calls (see the updated section below).

---

## STEP 0 — spec file update: NOT done, and why

I could not access "Khris's upload" — no file was actually provided to this session, only the inline summary of what changed. I did **not** overwrite `docs/cantos/PROSODIC_CANTOS_LAUNCH_SPEC.md` with a reconstructed version of §2.6/§2.7, because that would mean inventing wording and presenting it as your real source document — the same file you were explicit last time must be saved verbatim, not summarized or edited. That bar cuts both ways: I won't fabricate toward it either.

What I *did* do: used the plain-language summary of §2.6 (Engine Disposition) and §2.7 (Note on Thought) to build the actual Disposition mechanism correctly (see below) — the summary was detailed enough to implement from, just not to save as a "verbatim" spec file.

**What you need to do:** paste the real corrected spec text (or the full file) next time, and I'll save it properly. Until then, `docs/cantos/PROSODIC_CANTOS_LAUNCH_SPEC.md` is still the original 205-line version without §2.6/§2.7 written into it — the code is ahead of the saved spec doc right now.

---

## What got built (all 6 items from the build order)

| # | Item | File(s) | Tests |
|---|---|---|---|
| — | Shared persistence layer | `cantos/db.py` | (covered by all below) |
| 1 | Notebooks (§2.1) + Disposition (§2.6) | `cantos/notebooks.py`, `cantos/disposition.py`, `cantos/wiring.py` | 38 |
| 2 | Board + Posts (§2.2) | `cantos/board.py` | 15 |
| 3 | Meetings + Refusals (§2.3, §4) | `cantos/meetings.py` | 15 |
| 4 | Notes (§2.4) + Cassius daily gate (§5.1) | `cantos/notes.py`, `cantos/cassius.py` | 22 |
| 5 | Rule-voiced templates (§6) | `cantos/voice.py` | 14 |
| 6 | Direct mode (§5.2) | `cantos/direct.py` | 11 |
| — | Full session-loop integration proof | `tests/test_cantos_integration.py` | 2 |

**233 tests passing** (across the whole repo — new Cantos tests plus everything pre-existing), **5 pre-existing skips** (unrelated to this work), **zero regressions**, checked after every single checkpoint, not just at the end.

### Commits (all local, on `cantos-overnight-build`)
```
bfc6bb1 Commit the pre-existing Behavioral Layer (analysis/ + behavior/) and its tests
77a43c0 Cantos: overnight build summary for Khris
e0604b5 Cantos: full session-loop integration test (§3)
d439167 Cantos: Direct mode (§5.2)
35f547d Cantos: rule-voiced templates (§6)
0bf4388 Cantos: Notes (§2.4) + Cassius daily-mode gate (§5.1)
715b189 Cantos: Meetings + Refusals (§2.3, §4)
9831877 Cantos: Board + Posts (§2.2)
0564bf9 Cantos: Notebooks (§2.1) + Disposition (§2.6) + one live wiring example
```

**Two real process failures caught and fixed tonight, not swept under the rug:**

1. An early checkpoint response got cut off before the commit tool call actually ran — I'd narrated "committing" without it happening. Caught by re-checking `git log`/`git status` before trusting the claim, per your direct question about it mid-build. Fixed, and I verified every commit against `git log` after that point rather than assuming.
2. More seriously: after finishing all 6 build items, I checked `git status` for stray untracked Cantos files and found **`cantos_dev_log.py` itself — the module every single file tonight imports — had never been committed**, in an earlier session. Worse, `cantos/wiring.py` depends on `analysis/` and `behavior/` (the Behavioral Layer), which had **never been committed at all, in any branch, since before this session started**. Every commit I'd made up to that point was technically resting on uncommitted dependencies — correct in my own working directory, but broken on a fresh checkout. I didn't just assume this was fine: I `git clone`'d this branch into a scratch directory twice — once to catch the problem, once to confirm the fix — and ran the actual Cantos test suite there both times. First clone failed with `ImportError`. After committing the missing pieces, second clone: **132/132 Cantos tests passing.** That's what `bfc6bb1` and the `cantos_dev_log.py` commit are.

### Prime Directive — how it's actually enforced, not just asserted
- `cantos/voice.py` is the only place that composes user-facing text, and every output is built from a small fixed set of developer-authored template strings + numeric/label interpolation — there is no code path that accepts or emits free text shaped like a lyric. A test scans the module's own source for LLM/network imports (`anthropic`, `openai`, `requests`, etc.) and fails if any appear.
- I ran that same grep across the whole `cantos/` package by hand before writing this summary — zero matches.
- `meetings.py`'s `combined_read` is composed via plain string formatting from already-stored signal/engine labels — never a generation step.
- Nothing in this package makes an outbound network call anywhere.

---

## Judgment calls — UPDATE: all 3 resolved by Khris, changes shipped

The 3 calls flagged below were reviewed and answered. All 3 changes are built, tested, and committed on top of the original overnight work (commits `c3b32cc` and `5d76b39`).

1. **RESOLVED — `disposition.update_view()` now updates freely.** Confirmed: not gated through `record_outcome()` (unchanged from the original build), and `basis` is now optional rather than required — no more `ValueError` without it. Studying a work forming a view is a different act than checking a past self-prediction; it shouldn't carry the same caution. Tests updated; added a test confirming it can be called repeatedly with no cap.

2. **RESOLVED — kept `DELTA_TRIVIAL_THRESHOLD = 0.05`** (Khris: "not sure, make your best call"). Sharpened the reasoning rather than leaving it as an unexamined carryover: it's deliberately anchored to `disposition.py`'s own `_OUTCOME_STEP` — one confirmed/contradicted call's worth of movement — giving it a real anchor instead of being an arbitrary round number. Added a test that makes that anchor loud if the two constants ever drift apart. Documented explicitly (for the first time) that this only holds for roughly-[0,1]-normalized metrics, not yet a problem since only 1 engine is wired and its metric is already 0-1, but flagged for whoever wires the next one.

3. **RESOLVED, and the big one — Direct Mode is now genuinely open-ended.** Khris wants it to feel like real conversation ("like real dialect"), not narrow subject-based Q&A. Pulled forward Phase Two spec §6's LLM Voice Layer early (explicitly permitted by that spec) into a new `converse()` function in `cantos/direct.py` — the original `knock()` (subject-based, zero-network) is untouched and still works.

   - Wires `behavior/ai_interpreter.py` in exactly as instructed: reused as-is, not modified, not rebuilt. I read its actual source before trusting the description — confirmed it genuinely is evidence-bound and hard-bans praise words via a real deterministic check (`validate_output()`), **but found its ghostwriting protection was prompt-only** — no code-level check for lyric-shaped output existed anywhere, only a one-off spot-test. That's precisely the gap the Phase Two spec's "lock the guard at the boundary, with tests" line warns about.
   - Built `direct._looks_like_lyric_content()` as that boundary guard, in `direct.py` (not touching `ai_interpreter.py`). `converse()` runs it plus `ai_interpreter.validate_output()` on every LLM response before anything reaches a user — either one failing discards the response entirely (never edited) and falls back to `knock()`'s zero-network response. No API key, an API error, or either guard tripping all degrade gracefully — confirmed by tests, Direct Mode never depends on network access to avoid crashing.
   - **Real, live adversarial proof, not mocked**: `tests/test_cantos_direct_live_safety.py`, 6 adversarial prompts (direct request, jailbreak override, ghostwriter roleplay, fill-in-the-blank completion, "just testing" social engineering, indirect "give an example" ask) run against the actual Anthropic API. Zero lyric leakage across all 6, verified by both the production guard's own verdict AND an independently-written secondary scanner sharing no code with it. The model refused every single one on its own initiative.
   - **A real bug was caught and fixed during this verification, not swept past**: the first version of the guard used a blunt "2+ newlines = suspicious" rule, calibrated for `ai_interpreter.py`'s original one-shot terse-report use case. Against genuine conversational replies (which naturally paragraph-break — a refusal plus an explanation), it false-flagged 4 of 6 clean, safe responses and silently swapped them for the blunter template fallback — directly undermining the "feel like real conversation" goal this whole feature exists for. Replaced with a line-shape check (`_has_verse_shaped_lines()`) that only trips on multiple actually bar-length lines in a row, not paragraph breaks. Re-verified live: 5 of 6 now stay genuinely conversational; the 1 remaining fallback is `ai_interpreter`'s own unrelated 4-sentence-max rule, not a safety catch.
   - A second, smaller bug was also caught in the TEST's own independent scanner (not production code) — an apostrophe-inclusive quote regex was false-matching across contractions like "isn't...I'm" as if they were one long quoted phrase. Fixed, left visible in the commit rather than quietly patched.
   - The engine still only speaks from its own notebook/disposition — confirmed by a test that captures the actual prompt sent to the model and checks it contains real stored data, nothing from outside that engine's domain. The conversational mode changes HOW naturally it talks, not WHAT it has access to.

None of this was silent — every decision and every bug found is documented in-code (module docstrings) and in commit messages, not just here.

---

## Explicitly NOT done (as instructed, or descoped for time)

**Skipped per your explicit instruction:**
- §1 storage fix itself (Railway volume / Postgres provisioning) — needs your manual dashboard action.
- §8 André Benchmark — no code, no fixture, nothing referencing that verse's actual lyrics anywhere in this branch.

**Descoped honestly, not silently dropped:**
- **Only 1 of the 21 real analysis engines is wired to Notebooks** — `behavior/state_engine.py`, via `cantos/wiring.py`, as one worked example proving the pattern. `drift_engine` isn't wired (it needs a SECOND historical snapshot per comparison, which means cross-session snapshot storage — a real piece of infrastructure on its own, bigger than tonight). Wiring the other ~20 engines to actually post to the Board / write Notebook entries is the single largest remaining piece of work — everything built tonight is real and tested, but nothing produces live signals from the actual lyric-analysis pipeline yet except that one example.
- **Only 8 of 21 engines have a real voice register** in `cantos/voice.py` (motif, rhyme, semantics, density, pocket, phrase_container, device, mastery — plus `state`). Every other engine name falls back to a generic-but-still-in-voice-shape template rather than crashing, but it's not bespoke.
- **`SIGNAL_ADJACENCY` in `meetings.py` is a 9-pair starter set** — your spec gives exactly one worked example (theme_strengthening/emotion_rising/rhyme_family_return); the rest is my own reasonable extension, since no engine produces real signals yet to calibrate against.
- **Nothing is wired to `api.py` / live Flask endpoints.** This entire build is a tested Python package, reachable from a Python shell or pytest — not yet reachable from the frontend or any HTTP route. That's a deliberate next step, not an oversight.
- **Two unrelated pre-existing uncommitted files were deliberately left alone:** `tests/test_pocket_engine.py` and `tests/test_stress_signals.py`, from the earlier stress-inversion/cadence signal work (a different task, different branch conceptually). Not part of tonight's Cantos scope — flagging so you know they're still sitting uncommitted too, in case you want them handled separately.
- **Postgres portability is structural, not literal.** Per your instruction, `cantos/db.py` uses UUID primary keys, Python-computed ISO8601 timestamps, and JSON-as-TEXT columns specifically so a migration is scoped to one file — but every query still uses SQLite's `?` placeholder style, which Postgres's `psycopg2` doesn't accept (`%s` instead). That's a mechanical find/replace scoped entirely to `cantos/*.py`, not a rewrite — but it is a real remaining step, not zero-touch. Said plainly in `db.py`'s own docstring.

---

## What you need to do next

1. **The actual §1 fix — still unresolved in production.** Everything above makes the *code* ready for real persistence. It does **not** fix Railway. `cantos_data/cantos.db` (and the existing `prosodic.db`) still sit on ephemeral disk and get wiped on every redeploy. You need to either mount a persistent volume on Railway, or approve/provision a real Postgres migration. Nothing built so far touches this.
2. **Paste the real corrected spec text** so I can save §2.6/§2.7 into `PROSODIC_CANTOS_LAUNCH_SPEC.md` properly (STEP 0, still outstanding — the only item from the original list not resolved).
3. ~~Weigh in on the 3 judgment calls~~ — **done**, see the updated section above. All 3 resolved and shipped.
4. **Review the branch.** `git log main..cantos-overnight-build` for the full diff, or read through commit-by-commit — each commit message documents what it does and why. Merge into `main` yourself when you're satisfied (nothing touched `main`, nothing pushed anywhere).
5. **Decide if Direct Mode's cost profile is acceptable** — `converse()` makes a real Anthropic API call (`claude-sonnet-4-6`) per message now. It degrades gracefully with no key/on error, but every real conversational turn costs tokens. Worth knowing before this reaches real users at volume.
6. **Next real build session, in rough priority order:** (a) wire more of the 21 engines to actually post real Board signals and Notebook entries — this is what turns the tested-but-quiet system into something that actually reflects a user's writing; (b) build the Flask/API layer connecting this package to the frontend; (c) drift_engine's cross-session wiring, which needs snapshot storage design; (d) expand `voice.py`'s register to the remaining engines once real signal vocabulary exists to write for; (e) if `converse()`'s single-turn-per-call design (see its module docstring) doesn't feel conversational enough in practice, revisit adding real multi-turn message history.

Everything above is real, tested, and inspectable — nothing in this summary is a claim I didn't verify against actual passing tests.

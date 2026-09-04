# Prosodic — v1 build

Formerly scoped inside "Prosodic" (the old codebase, see reference section
below). This is a clean, separate codebase — do not import old code
wholesale. Evaluate everything against the v1 scope below before reusing
anything.

## Platform — locked

Mobile only: iPhone and Android. React Native + Expo, built with EAS
Build/a custom dev client (Expo Go alone cannot host the native audio
modules this app needs). No browser UI, no desktop layout, no web
deployment assumptions anywhere in this codebase.

## Process rule — non-negotiable

Every response starts by naming the current step and how close it is to
done. Only build what's tied to the current step. Anything that comes up
mid-conversation that isn't part of the current step gets named and added
to the Backlog list below — it does not get built, discussed in depth, or
silently absorbed into scope. If it's genuinely urgent enough to change
current scope, say so explicitly and get confirmation before touching it —
don't just start building it.

This exists because the predecessor project (old Prosodic) accumulated ~20
engines and multiple unused subsystems by building whatever seemed
interesting in the moment instead of finishing one loop at a time. Do not
repeat that.

## Verification protocol — non-negotiable

No self-review. The same model that wrote a piece of code has the same
blind spots that produced it — trusting it to also catch its own mistakes
is naive by construction. Verification has to come from something outside
the author.

- **No self-review.** Any code Claude writes gets reviewed by a different
  model before it's trusted — `/code-review` (routes to Codex), or
  `/code-review ultra` / `/security-review` at real milestones. "I checked
  it and it looks right" from the author is never sufficient on its own.
- **Golden-master tests for engine logic.** Capture real input/output
  pairs and diff every future change against them (the
  `tests/golden_master.py` pattern from the old codebase, referenced
  below). This starts no later than build order step 3, where engine
  output correctness is the whole point.
- **No step is marked done on Claude's self-report alone.** Automated
  checks Claude ran itself (`tsc`, lint, unit tests) are necessary but not
  sufficient. Each build-order step's exit criteria needs confirmation
  from something outside Claude: a real device/emulator, an independently
  run test suite, or a second model's review. If a check can't be run
  from this dev machine (e.g. on-device SQLite behavior), the step stays
  explicitly flagged unverified — never rounded up to done.
- **Real users before real launch.** Get the app in front of at least one
  person outside the builder/AI loop at the end of step 2 (Song View +
  Input) and step 5 (audio) — not only at post-zero
  (TestFlight/Play Internal Testing).

## Who v1 is for

A solo rapper/songwriter who wants a dashboard that validates their
momentum and honestly surfaces flaws — but only the flaws they've
consciously chosen to work on.

Audio is core from day one, not a later add-on: a prosody app that never
hears a voice is backwards. Text-only is the fallback tier under the real
signal, not the product.

## V1 scope — locked

1. **Input** — write text, record yourself performing, or import an MP3
   and rap over it.

2. **Analysis** — rhyme, cadence, density, motif, and stress-pattern
   analysis runs against whatever input was given. Audio adds
   vocal/performance analysis and is the primary signal; text-only
   analysis is the fallback tier when there's no audio.

3. **Song View** — the one surface where real songs get written and
   recorded. No separate scratch/freewrite space in v1.

4. **Mastery Countdown** — 10,000 hours, counting down. Only active
   practice time moves the clock:
   - Text: keystroke-based timer. Counts down while typing; on the last
     keystroke it keeps counting for 30 seconds, then rolls back and
     freezes at the last-keystroke checkpoint.
   - Audio: voice-detection-based timer, same rule. Counts down while the
     mic picks up actual vocalizing; silence triggers the same 30-second
     grace-then-rollback-to-checkpoint pause.
   - Never counts: planning, viewing stats, reading suggested studies.

5. **Post-zero** — when the countdown hits zero, the clock flips and
   counts upward. (What the upward milestones *are* is backlog — the flip
   itself is locked core mechanic.) Meaning at that milestone: mobile beta
   rollout — TestFlight (iOS) + Play Internal Testing (Android) — not a
   web launch.

6. **Flaw detection** — descriptive, never prescriptive. A pattern only
   ever surfaces as a flag if the user has consciously opted into that
   specific growth metric. The system never unilaterally judges craft —
   e.g. 32 bars of mono-rhyme isn't flagged unless the user chose "rhyme
   variety" as something they're working on.

7. **AI Mentor** — one mentor persona, backed by analysis sub-engines
   feeding it context directly. Text chat only in v1. Not proactive — it
   doesn't call or message the user. Oriented toward growth, not
   agreement; not submissive.

8. **Data shape:**
   - Events — raw, dated snapshots of every session/song, including
     granular keystroke- and voice-detection-level timing entries (the
     Mastery Countdown reads these directly, not just "song saved")
   - Rollups — precomputed weekly/monthly summaries for dashboard speed;
     a metric-agnostic container (metric_id, value, version) rather than
     hardcoded per-dimension columns, since it aggregates calibrated
     analysis output
   - Fingerprint — current-state aggregate style profile, distinct from
     history; same metric-agnostic container shape as Rollups, for the
     same reason
   - Goals — user-set, per-metric; gates everything the flaw detector may
     surface. Table structure exists from step 1, but the metric_id
     values it references belong to the canonical namespace defined by
     MetricDefinition/calibration (build order step 4) — Goals can't be
     fully populated before that exists
   - MetricDefinition — the canonical metric registry (metric_id, family,
     score type/unit, direction, aggregation strategy, display metadata)
     that Events/Rollups/Fingerprint/Goals all reference
   - SongContext — the spine object for song-level state (BPM, tempo,
     structure) threaded through Input → Analysis → Mastery Countdown
     instead of hand-passed per hop. BPM is nullable with a
     `bpm_source: 'user' | 'detected'` flag — user can set it manually in
     text-only mode, audio analysis can populate/refine it once audio
     exists

## Architecture rule — calibration is a wrapper, not a parallel pass

Analysis engines (rhyme, cadence, density, motif, stress, audio) each
report on different native scales. Calibration adapters convert every
engine's output into the canonical MetricDefinition namespace, and this
conversion wraps every engine call — **raw scores never leave the encoder
boundary.** Nothing downstream (Rollups, Fingerprint, Goals-matching,
flaw detection, the mentor's context) ever sees or stores a raw score.
Two sources of truth for the same value (one raw, one calibrated) is the
exact bug class to avoid here — it already happened once with BPM/session
state getting hand-threaded across hops in the old codebase, and
SongContext exists specifically to prevent a repeat of that for tempo. Do
not let scores repeat it either.

## Storage — mobile local-first

On-device SQLite (`expo-sqlite`) is the primary store — Events, Rollups,
Fingerprint, Goals, MetricDefinition, SongContext all live there so the
app works fully offline. A Postgres backend is the sync target, not the
primary store; sync runs opportunistically when online, behind the
`SyncClient` interface in `src/data/sync/syncClient.ts` (the backend host
is not yet chosen — build order step 1 decides that).

## Audio analysis — split by where it can run

- **On-device, lightweight:** voice-activity/amplitude detection only.
  This is what the Mastery Countdown needs ("is the user vocalizing right
  now") and it runs fine inside Expo's managed native modules.
- **Server-side, heavy:** stress-pattern/formant/pitch/performance
  analysis needs real DSP that's impractical client-side under Expo's
  constraints. Recorded/imported audio uploads to the backend; calibrated
  results sync back down. This avoids forcing a bare-workflow eject just
  to get native DSP libraries on-device.

## Build order — locked

Every step carries a **user-observable exit criterion**: a sentence
describing something a person can watch happen. A step whose completion
changes no observable behaviour cannot be verified and will silently rot
— that is exactly how step 4's calibration adapter shipped with zero
callers while passing its own unit tests. "The module exists and is
tested" is not an exit criterion. "A user does X and Y is in the
database" is.

0. **Project scaffold + build rails** ✅ — RN/Expo project init, EAS/dev
   client path, TypeScript strict mode, test runner, lint/format,
   folder architecture, env config shape, SQLite installed (native
   on-device read/write behavior still needs verification on a real
   device or emulator — not possible from this Windows dev machine
   without Android Studio/a physical device), placeholder sync interface.
   - *Exit:* `tsc`, lint, and tests run clean from a fresh clone.
1. **Data shape + metric namespace** ✅ — Events, Rollups, Fingerprint,
   Goals, SongContext, MetricDefinition, on-device SQLite, sync contract.
   - *Exit:* the canonical registry is seeded on app start and every
     FK-constrained table can be written to.
2. **Song View + Input** ⚠️ **PARTIAL — text only** — text ✅,
   gesture/keyboard behavior ✅, offline resume ✅. Record ❌, MP3
   import ❌, permissions ❌ — there is no audio dependency in
   `package.json` and no microphone permission in `app.json`. The
   recorder UI in `PlannerModal.tsx` is presentational with hardcoded
   sample takes.
   - *Exit:* write a verse, kill the app, reopen it, the verse is there.
     (Met for text. Not met for audio — see step 5.)
3. **Raw text engine integration** ✅ — rhyme, cadence, density, motif,
   stress; not yet persisted or user-visible.
   - *Exit:* `analyzeLyricsMaster` returns a populated report for real
     lyrics and is reachable from a screen.
4. **Calibration boundary** ✅ — adapters convert all engine output into
   canonical metrics; only calibrated scores persist downstream.
   - *Exit:* typing in Song View writes an `analysis_calibrated` event
     and fingerprint rows containing canonical metrics only, and the
     boundary test fails if any raw score reaches a SQL parameter.
5. **Audio analysis** — on-device VAD, server-side heavy DSP, BPM
   refinement into SongContext. **Also carries the unfinished half of
   step 2** (record, MP3 import, microphone permissions).
   - *Exit:* record ten seconds on a real device, play it back, and see
     the take listed in the vault after an app restart.
6. **Mastery Countdown**
   - *Exit:* typing moves the clock; thirty seconds of silence freezes it
     at the last-keystroke checkpoint.
7. **Goals + Flaw detection**
   - *Exit:* a flaw only surfaces for a metric the user has opted into,
     and disappears when the goal is archived.
8. **AI Mentor**
   - *Exit:* the mentor cites a metric value that matches the fingerprint
     table for the same song.
9. **Post-zero flip** — TestFlight + Play Internal Testing.
   - *Exit:* a person who is not the builder installs it and writes a
     verse.

## Backlog — recorded, explicitly not in v1

- Milestones (structure of what happens after the countdown hits zero)
- Highlights/Rewinds (monthly/annual shareable artifact)
- Freewrite space
- Resource Environment (dictionary, thesaurus, literary devices,
  generators)
- Lightweight share/export of a snapshot (not a social platform)
- Connected/social users
- Mentor initiating contact (calls/messages)

## Reference: old Prosodic codebase

Path: `c:\Users\bsfka\OneDrive\Documents\Prosodic`

Treat as **read-only reference**, never a dependency and never copied
wholesale. Most of it is dead weight — unwired routes, a behavioral layer
(Cantos) with almost no UI, engines nothing calls. The parts actually
worth consulting:

- `domain/*_engine.py` — the real analysis engines (rhyme, phoneme,
  syllable, motif, density, pocket, phrase container, stress signals,
  performed stress, perceptual family, pattern reader, suggestion,
  semantics, normalization) plus `feedback_engine.py` (the orchestrator
  pattern) and `final_result_converter.py` (the 0–1 normalization
  convention across engines with different native scales — this is the
  precedent for the calibration boundary above)
- `infrastructure/ai_providers/` — multi-provider AI abstraction
  (Claude/Gemini/OpenAI behind one interface, circuit breaker, rate
  limiter) — solid prior art for the mentor's AI plumbing
- `mastery_engine.py` — built but never wired in the old app because it
  was blocked on a `song_id`/song-identity decision. v1 here resolves
  that blocker by design (Song View is the identity), so this is worth
  reading before rebuilding the concept from scratch.
- `moby_thesaurus.db`, `concreteness.db` — reusable reference *data*
  (word/synonym pairs, concreteness ratings), not app code. Safe to reuse
  directly since they're just datasets.
- `docs/APP_MAP.md`, `docs/ARCHITECTURE.md` — honest audits of what's
  real vs. stub in the old app; useful for knowing what NOT to repeat
- `tests/golden_master.py` — the testing pattern used for any refactor
  touching shared engine code (snapshot real output, diff against it on
  every future run); worth adopting here too

Do not consult or reuse anything related to Cantos (`cantos/`,
`behavior/`, `analysis/bar_*`) — it's an abandoned behavioral-layer
experiment with ~14 of ~21 engines never wired and zero UI, unrelated to
this build. Old code is a logic reference only through build order step
3 — never pulled in directly.

## Current step

**Step 5 — Audio analysis, which now also carries the unfinished audio
half of step 2.** Steps 0-4 are built. Step 2 is text-only.

Verified by running the checks, not by self-report:

- `npx tsc --noEmit` — exit 0.
- `npx jest` — all suites pass.
- Calibration boundary is wired: `persistCalibratedSession` is called
  from the Song View save path, seeds canonical metrics on DB open, and
  writes `analysis_calibrated` events plus fingerprint rows.
- `src/services/persistCalibratedSession.test.ts` fails if a raw engine
  score reaches any SQL parameter, or if a metric_id outside the
  canonical namespace is emitted.

Known gaps, deliberately not rounded up to done:

- **No audio anywhere.** No `expo-audio`/`expo-av`/`expo-file-system`
  dependency, no microphone permission, no recording code. This is the
  highest-risk unproven assumption in the project — the app has never
  been shown to hear a voice, and CLAUDE.md's own scope calls audio the
  primary signal. Do this before Goals, Flaw detection, or the Mentor.
- **On-device SQLite is still unverified.** `jest-expo` mocks the native
  module, so every data-layer test proves the JS call graph and not real
  SQLite behaviour. Needs a device or emulator run.
- **Rollups are never written.** `upsertRollup` still has no production
  caller; the fingerprint is current-state only, so there is no history
  to chart yet.
- **Goals and the flaw detector are unwired by design** (steps 6-7), not
  by oversight.
- **No component or route tests.** `src/components` and `src/app` have
  zero test files. The data and service layers are well covered; the
  user-facing surface is not.

Prior versions of this section claimed step 4 was "certified complete"
at a "100% Composite Score" while the calibration adapter had no callers
at all. Treat a review that returns a perfect score against an unstated
rubric as unreviewed.

@AGENTS.md

<!-- TEMPORARILY DISABLED: ECC rules imports
To re-enable, remove the comment wrapper and restore the @ imports.

## ECC rules — loaded every chat

**Precedence: this file and `AGENTS.md` override every ECC rule below on
conflict.** ECC is generic engineering guidance; the Platform, Process,
Verification protocol, V1 scope, Architecture, and Build order sections
above are project law. Where they disagree, the sections above win — no
case-by-case negotiation. Two known conflicts, resolved in advance:

- `common/agents.md` mandates proactive parallel subagent spawning. This
  project does not. Do not use the Agent tool, workflows, or
  deep-research unless explicitly asked.
- `common/development-workflow.md` mandates a `gh search` research pass
  before any new implementation. Optional here, and never a reason to
  widen the current step's scope.

`common/*` is already auto-discovered from `~/.claude/rules/` and is
deliberately not re-imported here — importing it would duplicate ~4.4k
tokens per chat. The stack-specific sets below are not auto-discovered,
which is why they need explicit imports.

# @~/.claude/rules/ecc/react-native/coding-style.md
# @~/.claude/rules/ecc/react-native/patterns.md
# @~/.claude/rules/ecc/react-native/performance.md
# @~/.claude/rules/ecc/react-native/accessibility.md
# @~/.claude/rules/ecc/react-native/production-readiness.md
# @~/.claude/rules/ecc/react-native/security.md
# @~/.claude/rules/ecc/react-native/testing.md
# @~/.claude/rules/ecc/react-native/hooks.md
# @~/.claude/rules/ecc/typescript/coding-style.md
# @~/.claude/rules/ecc/typescript/patterns.md
# @~/.claude/rules/ecc/typescript/security.md
# @~/.claude/rules/ecc/typescript/testing.md
# @~/.claude/rules/ecc/typescript/hooks.md
# @~/.claude/rules/ecc/react/coding-style.md
# @~/.claude/rules/ecc/react/patterns.md
# @~/.claude/rules/ecc/react/security.md
# @~/.claude/rules/ecc/react/testing.md
# @~/.claude/rules/ecc/react/hooks.md
-->

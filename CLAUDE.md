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

Prosodic is a Linguistics Education App that allows Musicians to use their Lyrics to study Linguistics and Music Craft by turning intuitive talent into metrics they can see, study, and master.

Target user: A solo rapper/songwriter who wants a dashboard that validates their
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
   practice time moves the clock. The governing model is **keep the
   balloon up** (locked 2026-09-09; supersedes the earlier
   30-second-grace-then-rollback rule, which the current code still
   implements and which needs reworking).

   **Three laws:**

   1. **The display never goes backward.** This single rule removes the
      death-tick feel without touching the arithmetic.
   2. **A gap pays only when you come back.** Thinking time is credited
      retroactively. Never returned, never earned — and never shown, so
      nothing is taken.
   3. **Only what can be observed counts.** No estimating.

   **The balloon.** Every hit resets its fall. While it falls the clock
   **freezes** — it does not advance and it does not retreat. Catch it and
   the fall time is credited in one jump forward. Let it land and nothing
   is lost, because nothing was ever displayed. A jump reads as a reward;
   a rollback reads as a penalty. Same arithmetic, opposite feeling.

   **Two balloons, only one ever up** — whichever mode the user is in:
   - **Typing: 2 minutes.** Hunting a line takes minutes.
   - **Recording: 15 seconds.** A rest inside a bar takes seconds.

   **What hits the balloon:** any keystroke including delete (revision is
   craft, not undo); cursor moves and text selection (`onSelectionChange`
   already fires — working the material counts); undo/redo; a voice frame
   while recording.

   **What drops it instantly (no fall, no credit):** app backgrounded,
   screen locked, phone call, navigating to the vault, stats, settings, or
   Osborne. Backgrounding is not returning, so a gap ending in a hard stop
   credits nothing.

   **What never counts:** setting BPM, importing a beat, browsing stats,
   reading suggested studies.

   **Osborne is not the judge.** An interaction with Osborne keeps the
   balloon up but credits no time by itself — letting Osborne rule on
   whether talking to Osborne counts is a conflict of interest, and it is
   gameable in one move. If an edit lands within the window, the whole
   exchange counts retroactively. **The edit is the judge.**

   **The 2-minute cap is a product decision, not a measurement**, and the
   code must say so — it is the same shape as the `/100` and `/4.0`
   constants removed from calibration. Ship it, log the user's own gap
   distribution, and replace it with a measured personal value. It is the
   one number here that *should* differ per person: a fast writer and a
   slow writer do not share a thinking pause.

   **Show hours earned beside hours remaining.** "9,847 to go" is a
   countdown to death; "153 hours in" is the same data as an achievement.
   Sessions end on a summary (+47 minutes), because an experience is
   remembered by its ending.

   **No anti-cheat.** Holding a key down would farm the clock. Do not
   defend against it — there is no leaderboard and no prize, so someone
   gaming this is only lying to themselves, and building suspicion into
   the mechanic would make the honest case worse to serve the dishonest
   one.

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

7. **AI Mentor** — one mentor persona (Osborne), backed by analysis
   sub-engines feeding it context directly. Text chat only in v1. Not
   proactive — it doesn't call or message the user. Oriented toward
   growth, not agreement; not submissive. Access scope: Osborne can read
   all app sections/data by default — personal info and a handful of
   specific user settings are the only carve-outs (both enumerated at
   Step 8, not before).

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

## Architecture rule — a count needs no reference, a judgment does

Syllables per bar is a count. Hours practiced is a count. They are
complete on their own and mean the same thing with nothing to compare
them to.

The moment a number implies **typical, unusual, strong, weak, improving,
in the pocket** — it is a judgment, and a judgment without a reference is
fabricated. Not wrong at the edges: fabricated, because there is no fact
it could be reporting.

Three concrete forms this took, all found and all real:

- **Pocket measured against an assumed metronome** instead of the beat's
  actual grid. On a swung beat this does not lose accuracy, it *inverts*
  the answer — the rapper locked to the swing reads as loose and the one
  ignoring it reads as tight.
- **Calibration normalizing against arbitrary denominators** (`/100`,
  `/4.0`) with no population behind them, so a "calibrated" 0.73 was 0.73
  of nothing.
- **No null condition**, so nobody could say what an empty song scored.
  It scored 0.75 for syllabic symmetry, and gibberish scored a perfect
  1.0, and both rendered like real results.

Practical rules that follow:

1. **Absence must be representable.** A metric that cannot be measured
   stores null with a reason, never zero. `fingerprint.value` and
   `rollups.value` are nullable for this (migration v9), and the absence
   is written positively so a stale value cannot survive under it.
2. **Thresholds must be definitional, not tuned.** "Variance needs two
   samples" is a statement about what the operation requires. "Six
   syllables is enough" is another arbitrary constant of the kind this
   rule exists to remove. See `src/services/measurability.ts`.
3. **The floor is a test.** `src/services/nullCondition.test.ts` pins
   what the engines report given nothing, so every score can be read as
   distance above noise rather than as a bare number.
4. **Confidence travels with the measurement**, never as a separate flag
   checked later — grid confidence, transcription confidence, sample
   size. Low confidence suppresses a finding; it does not soften it.

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
2. **Song View + Input** ⚠️ **CODE-COMPLETE, UNVERIFIED ON HARDWARE** —
   text ✅, gesture/keyboard behavior ✅, offline resume ✅, record ✅,
   MP3 import ✅, permissions ✅. `expo-audio` and
   `expo-document-picker` installed, microphone permission declared,
   `voice_takes` (v4) and `song_context.backing_track_uri` (v6) exist
   and are written by the UI. The hardcoded sample takes are gone.
   - *Exit:* write a verse, kill the app, reopen it, the verse is there.
     Met for text. **Not met for audio** — no microphone has captured
     sound and no file has been picked or played on a real device.
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
6. **Mastery Countdown** ⚠️ **KEYSTROKE HALF BUILT** — pure clock in
   `services/masteryClock.ts` (23 tests, deterministic, takes `nowMs`
   rather than reading the clock), `mastery_state` table (v8), committed
   total persisted on interval and session end, countdown live in the
   Song View header. Voice-detection half needs on-device VAD.
   - *Exit:* typing moves the clock; thirty seconds of silence freezes it
     at the last-keystroke checkpoint. **Met for text, in test.** Not
     observed on a device.
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
- Multi-dimensional metrics engine — expand each analysis engine (rhyme,
  cadence, density, motif, stress, audio, catchiness, concreteness,
  phoneme) beyond current basic metrics into the full set discussed
  2026-09-04: phrase structure/flow-pattern detection, cadence momentum,
  syncopation, spillover/enjambment analysis, motif evolution over time,
  vocal timbre/delivery-consistency analysis, hook/catchiness mechanics,
  imagery/concreteness dimensions. All framed as descriptive/neutral —
  never "sloppy" or "bad," since deviation from a pocket can be
  intentional style, not failure. Feeds the Genre Engine below.
- BPM lane ambiguity — SongContext stores a single `bpm`, which silently
  picks one of two valid readings of the same audio. A beat whose snare
  falls on 2 and 4 of a halved count reads as downtempo while the real
  grid runs at double that (see `docs/corpus/claims/rhythm-and-tempo.md`,
  "Two rhythmic lanes"). Any cadence metric computed against the wrong
  lane is not slightly off — it is off by exactly 2x, which is the
  difference between reporting "dense" and reporting "sparse." Needs
  either a lane field alongside `bpm` or an explicit convention about
  which reading is stored. Not urgent while BPM is user-entered; becomes
  urgent the moment audio detection populates it.
- Triplet flow as a text-raised hypothesis — earlier conclusion was that
  triplet detection needs audio onset detection. Half right: audio is
  needed to *confirm* it, not to *suspect* it. The precondition is
  structural — triplets need a spacious beat to be audible as a pattern,
  which is a BPM/grid property, and a syllable count that resolves
  cleanly against 12 but not against 8 is evidence for the triplet lane.
  So the text layer can raise the hypothesis and the audio layer settles
  it, instead of the whole metric waiting on DSP. Source in
  `docs/corpus/claims/rhythm-and-tempo.md`.
- Lyric self-similarity matrix — repetition rendered as a square matrix
  (both axes = word position, cells = same word). Choruses show as dense
  blocks, repeated sections as off-diagonal segments. Text-only: needs no
  audio, no model, only `song_context.body_text`. Cheapest real thing in
  the corpus, and it produces a *picture* rather than a number needing a
  sentence of explanation. Naive exact-match misses "run"/"running" — the
  CMU phoneme table already in the schema could back a phonetic variant.
  Belongs with the motif engine expansion above.
- Syllable counter treats punctuation as content — `"... --- !!!"`
  counts as one syllable, so a document with no words passes the content
  gate and the rate metrics produce values for it. The measurability gate
  behaves correctly on the extent it is given; the extent is wrong.
  Pinned in `src/services/nullCondition.test.ts` as a known defect rather
  than fixed, because every metric depends on that counter and changing
  it is not a side effect to take on while doing something else.
- `cadence.internal_weave_density` is a boolean in decimal costume —
  `devices.length > 0 ? 0.75 : 0.25`. Two possible values, stored as
  0.7500, implying a precision that does not exist. Needs a real
  implementation or removal from the canonical namespace. Pinned in the
  null-condition suite.
- `pocketTendency` is a genre stereotype, not a measurement — matched on
  BPM + syllable rate against `GENRE_PROFILES`, then the genre's assumed
  value is copied out ("Southern Trap" → "rushing") and rendered to the
  user as "⚡ Rushing" in `ReactorHub.tsx`. No timing is examined. Should
  come out of the UI regardless of when real timing lands, and is the
  cultural-stereotyping risk already flagged for the Genre engine,
  shipped early and pointed at the user.
- Beat grid extraction — pocket needs the beat's *actual* onset grid, not
  a synthetic one derived from a single BPM number. Two maps (beat onsets
  + vocal onsets) instead of one, and "float" becomes definable: stable
  displacement with low variance that re-syncs at phrase boundaries, as
  distinct from high-variance drift. Server-side; beat tracking is mature
  (madmom/librosa/essentia) and modern produced hip-hop is its easy case.
  Known failure mode is the octave error, which is the BPM lane entry
  above. Needs a schema change — a sequence of onsets plus confidence,
  not a scalar `bpm`.
- Perceived acceleration without measured acceleration — hypothesis, not
  a claim, recorded in `docs/corpus/claims/perceptual-illusions.md`. A
  verse can feel like it speeds up while syllables-per-bar stays flat, if
  the rests consolidate into longer unbroken runs. If it holds it is the
  shape of finding the app should produce and currently cannot — number
  and feeling disagree, and the app can say why — and it is computable
  from syllable positions already captured, no new DSP. Untested against
  real verses; discard if it does not survive that.
- Transcription confidence must travel with the measurement — same rule
  as grid confidence below, for the transcription-dependent half of
  freestyle analysis. Phonemic restoration means a human and a
  transcriber genuinely disagree about what words are present in mumbled
  or masked audio, and the human is not wrong. A mismatch there is
  expected, not a bug to tune away.
- Grid confidence must travel with the measurement — when an inferred
  grid is ambiguous, every downstream microtiming deviation is computed
  against a possibly-displaced zero, so the numbers are false rather than
  merely weak. Low grid confidence must *suppress* the finding, not lower
  its score. Consistent with the fail-loud gate already agreed for
  cadence. Sourced from the Radiohead "Videotape" case where the band's
  own drummer could not locate beat one.
- Genre/Era/Geography Engine — reads the expanded metrics and produces a
  sonic fingerprint (primary genre, sub-genre blend, regional/cultural
  influence, era influence, comparable artists), validated against a
  Golden Master library of 50+ labeled reference-artist profiles rather
  than surface metrics alone (BPM/cadence is not enough — a false
  classification here is a credibility risk for the whole app). Needs
  confidence thresholds (stay quiet below ~60-70% rather than force a
  label) and explicit cultural-authenticity checks, not stereotyping.

  **Rule — "it's okay to not know," and not knowing has a reason.**
  Locked 2026-09-08. The pipeline is: receive every metric that bears on
  genre → compare against genre criteria → decide. The decision has
  *three* outcomes, not two:

  1. **One clear match** — report it with its confidence.
  2. **Plural match** — the song genuinely carries traits of several
     genres. This is a *result*, not a failure, and it is what "I don't
     know" almost always means here. It must be reported with its
     content: "the lyrics read closest to X and Y," or "it sounds like X
     but the lyrics carry traits of Y." Text and audio are allowed to
     disagree, and saying so is more informative than either alone.
  3. **Not measurable** — not enough input to run the comparison at all.
     Same condition as `measurability.ts` handles for the metrics.

  A bare "I don't know" with no reason attached is a **bug**. If the
  engine cannot say why it is uncertain, something upstream failed and
  the uncertainty is not the finding — the failure is.

  When the answer is plural, tell the user, then **ask them what it
  was.** That turns every uncertain classification into a labeled
  example, which is how the Golden Master reference library gets built
  without hand-labeling 50 artists up front (see
  `docs/corpus/claims/measurement-methodology.md` — human-scored labels
  beat algorithmic ones, and the cost of the labels is the point).

  Rationale, in the user's words: declining to guess "looks honest and
  more respectable than guessing a value." In signal-detection terms this
  deliberately accepts more misses to avoid false alarms, which is the
  correct trade when a wrong label is a credibility risk for the whole
  app.

  **The current implementation does the exact opposite and is a live
  defect.** `unifiedSongEngine.ts` clamps confidence with
  `Math.max(0.65, …)`, so the engine cannot report below 65%, and an
  unmatched song falls back to `GENRE_PROFILES[0]` — "Boom Bap / Golden
  Era." The worst case renders "Boom Bap / Golden Era — 65% Match" to the
  user. Both halves invented. Fix when this engine is built; until then
  the display should not ship.
- Public analysis site — a database of factual measurement sheets, one
  per song. **No lyrics, ever.** Not a lyrics site and not Genius: the
  claim is narrow and honest — *these are the results of this song
  according to Prosodic's engines*. Not a verdict on the music.
  - **Contents per song:** rhyme density / family / family clusters,
    syllable count and density, motif detection, and every other engine
    output, plus a written summary of the craft, a summary of the song,
    and a summary of how the craft serves it — **or whether it does at
    all.** That last clause is the differentiator: a site willing to say
    "the craft here is unremarkable, and here is the measurement" is
    trustworthy in a way praise never is.
  - **Text-only, deliberately.** The public tier is text analysis; audio
    stays in the app. This is the funnel, not a compromise — someone
    reads a page about a song they love, sees what is measurable, and
    wants to know what their own bars look like.
  - **Summaries are human-written by Masters**, with users voting and the
    winner published. This removes the generated-prose risk entirely
    rather than managing it, and it is the Pandora methodology from
    `docs/corpus/claims/measurement-methodology.md` — human-scored beats
    algorithmic, and the annotation cost is the point. Here the cost is
    paid in status rather than salary.
  - **Weight votes by hours practiced.** The app already measures the one
    thing that should decide whose read carries; a 4,000-hour writer's
    judgment is not a 40-hour writer's.
  - **This answers post-zero.** The Milestones entry above is undecided;
    this is the decision. Hit zero, become a Master, earn the right to
    write the canon. Note the deliberate asymmetry: **Dream Window is
    bought, this is earned.** It is the only tier money cannot skip, and
    that should stay true.
  - **Cold start:** nobody has 10,000 hours yet, so pages ship with stats
    only. They are complete on their own — that is the premise. Summaries
    accrue over months, and the page visibly improving is its own story.
  - **Gate, not a schedule:** the engines must survive being checked in
    public first. The app's numbers are private and wrong only to their
    owner; these would be permanent and checkable by anyone who knows the
    record. As of 2026-09-08 the engines still carry
    `internal_weave_density` as a boolean in decimal costume and a
    syllable counter that reads punctuation as content.
  - **Also needed:** contributor terms (the right to publish what people
    write), a takedown path, and lyrics acquired legally as *input* —
    computing on them privately is not redistributing them, but obtaining
    them still needs a licensed source.
- Upload + Story feature — fans upload a song (audio + lyrics) for
  metrics only. Artists can additionally upload pre-Prosodic material
  with context (age, year, years of experience) to build a "Story"
  timeline in their fingerprint/profile, showing measurable growth over
  time. Story completion (not just hour count) gates crossing from a
  regular account into the 10,000-hour Masters Club; Canon Events
  (named milestones) are optional within it.
- Freestyle performance analysis — a freestyle is a different task from a
  written verse, not the same task done worse, so judging it by written
  standards is a category error. The classification layer is BUILT
  (migration v7, `performance_mode` on takes, asked never inferred, with
  `other_artist` so quoting someone else's verse has a truthful answer).
  What still needs on-device audio:
    - Fast, no words needed: hesitation gaps (silence not landing on a
      rhythmic rest), gap position (mid-bar before a rhyme = searching),
      recovery time after a stumble, sustain curve across bars.
    - Slow, needs transcription: filler rate, immediate self-repetition
      (repeating to stay afloat), rhyme-search latency, semantic
      coherence under pressure.
    - Hardest piece, everything depends on it: telling a deliberate empty
      bar from running out of words. Both are silence. Three
      discriminators — position (intentional space lands on a bar
      boundary; searching happens mid-bar), what follows (confident
      re-entry vs rushing to catch up), and duration shape (a rest is
      clean; a search has ragged edges or a held vowel).
    - Difficulty is context, not a score bonus: freestyles compare to
      other freestyles, never across modes. That split makes "your
      freestyle density is now within 10% of your written density" a
      visible finding, which it is not otherwise.
    - Anomaly prompt: when the freestyle markers go quiet all at once
      (not merely "quality went up"), ask whether it was written —
      worded as data protection, never suspicion, and only when the
      markers are near-absent, so a genuine breakthrough is never
      deflated by being questioned.
- Quick Record (Memo) feature — a fast record-a-melody-or-freestyle
  capture separate from the main Song Studio flow. On stop: save as
  memo, send to a new song draft, or set a research/practice reminder.
  Real-time pointers during/after recording (e.g. "you rushed the
  bridge"), backed by the same metrics engine.
- Engines as AI personas + "dreaming" memory — considered turning each
  analysis engine into its own LLM-backed character (voice/personality)
  rather than a silent scorer, with a scheduled memory-consolidation
  step per persona modeled on Anthropic's Claude Dream (review recent
  sessions between uses, update its own memory, no human has to point
  out the pattern). Researched against the old Prosodic codebase
  2026-09-04: no prior art for this exists there — the old app enforced
  the opposite, a tested "zero mouth violations" rule where every engine
  stayed silent/numeric and exactly one top-level mentor persona (VEIL/
  "Osborne") spoke on their behalf. Reusable from that codebase: the
  `AIProvider` interface/adapter/circuit-breaker pattern, and VEIL's
  system-prompt-as-character technique as a template for N personas
  instead of one. Real constraint if revisited: analysis currently fires
  on every ~500ms autosave debounce, so per-persona LLM calls cannot run
  at that frequency — any persona/dreaming layer must trigger on
  explicit user action (song completion, "get feedback") or on a
  scheduled cadence (weekly dreaming), never on live keystrokes. Rough
  modeled cost at Sonnet 5 pricing ($3/$15 per M input/output tokens):
  ~$0.03-0.05 per song for an 8-persona feedback pass, ~$0.08/week for a
  full dreaming cycle across 8 personas — roughly $1-1.35/active
  user/month. This is Step 8 (AI Mentor) territory, not Step 5, and a
  materially bigger scope than the single-mentor version already
  implied by the v1 spec — revisit at Step 8, not before.

  Refined 2026-09-04 into a specific premium feature, "Dream Window":
  a paid yearly subscription (user correction, same day: membership is
  bought, not purely hours-earned — this needs reconciling later against
  the Upload/Story entry above, which still gates the 10,000-hour
  Masters Club itself on Story completion, not payment; whether Dream
  Window is the same gate as Masters Club or a separate paid add-on on
  top of it is undecided, flag at Step 8). No internal tiers once
  someone is a paying member — the shallow-vs-deep triage below is a
  response-timing mechanism (answer now vs. fold into tonight's cycle),
  never a paywall ladder inside the feature itself. Where the user can
  read a transcript of the personas' overnight "conversation" debating
  and synthesizing insight about their craft/progression/projects.
  Design corrections locked in during this discussion:
    - The "conversation" must be one carefully-orchestrated generation
      producing a dialogue-formatted transcript, never literal live
      multi-agent message-passing between separate API calls — same
      effect, a fraction of the cost, none of the latency/rate-limit
      fragility.
    - Every claim in the transcript must trace back to a real
      fingerprint/rollup value. No claim, no line — this is the single
      biggest lever on whether the feature feels revelatory or like
      slop, given how much anticipation "insight you've never seen
      before" sets up.
    - The overnight cycle needs an actual server-side scheduled job
      (worker + queue), independent of the app being open — the first
      feature in this build that requires the backend to proactively do
      work rather than just store/relay on-device data.
    - Users can leave Osborne (the single top-level mentor, matching
      VEIL's role in the old codebase — never the individual engine
      personas directly) a question or prompt to have the team ponder.
      Osborne triages it: shallow/factual questions get answered
      immediately in real time (cheap, fast model tier — no dream cycle
      triggered); questions with real depth (need synthesis across
      metrics/time, benefit from the personas disagreeing and
      reconciling) get folded into the next dream cycle alongside the
      baseline autonomous craft/progression review, which never gets
      replaced by a directed question, only supplemented.
    - Escalation override: after a quick real-time answer, the user can
      say "have the team actually sit with this overnight anyway" —
      protects against Osborne misjudging a casually-phrased but
      genuinely deep question as shallow.
    - Input surface should be a curated prompt menu + one short
      freeform note, not an open chat box — unconstrained free text
      turns this into "ask the AI anything" and defeats the premise.
    - Unify with the Quick Record memo "set a reminder" mechanism from
      the memo backlog entry above — one inbox for "leave a note for
      later," two entry points, not two separate systems.
    - Personas must be allowed to answer "not enough data yet" rather
      than always producing a confident answer — the credibility of the
      other 90% of transcripts depends on the system being willing to
      say this sometimes.
    - "Equip engines/personas with ECC" was asked and rejected: ECC
      (this development harness's agents/skills) is dev-time tooling for
      building Prosodic, not something that ships into a production
      backend — it assumes file/bash access and a single developer
      footing the bill, neither of which fits a multi-tenant mobile
      backend. The real equivalent, confirmed as the design: each
      persona is one LLM call with a defined role plus a short list of
      narrow, read-only, per-user-scoped lookup functions (native
      API tool-use) — never file/bash access, never open-ended action-
      taking. The 8 silent analysis engines need none of this; only the
      talking layer (Osborne, his inner hemispheres, the dream
      personas) ever calls an LLM.
    - Osborne's access scope, reconfirmed: matches the "AI Mentor" line
      already locked under V1 scope above — read access to all app
      sections/data by default, with personal info and a handful of
      specific user settings as the only carve-outs (enumerated at
      Step 8, not before). Do not scope him down to a narrow hand-picked
      tool list in the name of caution — the carve-out list is the
      control, not a short allowlist of what he's permitted to see.

## Reference: outside corpus

`docs/corpus/` — claims about how music works, stored with their sources
and a confidence label (`established` / `reported` / `anecdotal`).

Two uses, and they are different:

- **Engine design.** When a threshold or a design decision rests on a
  claim about music, the claim goes here with its source, so the
  reasoning survives the conversation that produced it.
- **Osborne's voice.** Material he may *cite*. Not material he may
  paraphrase into a confident claim of his own — same rule as the Dream
  Window's "no claim without a value behind it."

Nothing in the corpus has been verified against a primary source unless
its file says so. It is music journalism: a reasonable basis for design
intuition, a bad basis for a shipped metric. Anything that becomes a
number in code needs its own validation first.

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
half of step 2.** Steps 0-4 are built. Step 2's text half is built.
Step 5's first slice — record a take, play it back, list it under the
song — is code-complete and unverified on a device (see below).

Verified by running the checks, not by self-report:

- `npx tsc --noEmit` — exit 0.
- `npx jest` — 30 suites, 235 tests, all pass.
- `npx eslint src/` — 0 errors in the data/service layer. Four pre-existing
  `react/no-unescaped-entities` errors remain in `FramedArtModal` and
  `ReactorHub`, untouched.
- `npx expo-doctor` — 21/21 checks pass. `expo-asset` (a required peer of
  `expo-audio`, whose absence expo-doctor warned "may crash outside Expo
  Go") is installed, and the eight SDK 57 patch mismatches are aligned.
- **Undefined states closed (2026-09-08).** Each was a state the schema or
  the spec allowed and the code made unreachable:
  - *Tempo.* `song_context.bpm` and `bpm_source` were nullable by design,
    but every new song was born `bpm: 90, bpmSource: 'user'` — the app
    claimed the writer chose a tempo they never touched — and five read
    sites defaulted to 90. New songs now start with no tempo. A single
    named `LAYOUT_FALLBACK_BPM` draws the bar grid; `latestBpm` stays null
    until a real tempo exists, and `measurability.ts` refuses
    `cadence.spb_consistency` without one rather than measuring against an
    invented number.
  - *Genre confidence.* `Math.max(0.65, …)` made it impossible to report
    below 65%, and an unmatched song fell back to `GENRE_PROFILES[0]`, so
    the worst case rendered "Boom Bap / Golden Era — 65% Match". Replaced
    with the three-verdict rule (`single` / `plural` / `not_measurable`).
    Confidence is scored against all 100 available points, so a song with
    no tempo caps at 0.60 instead of having its missing evidence
    normalised away.
  - *Recording interruption.* `useVoiceRecorder` had no AppState listener
    and no unmount cleanup, so a call or app switch mid-take was
    undefined. The take is now stopped and handed to the same save path a
    normal stop uses.
  - *BPM writes* were unguarded and could throw out of a React event
    handler while the header already showed the new value.
  - *Translation fallback* to `hybrid` on an unknown mode is now logged
    rather than silent.
- Five genre tests and one master-suite test were asserting the forced
  label and had to be rewritten. At 140 BPM / 5.5 SPS with no devices,
  Southern Trap and UK/NY Drill both score exactly 75 — genuinely
  indistinguishable — and the old code broke the tie by array order. The
  engine still commits when evidence separates (Boom Bap with its own
  devices scores 100).
- **Absence is representable (migration v9).** `fingerprint.value` and
  `rollups.value` are nullable with a `not_measured_reason`, guarded by
  `CHECK (value IS NOT NULL OR not_measured_reason IS NOT NULL)`. Before
  this, "scored zero" and "never measured" were the same row, and an
  empty song produced a full confident profile — 0.75 syllabic symmetry
  for a document with no words in it, gibberish scoring a perfect 1.0.
- `src/services/measurability.ts` gates every metric on whether the input
  can support it, using definitional thresholds only (a relation needs
  two terms; variance over one sample is undefined).
- `src/services/nullCondition.test.ts` pins the floor. Its load-bearing
  assertion is that a real verse is measurable in strictly more ways than
  noise is — if that stops holding, the metrics are not tracking craft.
- `clamp()` no longer swallows NaN into 0.0. A non-finite result is now
  an absence with a reason, not a confident score of zero on a
  `higher_is_better` metric.
- A prior test asserted that empty lyrics produce finite non-NaN scores,
  and passed — it was enforcing the bug. Rewritten to assert absence.
- Calibration boundary is wired: `persistCalibratedSession` is called
  from the Song View save path, seeds canonical metrics on DB open, and
  writes `analysis_calibrated` events plus fingerprint rows.
- `src/services/persistCalibratedSession.test.ts` fails if a raw engine
  score reaches any SQL parameter, or if a metric_id outside the
  canonical namespace is emitted.
- `expo-audio` (~57.0.4) is installed, `app.json` declares the
  microphone permission plugin (`NSMicrophoneUsageDescription` on iOS,
  `RECORD_AUDIO` on Android).
- `voice_takes` table exists (migration v4), FK'd to `song_context`,
  append-only like Events — a bad take is deleted, never corrected in
  place. `src/data/repositories/voiceTakes.test.ts` covers insert/list/
  delete against the fake DB harness.
- `src/hooks/useVoiceRecorder.ts` is the one file that touches
  `expo-audio` directly — permission request, start/stop, live
  duration — so the native surface stays in one place.
- `PlannerModal`'s "Voice Vault" now renders real takes for the active
  song and records real ones; the record button flips to a live "Stop
  (0:07)" state and a fresh take appears in the list on save. The
  hardcoded sample takes are gone.
- Voice takes reload on song switch and reset on new-song creation,
  handled explicitly in `handleSelectSong`/`handleCreateNewSong` rather
  than an effect — an effect that read `activeSong.id` and called
  `setVoiceTakes` synchronously was caught by
  `react-hooks/set-state-in-effect` during this build and removed.

**Not yet verified — flagged explicitly per the Verification protocol,
not rounded up to done:**

- **Never run on a real device or emulator.** Permission prompts,
  actual microphone capture, and file playback have not been observed
  by a human. This is not possible from this Windows dev machine
  without Android Studio/a physical device/EAS build. The Step 5 exit
  criterion — "record ten seconds on a real device, play it back, and
  see the take listed in the vault after an app restart" — is not met
  until someone does this on hardware.
- Everything downstream of raw audio — on-device VAD, server-side heavy
  DSP, BPM refinement into SongContext, MP3 import — is still unbuilt.
  This slice only proves the app can capture and play back a voice.

Known gaps, deliberately not rounded up to done:

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

# Overnight build brief — Prosodic

You are working unsupervised. Nobody will answer questions until morning. That
changes what "good" means: a smaller amount of work that is **verifiably correct
and honestly reported** beats a large amount that has to be audited from scratch.

---

## 0. Read these before touching anything

In this order. They are not background — they are the rules you are held to.

1. `CLAUDE.md` — project spec, build order, locked decisions, backlog
2. `AGENTS.md` — the "don't build yet" and brainstorm protocols
3. `docs/architecture/README.md` — the 4+1 view index
4. `docs/architecture/components.md` — component boundaries and layer rules
5. `docs/architecture/sequence-typing.md` — the process view and why it exists
6. `docs/architecture/deployment.md` — what runs where
7. `brand-kit/BRAND_KIT.md` — the approved visual identity

Then run `npm run verify` and confirm it passes **before** you change anything.
If it fails on a clean checkout, stop and report that — do not build on a red
baseline.

---

## 1. The one thing that matters most

This codebase spent a week having **fabricated measurements** removed from it.
Not bugs — numbers that looked like measurements and were not.

Real examples that shipped and were found:

- An empty song scored **0.75 for "syllabic symmetry."** Gibberish scored a
  perfect **1.0**.
- The genre engine clamped confidence with `Math.max(0.65, …)`, so it was
  **mathematically incapable** of reporting below 65%, and an unmatched song
  fell back to `GENRE_PROFILES[0]` — rendering *"Boom Bap / Golden Era — 65%
  Match"* for anything it could not classify.
- `clamp()` turned NaN into `0.0`, so a failed calculation became a confident
  score of zero on a `higher_is_better` metric.
- A HUD read *"Dominant Rhyme Scheme: Cyan (IY)"* for every song ever written,
  because it was a default parameter the parent never passed.

**The guards that now prevent this are load-bearing. Do not weaken any of
them to make a feature work:**

| Guard | File | What it stops |
|---|---|---|
| Measurability gate | `src/services/measurability.ts` | Metrics computed on input that cannot support them |
| Null-condition floor | `src/services/nullCondition.test.ts` | Scores that are indistinguishable from noise |
| Namespace drift test | `src/services/namespaceSync.test.ts` | A metric declared but never given a rule |
| Composite weight assertion | `src/services/engines/registry.ts` | An engine removed without rebalancing the index |
| Encoder boundary | `src/services/persistCalibratedSession.ts` | A raw score reaching a SQL parameter |

If a task seems to require disabling one of these, **that is the signal the
task is wrong.** Stop and write it up instead.

### The governing rule

> **A count needs no reference. A judgment does.**
>
> Syllables per bar is a count — complete on its own. The moment a number
> implies *typical, unusual, strong, weak, improving*, it is a judgment, and a
> judgment with no reference behind it is fabricated.

**Absence must be representable.** A metric that cannot be measured stores
`null` with a reason, never `0`.

**Thresholds must be definitional, not tuned.** "Variance needs two samples" is
a fact about the operation. "Six syllables is enough" is someone's guess. If you
must introduce a tuned constant, put it in one named block with a comment saying
plainly that it is a product decision and not a measurement.

---

## 2. What to build — in this order

Stop at the end of any task if `npm run verify` fails and you cannot fix it
cleanly. Do not proceed with a red build.

### Task A — Four declared-but-empty metrics

These are already in the canonical namespace and already listed in
`KNOWN_UNIMPLEMENTED` in `src/services/namespaceSync.test.ts`. Implementing one
means: write the engine logic, add a measurability rule, add a calibration
entry, and **remove it from the known-unimplemented list.** The drift test
enforces all four steps.

1. **`rhyme.mosaic_rate`** — mosaic rhymes: a multi-word phrase rhyming with a
   single word or another phrase across word boundaries ("predictable pattern" /
   "unforgivable fathom"). The CMU phoneme table is already in the schema
   (`src/data/repositories/cmuPhonemes.ts`).
2. **`rhyme.vocabulary_recycling_rate`** — how much the writer reuses their own
   vocabulary. Type-token ratio is the obvious form; Shannon entropy over word
   frequency is the better one. State which you used and why.
3. **`cadence.enjambment_rate`** — how often a syntactic unit runs past the line
   break instead of resolving on it.
4. **Hook redundancy / self-similarity** — see the backlog entry on the lyric
   self-similarity matrix. Both axes are word position; cells mark repeats.
   Text-only, no audio, no model.

**Every one needs:** a measurability rule stating what input it requires, and an
entry in `nullCondition.test.ts` recording what it reports for empty input,
gibberish, and a real verse. **A metric with no floor is not a measurement.**

### Task B — Brand drift

`brand-kit/BRAND_KIT.md` defines the approved identity. `src/constants/theme.ts`
uses **none of it** — not one brand colour, not one of the three specified fonts
(Space Grotesk / Inter / Sora). The app currently ships the default Expo palette.

1. Produce `docs/BRAND_DRIFT.md` — every colour, font, and user-facing string
   across all 20 files in `src/components/` compared against the kit. A table,
   not prose.
2. Fix the mechanical half: theme tokens to the kit's exact hex for both dark
   and light mode, and wire the three fonts.
3. **Leave copy rewrites as proposals in the doc, do not apply them.** Voice is
   the owner's call. The kit's tone spec is *"premium but useful, artistic
   before technical, clear and encouraging, never academic, never gimmicky."*

### Task C — Mastery clock: the balloon model

`CLAUDE.md` section 4 specifies it fully and states plainly that **the current
code contradicts the spec** — `masteryClock.ts` still implements the old
30-second-grace-then-rollback rule.

Implement the spec as written. Keep `masteryClock.ts` pure — it takes `nowMs`
rather than reading the clock, which is why it is testable. Keep every existing
test passing or explain precisely why one had to change.

**Note the pattern:** several of this project's worst bugs came from tests that
asserted the buggy behaviour and therefore passed. If a test blocks correct
behaviour, say so explicitly in your report rather than quietly editing it.

### Task D — Research (read-only, no code)

Find open-source repositories and datasets that would genuinely help. Write
findings to `docs/RESEARCH_FINDINGS.md`. **Do not install anything.**

Look for:

- **Phonetics / G2P** — CMUdict wrappers, `pronouncing`, phonemizers, syllable
  counters, stress detection. The current syllable counter has a known defect:
  it scores `"... --- !!!"` as one syllable.
- **Rhyme detection** — multi-syllabic and slant-rhyme matchers, phonetic
  similarity metrics.
- **Prosody and meter** — metrical scansion, stress-pattern analysis.
- **Beat tracking / onset detection** — madmom, librosa, essentia, aubio,
  BeatNet. Relevant to the backlogged beat-grid work. Note which handle the
  octave-error problem (half vs double tempo).
- **Labeled music datasets** — anything usable as a reference population. The
  project has no baseline distribution, which is why every score is currently
  "0.73 of nothing."
- **Rhetorical device detection** — the device guide covers 127 devices.

**For each finding record:** name, link, licence, last commit date, whether it
is maintained, and one honest sentence on what it would replace or enable here.
**Licence and maintenance status are not optional** — an unmaintained GPL
library is not a usable finding for a commercial mobile app.

### Task E — Recording sequence diagram

`docs/architecture/sequence-typing.md` documents one keystroke. There is no
equivalent for recording. Produce `docs/architecture/sequence-recording.md` in
the same style — mermaid, with the timing constants listed and each one marked
as either definitional or arbitrary.

Four of this project's bugs were process-view failures found by grep, one at a
time, months late. The typing diagram exists because drawing it would have
caught them in ten seconds.

---

## 3. Absolutely do not

- **Do not touch the build or release path.** Not `eas.json`, not `app.json`'s
  identity fields, not the icon, not credentials. A human is mid-flight on an
  iOS build and your changes would collide.
- **Do not implement a genre threshold matrix** (SPS > 4.8 → Hip-Hop, etc.).
  Those numbers have no measured population behind them. This is the exact
  fabrication class already removed once.
- **Do not add a user-history Bayesian prior to genre classification.** It makes
  the engine tell people what they already are, which is the opposite of a
  growth tool, and it is circular — the prediction validates itself.
- **Do not mark any build-order step complete.** Steps require verification
  from outside the author. You cannot provide that for your own work.
- **Do not delete or weaken a test to make something pass.**
- **Do not add dependencies** without recording the licence and justification in
  your report. Prefer nothing new.
- **Do not refactor beyond the tasks listed.** No unsolicited cleanups.

---

## 4. How to work

- Small commits, one concern each, conventional format (`feat:`, `fix:`,
  `docs:`, `test:`, `refactor:`). Work on a branch, never `master`.
- Run `npm run verify` after every task. It is `tsc` + jest + eslint +
  expo-doctor, roughly 20 seconds.
- Comments explain **why**, not what. Match the density of the existing code —
  look at `src/services/measurability.ts` for the register.
- When a decision has two defensible answers, pick one, implement it, and record
  the other in your report. Do not stall waiting for input.

---

## 5. Morning report — `docs/OVERNIGHT_REPORT.md`

Write this as you go, not at the end.

**For each task:** what you did, what you verified, and the exact command output
proving it.

**Then, and this section matters more than the rest:**

- **What you were unsure about.** Every assumption you made that could be wrong.
- **What you could not finish, and precisely why.**
- **Anything you found that is broken but out of scope.** Name it, do not fix it.
- **Any number you introduced that is not definitional.** List every one.

**Do not round anything up to done.** "Implemented and tested, unverified on a
device" is the correct and useful sentence. "Complete" is not, and this project
has a documented history of a step being certified complete while the code had
no callers at all.

If you finish everything and there is time left: **stop.** Do not invent work.
Write the report and end. An honest short night is worth more here than a long
one that has to be audited.

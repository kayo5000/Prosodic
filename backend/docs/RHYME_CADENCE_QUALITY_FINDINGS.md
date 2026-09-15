# Rhyme & Cadence Quality Findings

A real investigation, not a code review — real verses through the real, live `/analyze` pipeline (local Flask, current code, 2026-08-17), plus direct calls to the scoring functions themselves to isolate root cause. Every claim below has an actual example and actual output attached; nothing here is "could probably be better."

**Bottom line up front:** there is one dominant, systemic root cause behind most of what would read as "bad" rhyme output, and it's not subtle — it's the primary behavior of the core scoring tier, not an edge case. Full detail in §1. A second, previously-known bug (self-rhyme on spelling variants) is confirmed still live and is actually worse than documented — it affects the real pipeline through a completely different, unguarded code path. §3 covers cadence, which is in meaningfully better shape.

---

## 1. THE finding: near-rhyme scoring ignores the coda entirely

`domain/phoneme_engine.py`'s `syllable_rhyme_score()` has a tier — 0.88, "same nucleus incl. stress digit (diff coda)" — that fires whenever two syllables share the same stressed vowel phoneme, full stop. It does **not** compare anything that comes after that vowel. `RHYME_THRESHOLD` (the bar for "these two syllables rhyme," `domain/prosodic_config.py:65`) is 0.78. Since 0.88 clears that bar, **any two words that happen to share a stressed vowel get grouped as rhyming, regardless of how different they sound.**

Verified directly against the actual function, current code, no hypotheticals:

```
'love'    → rhyme_unit ('AH1', 'V')
'enough'  → rhyme_unit ('AH1', 'F')
score = 0.88  →  GROUPED   ← this one is a genuinely good slant rhyme

'started' → rhyme_unit ('AA1', 'R', 'T', 'AH0', 'D')
'block'   → rhyme_unit ('AA1', 'K')
score = 0.88  →  GROUPED   ← nobody hears "started" and "block" as rhyming

'cut'     → rhyme_unit ('AH1', 'T')
'gun'     → rhyme_unit ('AH1', 'N')
score = 0.88  →  GROUPED   ← same problem, T vs N codas

'cat'     → rhyme_unit ('AE1', 'T')
'dog'     → rhyme_unit ('AO1', 'G')
score = 0.00  →  not grouped   ← different vowel, correctly rejected
```

**The score is identical (0.88) whether the coda is a near-miss (love/enough — one consonant, same manner and place) or has nothing in common at all (started/block).** The algorithm has no way to tell these apart, because it never looks.

### What this actually did to a real verse

Ran this through live `/analyze` (bpm 90):

```
Started from the bottom now I'm runnin' the game
Every single dollar that I earned I ain't playin'
Money on my mind but the Money ain't the same
Building something real not a moment gonna fade
Now the whole block knows my name ain't nothing but respect
Running from the pain but the pain is what I check
```

Real rhyme-family groupings from the actual response (`color_id` = the value the mobile app uses to color-code chips):

| Group | Words | Real listener verdict |
|---|---|---|
| `color_id=1` | Started, bottom, dollar, block | "Started" and "block" flagged as the same rhyme family. They don't rhyme. |
| `color_id=4` | runnin', Money, Money, something, nothing, Running | "money"/"running" flagged as rhyming (see §1 above) — mixed in with a real self-rhyme bug (§2) in the same group |
| `color_id=6` | Every, respect, check | "Every" grouped with "respect" and "check." It doesn't rhyme with either. |
| `color_id=8` | moment, whole, knows | Three words sharing only a vowel, flagged as one family |

Four of the eight multi-line groups this one verse produced are false positives by this same mechanism. This isn't a rare edge case triggering occasionally — it's what the second-most-common scoring tier *does*, on ordinary text.

### It compounds through transitivity — this is the part that will look worst to a user

`rhyme_detection_engine.find_rhyme_groups()` uses Union-Find, so if A~B and B~C both clear threshold, A/B/C become one family even though A and C were never compared. Tested on a second verse (`complicated / medicated` present as a genuinely correct perfect rhyme):

```
She said the situation got complicated
Every single conversation felt medicated
I never thought that I would be this hesitant
Living every moment like a strange experiment
```

Real output groups **said, Every, felt, never, hesitant, every, experiment** — seven words spanning all four lines — into one single rhyme family, because each pairwise link cleared 0.78 on a shared EH-ish vowel even though the group as a whole doesn't sound like one rhyme scheme to a reader. The `compound_sequences` detector (used for cross-word-boundary multi-rhymes) shows the same pattern: 9 "matches" found for a 4-line verse, several of them phrase pairs that don't actually sound alike read aloud (e.g. `['said', 'situation'] <-> ['Every', 'single']` at 82%).

**This is very likely the dominant contributor to "rhyme detection feels pretty bad."** A user who wrote one real, tight rhyme (complicated/medicated, scored correctly at 100%) would see it buried in a sprawling, mostly-wrong group of 7 words, with no way to tell from the output which pairing was the real one — because...

### There's no severity signal exposed to the user at all

The `/analyze` response's `rhyme_map` gives each syllable a `color_id` (bucket membership) and nothing else — no per-pair score, no "tight vs. loose" distinction. Confirmed by reading the actual response schema: fields are `char_end`, `char_start`, `color_id`, `is_stressed`, `line_index`, `on_pocket`, `stream_index`, `syllable_index`, `word`, `word_index`. A 100%-match pair and a 0.78-just-barely-cleared pair render identically in the app. Even if the scoring tiers were left exactly as-is, surfacing the actual score per group (or a "strength" tier: perfect / strong / loose) would let a user see that "complicated/medicated" is the real rhyme and "Every/said/felt" is noise — right now that distinction is computed internally and then thrown away before the response is built.

**What would actually fix the root cause** (not attempted here — this is a report, not a patch): the 0.88 tier needs to compare the coda, not just the nucleus — e.g. require the consonants after the stressed vowel to share place/manner of articulation (or literally match, falling back to a lower score for vowel-only matches) rather than passing anything with a matching vowel straight through. That's a real algorithm change to `syllable_rhyme_score()`, not a threshold tweak — bumping `RHYME_THRESHOLD` above 0.88 would just kill legitimate near-rhymes like love/enough along with the false positives, since they currently score identically.

---

## 2. Self-rhyme / spelling-variant bug — confirmed live, worse than documented

The known issue (case/apostrophe variants of the same word scoring as perfect rhymes) is real and still live. Direct re-verification:

```
'Money' vs 'money'        → rhyme_score() = 1.00   (raw string equality check: False — doesn't catch it)
"runnin'" vs 'Running'    → rhyme_score() = 1.00
'now' vs 'Now'            → rhyme_score() = 1.00
```

But tracing the actual call graph turned up something the original flag didn't capture: **the guarded function (`phoneme_engine.rhyme_score()`, which at least attempts a `word_a == word_b` identity check) is not what the live verse-analysis pipeline calls.** `rhyme_detection_engine.find_rhyme_groups()` — the function that actually powers `/analyze` — calls `syllable_rhyme_score()` directly on pre-computed rhyme units, a lower-level function with **no identity guard of any kind**, not even the broken raw-string one. Confirmed identical 1.00 output through that exact path too. So this isn't "the guard doesn't handle case variants correctly" — it's "the guard the codebase already wrote for this doesn't run in the code path that needed it."

Real-verse confirmation: the test verse above literally has "runnin'" (line 1) and "Running" (line 6), plus "Money" appearing twice with different capitalization on line 3. All three landed in the same `color_id=4` rhyme group, alongside the money/running coda-blind false-positive from §1 — meaning this one small group in the real output mixed a genuine algorithm bug (self-rhyme) with the systemic scoring gap (§1) and was visually indistinguishable from either.

**Fix shape:** the identity check needs to run on the *normalized* word (same normalization already used to build the rhyme unit), not the raw input string — and it needs to run inside `rhyme_detection_engine.py`'s actual candidate-comparison loop, not just in the separate wrapper function that verse analysis doesn't call.

---

## 3. Cadence / pocket — meaningfully better shape, one real caveat

Ran the same verse at BPM 65 and BPM 175 to check whether pocket/cadence output is genuinely tempo-sensitive (a `pocket_engine.py` bug — tempo-blind positioning — was flagged and fixed in an earlier audit; re-verified here, not assumed still fixed):

| BPM | on_pocket hits | stress_clash | promotion | demotion | stress_lapse |
|---|---|---|---|---|---|
| 65 | 31/55 | 11 | 12 | 0 | 1 |
| 175 | 27/55 | 9 | 11 | 1 | 2 |

Real, non-trivial differences at every BPM — this is genuinely tempo-aware, not a static grid dressed up with a BPM label. `flow_signature` returned `"On-Grid"` at both tempos for this verse, which is plausible (the verse's syllable count was moderate for both tempos) rather than a stuck-value bug — didn't get to test a verse deliberately too dense for a slow BPM to confirm the signature actually changes under real strain; worth a follow-up if there's time.

`stress_clash` signal counts (9-21 per ~50-55 syllable verse, ~20-38%) looked high at first read, but tracing `stress_signals.py`'s own docstring shows this was already investigated during that module's own build: it explicitly notes function-word pileups were found to cause false stress-clash noise and were suppressed (`_effective_lexical_stress()`, `domain/stress_signals.py:156-168`), and every clash signal correctly carries a `deliberateness` field defaulting to `'uncertain'` rather than asserting the writer meant it. This looks like working-as-designed on verse that wasn't written with tight metrical control (my own quick test verses, not a curated example) — not a new finding. Would need a real, professionally-flowed reference verse to say anything sharper about cadence quality specifically; didn't have time to source one this pass.

**No cadence-side bug found equivalent in severity to §1/§2.** The one open, previously-known gap (`normalization_engine.py`'s g-dropping erasure — "wearin'" silently becomes "wearing," losing the performed-register signal) is real per `docs/ARCHITECTURE.md` but didn't show up as a quality problem in this pass's actual outputs; it's a lost-signal issue, not a wrong-output issue.

---

## 4. Summary for the walkthrough

1. **`syllable_rhyme_score()`'s 0.88 tier ignores coda similarity entirely** — this is the real fix, and it's an algorithm change (compare consonants after the stressed vowel, don't just check the vowel), not a threshold tweak. Everything in §1 traces back to this one function.
2. **Self-rhyme guard exists in the codebase but doesn't run in the path that needs it** — `rhyme_detection_engine.py` needs its own normalized-word identity check; the existing one in `phoneme_engine.rhyme_score()` isn't reachable from live verse analysis.
3. **No rhyme-strength signal ships to the client** — even without touching the scoring algorithm, exposing a per-group or per-pair strength value would let the mobile UI visually distinguish "complicated/medicated" (real) from "Every/said/felt" (algorithmic noise), which would likely take a real bite out of how "bad" the output *feels* even before §1 is fixed.
4. **Cadence/pocket is the more solid half of the pipeline** — genuinely tempo-sensitive, thoughtfully guards against known false-positive classes, no comparable systemic bug found. Not fully stress-tested against a professionally-flowed reference verse — flagged as a real gap in this investigation's coverage, not a clean bill of health.

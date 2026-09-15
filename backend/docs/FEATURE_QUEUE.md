# PROSODIC — Feature Queue (Thesaurus/Word-Relationship Brainstorm)
**Started:** 2026-08-02
**Status:** Tiers A, B, C1, and C2 are all BUILT (2026-08-02/03). See `docs/BUILD_LOG.md` for what was actually shipped, including bugs fixed along the way. C3 parked — no usable dataset exists, not built.

---

## Locked In — Build Order

Build tiers are ordered by cost (not by how good the idea sounds). Do NOT reorder without a reason — Tier A has no new data dependencies, Tier B shares one foundation, Tier C needs brand-new datasets.

### Tier A — cheap, zero new data needed, build first
- **A1. Metaphor bridge finder** — given two unrelated topics/motifs, chain `thesaurus_engine.lookup()` + `reverse_lookup()` (both already written, currently unused) to find a word connecting both. Useful for extended metaphors.
- **A2. VEIL grounding** — have `/veil/chat` query the real thesaurus DB when giving craft feedback instead of relying on the model's own (sometimes made-up) word associations. Wires an existing engine into an existing chat feature.
- **A3. Motif engine auto-suggest** — when a user has a motif cluster (`motif_bank`), have the thesaurus propose additional words to add to it, instead of requiring 100% manual entry.
- **A4. Syllable-aware synonym search** — standalone "look up a word" tool that filters/sorts synonyms by syllable count so results fit the bar's rhythm. Combines `thesaurus_engine` + `syllable_engine`.
- **A5. Combined synonym+rhyme browser** — type a word, see both its synonyms and which of those synonyms also rhyme with your active verse families, in one view. Combines `thesaurus_engine` + `rhyme_detection_engine`/`phoneme_engine`.

### Tier B — real value, all three share one missing foundation (build it once, get three features)
Foundation needed: a usage-history data layer on top of `fingerprint_pipeline.py` + `feature_store.py` (currently dead/unwired — Tier 3 in `docs/AUDIT.md`), tracking word/rhyme-family usage over time.
- **B1. Personal word-choice fingerprint** — suggest words based on the user's own past word choices, and show them a report on their own rhyme/vocabulary patterns over time.
- **B2. Anti-cliché detection** — flag rhyme/word pairs that are statistically overused (money/honey/funny-tier), by running `fingerprint_pipeline.py` against a large lyric corpus and counting rhyme-pair frequency. Same underlying data pipeline as B1.
- **B3. Repetition warning** — flag when a suggested word has already been used elsewhere in the song, using the same usage-history layer as B1/B2.

### Tier C — needs a brand-new dataset that doesn't exist in the project yet, lowest priority
- **C1. Prefix/root/suffix suggestion (polyptoton)** — suggest words sharing a root with a word already used (e.g. "gravity" → "gravitate" → "gravitational"). Needs a stemmer (NLTK has one) or new dataset. Ties into `device_detection_engine.py`'s existing rhetorical-device framework.
- **C2. Concreteness/imagery bias** — favor vivid/sensory synonyms ("cold steel") over abstract ones ("violence"). Needs a public concreteness-rating dataset (e.g. Brysbaert norms).
- **C3. Register/slang filtering** — block overly formal synonyms that wouldn't fit hip-hop vernacular (e.g. "domicile" vs "crib"). Needs a new slang-tagging dataset.

## Considered, Not Queued

- **Antonym suggestion** — Moby Thesaurus DB only has `words`/`synonyms` tables, no antonym data. Would need an entirely new data source. Parked, not rejected.

---
*Nothing in this file is built. Do not start building until explicitly told to. This file is the source of truth for this feature set — no need to re-brainstorm/re-audit before starting a build; just re-read this file.*

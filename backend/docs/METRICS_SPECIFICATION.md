# Prosodic — Metric System Specification

This document provides the definitive specification of all computational metrics, craft signals, algorithmic thresholds, and scoring models implemented across the Prosodic hip-hop lyric analysis suite.

---

## Table of Contents

1. [Architectural Framework & Normalization](#1-architectural-framework--normalization)
2. [Rhyme & Phonetic Architecture](#2-rhyme--phonetic-architecture)
3. [Syllable & Rhyme Density](#3-syllable--rhyme-density)
4. [Cadence, Pocket & Beat Grid Mechanics](#4-cadence-pocket--beat-grid-mechanics)
5. [Compositional Structure & Phrase Packaging](#5-compositional-structure--phrase-packaging)
6. [Visual Motifs & Pattern Reading](#6-visual-motifs--pattern-reading)
7. [Semantics, Concreteness & Suggestions](#7-semantics-concreteness--suggestions)
8. [Literary & Rhetorical Device Detection](#8-literary--rhetorical-device-detection)
9. [Phonoaffective Signature Framework](#9-phonoaffective-signature-framework)
10. [Longitudinal Mastery & Progress Tracking](#10-longitudinal-mastery--progress-tracking)

---

## 1. Architectural Framework & Normalization

All raw engine outputs are mapped onto a unified, comparable scale through [`domain/final_result_converter.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/final_result_converter.py), ensuring that multi-engine blends do not distort or invert relative weights.

### The Standard Scale
* **Output Range**: `0.0` to `1.0` (Continuous).
* **Polarity**: Always `normal` ("higher value = stronger craft expression").
* **Clipping**: Clamped to `[0.0, 1.0]` by default.

### Source Metric Registry (`SCALES`)

| Source Key | Raw Min | Raw Max | Polarity | Originating Engine |
|---|---|---|---|---|
| `phoneme_rhyme_score` | `0.0` | `1.0` | `normal` | `phoneme_engine.py` |
| `perceptual_family_score` | `0.0` | `1.0` | `normal` | `perceptual_family_engine.py` |
| `pattern_activity_score` | `0.0` | `1.0` | `normal` | `pattern_reader_engine.py` |
| `semantic_similarity` | `0.0` | `1.0` | `normal` | `semantics_engine.py` |
| `density_internal` | `0.0` | `100.0` | `normal` | `density_engine.py` |
| `density_multisyllabic` | `0.0` | `100.0` | `normal` | `density_engine.py` |
| `density_motif` | `0.0` | `100.0` | `normal` | `density_engine.py` |
| `suggestion_rhyme_score` | `0.0` | `100.0` | `normal` | `suggestion_engine.py` |
| `suggestion_thesaurus_score` | `0.0` | `100.0` | `normal` | `suggestion_engine.py` |
| `suggestion_syllable_priority` | `0.0` | `2.0` | `normal` | `suggestion_engine.py` |
| `stress_signal_confidence` | `0.0` | `1.0` | `normal` | `stress_signals.py` |
| `phrase_boundary_weight` | `1.5` | `3.0` | `normal` | `phrase_container_engine.py` |

---

## 2. Rhyme & Phonetic Architecture

### Core Rhyme Metrics
* **Phoneme Rhyme Score**: Continuous float $[0.0, 1.0]$ measuring phonetic similarity between ARPABET nucleus and coda segments.
* **Rhyme Threshold (`RHYME_THRESHOLD = 0.78`)**: Minimum similarity score required to establish a valid rhyme edge in graph clustering.
* **Near-Rhyme Same Vowel Score (`NEAR_RHYME_SAME_VOWEL_SCORE = 0.75`)**: Assigned when identical base vowels differ only by stress digit or minor rhotic coloring (e.g. `ER1` vs `ER2`).

### Qualitative Rhyme Classifications (`RhymeType`)
* `PERFECT` — Identical vowel nucleus and identical coda consonants (e.g., *mind / blind*).
* `SLANT` — Shared vowel nucleus with phonetically proximate coda consonants.
* `NEAR` — Shared vowel with minor coda divergence.
* `FAMILY` — Membership in the same perceptual vowel sound family.
* `NONE` — Phonetically disparate ($<0.78$).

### The 12 Canonical Perceptual Vowel Families
Curated in [`domain/perceptual_family_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/perceptual_family_engine.py):

| Family Identifier | ARPABET Nucleus | Anchor Words | Example Members |
|---|---|---|---|
| `R_FAMILY` | `ER` | *worst, curse, verse, first, birth* | *hurt, rehearsal, church, merch, turnt, diverse* |
| `AY_FAMILY` | `EY` | *day, way, name, face, change* | *flame, rain, train, late, state, claim* |
| `EE_FAMILY` | `IY` | *see, free, feel, real, deep* | *street, dream, clean, scene, believe* |
| `OW_FAMILY` | `OW` | *know, flow, soul, cold, road* | *home, phone, stone, throne, grown* |
| `AH_FAMILY` | `AH` | *blood, love, tough, run, trust* | *young, done, dust, rush, club, sub* |
| `AY2_FAMILY` | `AY` | *life, night, mind, time, light* | *sky, high, drive, alive, desire, fire* |
| `OO_FAMILY` | `UW` | *through, true, move, cool, truth* | *choose, rules, school, groove, mood* |
| `AW_FAMILY` | `AW` | *down, found, ground, sound, out* | *crowd, loud, town, power, cloud* |
| `AE_FAMILY` | `AE` | *back, track, rap, trap, black* | *stand, brand, plan, slam, exam* |
| `OH_FAMILY` | `AO` | *talk, call, fall, thought, law* | *raw, cause, wall, long, strong, wrong* |
| `IH_FAMILY` | `IH` | *win, begin, spin, king, think* | *skin, bring, distinct, click, stick* |
| `EH_FAMILY` | `EH` | *head, dead, breath, best, death* | *chest, blessed, stressed, check, respect* |

### AAVE Phonological Transformations
Implemented in [`aave_phonology.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/aave_phonology.py) to capture authentic vernacular rhyme structures:
1. **Consonant Cluster Reduction**: Deletion of word-final stop in homorganic clusters (e.g., `/P AE1 S T/` $\rightarrow$ `/P AE1 S/` allowing *past* to rhyme with *class*; *hand* $\rightarrow$ *man*).
2. **Monophthongization**: Glide weakening of `/AY/` $\rightarrow$ `/AA/` (e.g., `/T AY1 M/` $\rightarrow$ `/T AA1 M/` allowing *time* to rhyme with *calm*; *mine* $\rightarrow$ *man*).
3. **Postvocalic R-Vocalization**: Deletion/vocalization of rhotic codas (e.g., `/M AO1 R/` $\rightarrow$ `/M AO1/` rhyming with *saw*; `/ER/` $\rightarrow$ `/AH/` merging *bird* and *bud*).

---

## 3. Syllable & Rhyme Density

### Density Component Metrics
Computed per bar and averaged over the full verse in [`domain/density_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/density_engine.py):

* **Internal Rhyme Density (`internal`)**:
  $$\text{Internal Density} = \left(\frac{\text{Highlighted Rhyme Syllables}}{\text{Total Syllables}}\right) \times 100$$
* **Multisyllabic Density (`multisyllabic`)**:
  $$\text{Multisyllabic Density} = \left(\frac{\text{Deduplicated Compound Rhyme Syllables}}{\text{Total Syllables}}\right) \times 100$$
* **Motif Recurrence Density (`motif`)**:
  $$\text{Motif Density} = \left(\frac{\text{Distinct Color IDs in Bar}}{\text{Total Color Palette Across Verse}}\right) \times 100$$

### Syllabic Load & Control
* **Syllables Per Beat (SPB)**: Syllables distributed across quarter-note pulses.
* **Density Control Ratio**: Percentage of bars falling within the optimal hip-hop pocket range ($2.5 - 4.5\text{ SPB}$).
* **Density Arc Classifications (`ArcType`)**:
  * `BUILDING` — Ascending syllabic load toward the close of a section.
  * `RELEASING` — Descending syllabic load providing resolution and breath.
  * `FLAT` — Variance across bars is $<20\%$ (`FLAT_VARIANCE_RATIO = 0.20`).
  * `PEAK_AND_RELEASE` — Sustained high-density peak ($\ge 25\%$ of section) followed by open resolution.
  * `COMPLEX` — Multi-directional or undulating density profile.

---

## 4. Cadence, Pocket & Beat Grid Mechanics

### The 16-Step Beat Grid
Defined in [`domain/prosodic_config.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/prosodic_config.py) and [`domain/pocket_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/pocket_engine.py):
* **Grid Resolution (`GRID_SIZE = 16`)**: 16 sixteenth-note slots per 4/4 bar.
* **Strong Positions**: Positions `0`, `4`, `8`, `12` (Downbeats of Beats 1, 2, 3, 4).
* **Pocket Positions**: Positions `4` and `12` (Snare pocket on Beats 2 and 4).
* **Tolerances**:
  * `POCKET_WINDOW = 1` ($\pm 1$ sixteenth note qualifies as on-pocket).
  * `NUDGE_WINDOW = 2` (Max grid positions a stressed syllable is nudged toward natural pulse).

### Macro Flow Signatures
* `On-Grid` — $>75\%$ of stressed syllables land on strong downbeat pulses (`0, 4, 8, 12`).
* `Syncopated` — $>50\%$ of stressed syllables land on the snare pocket (`4, 12`).
* `Floating` — $<35\%$ on-beat alignment; vocal rhythm floats over the tempo.
* `Pocket Jumper` — Dynamic oscillation between tight pocket landing and syncopated runs.

### Syllable Compression Capacity
* **Tempo-Adjusted Span**: Above $90\text{ BPM}$, available syllable capacity per bar shrinks according to `syllable_compression.available_syllable_slots()`.
* **Compression Severity (`CompressionSeverity`)**: `NONE`, `MILD`, `MODERATE`, `HEAVY`.

### Cadence Signal Taxonomy (Stress Mismatches)
Classified in [`domain/stress_signals.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/stress_signals.py):

| Signal Identifier | Trigger Condition | Craft Meaning |
|---|---|---|
| `promotion` | Lexically weak syllable ($0$) lands on stressed grid position ($\ge 1$). | Performed rhythmic emphasis on structural word. |
| `demotion` | Lexically stressed syllable ($1, 2$) lands off-beat within `POCKET_WINDOW`. | Softened delivery near the beat. |
| `syncopation` | Lexically stressed syllable lands off-beat beyond `POCKET_WINDOW`. | Deliberate rhythmic displacement between pulses. |
| `trochaic_inversion` | Rising grid prominence over falling lexical stress (trochee in iambic slot). | Metrical reversal creating tension. |
| `stress_clash` | Adjacent lexically stressed syllables colliding without unstressed buffer. | Trigger environment for English's Rhythm Rule. |
| `stress_lapse` | $\ge 3$ consecutive unstressed syllables (`LAPSE_RUN_LENGTH = 3`). | Rhythmic lull or rapid patter. |
| `secondary_recruitment`| Secondary stress ($2$) lands on strong beat while primary ($1$) does not. | Anchoring grid on secondary syllable. |
| `level_stress_ambiguity`| Word has multiple dictionary pronunciations with contested stress. | Lexical ambiguity. |

### Deliberateness Classification
* `likely_automatic` — Occurs within a `stress_clash` context (automatic Rhythm Rule retraction).
* `possible_deliberate` — Word recurs on $\ge 2$ other lines without clash context (`RECURRENCE_MIN = 2`).
* `uncertain` — Standard baseline; under-claims intent to preserve analytical integrity.

---

## 5. Compositional Structure & Phrase Packaging

Managed in [`domain/phrase_container_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/phrase_container_engine.py).

### Boundary Detection Rules
A structural container break is declared when cumulative signal weight exceeds `BOUNDARY_THRESHOLD = 1.5` and at least `MIN_SIGNALS_FIRED = 2` individual signals fire:

| Signal Name | Weight | Threshold Condition |
|---|---|---|
| `rhyme_resolution` | `0.8` | Terminal rhyme scheme resolves on this bar. |
| `rest_bar` | `0.7` | Line has $\le 3$ words (`REST_BAR_MAX_WORDS = 3`). |
| `density_drop` | `0.6` | Prior line internal density $\ge 40\%$ and current line drops $>40\%$ (`DENSITY_DROP_RATIO = 0.6`). |
| `syllable_reset` | `0.5` | Syllable count drops to $<60\%$ of prior line (`SYLLABLE_RESET_RATIO = 0.6`). |
| `line_length_shift` | `0.4` | Line word count differs by $>4$ words from previous (`LINE_LENGTH_SHIFT_WORD_DIFF = 4`). |

---

## 6. Visual Motifs & Pattern Reading

Implemented in [`domain/pattern_reader_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/pattern_reader_engine.py) and [`domain/motif_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/motif_engine.py).

### Perceptual Family Activity Score
$$\text{Activity Score} = (\text{Member Count Norm} \times 0.40) + (\text{Line Spread} \times 0.35) + (\text{Stress Ratio} \times 0.25)$$

* **Member Count Norm**: $\min(\text{Members}, 10) / 10$.
* **Line Spread**: Unique lines containing family members / Total verse lines.
* **Stress Ratio**: Stressed family hits / Total family members.
* **Active Confirmation Threshold**: $\text{Activity Score} \ge 0.25$.
* **Parallel Pocketing**: Triggered when top 2 active families' activity scores are within $15\%$ of each other.

---

## 7. Semantics, Concreteness & Suggestions

### Semantic & Lexical Metrics
* **Semantic Similarity (`semantic_similarity`)**: Continuous cosine distance $[0.0, 1.0]$ derived from spaCy `en_core_web_md` word embeddings.
* **Brysbaert Concreteness Score**: Scale of $1.0 - 5.0$ measuring sensory grounding ($1.0 = \text{Abstract}$, $5.0 = \text{Tangible/Sensory}$).

### Suggestion Ranking Composite Score
Calculated in [`domain/suggestion_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/domain/suggestion_engine.py):
$$\text{Composite Score} = (\text{Rhyme Score} \times 0.55) + (\text{Thesaurus Score} \times 0.30) + (\text{Syllable Priority} \times 0.15)$$

* **Rhyme Score ($55\%$)**: Raw phonetic similarity scaled to $0-100$.
* **Thesaurus Score ($30\%$)**: Tiered ladder based on Moby Thesaurus depth ($0, 30-70, 85, 90, 100$).
* **Syllable Priority ($15\%$)**: $0 = \text{off-target}$, $1 = \pm 1\text{ syllable}$, $2 = \text{exact syllable count match}$.

---

## 8. Literary & Rhetorical Device Detection

Audited across 12 core rhetorical patterns in [`device_detection_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/device_detection_engine.py).

### Status Tiers (Events Per 100 Lines)
* **`untapped`**: Below emerging threshold.
* **`emerging`**: Present but not yet stylistically consistent.
* **`signature`**: Consistently deployed; core stylistic fingerprint.
* **`overused`**: Exceeds natural balance; risk of mechanical repetition.

### The 12 Detectors & Thresholds

| Device | Category | Detection Heuristic | Emerging Rate | Signature Rate | Overuse Rate |
|---|---|---|---|---|---|
| **Alliteration** | *Sound* | $\ge 2$ consecutive non-stop words sharing initial consonant. | $\ge 5.0$ | $\ge 18.0$ | $> 50.0$ |
| **Assonance** | *Sound* | $\ge 3$ non-stop words in a single line sharing stressed vowel. | $\ge 4.0$ | $\ge 15.0$ | $> 45.0$ |
| **Anaphora** | *Structural* | Same word opens $\ge 2$ consecutive lines ($\ge 3$ chars, non-stop). | $\ge 2.0$ | $\ge 8.0$ | $> 30.0$ |
| **Epistrophe** | *Structural* | Same word closes $\ge 2$ consecutive lines. | $\ge 1.5$ | $\ge 5.0$ | $> 20.0$ |
| **Anadiplosis** | *Structural* | Last word of line $N$ matches first word of line $N+1$. | $\ge 1.0$ | $\ge 4.0$ | $> 15.0$ |
| **Simile** | *Comparison* | Direct comparative pattern (*"like a/an"*, *"as ... as"*, *"like the"*). | $\ge 3.0$ | $\ge 10.0$ | $> 35.0$ |
| **Rhetorical Question** | *Rhetorical* | Line terminal character is `?`. | $\ge 1.5$ | $\ge 6.0$ | $> 20.0$ |
| **Repetition** | *Emphasis* | Key content word ($>3$ chars) appears $\ge 4$ times in song. | $\ge 1.0$ | $\ge 3.0$ | $> 8.0$ |
| **Enumeration** | *Structural* | $\ge 2$ commas in a line (stacking 3+ listed items). | $\ge 2.0$ | $\ge 8.0$ | $> 25.0$ |
| **Polysyndeton** | *Structural* | $\ge 3$ coordinating conjunctions (*and / but / or*) in one line. | $\ge 1.0$ | $\ge 4.0$ | $> 15.0$ |
| **Asyndeton** | *Structural* | $\ge 2$ commas in a line with no coordinating conjunctions. | $\ge 1.5$ | $\ge 6.0$ | $> 20.0$ |
| **Parallelism** | *Structural* | Consecutive lines sharing identical opening 2-word syntax. | $\ge 1.5$ | $\ge 6.0$ | $> 20.0$ |

---

## 9. Phonoaffective Signature Framework

Formulated in [`aspiration_gap.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/aspiration_gap.py) to measure emotional encoding and artist intentionality.

### The 8-Component Formula
$$E = (\text{PT} \times w_1) + (\text{PP} \times w_2) + (\text{SF} \times w_3) + (\text{CM} \times w_4) + (\text{IS} \times w_5) + (\text{TP} \times w_6) + (\text{SA} \times w_7) + (\text{SD} \times w_8)$$

* **PT (Phonemic Texture)**: Ratio of plosives/hard consonants vs liquids/fricatives, vowel openness.
* **PP (Prosodic Pressure)**: Syllable density, delivery compression, stress inversion rate.
* **SF (Semantic Field Gravity)**: Semantic valence, imagery clustering, thematic cohesion.
* **CM (Cultural Memory)**: Vernacular frequency, regional marker density, AAVE bridges.
* **IS (Intentionality Signal)**: Revision count, dictionary override telemetry.
* **TP (Temporal Position)**: Section trajectory (Verse 1 setup vs Climax vs Outro).
* **SA (Sonic Aspiration)**: Selected emotional target from the 15 canonical labels (*aggressive, celebratory, contemplative, defiant, desperate, grieving, hopeful, hungry, melancholic, nostalgic, peaceful, proud, raw, triumphant, vulnerable*).
* **SD (Subtext Delta)**: Divergence between surface semantic sentiment and phonetic tension.

### Aspiration Gap Score (`aspiration_gap_score`)
$$D_{\text{aspiration}} = \sqrt{\sum_{k \in \{\text{PT}, \dots, \text{SD}\}} (C_k - \text{Expected}_k)^2}$$
Bounded in $[0.0, 1.0]$, where `0.0` represents exact execution of stated emotional craft intent.

---

## 10. Longitudinal Mastery & Progress Tracking

Evaluated across catalog history in [`mastery_engine.py`](file:///c:/Users/bsfka/OneDrive/Documents/Prosodic/mastery_engine.py).

### Activation Gate
Mastery tracking is unlocked only when an artist's portfolio satisfies:
* $\ge 3$ distinct songs analyzed
* $\ge 40$ total rhyme events recorded
* $\ge 20$ total cadence events recorded
* $\ge 15$ total bars written

### Proficiency Tiers
* `Developing`: $0 - 39$
* `Approaching`: $40 - 64$
* `Competent`: $65 - 81$
* `Exemplary`: $82 - 100$

### The 6 Core Skill Category Formulas

1. **Flow & Cadence Score**:
   $$\text{Score} = (\text{Density Control \%} \times 0.55) + (\text{Inversion Score} \times 0.30) + (\text{Cadence Variety Bonus} \times 0.15)$$
2. **Rhyme Architecture Score**:
   $$\text{Score} = (\text{Avg Similarity} \times 80) + \text{Type Diversity Bonus (max 20)}$$
3. **Internal Rhyme Density Score**:
   $$\text{Score} = (\text{Avg Gradient Density} \times 70) + (\text{Consistency} \times 0.30)$$
4. **Multisyllabic Flow Score**:
   $$\text{Score} = (\text{Compression Rate \%} \times 0.60) + (\text{High Density Rate \%} \times 0.40)$$
5. **Motif Architecture Score**:
   $$\text{Score} = (\text{Avg Cluster Strength} \times 75) + \text{Field Diversity Bonus (max 25)}$$
6. **Stress Architecture Score**:
   $$\text{Score} = (\text{Inversion Control Score} \times 0.65) + (\text{Stress Pattern Variety} \times 0.35)$$

### Longitudinal Trend Calculation
* **Early Window**: Earliest $40\%$ of catalog by timestamp.
* **Recent Window**: Latest $40\%$ of catalog by timestamp.
* **Delta**: $\Delta = \text{Score}_{\text{recent}} - \text{Score}_{\text{early}}$
  * `up`: $\Delta \ge +5$
  * `down`: $\Delta \le -5$
  * `neutral`: $-5 < \Delta < +5$

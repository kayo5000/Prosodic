# PROSODIC — Codebase Snapshot
**Date:** 2026-05-07
**Status:** Read-only documentation. Describes code on disk as of this date.
**Scope:** Full repo walk. Where something is incomplete, stubbed, or half-wired, it is stated explicitly with file references.

---

## TABLE OF CONTENTS
1. [Purpose & Entry Points](#1-purpose--entry-points)
2. [Input → Output Flow](#2-input--output-flow)
3. [Analysis Engines](#3-analysis-engines)
4. [Behavioral Layer](#4-behavioral-layer)
5. [Data & Storage](#5-data--storage)
6. [Dependencies](#6-dependencies)
7. [Gaps & Inconsistencies](#7-gaps--inconsistencies)

---

## 1. PURPOSE & ENTRY POINTS

### What Prosodic Is
Prosodic is a hip-hop lyric analysis tool built as a Python/Flask REST API with a React frontend. An artist pastes lyrics and a BPM into the interface; the backend runs 11+ analysis engines over the text and returns a detailed breakdown of rhyme architecture, cadence, syllabic density, motif clustering, stress patterns, and perceptual sound families. A built-in AI mentor (VEIL) can discuss the results.

### How the App Starts
**Backend:** `python api.py` — starts Flask on port 5000 (or `$PORT` env var). Debug mode off. Threaded. Initializes the users SQLite table on startup.

**Frontend:** `npm start` inside `frontend/` — React dev server on port 3000.

**Production:** `Procfile` present for Railway deployment (`web: gunicorn api:app`).

### All Flask Routes (`api.py`)

| Method | Route | What it does |
|--------|-------|-------------|
| `POST` | `/analyze` | Full verse analysis. Requires `verse_lines` (array of strings) + `bpm` (number). Returns complete feedback object. |
| `POST` | `/suggest` | Top 10 rhyme suggestions for the next line. Optional `bpm`, `trigger_mode`, `target_word`, `context_lines`, `motif_bank`. |
| `GET`  | `/suggest/more` | Suggestions 11–20 from the last `/suggest` call. No API cost — uses cached state. |
| `POST` | `/veil/chat` | AI craft mentor. Requires `messages` array. Optional `analysis_context` injects current song data. Uses `claude-sonnet-4-6`. |
| `POST` | `/autofill` | Scores every content word in a verse against existing color families. Returns `assignments` list. |
| `POST` | `/suggest-family` | Given a word + existing families, returns top-3 family matches with scores ≥ 0.55. |
| `POST` | `/corrections` | Records manual correction signals (add/remove word from family). |
| `GET`  | `/corrections` | Returns top correction signals for debug/review. |
| `GET`  | `/health` | Liveness check. Returns `{"status": "ok"}`. |
| `POST` | `/auth/register` | Create account. Returns JWT + user dict. |
| `POST` | `/auth/login` | Login with email or username + password. Returns JWT + user dict. |
| `GET`  | `/auth/me` | Returns current user (requires Bearer token). |
| `POST` | `/auth/update` | Update profile fields (username, veil_name, phone, hometown, gradient_index, geo_influences, password). |
| `GET`  | `/mastery` | Computes mastery report from stored analysis history. Returns `{ready, categories, volume, devices}`. |
| `POST/GET` | `/veil/revival/*` | VEIL revival routes — guided conversation for abandoned drafts (blueprint from `veil_revival_routes.py`). |
| `OPTIONS` | (all above) | CORS preflight handler. Returns 204. |

All responses include `Access-Control-Allow-Origin: *`.

---

## 2. INPUT → OUTPUT FLOW

### Tracing One Analysis Request: `POST /analyze`

**Step 0 — Request validation** (`api.py:305–328`)
- Parses JSON body
- Requires `verse_lines` (non-empty array of strings)
- Requires `bpm` (positive number)
- If either is missing/invalid → 400 error

**Step 1 — Entry point** (`api.py:321`)
```python
feedback = assemble_feedback(verse_lines, bpm)
```

**Step 2 — `assemble_feedback` pipeline** (`feedback_engine.py`)

Engines run in this order:

```
1. motif_engine.build_motif_map(verse_lines, bpm)
   → stream (flat syllable stream with motif color assignments)
   → motif_map (per-word color lookup)
   → motif_groups (list of {type, color_id, members})
   → total_color_families

2. rhyme_detection_engine runs internally via motif_engine
   (motif_engine calls rhyme detection to assign color families)

3. pocket_engine.enrich_stream_with_pocket(stream, bpm)
   → adds pocket_position, beat_number, on_strong_beat, on_pocket
     to every syllable in the stream

4. density_engine.score_full_verse(verse_lines, motif_result)
   → density_per_line: [{line, index, scores: {internal, multisyllabic, motif}}]
   → density_summary: {internal%, multisyllabic%, motif%}

5. phrase_container_engine.build_containers(verse_lines)
   → phrase_containers: [{start_line, end_line, bar_count, type}]

6. pocket_engine.get_flow_signature(verse_lines, bpm)
   → flow_signature: 'On-Grid'|'Syncopated'|'Floating'|'Pocket Jumper'

7. pattern_reader_engine.read_patterns(tagged_words, verse_lines)
   (called via perceptual_family_engine internally)
   → perceptual_pattern: {dominant_families, active_families, parallel_pocketing}
```

**Step 3 — Response shape** (returned by `assemble_feedback`, serialized by `api.py`)

```json
{
  "rhyme_map": [
    {
      "word": "run",
      "line_index": 0,
      "syllable_index": 2,
      "stream_index": 14,
      "word_index": 5,
      "char_start": 42,
      "char_end": 45,
      "color_id": "AY_FAMILY",
      "is_stressed": true,
      "on_pocket": true
    }
  ],
  "motif_groups": [
    {
      "type": "sonic",
      "color_id": "AY_FAMILY",
      "members": [{"word": "run", "line_index": 0, ...}]
    }
  ],
  "total_color_families": 3,
  "density_per_line": [
    {"line": "I never ran...", "index": 0, "scores": {"internal": 45.0, "multisyllabic": 22.0, "motif": 0.66}}
  ],
  "density_summary": {"internal": 38.5, "multisyllabic": 18.0, "motif": 0.72},
  "phrase_containers": [
    {"start_line": 0, "end_line": 3, "bar_count": 4, "type": "4-bar"}
  ],
  "flow_signature": "Syncopated",
  "bpm": 90,
  "line_count": 4,
  "perceptual_pattern": {
    "dominant_families": ["AY_FAMILY"],
    "active_families": ["AY_FAMILY", "EE_FAMILY"],
    "parallel_pocketing": false
  }
}
```

---

## 3. ANALYSIS ENGINES

### Fully Implemented Engines

#### `normalization_engine.py`
**Computes:** Text normalization — expands contractions, tags phonological manipulation, maps slang/AAVE, converts numerics, strips repeated letters, splits hyphenated compounds.
**Input:** Single word (string)
**Output:** `{normalized: str|list, original: str, manipulation: str|None, was_split: bool}`
**Status:** ✅ Fully implemented. Six layers, all operational.

#### `phoneme_engine.py`
**Computes:** CMU Arpabet phoneme lookup, rhyme unit extraction, rhyme scoring, R-family classification.
**Input:** One or two words (strings)
**Output:** List of phoneme symbols; rhyme unit tuples; float scores [0.0–1.0]
**Key functions:** `get_phonemes()`, `get_rhyme_unit()`, `syllable_rhyme_score()`, `rhyme_score()`, `classify_r_family()`
**Status:** ✅ Fully implemented. LRU cache (4096). Falls back to `g2p_en` for unknown words.
**R-family gate:** Hard block prevents ER ↔ VR/EH+R mismatches. Five scoring tiers: 1.0 (exact), 0.88 (same nucleus), 0.80 (R-bridge), 0.75 (stress diff), 0.65 (EH+R slant), 0.35 (final consonant).

#### `syllable_engine.py`
**Computes:** Syllable segmentation with stress assignment and character-range mapping.
**Input:** Word (string) or full line (string)
**Output:** List of `{index, phonemes, stress, is_stressed}` per syllable; `syllabify_line()` adds `word_index`, `stream_index`, `char_start`, `char_end`
**Status:** ✅ Fully implemented.

#### `rhyme_detection_engine.py`
**Computes:** Rhyme group detection across a verse using Union-Find transitive closure.
**Input:** `verse_lines` (list of strings)
**Output:** Stream with color assignments; rhyme groups; compound sequences
**Algorithm:** Four passes — exact/near rhyme (threshold 0.78), EH+R slant bridge (0.62, 3-line gate), function-word conditional coloring.
**Status:** ✅ Fully implemented.

#### `motif_engine.py`
**Computes:** Sonic motif detection (recurring stress patterns + phoneme similarity clusters) + full motif map with color assignment.
**Input:** `verse_lines`, `bpm`
**Output:** `{stream, motif_map, motif_groups, total_colors}`
**Status:** ✅ Fully implemented. Multisyllabic words inherit color from any colored member.

#### `density_engine.py`
**Computes:** Three density metrics per line — internal rhyme %, multisyllabic %, motif color ratio.
**Input:** `verse_lines`, optional `motif_result`
**Output:** `[{line, index, scores: {internal, multisyllabic, motif}}]`
**Status:** ✅ Fully implemented.

#### `pocket_engine.py`
**Computes:** Maps syllables to a 16-step beat grid; classifies flow style.
**Input:** Line (string), `bpm`, optional `start_position`
**Output:** Syllable stream enriched with `pocket_position`, `beat_number`, `on_strong_beat`, `on_pocket`; flow signature string
**Status:** ✅ Fully implemented. Beat model: positions 0/8 = downbeat, 4/12 = backbeat.

#### `performed_stress.py`
**Computes:** Performed vs. lexical stress comparison; inversion detection and scoring.
**Input:** Line (string), `bpm`
**Output:** Per-syllable stress data; inversion list; `{inversion_count, inversion_rate, stress_pattern_type}`
**Stress types:** Locked (≤20% inversion), Flexible (21–50%), Experimental (>50%)
**Status:** ✅ Fully implemented (560 lines).

#### `perceptual_family_engine.py`
**Computes:** Layer 1 of the two-layer rhyme color system — assigns words to 12 named sonic families.
**Input:** `verse_lines`
**Output:** Tagged word list with `{word, syllable_text, family, family_score, is_boundary, is_stressed}`
**Families:** R_FAMILY, AY_FAMILY, EE_FAMILY, OW_FAMILY, AH_FAMILY, AY2_FAMILY, OO_FAMILY, AW_FAMILY, AE_FAMILY, OH_FAMILY, IH_FAMILY, EH_FAMILY
**Status:** ✅ Fully implemented (474 lines).

#### `pattern_reader_engine.py`
**Computes:** Layer 2 — confirms active families, disambiguates boundary words, detects parallel pocketing.
**Input:** Tagged words from Layer 1, `verse_lines`
**Output:** `{dominant_families, active_families, family_map, parallel_pocketing}`
**Activity score:** 40% member density + 35% line spread + 25% stress ratio. Threshold 0.25.
**Status:** ✅ Fully implemented (374 lines).

#### `phrase_container_engine.py`
**Computes:** Structural phrase boundaries — groups lines into containers (2-bar, 4-bar, 8-bar, extended).
**Input:** `verse_lines`
**Output:** `[{start_line, end_line, bar_count, type}]`
**Signals (weighted):** rhyme_resolution (0.8), density_drop (0.6), syllable_reset (0.5), rest_bar (0.7), line_length_shift (0.4). Threshold 1.5.
**Status:** ✅ Fully implemented.

#### `aave_phonology.py`
**Computes:** AAVE phonological variants — consonant cluster reduction, monophthongization, R-vocalization.
**Input:** CMU phoneme list
**Output:** Variant phoneme lists; `get_all_pronunciations()` returns all valid forms
**Status:** ✅ Fully implemented (614 lines). Three rules with full combinatorial variant generation.

#### `syllable_compression.py`
**Computes:** Syllable compression severity and elision candidates relative to BPM tempo grid.
**Input:** Line (string), `bpm`
**Output:** `{actual_syllables, available_slots, delta, severity}` + candidate list with elision patterns
**Severity:** none / mild (1–2 over) / moderate (3–4) / heavy (5+). 13 elision patterns.
**Status:** ✅ Fully implemented (555 lines).

#### `density_gradient.py`
**Computes:** Syllable density per bar, rolling gradient, arc classification.
**Input:** `verse_lines` (section)
**Output:** `{bar_densities, density_gradient, arc_type, mean_density, sparse_bars, packed_bars}`
**Arc types:** BUILDING, RELEASING, FLAT, PEAK_AND_RELEASE, COMPLEX
**Status:** ✅ Fully implemented (495 lines).

#### `bar_grid_linguistics.py`
**Computes:** Phrase-boundary collision analysis against the 16-step beat grid.
**Input:** Line (string), `bpm`, optional `bar_start_offset`
**Output:** `BarGridAlignment` with `syllable_grid`, collision list, alignment score
**Collision types:** boundary_on_weak, strong_beat_mid_phrase. Score penalty: −0.15 / −0.10.
**Status:** ✅ Fully implemented (510 lines).

#### `aspiration_gap.py`
**Computes:** Phonoaffective Signature — gap between what the phoneme texture encodes and the stated emotional intent.
**Input:** 8-component signature vector + aspiration label (one of 15)
**Output:** `AspirationGapResult` with gap score, classification, component breakdown
**Classifications:** controlled (<0.20), leaked (0.20–0.45), inverted (>0.45)
**Status:** ✅ Fully implemented (589 lines). 15 aspiration labels, each with expected component ranges.

#### `fingerprint_pipeline.py`
**Computes:** Phoneme fingerprints from public-domain text sources (never stores raw text).
**Input:** URL or list of URLs
**Output:** `{word_count, phoneme_sequences, stress_patterns, rhyme_density, cadence_signatures, source_hash}` written to `feature_store`
**Status:** ✅ Fully implemented (523 lines). BeautifulSoup for HTML stripping.

#### `learning_engine.py`
**Computes:** Records and aggregates manual correction signals (word–family associations).
**Input:** `{word, correction_type, color_id}` signals
**Output:** Writes to `learning_signals.db`; `get_top_signals()` returns most-corrected words
**Status:** ✅ Fully implemented.

#### `suggestion_engine.py`
**Computes:** Two-layer rhyme suggestions — phonetic index lookup + Moby Thesaurus composite scoring.
**Input:** `verse_lines`, optional `bpm`, `trigger_mode`, `target_word`, `motif_bank`
**Output:** Top 10 suggestion objects; cached for `get_more_suggestions()` (11–20)
**Status:** ✅ Fully implemented.

#### `thesaurus_engine.py`
**Computes:** Synonym lookup via Moby Thesaurus SQLite database.
**Input:** Word (string)
**Output:** `{word, found, synonyms: [...]}` or reverse-lookup list
**Status:** ✅ Fully implemented. Thread-local DB connections.

#### `semantics_engine.py`
**Computes:** Semantic similarity via spaCy word vectors; enhanced rhyme score (phonetic + 0.1×semantic).
**Input:** Two words
**Output:** `{phonetic_score, semantic_score, enhanced_score}`
**Status:** ✅ Fully implemented (68 lines). **Gracefully degrades** to 0.0 if `en_core_web_md` unavailable.
**Note:** spaCy model not in `requirements.txt` — semantic scoring is optional/silent.

#### `mastery_engine.py`
**Computes:** Per-artist skill mastery across 7 categories with trend tracking.
**Input:** No input — reads from `prosodic_features.db`
**Output:** `{ready: bool, categories: [...], volume, devices}`
**Categories:** Flow & Cadence, Rhyme Architecture, Internal Rhyme Density, Multisyllabic Flow, Motif Architecture, Stress Architecture, Phoneme Family Range
**Trigger:** ≥3 songs, ≥40 rhyme events, ≥20 cadence events, ≥15 bars
**Trend:** Compares earliest 40% of songs vs latest 40%
**Status:** ✅ Fully implemented (649 lines).

#### `device_detection_engine.py`
**Computes:** Detects 12 literary/rhetorical devices; rates usage as signature/emerging/overused/untapped.
**Input:** `verse_lines`
**Output:** Device report with rate (per 100 lines) and usage classification
**Devices detected:** alliteration, assonance, anaphora, epistrophe + 8 more
**Status:** ⚠️ Partially read — 4 detectors confirmed, 8+ others referenced.

#### `telemetry.py`
**Computes:** Logs user interaction signals for future ML training.
**Input:** Event type + before/after state
**Output:** Writes to `user_signals` table in `prosodic_features.db`
**Events:** rhyme_group_override, line_rewritten, bar_break_moved, suggestion_accepted/rejected, song_marked_complete, stress_override, section_label_changed
**Status:** ✅ Fully implemented. Silent, non-blocking.

### Engines Imported But Not Directly Wired to API Routes
- `bar_grid_linguistics.py` — called from `density_gradient.py` and internal tools, not exposed via API
- `aspiration_gap.py` — implemented but no API endpoint calls it directly
- `syllable_compression.py` — implemented but not in `assemble_feedback` pipeline
- `fingerprint_pipeline.py` — standalone data-collection script, not part of request cycle

### ML Stub Modules (Present but Not Functional)
- `ml_interface.py` — Abstract base + 5 model stubs. All fall back to rule-based logic. **No trained weights.**
- `model_registry.py` — Singleton registry framework. Awaits `.pt` files: `rhyme_model.pt`, `cadence_model.pt`, `motif_model.pt`, `structure_model.pt`, `style_model.pt`. **None present.**
- `prosodic_data_objects.py` — Dataclass definitions for ML pipeline (PhonemeSequence, LyricLine, RhymeEvent, etc.). Fully defined, used by `feature_store.py`.

---

## 4. BEHAVIORAL LAYER

The behavioral layer was built as a separate package layer **above** the existing engines. It does not modify any existing engine. All files were created as of the current date.

### Files and Status

#### `analysis/compatibility_checker.py` ✅ Complete
**What it does:** Before any cross-snapshot operation, verifies both snapshots used the same segmentation method and algorithm version.
**Inputs:** Two snapshot dicts
**Output:** `{compatibility: "identical"|"compatible_with_warning"|"incompatible", recommended_action, reason}`

#### `analysis/bar_segmenter.py` ✅ Complete
**What it does:** Single source of truth for bar boundary inference from raw lyrics + BPM. Deterministic — same input always yields identical output (segmentation_id derived from SHA-256 hash of normalized lyrics + BPM).
**Inputs:** `lyrics` (string), `bpm` (int)
**Output:** Full segmentation dict with `bars[]`, each bar having `bar_index`, `text`, `start_char`, `end_char`, `start_syllable`, `end_syllable`, `line_indices`, `estimated_beat_coverage`, `confidence`, `boundary_signals`
**Algorithm v1:** Weighted signals — line_break (0.40), syllable_budget (0.20), stress_resolution (0.15), end_rhyme (0.15), punctuation (0.10), pattern_consistency (0.10). Lines >1.8× target syllables are split into two bars.
**Note:** `analysis/text_normalizer.py`, `analysis/syllable_parser.py`, etc. do **not** exist as separate files — the segmenter imports directly from root-level engines.

#### `analysis/bar_feature_mapper.py` ✅ Complete
**What it does:** Projects `assemble_feedback()` output onto frozen bar boundaries, producing a per-bar feature vector.
**Inputs:** `segmentation` dict (from bar_segmenter), `engine_outputs` dict (from assemble_feedback)
**Output:** List of bar feature dicts with 15 fields: `bar_index`, `syllable_count`, `stress_pattern`, `pocket_alignment`, `rhyme_density`, `internal_rhyme_count`, `end_rhyme_families`, `assonance_score`, `consonance_score`, `density_score`, `motif_hits`, `semantic_shift`, `emotional_directness`, `energy_estimate`, `breath_load`
**Note:** `semantic_shift` is always `0.0` — semantics_engine is not yet called per-bar.

#### `analysis/bar_aligner.py` ✅ Complete
**What it does:** Content-aware alignment of bars across two snapshots using DTW. Prevents phantom degradation when bars are inserted or deleted between drafts.
**Inputs:** Two snapshots (each with `bar_features`)
**Output:** `{alignment_id, pairs[]}` where each pair has `status: matched|shifted_match|rewritten|inserted|deleted`, `similarity`, `anchors`
**Algorithm:** Weighted similarity (rhyme overlap 25%, motif overlap 20%, stress pattern 15%, syllable count 15%, lexical Jaccard 25%) → DTW traceback with insertion/deletion penalties (0.30).

#### `behavior/state_engine.py` ✅ Complete
**What it does:** Classifies the behavioral state of a verse from its bar feature vectors. Produces one of exactly 6 labels plus a `state_path` across windowed segments of the verse.
**Inputs:** Snapshot with `bar_features`
**Output:** `{snapshot_id, section_state, confidence, state_path[], evidence[]}`
**Six labels (hard-coded, no additions permitted):**
- **Locked** — stable, low variance, slopes near zero, features at meaningful level (energy > 0.25 threshold)
- **Tightening** — rising rhyme density AND rising pocket alignment, stable variance
- **Pushing** — rising syllable density AND rising breath load, pocket holding above 0.5
- **Slipping** — falling pocket alignment OR rising stress variance, while density rises
- **Flat** — low energy, low rhyme density, low motif activity
- **Exposed** — low density, low rhyme, high emotional directness
**Integration:** Calls `label_capture.capture_prediction()` before returning. If label_capture fails, the failure is silently swallowed.

#### `behavior/label_capture.py` ✅ Complete
**What it does:** Logs every State Engine prediction to SQLite. Exposes thumbs-up/down feedback API. Accumulates labeled training data for a future ML classifier.
**DB file:** `prosodic_labels.db` (created at project root)
**Table:** `state_labels` — label_id, snapshot_id, bar_features_json, predicted_state, predicted_confidence, rule_path_json, user_agree, user_corrected_state, user_feedback_at, created_at
**Public API:** `capture_prediction()`, `record_feedback()`, `get_label_stats()`, `get_training_set()`
**ML path:** When ~200 confirmed records exist, `get_training_set()` returns the labeled dataset for classifier training. The classifier can replace the rule-based scoring in `state_engine.py` with no other rework.

#### `behavior/drift_engine.py` ✅ Complete
**What it does:** Compares two snapshots across aligned bars and reports directional change.
**Inputs:** `snapshot_a`, `snapshot_b`, alignment (from bar_aligner), compatibility (from compatibility_checker)
**Output:** `{drift_id, overall_drift, summary_evidence[], per_bar_changes[], insertions[], deletions[]}`
**Overall drift classes:** technical_up_emotional_down, emotional_up_technical_down, density_up_clarity_down, clarity_up_density_down, strict_improvement, strict_degradation, lateral
**Guard:** If compatibility returns `requires_resegmentation`, returns immediately with `{"error": "requires_resegmentation"}`.

#### `behavior/degradation_detector.py` ✅ Complete
**What it does:** Reads drift output and explicitly classifies the revision tradeoff. Protects against over-polishing.
**Input:** Drift engine output
**Output:** `{tradeoff_class, improvements[], degradations[], location, summary}`
**Feature buckets:** technical (rhyme_density, pocket_alignment, assonance, consonance, internal_rhyme_count), emotional (emotional_directness, semantic_shift, motif_hits_count), density (syllable_count, density_score, breath_load), clarity (emotional_directness, motif_hits_count, pocket_alignment)
**Tradeoff classes:** Same 7 as drift engine overall_drift.

#### `behavior/ai_interpreter.py` ✅ Complete
**What it does:** Converts structured state/drift/degradation output into a 2–4 sentence artist-facing interpretation using the Anthropic API.
**Model:** `claude-sonnet-4-6`, max_tokens 400
**Input:** Optional `state`, `drift`, `degradation` dicts
**Output:** `{interpretation: str, based_on: [...]}`
**Hard constraints (system prompt-enforced):** Explain only from structured evidence. Forbidden words: powerful, good, weak, bad, great, amazing, you must, you should. Never propose replacement lyrics. 2–4 sentences max.
**Fallback:** If API call fails, returns a plain-text fallback message rather than crashing.

### How the Behavioral Layer Relates to Existing Engines

```
Existing Engines (unchanged)
    ↓
feedback_engine.assemble_feedback()
    ↓
analysis/bar_segmenter.py      ← new: infers bar boundaries
analysis/bar_feature_mapper.py ← new: projects engine output onto bars
    ↓
[snapshot: {segmentation, bar_features}]
    ↓
behavior/state_engine.py       ← new: single-snapshot label
behavior/drift_engine.py       ← new: cross-draft comparison
behavior/degradation_detector.py ← new: tradeoff classification
behavior/ai_interpreter.py     ← new: natural language explanation
    ↓
behavior/label_capture.py      ← new: every prediction logged for ML
```

### Not Yet Wired to API
The behavioral layer has **no API endpoints** as of this snapshot. All 9 modules exist and are tested in isolation (`tests/` — 74 passing, 5 skipped for API key), but no route in `api.py` calls them. They are ready to be wired but are not yet connected to the live request flow.

---

## 5. DATA & STORAGE

### `prosodic.db` (user auth)
Location: `~/prosodic_data/prosodic.db` (or `$PROSODIC_DB_PATH`)

```sql
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT    UNIQUE NOT NULL,
    username        TEXT    UNIQUE NOT NULL,
    password_hash   TEXT    NOT NULL,
    veil_name       TEXT    DEFAULT '',
    gradient_index  INTEGER DEFAULT 0,
    phone           TEXT    DEFAULT '',
    hometown        TEXT    DEFAULT '',
    geo_influences  TEXT    DEFAULT '',   -- comma-separated list
    created_at      TEXT    DEFAULT (datetime('now'))
);
```

### `prosodic_features.db` (ML training data)
Location: `<project_root>/prosodic_features.db`

```sql
-- Phoneme sequences (CMU + g2p derived)
CREATE TABLE phoneme_sequences (
    id              INTEGER PRIMARY KEY,
    word            TEXT NOT NULL,
    phonemes        TEXT NOT NULL,   -- JSON array
    syllable_count  INTEGER,
    stress_pattern  TEXT,            -- JSON array
    source          TEXT,            -- 'cmu' | 'g2p' | 'aave'
    low_confidence  INTEGER,
    is_aave_variant INTEGER,
    created_at      TEXT
);

-- Lyric lines with analysis metadata
CREATE TABLE lyric_lines (
    id                          INTEGER PRIMARY KEY,
    line_id                     TEXT NOT NULL,
    song_id                     TEXT NOT NULL,
    section_label               TEXT,
    text                        TEXT,
    bar_index                   INTEGER,
    bpm                         REAL,
    total_syllables             INTEGER,
    performed_stress_inversions TEXT,   -- JSON
    created_at                  TEXT
);

-- Detected rhyme pairs
CREATE TABLE rhyme_events (
    id                  INTEGER PRIMARY KEY,
    song_id             TEXT,
    section_label       TEXT,
    word_a              TEXT,
    word_b              TEXT,
    phonemes_a          TEXT,   -- JSON
    phonemes_b          TEXT,   -- JSON
    rhyme_type          TEXT,
    similarity_score    REAL,
    line_index_a        INTEGER,
    line_index_b        INTEGER,
    aave_bridge         INTEGER,
    engine_confidence   REAL,
    created_at          TEXT
);

-- Per-line cadence measurements
CREATE TABLE cadence_events (
    id              INTEGER PRIMARY KEY,
    song_id         TEXT,
    section_label   TEXT,
    line_index      INTEGER,
    bpm             REAL,
    syllables_per_beat  REAL,
    stress_pattern  TEXT,   -- JSON
    cadence_class   TEXT,
    inversion_count INTEGER,
    inversion_rate  REAL,
    compression_flag INTEGER,
    cadence_variance REAL,
    created_at      TEXT
);

-- Detected motif events
CREATE TABLE motif_events (
    id              INTEGER PRIMARY KEY,
    song_id         TEXT,
    section_label   TEXT,
    anchor_word     TEXT,
    related_words   TEXT,   -- JSON
    semantic_field  TEXT,
    line_indices    TEXT,   -- JSON
    cluster_strength REAL,
    first_appearance INTEGER,
    created_at      TEXT
);

-- Section-level density profiles
CREATE TABLE song_sections (
    id              INTEGER PRIMARY KEY,
    song_id         TEXT,
    label           TEXT,
    bar_count       INTEGER,
    bpm             REAL,
    density_gradient TEXT,  -- JSON array of per-bar floats
    arc_type        TEXT,
    average_syllables_per_bar REAL,
    line_count      INTEGER,
    created_at      TEXT
);

-- Song-level analysis summaries
CREATE TABLE song_analyses (
    id                  INTEGER PRIMARY KEY,
    song_id             TEXT UNIQUE,
    title               TEXT,
    total_bars          INTEGER,
    bpm                 REAL,
    emotional_signature TEXT,   -- JSON
    aspiration_gap_score REAL,
    metadata            TEXT,   -- JSON
    created_at          TEXT,
    updated_at          TEXT
);

-- User interaction telemetry
CREATE TABLE user_signals (
    id              INTEGER PRIMARY KEY,
    event_type      TEXT,
    song_id         TEXT,
    before_state    TEXT,   -- JSON
    after_state     TEXT,   -- JSON
    engine_confidence REAL,
    created_at      TEXT
);
```

All writes use `INSERT OR REPLACE` for idempotency. WAL mode enabled. All errors logged to `prosodic_errors.log`, never raised.

### `learning_signals.db` (manual corrections)
```sql
CREATE TABLE global_correction_signals (
    word            TEXT,
    phoneme_sequence TEXT,
    correction_type TEXT,   -- 'add' | 'remove'
    color_id        TEXT,
    count           INTEGER,
    last_seen       TEXT
);
```

### `moby_thesaurus.db` (synonym lookup)
Pre-built from Moby Thesaurus data by `setup_thesaurus.py`. Read-only at runtime.

### `prosodic_labels.db` (behavioral layer — new)
```sql
CREATE TABLE state_labels (
    label_id              TEXT PRIMARY KEY,
    snapshot_id           TEXT NOT NULL,
    bar_features_json     TEXT NOT NULL,
    predicted_state       TEXT NOT NULL,
    predicted_confidence  REAL NOT NULL,
    rule_path_json        TEXT,
    user_agree            INTEGER,         -- 1=agree, 0=disagree, NULL=no feedback
    user_corrected_state  TEXT,
    user_feedback_at      TEXT,
    created_at            TEXT NOT NULL
);
```

---

## 6. DEPENDENCIES

### `requirements.txt` (production deps)
```
flask==3.1.0
anthropic==0.87.0
python-dotenv==1.1.0
nltk==3.9.1
gunicorn==23.0.0
PyJWT==2.10.1
werkzeug==3.1.3
```

### Additional Runtime Dependencies (not in requirements.txt)

| Library | Used In | Notes |
|---------|---------|-------|
| `g2p_en` | `phoneme_engine.py` | Fallback G2P for OOV words not in CMU dict |
| `cmudict` (NLTK) | `phoneme_engine.py` | Primary phoneme source |
| `spacy` (`en_core_web_md`) | `semantics_engine.py` | Optional — degrades gracefully if absent. Not in requirements.txt. |
| `beautifulsoup4` | `fingerprint_pipeline.py` | HTML stripping for data collection. Lazy-imported. |
| `requests` | `fingerprint_pipeline.py` | HTTP fetch for data collection. Lazy-imported. |
| `sqlite3` | `api.py`, `feature_store.py`, `learning_engine.py`, `mastery_engine.py`, `thesaurus_engine.py`, `behavior/label_capture.py` | Standard library |
| `statistics` | `mastery_engine.py`, `behavior/state_engine.py`, `behavior/drift_engine.py` | Standard library |
| `hashlib` | `analysis/bar_segmenter.py` | Standard library — SHA-256 for deterministic segmentation IDs |

### Environment Variables
| Variable | Used In | Default |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | `api.py`, `behavior/ai_interpreter.py` | None — required for VEIL and AI interpreter |
| `JWT_SECRET` | `api.py` | `'prosodic-dev-secret-change-in-prod'` |
| `PROSODIC_DB_PATH` | `api.py` | `~/prosodic_data/prosodic.db` |
| `PORT` | `api.py` | `5000` |

---

## 7. GAPS & INCONSISTENCIES

### Behavioral Layer Not Wired to API
The entire `analysis/` and `behavior/` package (9 modules, 74 passing tests) has **no API endpoints**. `api.py` does not import any of these modules. The behavioral layer is fully tested in isolation but is not reachable from the frontend or any external caller.

### `semantic_shift` Always Zero
`analysis/bar_feature_mapper.py` hardcodes `semantic_shift = 0.0` for every bar (`bar_feature_mapper.py` — line near end of function). The semantics engine exists and is functional but is not called per-bar. This means drift and degradation analysis cannot use semantic shift as a signal.

### ML Models Are Rule-Based Stubs
`ml_interface.py` defines 5 model classes. All fall back to rule-based logic. No trained `.pt` files exist. `model_registry.py` provides the hot-swap infrastructure but has nothing to load. The ML training data pipeline (feature_store, telemetry, fingerprint_pipeline) is complete — models are the missing piece.

### spaCy Not in requirements.txt
`semantics_engine.py` imports `spacy` and requires `en_core_web_md`. Neither is in `requirements.txt`. The engine degrades gracefully to `0.0` if unavailable, but semantic scoring is silently disabled on any clean install. This was likely intentional (spaCy was removed to reduce Railway image size per commit `1240e9f`).

### `aspiration_gap.py` Has No API Endpoint
The 589-line aspiration gap framework is fully implemented but not called from `api.py`, `feedback_engine.py`, or any route. It is a self-contained analytical capability with no current consumer.

### `bar_grid_linguistics.py` and `syllable_compression.py` Not in Main Pipeline
Both are fully implemented but not called from `assemble_feedback()` or any API route. They appear to be analytical modules built ahead of the pipeline that would use them.

### `device_detection_engine.py` — `compute_device_usage()` Called from Mastery
`mastery_engine.py:640` calls `compute_device_usage()` from `device_detection_engine.py` and includes the result in the mastery report. This is the only wired call to the device engine. The full device report is not exposed as a standalone endpoint.

### Behavioral Layer Uses `datetime.utcnow()` (Deprecated in Python 3.12+)
`analysis/bar_segmenter.py:258` and `behavior/label_capture.py:56,89` use `datetime.datetime.utcnow()` which is deprecated in Python 3.12+. Python 3.14 is in use on this machine. Tests produce 45 deprecation warnings. Replace with `datetime.datetime.now(datetime.UTC)`.

### `START_SERVER.bat` Present but Undocumented
A `START_SERVER.bat` file exists at root. It kills anything on port 5000, waits 2 seconds, then starts `python api.py`. Not referenced in any docs.

### Frontend Auth Pages Not Covered in This Snapshot
`frontend/src/pages/LoginPage.js`, `SignupPage.js`, `MasteryPage.js`, `ProfilePage.js` are listed as untracked in git (`??`). Their contents were not read for this snapshot.

### No README
No `README.md` exists at the project root. Entry points and purpose must be inferred from code and docstrings.

---

*End of snapshot. Generated 2026-05-07. Read-only — no application code was modified.*

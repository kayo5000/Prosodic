# Prosodic — Project Handoff

Hip-hop lyric craft analysis and writing tool. Python/Flask backend, React frontend.
Backend is complete and tested. Frontend is fully built and in active iteration.

---

## Project Structure

```
C:\Users\bsfka\OneDrive\Documents\Prosodic\
├── phoneme_engine.py
├── syllable_engine.py
├── rhyme_detection_engine.py
├── pocket_engine.py
├── motif_engine.py
├── density_engine.py
├── semantics_engine.py
├── normalization_engine.py
├── phrase_container_engine.py
├── feedback_engine.py
├── suggestion_engine.py
├── thesaurus_engine.py
├── learning_engine.py
├── veil_prompt.py
├── api.py
├── test_api.py
├── learning_signals.db     # SQLite — correction signals from user
├── moby_thesaurus.db       # SQLite — Moby Thesaurus synonym index
├── .env                    # ANTHROPIC_API_KEY (real key, never commit)
└── frontend/               # React app (create-react-app, plain JS)
```

---

## The Engines

### 1. phoneme_engine.py
Converts words to phoneme sequences using NLTK cmudict, with g2p_en fallback for OOV words.
- `get_rhyme_unit(word)` — extracts rhyme-bearing portion from last primary stress to end of word
- `rhyme_score(a, b)` — phonetic similarity float 0–1
- `get_phonemes(word)` — full phoneme list
- `FUNCTION_WORDS` — prepositions, articles, conjunctions excluded from analysis
- Imports `CONTRACTIONS` from normalization_engine

### 2. syllable_engine.py
Splits words into syllables and counts them.
- `get_syllable_count(word)` — integer count
- `syllabify_line(line)` — returns list of `{ word, syllable, syllable_index, word_index, is_stressed }`
- Used by pocket_engine and density_engine for beat-position mapping
- **Note:** `char_start`/`char_end` in the rhyme_map response are character offsets within the clean word (letters + apostrophes, exclusive end). These come from syllable boundary detection here. Known issue: coda consonants at syllable junctions (e.g., the "n" in "tain" for "unattainable") can be mis-assigned to the following syllable, producing visually wrong splits like "tai|nab|le" instead of "tain|a|ble".

### 3. rhyme_detection_engine.py
Detects rhyme groups across a verse.
- `analyze_verse(verse_lines)` → `{ rhyme_groups, end_rhyme_lines }`
- Each rhyme group member: `{ word, line_index, syllable_index, stream_index, color_id }`
- `color_id` is a stable 1-based integer per rhyme family, used by the frontend color system
- IDs are non-contiguous across responses (backend cluster merging may skip values); frontend remaps to compact 1–N sequence

### 4. pocket_engine.py
Maps syllables to a 16-position sixteenth-note grid.
- Beat 2 and Beat 4 are "pocket" positions (grid positions 4 and 12)
- `POCKET_WINDOW = 1` — ±1 sixteenth note counts as on-pocket
- `map_line_to_pocket(line, bpm)` → syllables with `pocket_position`, `beat_number`, `on_strong_beat`, `on_pocket`
- `get_flow_signature(verse_lines, bpm)` → one of: `On-Grid`, `Syncopated`, `Floating`, `Pocket Jumper`
- Distribution formula: `(i * 16) // total_sylls` — proportional, every bar position reachable

### 5. motif_engine.py
Groups rhyme families into motifs — recurring sound patterns across a verse.
- `build_motif_map(verse_lines, bpm=None)` → `{ motif_groups, verse_stream }`
- Each motif group: `{ type, color_id, members }`
- When bpm provided, only pocket-position syllables are considered for color assignment
- Imports pocket_engine at module level

### 6. density_engine.py
Scores three types of lyrical density per line and as a verse summary.
- `score_full_verse(verse_lines, motif_result=None)` → `{ density_per_line, density_summary }`
- Summary keys: `internal` (internal rhyme %), `multisyllabic` (multi-syllable rhyme %), `motif` (motif recurrence %)
- Accepts pre-computed motif_result to avoid double computation

### 7. semantics_engine.py
Semantic similarity between words using spaCy `en_core_web_md`.
- `semantic_similarity(word_a, word_b)` → float 0–1
- `SPACY_AVAILABLE` flag — suggestion engine uses syllable proximity as fallback if spaCy absent
- `nlp = None` initialized before try block to prevent AttributeError

### 8. normalization_engine.py
Six-layer text normalization pipeline.
- `normalize(word)` → `{ normalized, original, manipulation, was_split }`
- Layer order: (4) numeric/symbol expansion, (5) repeat stripping (`realllly` → `really`), (6) hyphen splitting, (1) contraction expansion, (3) slang/AAVE mapping, (2) generic -in' rule
- `CONTRACTIONS` and `SLANG` dicts defined here; phoneme_engine imports CONTRACTIONS

### 9. phrase_container_engine.py
Detects phrase containers — structural units like couplets, quatrains, and bars.
- `get_phrase_containers(verse_lines, bpm)` → list of `{ start_line, end_line, bar_count, type, lines }`
- Types: `couplet` (2 lines), `quatrain` (4 lines), `bar` (single bar unit)
- End rhyme detection compares last word of each line, not stream position

### 10. feedback_engine.py
Assembles all engine outputs into one unified response object.
- `assemble_feedback(verse_lines, bpm)` is the main callable
- Calls motif_engine, density_engine, phrase_container_engine, pocket_engine, rhyme_detection_engine
- Returns:
```python
{
  rhyme_map,             # flat list — all rhyming syllables with color_ids, char offsets, stress flags
  motif_groups,
  total_color_families,
  density_per_line,
  density_summary,       # { internal, multisyllabic, motif }
  phrase_containers,
  flow_signature,        # section-level string: On-Grid / Syncopated / Floating / Pocket Jumper
  bpm,
  line_count
}
```
- `rhyme_map` entry shape: `{ line_index, word_index, char_start, char_end, word, color_id, is_stressed, on_pocket }`
- Multiple entries per word = one entry per syllable
- `word_index` = position among non-whitespace tokens, 0-based

### 11. suggestion_engine.py
Two-layer rhyme suggestion.
- `get_suggestions(verse_lines, bpm=None, trigger_mode='auto')` → top 10 ranked, caches all 20
- `get_more_suggestions()` → ranks 11–20 from cache, no API call

**Layer 1 (local filter):**
- Detects dominant rhyme family via analyze_verse
- Uses RHYME_INDEX and NUCLEUS_INDEX (built once at startup from CMU dict — O(1) lookup)
- Filters by rhyme score ≥ 0.75, semantic similarity, syllable proximity
- MAX_CANDIDATES = 20 sent to Layer 2

**Layer 2 (Claude API ranking):**
- Sends top 20 candidates with verse context to claude-sonnet-4-6
- Returns ranked list with per-word reasons (max 12 words) and star ratings (1–5)
- max_tokens = 2048, compact JSON
- Falls back to Layer 1 order on API failure

**Suggestion entry shape:**
```python
{ word, rank, rhyme_score, semantic_score, syllable_count,
  motif_fit,     # "extends existing family" | "starts new family"
  reason,        # Claude's ≤12-word explanation
  star_rating,   # 1–5
  trigger_mode   # "auto" | "manual"
}
```

### 12. thesaurus_engine.py
Moby Thesaurus synonym lookup backed by a local SQLite database.
- `lookup(word)` → list of synonym strings
- `search(prefix)` → list of root words matching prefix (for autocomplete)
- `db_available` flag — degrades gracefully if DB missing

### 13. learning_engine.py
Records manual correction signals from users and exposes them for review.
- `record_signals_batch(signals)` — writes to `learning_signals.db` (SQLite)
- `get_top_signals()` — returns most frequent correction patterns
- Used by the frontend when users manually reassign rhyme families in the correction popover

### 14. veil_prompt.py
Contains `VEIL_SYSTEM_PROMPT` — the system prompt for the VEIL AI craft intelligence endpoint.
VEIL is a rap craft advisor persona embedded in the tool. Loaded at API startup.

---

## API Endpoints (api.py)

Flask app at `http://localhost:5000`. CORS enabled for all origins.

### GET /health
`{ "status": "ok" }` — liveness check.

### POST /analyze
**Body:** `{ verse_lines: string[], bpm: number }`
**Returns:** Full feedback_engine response (see Engine 10).
**Errors:** 400 if bpm missing/zero, 400 if verse_lines missing/empty/non-strings.

### POST /suggest
**Body:** `{ verse_lines: string[], bpm?: number, trigger_mode?: "auto"|"manual" }`
**Returns:** `{ suggestions: [...top 10], count: 10, trigger_mode }`
Caches all 20 results for /suggest/more.

### GET /suggest/more
No body. Returns `{ suggestions: [...ranks 11–20], count: 10 }`.
Instant — reads in-memory cache from last /suggest call.

### POST /veil/chat
**Body:** `{ messages: [{role, content}] }`
**Returns:** streaming or buffered Claude response using VEIL_SYSTEM_PROMPT.
VEIL is a rap craft intelligence persona — answers questions about flow, rhyme, structure.

### GET /thesaurus
**Query:** `?word=xxx`
**Returns:** `{ word, synonyms: string[] }` from Moby Thesaurus SQLite.

### GET /thesaurus/search
**Query:** `?q=xxx`
**Returns:** `{ results: string[] }` — prefix-matched root words.

### POST /autofill
**Body:** `{ verse_lines: string[], bpm: number, threshold?: number }`
**Returns:** autofill assignments — suggested rhyme family matches for uncolored words.
Uses phonetic scoring against existing families. Default threshold 0.60.

### POST /suggest-family
**Body:** `{ word: string, families: [{color_id, samples}] }`
**Returns:** `{ suggestions: [{color_id, score}] }` — phonetic match scores for a specific word against existing rhyme families. Used by the correction popover's "Suggested Match" section.

### POST /corrections
**Body:** `{ signals: [{...}] }`
Records manual correction events to learning_signals.db.

### GET /corrections
Returns top correction signals for debug/review.

### GET /rhyme-find
**Query:** `?word=xxx`
Returns rhyme candidates from CMU dict for a given word.

---

## rhyme_map Field Detail

Each entry in `rhyme_map` represents one phonetic syllable:
```python
{
  "line_index":  2,       # 0-based line number in verse_lines
  "word_index":  4,       # 0-based index among non-whitespace tokens on the line
  "char_start":  0,       # char offset within clean word (punctuation stripped), inclusive
  "char_end":    3,       # char offset within clean word, exclusive
  "word":        "prayin",
  "color_id":    177,     # raw family ID — non-contiguous; frontend remaps to 1-N
  "is_stressed": true,
  "on_pocket":   false
}
```
Multiple entries sharing `(line_index, word_index)` = multi-syllable word.
`color_id` is non-contiguous across responses due to internal cluster merging.
Frontend normalizes via `normalizedRhymeMap` useMemo that remaps to compact 1–N sequence.

---

## Known Issue: Syllable Boundary Characters

The `char_start`/`char_end` values come from `syllable_engine.py`'s boundary detection.
Coda consonants at syllable junctions can be mis-assigned to the following syllable.

Example — "unattainable":
- Backend returns: `un | at | tai | nab | le`
- Correct split is: `un | at | tain | a | ble`
- The "n" coda of "tain" bleeds into the next syllable, dragging "b" along with it

The frontend displays `word.slice(char_start, char_end)` directly — it correctly shows whatever the backend gives. The fix must be in `syllable_engine.py`.

---

## Frontend Architecture (SongViewPage.js)

The frontend is a single large React page (~3900 lines). Key patterns:

**Mirror + textarea overlay:**
- `position: relative` container holds both
- Mirror div renders all colored spans (rhyme highlights, stress colors, collab tints)
- Transparent `<textarea>` sits at `position: absolute; inset: 0` for input
- Both must have identical `fontFamily`, `fontSize`, `lineHeight`, `padding`, `whiteSpace`, `wordBreak` or cursor drifts
- Shared constants in `frontend/src/constants/textLayout.js`:
  - `FONT_FAMILY = 'DM Sans, sans-serif'`, `FONT_SIZE_PX = 16`, `LINE_HEIGHT = 1.8`
  - `TEXT_PADDING = '16px 20px'`, `LINE_HEIGHT_PX = '28.8px'`

**Mode flags (mutually exclusive):**
- `mapVisible` — rhyme colorMap active; `flowMode` — stress/pocket colors active
- When `flowMode=true`: `colorMap={}`, `stressMap=derivedStressMap+stressMarks`
- When `flowMode=false`: `colorMap=rhymeColorMap`, `stressMap={}`

**Memoization stack (rhyme):**
```
normalizedRhymeMap → baseColorMap → autofillColorMap → colorMap
```

**Key state:**
- `corrections` — manual rhyme reassignments per section, persisted via useCorrections hook
- `stressMarks` — manual flow stress overrides per section (`li_wi` → 'yellow'|'blue'|'green')
- `lineOwners` — `{ lineIndex: artistId }` for collab mode
- `adlibLines` — Set of line indices excluded from analysis
- `barBoundaries` — Set of line indices where user placed bar dividers

**Bar count formula:**
```js
barCount = barBoundaries.size > 0
  ? barBoundaries.size + 1
  : Math.ceil(lines.length / barSize)
```
`lines.length` includes blank lines (structural in hip-hop). `barSize` default = 4.

---

## Design Language

**Aesthetic:** Dark (#1a1a1a background), gold accent (#F5C518), premium hip-hop craft tool.
**Color system:** 44 colors per session, evenly spaced HSL wheel, stride-9 distribution across families.
- `getColor(colorId)` → `{ bg, fg }` via `RHYME_PALETTE[(offset + (colorId-1)*9) % 44]`
- gcd(9, 44) = 1 so consecutive IDs span the full hue wheel

---

## Environment

- Python 3.14, Windows 11
- Flask backend: `python api.py` → http://localhost:5000
- React frontend: `npm start` in `frontend/` → http://localhost:3000
- ANTHROPIC_API_KEY in `.env`
- NLTK cmudict downloaded automatically on engine import
- spaCy `en_core_web_md` optional — engines degrade gracefully without it

---

## Test Suite

`test_api.py` — 41 checks. Run: `python test_api.py` from the Prosodic directory.
Covers: serializer, health, /analyze (validation + response shape), /suggest (validation + all fields), /suggest/more (no-overlap + cache speed <50ms), OPTIONS preflight, CORS headers.

---

## Test Verse (J. Cole — BPM 80)

```
And I swear that it's turnt
It all begins with encore cheers
From those wearin' my merch
Fast forward through years of rehearsal
Losin', winnin', bank account thinnin'
Income streams nowhere near as diverse
And though I'm blessed I seen you stressin'
From hearin' the chirps and naysayers
```

Expected: dominant rhyme family = -ITS/-ERCH, flow signature = Pocket Jumper,
top suggestion = "admits" (confessional tone matches verse).

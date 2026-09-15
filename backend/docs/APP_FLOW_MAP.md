# Prosodic — App Flow Map (refresh)

Verified against the current repo tonight, not read from memory. **I don't have
the literal original map file** — it wasn't in this session's context and no
`docs/*flow*`/`*map*` file exists in the repo to diff against — so "what changed"
below is built from (a) what Khris told me changed, and (b) my own direct
re-verification of each item against current code, not a literal line-by-line
diff against his original. Flagged explicitly anywhere that distinction matters.

Criteria applied, verbatim as given:
- **Red** — more than one distinct job, OR both encoder and decoder in the same
  file, OR asks for BPM/context directly instead of getting it from SongContext.
- **Yellow** — decoder only.
- **No color** — single job, encoder only, fed correctly.
- Encoder = raw input → structured internal data, never seen directly outside the pipeline.
- Decoder = structured internal data → final/presentable result (UI/API response).
- Both = real work in both directions, same file.

---

## 1. Module table

### `/analyze` + `/suggest` pipeline

| # | MODULE | TASK(S) | TYPE | NEEDS → ACTUALLY FED | FLAGS |
|---|---|---|---|---|---|
| 1 | `phoneme_engine.py` | CMU/G2P phoneme lookup + phonetic rhyme scoring | Encoder | word → word (no bpm need) | — |
| 2 | `normalization_engine.py` | Canonicalize word surface form (contractions/slang/g-dropping) for lookup | Encoder | word → word | — |
| 3 | `syllable_engine.py` | Split word into syllables from phoneme vowel boundaries (+ letters-fallback tier) | Encoder | word → word | — |
| 4 | `rhyme_detection_engine.py` | Group syllables into rhyme families (union-find over phonetic threshold) | Encoder | verse_lines → verse_lines | — |
| 5 | `motif_engine.py` | Assign color-family IDs across rhyme + compound sequences | Encoder | verse_lines, ctx → verse_lines, ctx ✓ | — |
| 6 | `density_engine.py` | Score internal-rhyme/multisyllabic/motif density per bar | Encoder | verse_lines → verse_lines (no bpm need) | — |
| 7 | `pocket_engine.py` | Assign syllables to 16-step grid + classify flow signature | Encoder | `get_flow_signature` takes ctx ✓; but `map_line_to_pocket`/`enrich_stream_with_pocket` still take a bare `bpm` param in their signature | **Red** — see note below |
| 8 | `performed_stress.py` | Compare lexical vs. performed (grid) stress | Encoder | reads pocket_engine's already-placed grid position — no bpm/ctx param at all on the live entry point | — |
| 9 | `stress_signals.py` | Classify stress mismatches into a craft-signal taxonomy with deliberateness gating | Encoder | verse_lines, ctx → ctx ✓ | — |
| 10 | `phrase_container_engine.py` | Detect compositional boundaries from 5 weighted signals, now with confidence | Encoder | verse_lines → verse_lines (no bpm need) | — |
| 11 | `perceptual_family_engine.py` | Tag words by phonetic family + confidence | Encoder | verse_lines → verse_lines | — |
| 12 | `pattern_reader_engine.py` | Read dominant rhyme-family patterns across a verse | Encoder | tagged_words → tagged_words | — |
| 13 | `semantics_engine.py` | spaCy word-vector similarity for near-rhyme scoring | Encoder | word pair → word pair | — |
| 14 | `thesaurus_engine.py` | Synonym/bridge/reverse lookup against Moby Thesaurus | Encoder | word → word | — |
| 15 | `final_result_converter.py` | Normalize + polarity-align raw scores onto one comparable scale before blending | Encoder | value + registered source key → same | — |
| 16 | `suggestion_engine.py` | Layer 1 phonetic filter + Layer 2 thesaurus composite + target-word override, AND its `get_suggestions()` return value ships directly as the `/suggest` response | **Both** | ctx ✓, but does real encoding (candidate generation) and is also the literal decoder for `/suggest` in the same file | **Red** — multiple jobs AND both encoder+decoder |
| 17 | `feedback_engine.py` | Assemble every engine's output into the final `/analyze` response | **Decoder** | ctx ✓ | **Yellow** — this is a genuine reclassification from "just an orchestrator": its return value (minus a tuple→list pass in `api.py`) *is* the API response, which makes it a decoder by the given definition, not colorless |
| 18 | `prosodic_config.py` | Shared constants (grid size, thresholds, weights) | *n/a — no behavior* | — | not scored (pure constants, not a job) |

**`pocket_engine.py` red-flag detail, since this is the exact BPM-class bug named
in the roadmap:** at the orchestrator level (`get_flow_signature`, called by
`feedback_engine`) this is now fully fixed — it takes `ctx` and unwraps
`ctx.bpm` correctly. But two leaf functions
(`map_line_to_pocket`/`enrich_stream_with_pocket`) still have a bare `bpm`
parameter in their signature. Checked their bodies directly: `bpm` is never
referenced anywhere inside either function — it's a dead parameter, not a
live SongContext bypass. So functionally this is resolved (nothing reads a
wrong/stale bpm value), but per the letter of the stated criterion ("asks for
context data directly instead of getting it from SongContext") the signature
itself still asks — that's a real, if cosmetic, finding. Recommend either
dropping the parameter entirely or renaming it to make the dead-ness explicit
(e.g. `_bpm_unused`), rather than leaving a signature that looks load-bearing
and isn't.

### `/mastery`

| # | MODULE | TASK(S) | TYPE | NEEDS → ACTUALLY FED | FLAGS |
|---|---|---|---|---|---|
| 19 | `mastery_engine.py` | Compute mastery signal from historical song-level data | Decoder (if ever called) | Needs a `song_id`/song-identity concept that doesn't exist anywhere else in the app | **Disconnected**, not colored — `/mastery` was pulled tonight and returns an honest "not wired up" response without calling this file at all. Real, tested code; zero live callers. Not a Red/Yellow/no-color case, a "not currently reachable" case. |

### `/veil/*`

| # | MODULE | TASK(S) | TYPE | NEEDS → ACTUALLY FED | FLAGS |
|---|---|---|---|---|---|
| 20 | `veil_prompt.py` | Static system-prompt template string | *n/a* | — | resource, not scored |
| 21 | `veil_revival_routes.py` | Build revival system prompt + run the `/veil/revival/chat` conversation | Decoder | request data → response | **Yellow** |
| 22 | `api.py`'s `/veil/chat` route (inline, not a separate file) | Assemble system prompt + call Anthropic + return response | Decoder | request data → response | **Yellow** (would be Red as a standalone file for doing prompt-assembly + API call + response-shaping together, but it's a thin route body, not an engine module — noting the shape rather than forcing a color) |

### Cantos package (behind `FEATURE_CANTOS_ENABLED`, off by default)

| # | MODULE | TASK(S) | TYPE | NEEDS → ACTUALLY FED | FLAGS |
|---|---|---|---|---|---|
| 23 | `cantos/db.py` | Connection factory + schema | *n/a* | — | infrastructure, not scored |
| 24 | `cantos/notebooks.py` | Append-only per-engine observation log + delta computation | Encoder | engine, user_id, session_id, observation → structured entry | — |
| 25 | `cantos/disposition.py` | Persistent per-engine-per-user state (confidence/pride/trajectory/views) | Encoder | outcome/view data → structured state | — |
| 26 | `cantos/wiring.py` | The one worked example: real engine chain → Notebook Entry | Encoder | user_id, session_id, verse_text, **bpm (bare, not ctx)** | **Red** — genuinely still asks for bare `bpm` directly, not SongContext. Wraps it in `SongContext(bpm=bpm)` before calling `feedback_engine.assemble_feedback` internally (verified — it does this correctly one level in), but its own public signature is still bare bpm. Real, not fixed. |
| 27 | `cantos/board.py` | Shared per-session signal board | Encoder | engine, session_id, signal data → structured post | — |
| 28 | `cantos/meetings.py` | Detect related-signal clusters across the board, form meetings | Encoder | session_id, posts → structured meeting | — |
| 29 | `cantos/notes.py` | Store/read notes before Cassius gating | Encoder | source, message data → structured note | — |
| 30 | `cantos/cassius.py` | Daily eligibility gate deciding which notes surface | Encoder (decision, not language) | notes, thresholds → which notes get marked surfaced | — |
| 31 | `cantos/voice.py` | Render structured signal+delta into final template text, no LLM | **Decoder** | engine/signal/strength/delta → rendered string | **Yellow** — the clean, correct kind (single job, pure decoder, explicitly cannot generate lyric content) |
| 32 | `cantos/direct.py` | User-initiated per-engine channel: `knock()` (rule-voiced) + `converse()` (open-ended, LLM) | **Both** | engine, user_id, message → response | **Red** — real encoding (gathering notebook/board/disposition context) and real decoding (rendering `knock()` responses via voice.py, and `converse()`'s LLM output) in the same file |
| 33 | `behavior/state_engine.py` | Classify bar features into a state label + evidence | Encoder | snapshot → structured classification | — |
| 34 | `behavior/ai_interpreter.py` | Structured state/drift/degradation → 2-4 sentence artist-facing read via LLM | **Decoder** | state/drift/degradation → text | **Yellow** — this is the file Khris's naming note already earmarked as "should be named VEIL, the one decoder" — confirmed here structurally, it IS a clean single-job decoder |
| 35 | `feature_flags.py` | `FEATURE_CANTOS_ENABLED` gate | *n/a* | — | infrastructure, not scored |

---

## 2. Big-picture request flow

**`/analyze`** (`api.py:314`): parse JSON → require verse_lines → parse bpm
(required) → **`ctx = SongContext(bpm=bpm)`** minted once, right here, nowhere
else → `assemble_feedback(verse, ctx)` → `feedback_engine.py` fans out to
`motif_engine`/`density_engine`/`pocket_engine`/`phrase_container_engine`/
`stress_signals`, all of which now take `ctx` (verified above, not assumed) →
their outputs get assembled into one dict → `jsonify(_serializable(feedback))`
ships it. **Confirmed, not assumed: BPM now flows through SongContext cleanly
end-to-end for this route** — one mint point, one `ctx` object threaded through
every sub-call, no second independent bpm re-derivation anywhere in the chain.

**`/suggest`** (`api.py:347`): same shape — parse JSON → require verse →
**`ctx = SongContext(bpm=bpm)`** minted once (bpm optional here, unlike
`/analyze`) → `get_suggestions(verse, ctx=ctx, ...)` → Layer 1
(`suggestion_engine._layer1`, uses `ctx` for `build_motif_map`) → Layer 2
(thesaurus composite scoring, no bpm need) → results cached in-memory →
top 10 returned. **Same confirmation: one `ctx`, no drift.**

**Remaining structural gap, real and unresolved:** `suggestion_engine.py`
itself is both the encoder (Layer 1 candidate generation) and the decoder
(its return value ships as the API response) in one file — see the Red flag
above. This isn't a BPM problem, it's the encoder/decoder-both problem the
color scheme is designed to catch. Splitting it into a candidate-generation
module + a response-shaping module would resolve it structurally, matching
what already happened with `feedback_engine.py`/`assemble_feedback` (a clean,
separate decoder).

---

## 3. What changed since the last map

Working from what Khris described changed, verified against current code
rather than assumed true:

**Resolved, confirmed:**
- **SongContext exists and actually threads through cleanly** for both live
  routes — this was almost certainly the top red flag on the original map
  (the doc's own criteria singles out "asks for BPM directly" as an automatic
  Red). Confirmed clean at the orchestrator level for all 9 modules in the
  `/analyze`/`/suggest` graph that need temporal context at all.
- **`final_result_converter.py` didn't exist on the original map** — it's new
  tonight, and it's the answer to the scale/polarity blending question that
  likely wasn't answerable before (there was no shared normalization layer).
- **Dead code cleared** — 9 functions across 8 files removed tonight+prior
  session; none of them show up in this table because they're gone, not
  because they were skipped.
- **`/mastery` pulled** — no longer a live route claiming to do something it
  can't; now an honest "not wired up" response. Reflected in the table as
  "disconnected," not colored red/yellow, since it's not actually running.
- **phoneme/normalization split fixed** — `phoneme_engine.normalize()` now
  delegates to `normalization_engine`'s real cleaner instead of a thinner,
  separately-maintained copy. Removes a twin that would otherwise be on this
  map.
- **Private-import leak fixed** — `api.py` no longer reaches into
  `rhyme_detection_engine`'s private function; not directly part of this
  encoder/decoder scheme, but closes an API-boundary hygiene issue that would
  have been adjacent to this audit.

**Still open (real, not new, but re-confirmed tonight rather than assumed):**
- `pocket_engine.py`'s two leaf functions still carry a dead `bpm` parameter
  — cosmetic now, not a live drift risk, but still literally asks for bpm
  directly per the stated criterion.
- `suggestion_engine.py`'s both-encoder-and-decoder shape — unchanged, real,
  unresolved.

**New, found only by re-verifying tonight (would not have been on the
original map, since some of this code didn't exist a few days ago):**
- `cantos/wiring.py`'s public `record_state_snapshot(user_id, session_id,
  verse_text, bpm)` still takes bare `bpm`, not `ctx` — this module didn't
  exist on the original map at all (Cantos was built after it, in an earlier
  session tonight). It does correctly wrap it in `SongContext` one level
  in, but its own signature is a real, if narrow, instance of the exact
  bug class this whole audit is hunting.
- `cantos/direct.py`'s both-encoder-and-decoder shape — same pattern as
  `suggestion_engine.py`, in code that's newer than the original map.
- `feedback_engine.py` reclassified from "orchestrator" to **Decoder
  (Yellow)** — its return value ships directly as the API response. This
  wasn't wrong on the original map necessarily (I don't have it to check),
  but it's worth stating precisely: single job, decoder-only, correctly
  Yellow, not colorless.

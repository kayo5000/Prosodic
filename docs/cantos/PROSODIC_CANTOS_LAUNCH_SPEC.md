# PROSODIC — THE CANTOS: LAUNCH SPEC

**Scope:** Everything buildable *before launch*, on the current stack, using engines that already exist.
**Companion doc:** `PROSODIC_CANTOS_PHASE_TWO_SPEC.md` (the horizon — do not build from that yet).

---

## 0. PRIME DIRECTIVE (non-negotiable, applies to every line below)

Prosodic **analyzes, never generates.** The Cantos characters **understand the *how*** of craft and emotion; they **never write the *what***.

- An engine may name a device, map a structure, track a change, ask a question, point at a word.
- An engine may **never** supply a replacement line, bar, phrase, or lyric.
- Any feature that drifts toward authorship is a bug, not a milestone.

This is architectural, not cultural. If a module *could* emit lyric content, it is wired wrong.

**On "feeling":** engines do not feel. They **model emotional architecture so precisely that it functions like understanding.** Everywhere this spec says an engine "notices," "recognizes," or "takes pride," it means a real, computed, logged state — never a claim of subjective experience. Build the model of the feeling; never claim the ache.

---

## 1. HARD BLOCKER (fix first, nothing else matters until this is done)

**Memory must survive redeploys.** Current SQLite on Railway sits on ephemeral disk and wipes on every redeploy. The entire Cantos system is built on persistent per-engine memory — if the save file dies, the town dies.

**Task:** mount a persistent volume on Railway (or migrate to managed Postgres) so the DB survives redeploys. This is the single prerequisite for §3–§7.

---

## 2. THE FIVE REAL PRIMITIVES

Strip away the town, the houses, the weather. Underneath, the launch system is **five record types**. Everything else is skin. Get these schemas right — they are the nervous system.

### 2.1 Notebook Entry (per engine, per user — private memory)
Append-only. One entry per engine per session. Newest-on-top when read.
```
notebook_entry {
  engine:       str        # e.g. "rhyme_detection"
  user_id:      str
  session_id:   str
  observation:  str        # what this engine saw this session
  metrics:      json       # the raw numbers behind the observation
  delta:        json|null  # change vs. this engine's last entry (null on first)
  timestamp:    iso8601
}
```
`delta` is the growth signal. It is computed by comparing to the previous entry for the same (engine, user). This is the mechanism behind "now vs. then."

### 2.2 Board Post (shared read surface — how engines see each other)
Written to a per-session board. Any engine can read all posts.
```
board_post {
  engine:     str
  session_id: str
  section:    str        # which bars — e.g. "L1-8" or bar range
  signal:     str        # machine label, e.g. "theme_strengthening", "pocket_slip", "rhyme_family_return"
  strength:   float      # 0.0–1.0 salience/confidence
  summary:    str|null   # one line in engine voice (optional at launch)
  timestamp:  iso8601
}
```

### 2.3 Meeting (engines choosing to combine)
Formed when the board shows overlap. See §4 for trigger logic.
```
meeting {
  session_id:    str
  section:       str
  participants:  [str]        # engines that joined
  trigger:       str          # why it formed (which overlapping signals)
  combined_read: str          # merged conclusion, richer than any single post
  declined:      [{engine, reason}]  # invited but passed (e.g. "own read thin (0.3)")
  timestamp:     iso8601
}
```

### 2.4 Note to Cassius (candidate for surfacing)
Everything an engine or meeting wants the user to potentially hear lands here first.
```
note {
  source:     str        # engine name or "meeting:<id>"
  session_id: str
  section:    str
  message:    str        # the thing that could reach the user, in voice
  priority:   float      # 0.0–1.0
  basis:      json       # links to notebook entries / deltas grounding the claim
  timestamp:  iso8601
}
```

### 2.5 Dev Log Line (plain text — BUILD THIS FIRST)
One human-readable line per event. This is how *you* verify the town is real before any UI exists.
```
[HH:MM:SS] ENGINE action → detail
[10:42:03] MOTIF read L1-8 → posted board: theme_strengthening, strength 0.81
[10:42:04] RHYME saw MOTIF post → overlap L1-8 → JOINED
[10:42:05] RHYME declined further → own read thin (0.30), researching
[10:42:06] MEETING closed (motif+semantics) → note dropped to Cassius, priority 0.77
[10:42:07] CASSIUS held 4 notes → surfaced 1 to user
```
Build the log **before** anything else in §3. If you can read the log, you can trust the system.

---

## 3. THE SESSION LOOP (one write, start to finish)

1. User writes / edits lyrics.
2. **Foundation** (Normalization → Phoneme → Syllable) preps raw material. Never writes to the user.
3. **Analysis engines** each read their one dimension, then do two things:
   - append a **Notebook Entry** (with `delta` vs. last session), and
   - if a finding is salient, write a **Board Post**.
4. **Meetings** form where the board shows overlap (§4).
5. Engines and meetings drop **Notes** at Cassius's door.
6. **Cassius** gates: surfaces the single highest-value note, withholds the rest (§5). Withheld notes are still stored and logged.
7. Every step writes a **Dev Log Line**.

---

## 4. MEETING TRIGGER (when an engine bugs *another engine*)

A meeting opens when, within one session:
- **2+ engines** post to the board on the **same `section`**, AND
- their signals are **related** (a small adjacency map defines which signals reinforce which — e.g. `theme_strengthening` ↔ `emotion_rising` ↔ `rhyme_family_return`), AND
- **combined strength** clears a threshold `T_meet` (start at 1.2 summed, tune later).

When it opens, other relevant engines are **invited**. An invited engine **joins only if its own read on that section clears `T_join`** (start at 0.5); otherwise it **declines with a reason**, which is logged.

**Declines are real.** "No / not now" isn't conflict-for-flavor — it's an engine whose data didn't support the play. This behavior is required, not optional. It's what makes the town read as alive instead of scripted.

---

## 5. CASSIUS — THE GATE (the wall between the town and the user)

Cassius holds the only line to the user. Two modes:

### 5.1 Daily mode (gated feed) — default
- Collects all Notes for the session.
- Surfaces **one** by default (config `surface_max`, default 1).
- A note is eligible only if it clears the bar:
  - `(a)` it represents a **meaningful change** since last session (non-null, non-trivial `delta`), **OR**
  - `(b)` its `priority` exceeds `T_surface` (start 0.7), **AND**
  - `(c)` it is the **highest-priority** eligible note this session.
- **Everything withheld is still stored and logged.** The gap between generated and surfaced is the mentorship. Do not delete withheld notes — they are the record of what Cassius chose not to say.

### 5.2 Direct mode (knock on a door) — user-initiated
- The user may open a **direct channel to a specific engine** and talk to it (text at launch).
- This bypasses the daily gate *by the user's choice* — it is a different room, not a violation of the wall.
- The engine responds **only within its domain**, from its **notebook** (so it "remembers" the user), in its **voice**. Still bound by the Prime Directive.

---

## 6. VOICE LAYER (how they talk — launch = rule-voiced)

- Launch uses **rule-voiced templates**: each engine speaks in its own register via templates keyed to `signal` + `delta`. Free, fast, cannot hallucinate, cannot generate lyrics.
- **Every surfaced and withheld message is logged with its inputs.** This log is the training set for the future LLM voice (`ai_interpreter.py`, wired in Phase Two). The rule engine is simultaneously the product and the dataset — this is the `label_capture.py` principle applied to voice.
- Character register per engine comes from the character sheets (function-truth, wound, voice line). Keep voice tethered to function — an engine never speaks outside what it actually computes.

---

## 7. MEMORY MODEL AT LAUNCH (Well 1 only)

Launch ships **exactly one memory well:**

- **Well 1 — The Notebook:** private, per-engine, per-user, about *this user only*. Never leaves the town.

Wells 2 (craft library from the open world) and 3 (anonymous cross-user patterns) are **Phase Two**. Do not build them here. Do **frame the empty rooms** — leave a clean interface where an engine could later consult external knowledge — but wire nothing to the outside world at launch.

---

## 8. THE ANDRÉ BENCHMARK (private test case — legal-safe handling)

A hard target to prove the emotion-architecture reading is real.

**Test:** Given André 3000's verse on *Life of the Party* (Kanye West & André 3000) as **input at test time**, can the analysis:
1. map the nested-grief structure (living artist → deceased Donda → deceased mother → living son),
2. detect the doubt→hope turn across the verse (from "no Heaven's trumpets" toward "blade of grass, keep rolling"), and
3. surface the parallel-fate irony (both parents, separated, heart conditions)?

**Legal handling (strict):**
- Reference the verse **by title + artist only**. Do **not** paste lyrics into the spec, the codebase, tests, or any stored fixture.
- Lyrics are **input-not-inventory**: fed at test time, analyzed, never bundled or shipped, never reproduced back to any user.
- Rule for all copyrighted material, permanently: **analysis in, insight out — never the original text back out.**
- (Bless this boundary with a 30-min IP consult at LLC formation. Not a blocker; a checkbox.)

---

## 9. BUILD ORDER (sequenced)

1. **Fix the save file** (§1). Nothing sticks until this is done.
2. **Dev Log** (§2.5). Build the eyes before the body.
3. **Notebooks** (§2.1) — wire the already-built Behavioral Layer (9 modules, 74 tests) to live endpoints so entries persist per session.
4. **Board + Posts** (§2.2).
5. **Meetings + Refusals** (§2.3, §4).
6. **Cassius gate — daily mode** (§5.1).
7. **Rule-voiced templates** (§6).
8. **Direct mode** (§5.2).
9. **André benchmark** (§8) as an ongoing regression test.

Items 3, 7, and the interpreter groundwork lean on modules **you already built** (Behavioral Layer, `ai_interpreter.py`, `label_capture.py`). Much of launch is wiring, not net-new construction.

---

## 10. EXPLICITLY OUT OF SCOPE (see Phase Two)

World-scale learning · tutor/study-session system · Album Engine · Story Engine · Melody Engine (audio stack) · LLM-voiced characters · Godot village / weather / avatar / faces / mic. None of these gate launch. Frame empty rooms only where §7 says to.

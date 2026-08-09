# PROSODIC — THE CANTOS: PHASE TWO SPEC (THE HORIZON)

**Scope:** Everything beyond launch — new senses, self-leveling, world-scale learning, and the visible world.
**Do not build from this until the Launch Spec ships and holds.** This is the map, not the marching order.
**Companion doc:** `PROSODIC_CANTOS_LAUNCH_SPEC.md`.

---

## 0. PRIME DIRECTIVE (unchanged, still absolute)

Analyze, never generate. Understand the *how*, never write the *what*. Engines **model** feeling so precisely it functions like understanding; they never claim to feel and never author lyric content. Every item below inherits this wall — the more powerful the feature, the harder the wall must hold.

---

## 1. THE THREE MEMORY WELLS (Phase Two completes the set)

Launch ships Well 1 only. Phase Two adds two more — and the wall between them is what makes them safe.

- **Well 1 — The Notebook** *(shipped at launch)*: private, per-engine, per-user, about this user only.
- **Well 2 — The Craft Library**: shared knowledge about *how music/writing works*, learned from the open pool (public web, books, corpora you feed it). Belongs to no user. Makes every engine a better **reader**, never a fisher-of-lines.
- **Well 3 — The Pattern Well**: anonymous lessons learned across many users. **Patterns only, never people, never words.**

**The privacy wall (hard rule):**
> Engines learn **patterns**, never **people**. A lesson like "stacked internal rhymes tend to cost pocket" may enter the well. A specific line, bar, phrase, or fingerprint of another human's writing may **never** cross into any user's town. The pool teaches the lesson; it never carries the evidence. Privacy isn't a setting added later — it's the precondition that lets Wells 2 and 3 exist at all.

**Ceiling to design around:** an engine trained on the open pool learns what is *common* and *how* craft works. It does **not** acquire taste. Common ≠ wise. Taste stays with the user — which is the correct seat for it.

---

## 2. THE TUTOR / STUDY-SESSION SYSTEM (anti-plateau)

**Problem it solves:** engines left running don't get wiser — running isn't studying. Without deliberate leveling, they plateau.

**Mechanism (real, not flavor):**
- An engine "goes to a tutor" when its **confidence stalls** — it repeatedly hits patterns it can't explain with what it knows (a measurable state, not a mood).
- A **tutor** is a deeper knowledge source: a specialist model, a curated corpus, or a harder dataset for one narrow domain. (The "50 tutors" are this, catalogued.)
- A **study session** is the engine being **retrained or extended** on that narrower, deeper material, then returning able to see what it was blind to.

**The breakthrough function:** tutors don't just deepen — they **reframe.** "You measure rhyme as sound; what if you measured it as tension-and-release?" A reframe makes an engine re-see its whole domain. This is how you get *new*, not just *better*. It is the system's ceiling-raiser.

**Prereq:** Well 2 (a real external knowledge substrate) must exist first.

---

## 3. ALBUM ENGINE (new character — reception & landscape)

**Job:** understand the *landscape* of music — what exists, what's been received how, what's saturated, what's open.

- Studies conversation *around* music continuously (reviews, Reddit, YouTube critics) **to understand reception, not to become a fan.** May still hold private taste (a top 10/100) but that's separate from the job.
- **Weights sources by track record** so no single loud voice warps the read. This is genre-conditioned baselines applied to *taste* — the guard against a hive-mind engine that just parrots hype.
- **Recommends albums to the user, with sourcing:** "Sending you this because Cadence asked me about slow vibes." Cross-engine sourcing reuses the launch board/meeting system, pointed outward at the world instead of inward at the bars.
- Can run **research for the user** on request.

**Prereq:** Well 2 + Well 3 infrastructure. Runs on text/reception data, so it fits the existing town.

---

## 4. STORY ENGINE (new character — narrative-structure reader)

**Job:** read narrative architecture across a body of work — how a verse travels, how an album arcs, how a concept threads across tracks (e.g. *Psych 90*; the voicemail→doorbell reversal).

- Outputs analysis: "Verse 2 doesn't land the reversal — you resolved the tension too early."
- **Guardrail (one letter from disaster):** it is a **reader of narrative structure, never a generator of narrative.** It maps the arc; it never writes the arc. Name it and gate it accordingly.

**Prereq:** none beyond launch primitives + Well 2 for cross-corpus structural learning. Fits the existing town.

---

## 5. MELODY ENGINE (a SECOND TOWN — read this carefully)

**Why it's separate:** every launch engine runs on **words** — phonemes, syllables, rhyme, CMU dictionary. Melody and harmony run on **audio and pitch** — a different kind of data entirely. The 21 engines can't hear; they read text.

So the Melody Engine is **not another character slotted next to Rhyme.** It's a **second foundation** — audio analysis, pitch detection, harmonic analysis — a separate stack. This is Prosodic evolving from a *lyric* instrument into a *music* instrument. It is a **phase-two product**, not an engine.

**What it can genuinely do (real, not mystical):**
- Explain *why* a progression sounds otherworldly — e.g. a borrowed chord from outside the key; one "wrong" note that makes the harmony feel like it arrives from elsewhere (*Pink + White*-type analysis).
- Identify and explain specific vocal techniques by their physical production — e.g. the high-resonance African choral belt / high-placement gospel technique: name the placement, the resonance, the overtones, and *why* it hits the nervous system.

**Ceiling:** it explains the machinery of the goosebump like a master mechanic explains an engine — completely. It does not supply *taste* or *beauty judgment.* That stays with the user.

**Prereq:** a full audio/DSP stack. Treat as its own project with its own spec when the time comes.

---

## 6. LLM VOICE LAYER (bridge item — can come early if wanted)

- Wire `ai_interpreter.py` so characters speak in fully natural, varied language instead of templates.
- **Trained/seeded on the launch voice logs** (§6 of Launch Spec) — the rule-voiced era was the dataset.
- **Hard gate:** the interpreter may phrase analysis in-voice; it may **never** emit lyric content. This is the highest-risk module for Prime-Directive drift — lock the "no bars out" guard at the boundary, with tests.
- Costs tokens + latency; fires only when the user is present. Optional to pull forward before the rest of Phase Two.

---

## 7. THE SKIN (the visible world — last, wrapped around a working brain)

Everything the finished dream *looks* like. Built **on top of** a brain that already works — never top-down.

- **Godot village:** each engine has a house; the foundation lives down the hill; the Hermit is isolated on purpose; State/Drift sit past the edge of town; Cassius at center.
- **Weather = creative state:** clear iconic-green-hills = high flow; weathered autumn = choppy-but-showing-up. Weathered reads as beautiful and honorable, never punitive ("Bliss" logic — the user was always standing in the field).
- **Two ways in, rendered spatially:** the daily Cassius feed *and* walking up to knock on a specific engine's door for a direct talk (now with voice/mic, Inworld-style).
- **Faces + voice:** the talking-head layer (game-engine + TTS/voice + mic). This is a *plug-in on top* of memory + motive. Without the brain underneath, a talking face is just a chatbot in a costume. Build the person first; give them a face last.

---

## 8. SEQUENCING (rough dependency order)

1. Launch Spec ships and holds (memory persists, town runs, log readable).
2. **Well 2** (craft library) — unlocks Album Engine, Story Engine's cross-corpus reach, and Tutors.
3. **Album Engine + Story Engine** (text-native, fit the existing town).
4. **Well 3** (pattern well) + privacy wall hardening.
5. **Tutor/study-session system** (needs Well 2 substrate).
6. **LLM voice** (any time after launch; independent).
7. **Melody Engine** (its own project + audio stack).
8. **The skin** (Godot, weather, faces, mic) — last, around a proven brain.

---

## 9. THE THROUGH-LINE

You don't "transcend what's possible" by making one engine smarter. You get there two ways:
- **New senses** — audio (Melody), reception (Album), narrative (Story).
- **A rising ceiling** — tutors so the system keeps leveling instead of settling.

The brain gets built first (Launch). The senses and the ceiling come next (here). The face comes last. Same town the whole way — it just grows new senses, then grows a face.

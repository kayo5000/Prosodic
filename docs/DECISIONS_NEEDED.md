# Prosodic — Decisions Needed From Khris

**Running log, started 2026-08-16.** Per standing instruction: anything genuinely blocked on a decision only Khris can make gets skipped, not guessed at and not stalled on — logged here instead, work continues on everything else in `docs/BUILD_PLAN.md` around it. Updated in place as items resolve or new ones come up. Not a status report — see `docs/BUILD_PLAN.md` for that; this is specifically the "needs Khris" list.

Status markers: 🚧 open · ✅ resolved (date + outcome noted) · ⏭️ skipped-around, work continuing elsewhere

---

## 🚧 1. Sentry account

**Blocks:** `docs/BUILD_PLAN.md` Phase 5 (backend + mobile crash/error reporting).

**The actual question:** does a Sentry account already exist for this project? If not, one needs creating — account creation isn't something to do on Khris's behalf. Free-tier limits also need checking at whatever point this actually gets picked up (pricing/limits can change; not assuming today's numbers hold).

**What happens once resolved:** wiring the SDK into both the Flask backend and the mobile app is genuinely quick — a few hours total, not a multi-day item. The account/decision is the only real blocker.

**Current handling:** skipped for now. Phase 5 sits where it is in the plan (after the structural phases settle, before CI) — not started, not blocking anything else.

---

## 🚧 2. Mastery tab / `mastery_engine.py` wiring — what counts as "a song"?

**Blocks:** the mobile Mastery tab, and finishing the wiring of `mastery_engine.py` (real, tested, currently unreachable code — see `docs/PROJECT_STATUS.md`).

**The actual question:** this app has no persistent "song" identity anywhere today — `/analyze` takes `verse_lines` + `bpm` per request with no stable ID across edits. Mastery tracking needs one (a `song_id`/section concept to attach `rhyme_events`/`cadence_events`/etc. to). What counts as "a song" vs. an in-progress edit of the same song? When does a trackable record get created? This is real product design, not a wiring task — inventing an answer to make a number go up would directly contradict the "say what's actually true" standard the `/mastery` stub itself was built on.

**What happens once resolved:** genuinely unknown until the answer exists — could be a small mapping-layer addition, could be its own multi-day feature. Guessing at a size estimate here would be exactly the wrong move.

**Current handling:** skipped. Not on any phase's critical path — nothing else in the build plan depends on this resolving first.

---

## 🚧 3. Phase 7 native builds — no Xcode or Android SDK in this environment

**Blocks:** actually *verifying* `docs/BUILD_PLAN.md` Phase 7 (iOS App Intents, Android App Actions/Quick Settings Tile) — not writing it.

**The actual finding, checked directly when Phase 7's timeline came up, not assumed:** this is a Windows machine (`MINGW64`/Git Bash) — no `xcodebuild`/`swift` anywhere on it, and no `adb`/`gradle`/Android SDK either. Real Swift and Kotlin source can still be written here, but neither can be compiled, run, or verified in this environment. That breaks the "verify, don't assume" standard everything else in this project has run on — flagging it now rather than quietly shipping unverified native code when Phase 7 is reached and calling it done.

**The actual question for Khris:** when Phase 7 is reached, how should the unbuildable-here problem get handled — Mac + Xcode access provided for iOS (Android Studio/SDK could plausibly be installed on this same Windows machine for the Android half, worth confirming), Khris builds/tests the output himself on his own machines, or something else? Not a question that needs answering now — Phase 7 is last in the sequence — but worth knowing before arriving there with unverifiable code as the only option.

**Current handling:** noted for when Phase 7 is actually reached — not blocking anything before it (native work is explicitly sequenced last, after the mobile app's screens are stable). No action needed from Khris yet.

---

## Resolved

*(none yet)*

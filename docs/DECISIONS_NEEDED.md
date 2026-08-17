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

**The original finding, checked directly when Phase 7's timeline came up:** this is a Windows machine (`MINGW64`/Git Bash) — no `xcodebuild`/`swift` anywhere on it, and no `adb`/`gradle`/Android SDK either.

**Updated, more precise finding — checked directly when Phase 7 was actually reached and started, not inferred from the note above:**
- **Android: real prebuild verification IS possible here.** `npx expo prebuild --platform android --no-install` runs successfully on this Windows machine with no Android SDK installed — it generates the real `android/` native project skeleton (Kotlin/Java source tree, `AndroidManifest.xml`, resources), which is enough to run the Phase 7 config plugin for real and inspect its actual output (correct file placement, correct manifest XML) — genuine verification of everything except the final Gradle compile step, which does need the SDK.
- **iOS: prebuild is blocked entirely, not just the compile step.** `npx expo prebuild --platform ios` refuses to run on Windows at all — Expo's own CLI prints "Run `npx expo prebuild` again from macOS or Linux to generate the iOS project" and exits. This means the iOS half of Phase 7 (the Swift App Intents file + its config plugin) has **zero verification** possible in this environment, not even the "does the plugin's file-copy/Xcode-project-registration logic run without error" step Android got. The Swift source and its plugin are written carefully against Apple's current documentation, but that's a materially weaker claim than what Android got.

**The actual question for Khris:** when Phase 7's iOS half needs to actually ship, how does the "no macOS/Linux available here at all" gap get closed — Mac + Xcode access provided, Khris runs `npx expo prebuild`/`expo run:ios` himself on his own Mac, a cloud Mac build service (EAS Build can build iOS without local Xcode — worth considering as lower-friction than provisioning a physical Mac), or something else? Not urgent — Phase 7 is last in the sequence — but worth knowing before treating the iOS code as done.

**Current handling:** Android half of Phase 7 built AND verified as far as this environment allows (real `expo prebuild` run, real generated files inspected). iOS half built but explicitly flagged as unverified-by-anything, not just unverified-by-compilation. Full detail in `mobile/native/README.md`.

---

## Resolved

*(none yet)*

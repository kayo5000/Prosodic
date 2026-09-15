# Native quick-access — Phase 7

Real Swift/Kotlin source and the Expo config plugins that wire it into
the app during `expo prebuild`. Not a stub, not a mock — this is meant
to actually ship, with one real asymmetry in how far it's been verified
(see below). Cross-reference `docs/DECISIONS_NEEDED.md` item 3 and
`docs/BUILD_PLAN.md`'s Phase 7 section for the same facts in the
project's running status docs.

## What this builds

One shared foundation, two platform-specific front ends:

- **`mobile/src/navigators/linking.ts`** — the actual navigation logic.
  `prosodic://write?focus=1` → Analyze screen, verse input auto-focused.
  `prosodic://chat` → Chat screen. This is the *only* contract between
  the native code below and the app — every native entry point below
  does nothing but get one of these two URLs to the OS. Fully built and
  unit-tested (`linking.test.ts`, using React Navigation's own
  `getStateFromPath` — not a mock).

- **iOS** (`native/ios/ProsodicAppIntents.swift`, wired by
  `plugins/withIosAppIntents.js`): two `AppIntent`s (Quick Write, Ask
  VEIL) registered via `AppShortcutsProvider`. Once built, these become
  eligible for Siri, Spotlight, Control Center, and — the two surfaces
  actually named in the original brief — the **Action Button** (iPhone
  15 Pro+) and **Camera Control** (iPhone 16+), both configurable from
  Settings → the app's shortcuts. AssistiveTouch needs no extra code:
  it can already be configured to run any Shortcut, including one built
  from these intents via the Shortcuts app.

- **Android** (`native/android/`, wired by
  `plugins/withAndroidQuickAccess.js`):
  - **Static App Shortcuts** (`res/xml/shortcuts.xml`) — long-press the
    app icon → Quick Write / Ask VEIL. No external registration needed.
  - **Quick Settings Tile** (`QuickWriteTileService.kt`) — add-from-
    Quick-Settings tile that opens straight to Quick Write.

## What this deliberately does NOT build

**Android App Actions (Google Assistant integration).** Looked into
building this, decided to skip it rather than guess — logged in
`docs/DECISIONS_NEEDED.md` item 3, not silently dropped. Two real
reasons, not a time-saving shortcut:
1. Google's own documentation shows **two different XML schema
   generations** for capability declarations (an older standalone
   `actions.xml` with `<actions><action intentName=...>` and
   entity-sets, and a newer `<capability>` block merged into
   `shortcuts.xml`) without making clear which applies to which
   built-in intent today.
2. Even the code-complete version needs a **Play Console upload and
   Google's own review** before it does anything — "Static shortcuts
   are ingested by Assistant when you upload a release to Google Play
   Console" (Google's own words) — and inline-inventory parameters are
   only testable in a live preview for 6 hours at a time. That's an
   account-gated, iterative process much closer to the Sentry decision
   than to an engineering task solvable by writing more XML now.

**"Quick Record."** The original brief's examples included this
alongside Quick Write, but this app has no audio-recording feature
anywhere — `/analyze` and `/suggest` take text, not audio (verified
against `docs/openapi.yaml`, the actual backend contract). Building a
native shortcut for a feature that doesn't exist would mean inventing
product scope no one asked for, which is exactly the wrong move here.
Quick Write and Ask VEIL — the two screens that actually exist — are
what got built.

## Verification: real for Android, incomplete for iOS

This environment (Windows/MINGW64, confirmed via `which xcodebuild` /
`which swift` / `which adb` / `which gradle` / an Android SDK search —
none present) can't compile a final app for either platform. But the
two halves are NOT equally verified beyond that:

**Android — real, run verification**, not just written code:
- `npx expo prebuild --platform android --no-install` succeeds on this
  machine with no Android SDK installed at all.
- The generated output was directly inspected, twice (once for a first
  pass, once after fixing a nonexistent-drawable-icon bug the first
  pass had): `QuickWriteTileService.kt` lands at the correct package
  path (`android/app/src/main/java/com/prosodic/app/`), `shortcuts.xml`
  and its string resources copy byte-for-byte, and
  `AndroidManifest.xml` gets exactly the `<meta-data
  android:name="android.app.shortcuts">` and `<service>` entries
  expected — inserted once, not duplicated on a second prebuild run.
- What's NOT verified: the actual Gradle compile (needs the Android
  SDK), and therefore whether the Kotlin itself compiles cleanly or the
  tile/shortcuts actually behave correctly on a device.

**iOS — code written, zero run verification, not even partial.**
`npx expo prebuild --platform ios` refuses to run on Windows at all —
Expo's own CLI prints "Run `npx expo prebuild` again from macOS or
Linux to generate the iOS project" and exits immediately. That means
`plugins/withIosAppIntents.js` has never actually executed against a
real Xcode project here — not the file copy, not the `.pbxproj`
registration via `project.addSourceFile()`, nothing. It's written
carefully against Apple's current AppIntents documentation and the
`xcode` npm package's standard, widely-used pattern for this exact
task, but "written correctly" and "verified correct" are different
claims, and only the first one is true right now.

## Verification checklist for whoever has macOS/Xcode + Android Studio

1. `cd mobile && npx expo prebuild --clean` (both platforms this time).
2. **iOS**: confirm `ios/Prosodic/ProsodicAppIntents.swift` exists and
   is listed in `ios/Prosodic.xcodeproj/project.pbxproj`'s
   `PBXBuildFile`/`PBXSourcesBuildPhase` sections. Open in Xcode, build
   for a simulator, check for compile errors — this is genuinely the
   first time this file will have been compiled at all.
3. **iOS**: run the app on a device running iOS 16+, go to Settings →
   [app name] → check the intents are recognized (or use the Shortcuts
   app to find "Quick Write"/"Ask VEIL" under the app). On iPhone
   15 Pro+/16+, try assigning one to the Action Button / Camera Control.
4. **Android**: `npx expo run:android`, confirm `QuickWriteTileService`
   compiles. Long-press the launcher icon → confirm both shortcuts
   appear and deep-link correctly. Add the Quick Settings tile from the
   notification shade's edit screen, confirm tapping it opens the app
   to Quick Write.
5. If Android App Actions still matters once the above is solid: start
   from Google's current `actions.xml`/`shortcuts.xml` schema docs
   fresh (they may have converged to one format by then), and treat the
   Play Console upload/review as its own real step, not an afterthought.

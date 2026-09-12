# TestFlight Handoff — Prosodic mobile

**Status: nothing is set up yet.** This is a spec for work that has not been
done, not a description of an existing pipeline. There is no `eas.json`, no
`eas-cli` dependency, no Apple Developer account configured, and no App Store
Connect record. Everything below needs building from zero.

Written 2026-09-12 against commit `a35973b`.

---

## What the app actually is

Verified from `mobile/package.json` and `mobile/app.json`, not assumed:

| | |
|---|---|
| Framework | Expo SDK `~57.0.13`, React Native `0.86.2`, React `19.2.3` |
| Language | TypeScript `~6.0.3`, strict mode |
| Bundle ID | `com.prosodic.app` (iOS and Android both) |
| Slug / name | `prosodic` / `Prosodic` |
| Version | `1.0.0` |
| Build scripts today | `expo run:ios` / `expo run:android` — **local only, no EAS** |
| Secure storage | `expo-secure-store` (holds auth tokens) |
| Config plugin | `./plugins/withQuickAccess.js` |

---

## The two blockers that will waste a build if skipped

### 1. `EXPO_PUBLIC_API_URL` must point at a deployed backend

`src/services/api/prosodicApi.ts:17`:

```ts
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
```

`EXPO_PUBLIC_*` variables are **inlined at build time**, not read at runtime. A
TestFlight build made without this set will ship with `http://localhost:5000`
baked in, which on a phone means the device's own loopback. Every API call
fails. The app installs, opens, and does nothing.

So the backend has to be deployed and reachable over public HTTPS *before* the
first build is worth making. The backend is Flask, runs under
`gunicorn api:app` (see root `Procfile`), and needs `ANTHROPIC_API_KEY` and
`JWT_SECRET` set — it refuses to boot without `JWT_SECRET`. Railway is the
intended host; see `docs/SETUP.md`.

### 2. Apple Developer Program membership is non-negotiable

$99/year, and it gates everything: no signing, no build, no TestFlight. This
cannot be automated or worked around. A human with the Apple ID has to enrol,
and enrolment can take 24–48 hours to clear.

---

## Why a real build is needed at all (not just Expo Go)

The app has custom native code that Expo Go structurally cannot run. From
`mobile/plugins/withQuickAccess.js`:

```js
config = withAndroidQuickAccess(config);   // Quick Settings tile
config = withIosAppIntents(config);        // iOS App Intents / Siri
```

Source lives in `mobile/native/ios/` and `mobile/native/android/`
(`QuickWriteTileService.kt`, `shortcuts.xml`, App Intents). Expo Go is a
generic pre-built binary and has no way to contain this app's native modules —
`mobile/README.md` says so explicitly. These plugins run during `expo prebuild`,
which EAS Build performs automatically.

**They have never been exercised in a cloud build.** They work locally via
`expo run:ios`. The first EAS build is the first real test of them, so budget
for that being where things break.

---

## Steps

Human-only first — none of this can be scripted:

1. Enrol in the Apple Developer Program with the Apple ID that will own the app.
2. In App Store Connect, create an app record with bundle ID `com.prosodic.app`.
3. Deploy the backend and note its public HTTPS URL.

Then:

```bash
cd mobile
npm install --save-dev eas-cli
npx eas login
npx eas build:configure          # creates eas.json
```

Add a build profile to `eas.json` that carries the API URL — this is the step
that prevents blocker #1:

```json
{
  "build": {
    "production": {
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_API_URL": "https://<your-deployed-backend>" }
    }
  }
}
```

Then build and submit:

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios --latest
```

`eas build` will offer to generate signing credentials — let it manage them
unless there's a reason not to. `eas submit` uploads to App Store Connect;
TestFlight processing then takes roughly 5–30 minutes before the build appears.

Finally, add testers in App Store Connect → TestFlight. Internal testers (up to
100, must be on the team) need no review. External testers require a Beta App
Review, usually a day or two.

---

## Project-specific landmines

- **`app.json` has no `ios.buildNumber`.** Every TestFlight upload needs a
  unique build number or App Store Connect rejects it. Either set
  `"autoIncrement": true` in the eas.json profile or manage it by hand.
- **`expo-secure-store` needs Keychain entitlements.** The config plugin should
  handle this during prebuild; verify it landed rather than assuming.
- **`userInterfaceStyle` is `"dark"`** and `backgroundColor` is `#06060A`.
  Screenshots and the launch screen will be dark — that's intended, not a bug.
- **Do not commit `eas.json` with secrets in `env`.** The API URL is fine
  (it's public anyway); anything sensitive belongs in EAS secrets
  (`eas secret:create`).
- **The tunnel gotcha in `README.md` is irrelevant here.** That's an Expo Go dev
  concern; EAS builds don't touch ngrok.

---

## Definition of done

A build appears in TestFlight, installs on a physical device, and — with the
backend live — successfully analyses a verse end to end. Anything short of that
last step means blocker #1 was not actually cleared.

---

## Not in scope

The CIELAB / Tierra colour work under `research/tierra/` is **not** part of this
and ships nothing. It is research tooling with zero product code — no module in
`mobile/` or `api.py` imports it. Tierra is planned as its own separate project.
Do not wire it into this build.

# Prosodic — Mobile (React Native + Expo)

Native mobile client for the same Flask API the (now-removed) web app
used. No backend changes — same JSON endpoints, real mobile client
instead of a browser.

## Status

Three real tabs, all talking to the live backend:

- **Analyze** (`src/screens/AnalyzeScreen.tsx`) — write a verse, set BPM,
  hit Analyze, see the rhyme map color-coded by family, then pull real
  suggestions from `/suggest`. The most central flow in the app.
- **Chat** (`src/screens/ChatScreen.tsx`) — VEIL, backed by `/veil/chat`.
  Full turn history resent per message (the backend is stateless per
  request). Surfaces the real rate-limit (429) and circuit-breaker-open
  (503) error strings from the backend rather than a generic failure.
- **Profile** (`src/screens/ProfileScreen.tsx`) — shows the logged-in
  user + logout, or `LoginScreen.tsx` (login/register toggle) if signed
  out. Auth (`src/state/AuthContext.tsx`) uses `expo-secure-store` for
  the JWT, restored on launch via `GET /auth/me`.

Only Profile is auth-gated — Analyze and Chat work for anyone who opens
the app, matching the backend exactly (`/analyze` and `/suggest` don't
require auth; login only unlocks personalization — `used_before` /
`community_uses` tagging in `/suggest`).

Not yet built: Mastery (backend `/mastery` is still an honest "not
ready" stub, nothing real to build against yet), Notepad, Freewrite,
Tools, Projects, Search. The deleted web app's git history (commit
before `543c8e1`) is the reference for what each of those covered, if
rebuilding them later.

**Native quick-access (Phase 7)** — real iOS App Intents (Swift) and
Android App Shortcuts/Quick Settings Tile (Kotlin) deep-linking into
Quick Write / Ask VEIL, wired via Expo config plugins. See
`native/README.md` for the full picture — including a real asymmetry in
how verified each half is (Android was run and inspected against a real
`expo prebuild`; iOS could not be, since that command refuses to run on
Windows at all).

## Setup

```
cd mobile
npm install
```

Point the app at a backend by editing `.env` (gitignored — `.env.example`
is the committed template):

```
EXPO_PUBLIC_API_URL=https://prosodic-production.up.railway.app
```

That's the current default (`.env.example` matches) — works from any
network, no shared WiFi needed, verified with a real `POST /analyze`
against it. **Expo bakes this into the bundle once at CLI startup —
editing `.env` while `expo start` is already running does nothing until
you restart the dev server.** Hit this for real once already; if in
doubt, re-fetch the actual bundle and grep for the URL rather than
trusting the config file alone.

- **Local Flask dev server instead** (only needed when developing
  against backend changes not yet deployed): use your machine's LAN IP,
  not `localhost` — `localhost` on your phone means the phone itself,
  not your computer. e.g. `http://192.168.1.23:5000`. Your phone and
  computer need to be on the same WiFi network for this to work.

## Run it

```
npx expo start
```

This starts the Metro dev server and prints a QR code + connection URL
in the terminal. Scan the QR code with your phone's camera (iOS) or the
Expo Go app itself (Android) — Expo Go must be installed first, free on
the App Store / Play Store. No Apple/Google developer account needed
for this — that's only required for actual App Store / Play Store
submission later (see TODO below).

If your phone can't reach the dev server directly (different WiFi, VPN,
corporate network, or you just want to preview from anywhere), run
`npx expo start --tunnel` instead — slower, routes through a public
relay. **Known gotcha**: Expo's *bundled* ngrok authtoken (shared by
every Expo developer running tunnel mode) is currently ACL-blocked by
ngrok (`ERR_NGROK_316`, confirmed by running the raw `ngrok.exe` binary
directly, not a guess) — tunnel mode fails identically on every retry
until you configure your own free ngrok account and authtoken. Full
steps in `docs/SETUP.md`.

**Native quick-access features (Phase 7 — see `native/README.md`) do
NOT work in Expo Go**, and can't: Expo Go is a generic pre-built binary
Apple/Google already shipped, and it has no way to contain this app's
own compiled Swift/Kotlin. The 3 existing screens (Analyze/Chat/Profile)
keep working in Expo Go exactly as before — confirmed by running the
full verification chain (`tsc`, lint, Jest, and a real `npx expo export`
bundle) after the native plugin was wired into `app.json`, all still
clean. Testing the App Intents / App Shortcuts / Quick Settings Tile
themselves requires a real native build: `npx expo run:ios` or
`npx expo run:android` (which `npm run ios`/`npm run android` now alias
— `expo prebuild` updated them automatically the moment real native
code entered the project), not `expo start` + Expo Go.

## Project layout

Ignite-inspired structure (Phase 3, `docs/BUILD_PLAN.md`) — TypeScript
strict mode throughout, `App.tsx` kept minimal (providers + the
navigator only), the actual tab/screen wiring lives in `navigators/`.

```
App.tsx                              — root: AuthProvider + AppNavigator + StatusBar
index.ts                             — Expo entry point (registerRootComponent)
src/navigators/AppNavigator.tsx      — bottom tabs (Analyze / Chat / Profile), tab icons, ProfileTab auth gate
src/services/api/prosodicApi.ts      — API layer: analyze, suggest, veilChat, register/login/getMe
src/state/AuthContext.tsx            — JWT session state, expo-secure-store persistence
src/theme/theme.ts                   — dark palette matching the (removed) web app + rhyme-family colors
src/types/api.ts                     — shared TS types, kept in sync with docs/openapi.yaml
src/screens/AnalyzeScreen.tsx        — Analyze/Suggest screen
src/screens/ChatScreen.tsx           — VEIL chat screen
src/screens/LoginScreen.tsx          — login/register
src/screens/ProfileScreen.tsx        — logged-in user info + logout
src/navigators/linking.ts            — deep-link config (prosodic://write, prosodic://chat) — see native/README.md
plugins/                             — Expo config plugins wiring native/ into expo prebuild (Phase 7)
native/                              — real Swift/Kotlin source for iOS App Intents + Android App Shortcuts/Quick Settings Tile
```

No `src/components/` yet — every current sub-component (e.g.
`ChatScreen.tsx`'s `Bubble`) is single-use and local to its screen. The
folder gets created the moment something is genuinely shared across
screens, not preemptively.

**TypeScript**: `tsconfig.json` extends `expo/tsconfig.base` with
`strict: true`. Run `npm run tsc` for a type-check (`tsc --noEmit`,
matches what CI runs — see `docs/BUILD_PLAN.md` Phase 6).

## Testing (Phase 4, `docs/BUILD_PLAN.md`)

```
npm test              # jest
npm run test:coverage # jest --coverage
```

`jest-expo` preset, `@testing-library/react-native` for hook/component
tests. Current real coverage: `src/services/api/prosodicApi.ts` (~95%
— contract tests checked directly against `docs/openapi.yaml`'s request/
response shapes, not just "does it not crash") and `src/state/
AuthContext.tsx` (~84% — session restore, login/register/logout state
transitions) and `src/theme/theme.ts` (100%). Screens and
`AppNavigator.tsx` have **no tests yet** — 0% is the honest number, not
hidden; component-level RNTL tests (mocking navigation, SecureStore,
etc. per screen) are real additional work not yet scheduled, tracked in
`docs/BUILD_PLAN.md`.

**Gotcha worth knowing**: `@testing-library/react-native` v14 made
`render()`/`renderHook()` return a `Promise` (a real, non-obvious API
change from every earlier major version) — both must be `await`ed, or
the destructured `result` is silently `undefined` instead of erroring
clearly. `jest.setup.js` also sets `global.IS_REACT_ACT_ENVIRONMENT =
true`, required for this exact React 19 + jest-expo 57 + RNTL 14
combination — without it every state update inside a test logs "The
current testing environment is not configured to support act(...)".

## Known gotchas (already fixed once, worth knowing about)

- **Don't import the `@expo/vector-icons` barrel.** `import { Ionicons }
  from '@expo/vector-icons'` pulls in every icon set via `IconsLazy.js`,
  and one font asset (Octicons.ttf) doesn't resolve in the currently
  installed version — 500s the whole Metro bundle. Use the subpath
  import instead: `import Ionicons from '@expo/vector-icons/Ionicons'`.
- **`expo-secure-store` has no real web implementation** (its `.web.js`
  build is a bare `{}`) — calls to it are wrapped in try/catch in
  `AuthContext.tsx` so a missing storage backend degrades to "don't
  persist the session" instead of crashing. Only matters if someone runs
  `npx expo start --web`; native (the real target) is unaffected.

## TODO / flagged for later (not urgent)

- **Tunnel mode needs a personal ngrok authtoken** — see the gotcha
  above / `docs/SETUP.md`. Not done yet; LAN mode works today.
- **App icon**: using the real Prosodic logo now (`assets/icon.png`),
  but at its original 2000x2000 with a baked-in white background — fine
  for Expo Go preview, but a real store submission wants an exact
  1024x1024 and the Android adaptive-icon layers (currently still
  Expo's scaffold defaults) redone with the background stripped out.
- **App Store / Play Store publishing**: not needed for the Expo Go
  preview flow above, only for real store submission down the line.
  - Apple Developer Program: $99/year (required to submit to the App
    Store, and for TestFlight beta distribution)
  - Google Play Console: $25 one-time (required to submit to Play
    Store)
  - Neither is needed to keep developing or to keep showing progress
    via Expo Go — flagging early so it's not a surprise later.

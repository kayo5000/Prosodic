# Prosodic — Mobile (React Native + Expo)

Native mobile client for the same Flask API the (now-removed) web app
used. No backend changes — same JSON endpoints, real mobile client
instead of a browser.

## Status

Three real tabs, all talking to the live backend:

- **Analyze** (`src/screens/AnalyzeScreen.js`) — write a verse, set BPM,
  hit Analyze, see the rhyme map color-coded by family, then pull real
  suggestions from `/suggest`. The most central flow in the app.
- **Chat** (`src/screens/ChatScreen.js`) — VEIL, backed by `/veil/chat`.
  Full turn history resent per message (the backend is stateless per
  request). Surfaces the real rate-limit (429) and circuit-breaker-open
  (503) error strings from the backend rather than a generic failure.
- **Profile** (`src/screens/ProfileScreen.js`) — shows the logged-in
  user + logout, or `LoginScreen.js` (login/register toggle) if signed
  out. Auth (`src/state/AuthContext.js`) uses `expo-secure-store` for
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

## Project layout

```
App.js                        — navigation root (bottom tabs: Analyze / Chat / Profile)
src/api/prosodicApi.js        — API layer: analyze, suggest, veilChat, register/login/getMe
src/state/AuthContext.js      — JWT session state, expo-secure-store persistence
src/theme/theme.js            — dark palette matching the (removed) web app + rhyme-family colors
src/screens/AnalyzeScreen.js  — Analyze/Suggest screen
src/screens/ChatScreen.js     — VEIL chat screen
src/screens/LoginScreen.js    — login/register
src/screens/ProfileScreen.js  — logged-in user info + logout
```

## Known gotchas (already fixed once, worth knowing about)

- **Don't import the `@expo/vector-icons` barrel.** `import { Ionicons }
  from '@expo/vector-icons'` pulls in every icon set via `IconsLazy.js`,
  and one font asset (Octicons.ttf) doesn't resolve in the currently
  installed version — 500s the whole Metro bundle. Use the subpath
  import instead: `import Ionicons from '@expo/vector-icons/Ionicons'`.
- **`expo-secure-store` has no real web implementation** (its `.web.js`
  build is a bare `{}`) — calls to it are wrapped in try/catch in
  `AuthContext.js` so a missing storage backend degrades to "don't
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

# Prosodic — Mobile (React Native + Expo)

Native mobile client for the same Flask API the web app
(`frontend/`) talks to. No backend changes — same JSON endpoints,
real mobile client instead of a browser.

## Status

First working screen: **Analyze / Suggest** (`src/screens/AnalyzeScreen.js`)
— write a verse, set BPM, hit Analyze, see the rhyme map color-coded by
family, then pull real suggestions. This is the most central flow in the
existing web app (`frontend/src/pages/SongViewPage.js`), rebuilt as a
functional mobile-native screen rather than a full port of that file —
same real backend, `/analyze` and `/suggest`, simpler UI to start.

Not yet built: VEIL chat, Mastery, login/signup, Notepad, Freewrite,
Tools, Projects. See "Next screens" below — the web app under
`frontend/src/pages/` is the reference for what each of these needs to
cover when they get built.

## Setup

```
cd mobile
npm install
```

Point the app at a backend by editing `.env` (gitignored — `.env.example`
is the committed template):

```
EXPO_PUBLIC_API_URL=http://localhost:5000
```

- **Local Flask dev server**: use your machine's LAN IP, not
  `localhost` — `localhost` on your phone means the phone itself, not
  your computer. e.g. `http://192.168.1.23:5000`. Your phone and
  computer need to be on the same WiFi network for this to work.
- **Railway (production)**: use the public `https://...up.railway.app`
  URL — works from any network, no shared WiFi needed. This is the
  right default once you have the URL (see TODO below).

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

If your phone can't reach the dev server (different WiFi, VPN,
corporate network), run `npx expo start --tunnel` instead — slower, but
works across networks via a relay.

## Project layout

```
App.js                        — navigation root (React Navigation stack)
src/api/prosodicApi.js        — API layer, mirrors frontend/src/api/prosodicApi.js
src/theme/theme.js            — dark palette matching the web app + rhyme-family colors
src/screens/AnalyzeScreen.js  — Analyze/Suggest screen
```

## Next screens (in rough priority order)

1. **VEIL chat** — reference `frontend/src/pages/NewChatPage.js` +
   `ChatThreadPage.js`, backend `/veil/chat` (now rate-limited + circuit-
   breaker protected, see `anthropic_circuit_breaker.py` /
   `rate_limiter.py` at repo root).
2. **Auth** — reference `frontend/src/state/AuthContext.js`
   (JWT-based). `/analyze` and `/suggest` don't require auth today, but
   `/mastery` and usage history do read `user_id`.
3. **Mastery / progress** — reference `frontend/src/pages/MasteryPage.js`,
   backend `/mastery`.
4. Notepad, Freewrite, Tools, Projects, Search — lower priority, see
   `frontend/src/pages/` for what each currently does.

## TODO / flagged for later (not urgent)

- **Real Railway URL**: `.env` currently points at `localhost:5000` as
  a placeholder — swap in the actual deployed Railway URL once you have
  it handy (check the Railway dashboard, or `railway domain` after
  `railway login`).
- **App Store / Play Store publishing**: not needed for the Expo Go
  preview flow above, only for real store submission down the line.
  - Apple Developer Program: $99/year (required to submit to the App
    Store, and for TestFlight beta distribution)
  - Google Play Console: $25 one-time (required to submit to Play
    Store)
  - Neither is needed to keep developing or to keep showing progress
    via Expo Go — flagging early so it's not a surprise later.

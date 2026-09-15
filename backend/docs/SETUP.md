# Prosodic — Setup

Practical steps to get both halves running from a clean clone. For *what* the two halves are and how they relate, see `CLAUDE.md`; for architecture detail, `docs/ARCHITECTURE.md`.

---

## Backend

### Prerequisites
- Python **3.11.9** specifically for anything matching production (`.python-version` / `runtime.txt` pin this exactly — Railway's build needs it; see the comment in `mise.toml` for why 3.11.9 and not a newer patch). Local dev works fine on a newer interpreter too (this session ran on 3.14 without issue) — 3.11.9 only matters when you want your local environment to match what actually deploys.
- `pip install -r requirements.txt`

### Environment variables
Create `.env` at the repo root (see `.env.example` for the template):

| Variable | Required? | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes, for VEIL/`/veil/chat`/`/veil/revival/chat` | Without it, those routes fail; everything else works fine. |
| `JWT_SECRET` | **Yes, always** | The app refuses to boot without it (`api.py` raises on startup, not a silent fallback). Generate one: `python -c "import secrets; print(secrets.token_hex(32))"`. |
| `PROSODIC_DB_PATH` | No | Users/auth DB. Defaults to `~/prosodic_data/prosodic.db`. Needs to point at a persistent volume in any deployment where the filesystem doesn't survive a redeploy (Railway does not, by default). |
| `PROSODIC_FEATURES_DB_PATH` | No | Shared by `feature_store.py`/`telemetry.py`/`usage_history.py` — **must stay identical across all three** or they silently split onto different files. Defaults to `<repo root>/prosodic_features.db`. |
| `LEARNING_SIGNALS_DB_PATH` | No | `learning_engine.py`. Defaults to `<repo root>/learning_signals.db`. |
| `CONCRETENESS_DB_PATH` | No | `concreteness_engine.py`. Defaults to `<repo root>/concreteness.db`. |
| `CANTOS_DB_PATH` | No | Only matters if `FEATURE_CANTOS_ENABLED=true`. Defaults to `<repo root>/cantos_data/cantos.db`. |
| `CANTOS_DEV_LOG_PATH` | No | `cantos_dev_log.py`, low-stakes dev logging path. |
| `FEATURE_CANTOS_ENABLED` | No | Defaults `false`. Set `true` to reach the Cantos/behavioral-layer routes. |
| `PORT` | No | Defaults `5000`. Railway sets this automatically — don't hardcode it there. |

### Run it
```
python api.py
```
Boots on `http://localhost:5000` (or `$PORT`). `debug=False`, `threaded=True` — code changes need a manual restart, no auto-reload.

Production runs via `Procfile`: `gunicorn api:app --bind 0.0.0.0:$PORT` — **1 worker, 1 thread, no `--workers`/`--threads` flags today.** This matters if you ever add those: every in-memory cache (CMU dict, `lru_cache`d lookups) and the rate limiter's in-memory storage are per-process, not shared across workers.

### Tests
```
python -m pytest tests/ -q
```
See `CLAUDE.md` for the golden-master philosophy and the one known-flaky test.

---

## Mobile app

### Prerequisites
- Node.js (this session used Node 24; Expo SDK 57 doesn't demand a specific LTS beyond "recent"). `npm`.
- The [Expo Go](https://expo.dev/go) app on your phone (free, App Store/Play Store) — no Apple/Google developer account needed for this.

### Install
```
cd mobile
npm install
```

### Environment variable
`mobile/.env` (gitignored — `mobile/.env.example` is the committed template):
```
EXPO_PUBLIC_API_URL=<your backend URL>
```
**Expo bakes this into the JS bundle once, at CLI startup — it does NOT hot-reload.** Editing `.env` while `expo start` is already running has no effect until you restart the dev server. This bit us once already this session (an env change looked like it took effect but the running bundle was still serving the old value) — always restart after editing it, and if you want to be sure, re-fetch the actual bundle and grep for the value rather than trusting the config file alone.

What to put there:
- **Pointing at a local Flask server**: use your machine's real LAN IP, not `localhost` — on your phone, `localhost` means the phone itself. Find it with `ipconfig` (Windows) / `ifconfig` (Mac/Linux) and use e.g. `http://192.168.1.23:5000`. Your phone and computer need to be on the same WiFi.
- **Pointing at Railway (production)**: `https://prosodic-production.up.railway.app` — works from any network, no shared WiFi needed. This is the right default whenever you're not actively developing against local backend changes.

### Run it
```
npx expo start
```
Prints a QR code + connection URL. Two modes:

- **LAN mode (default)** — phone and computer must be on the same WiFi. Fast. This is what plain `npx expo start` gives you.
- **Tunnel mode** (`npx expo start --tunnel`) — works from any network (cellular, different WiFi), routes through a public tunnel, slower. **Known gotcha, hit this session**: Expo bundles a *shared* ngrok authtoken used by every Expo developer running tunnel mode worldwide, and ngrok has ACL-blocked that specific shared credential (`ERR_NGROK_316`, confirmed by running the raw `ngrok.exe` binary directly, not a guess). Tunnel mode will fail identically on every retry until you configure your own free ngrok account:
  1. Sign up free at [ngrok.com](https://ngrok.com) (no credit card).
  2. Grab your personal authtoken from the dashboard's Setup & Installation page.
  3. `npm install --save-dev @expo/ngrok` in `mobile/` if not already installed.
  4. Configure the token (either `ngrok config add-authtoken <token>` if you have the ngrok CLI, or write it into `~/.expo/ngrok.yml` as `authtoken: <token>`).
  5. `npx expo start --tunnel` — should now succeed. Verify by actually hitting the printed URL, not just trusting the process didn't crash.

### Scanning the QR
- iOS: point the camera app at the QR code.
- Android: open Expo Go, use its built-in scanner.

---

## Railway (production deploy)

Environment variables to set in the Railway dashboard (Service → Variables):

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Real key |
| `JWT_SECRET` | Real generated secret — **not** committed anywhere, generate fresh for production |
| `PROSODIC_DB_PATH` | Path on a mounted persistent volume, e.g. `/data/prosodic.db` — without this, registered accounts get wiped on every redeploy (Railway's filesystem doesn't survive one by default) |

Volume setup: Service → **Volumes** tab → **+ New Volume** → mount path (e.g. `/data`) → then set `PROSODIC_DB_PATH` to a path under that mount → redeploy.

`PORT` is set automatically by Railway — don't override it. `moby_thesaurus.db` (read-only reference data) ships via a normal `git push` — no volume needed for it, it's under GitHub's 100MB limit and doesn't need to survive a redeploy since it's never written to.

**Current known gap**: persistence has been configured (volume + `PROSODIC_DB_PATH` set per the steps above) but a from-scratch "prove data survives a redeploy" check hasn't been completed from this session — no authenticated Railway CLI access here to inspect current dashboard state directly. The backend itself is confirmed live and responding to real requests (`https://prosodic-production.up.railway.app`), which is a different (and already-verified) claim from "the persistent volume is definitely wired correctly."

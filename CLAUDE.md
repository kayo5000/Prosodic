# Prosodic

Hip-hop lyric analysis tool — paste a verse and a BPM, get rhyme architecture, cadence, syllabic density, motif clustering, and stress-pattern feedback back, plus an AI craft mentor (VEIL) to talk through it.

## Architecture

Two halves, one contract:

- **Backend** (repo root) — Flask JSON API. `api.py` is the only entry point Flask routes live in; everything else is an engine or support module it calls into. No templates, no server-rendered pages — every route returns JSON.
- **Mobile app** (`mobile/`) — React Native + Expo. The real client. Talks to the Flask API over HTTP exactly like any other consumer would; the backend has zero awareness of what's calling it.

**There is no web frontend.** One existed (`frontend/`, Create React App) and was deleted outright — not archived — once the mobile app became the real target. If you're tempted to go looking for it, don't; it's gone from disk, still recoverable from git history before commit `543c8e1` if a specific asset is ever needed (see `docs/PROJECT_STATUS.md`).

## Running it locally

**Backend:**
```
python api.py
```
Needs `ANTHROPIC_API_KEY` and `JWT_SECRET` in a root `.env` (see `.env.example`; the app refuses to boot without `JWT_SECRET`). Runs on `:5000` by default (`$PORT` overrides). Production: `gunicorn api:app` (see `Procfile`) — currently 1 worker/1 thread, no `--workers`/`--threads` flags, which matters for anything assuming shared in-process state (see `docs/ARCHITECTURE.md`).

**Mobile app:**
```
cd mobile && npm install && npx expo start
```
Scan the printed QR with Expo Go. Point it at a backend via `mobile/.env` (`EXPO_PUBLIC_API_URL`) — full detail in `docs/SETUP.md`, including the tunnel-mode gotcha (Expo's bundled shared ngrok token is currently ACL-blocked; needs a personal ngrok authtoken for `--tunnel` to work).

## Testing

```
python -m pytest tests/ -q
```
368 tests. One is a known-flaky live-LLM safety test (`test_cantos_direct_live_safety.py`, non-deterministic model output tripping an oversensitive independent-scanner heuristic — the production guard itself is fine; see `docs/PROJECT_STATUS.md`). A handful skip without `ANTHROPIC_API_KEY` set.

**Golden-master testing** (`tests/golden_master.py`) is the load-bearing pattern for any refactor that touches shared engine code: capture a real engine's output for a fixed input as a JSON snapshot (`tests/golden/`), and every future run diffs live output against it. A snapshot only changes on purpose (`UPDATE_GOLDEN=1 pytest tests/test_golden_master.py -q`), reviewed like any other code change. This exists because a signature-migration refactor once looked like it had changed real output when it hadn't — a separate, unrelated fix had — and proving that took spelunking through git history by hand. Use this before/after touching shared code, not just when something feels risky; it's not a replacement for regular unit tests.

## Key conventions

- **`SongContext`** (`song_context.py`) — a frozen dataclass carrying facts constant for a whole song (`bpm`, room for `key`/`genre`/`time_signature` later). Minted once at the API boundary, threaded through every engine call, instead of `bpm` hand-passed function to function. Holds *only* song-constant facts — never verse lines, trigger modes, or anything that changes call-to-call.
- **`final_result_converter.py`** — the normalization layer between engines and anywhere their scores get blended or compared. Every engine's raw output lands on a different scale/polarity (0–1, 0–100, ordinal); this module maps them all onto one comparable 0.0–1.0 "higher always stronger" scale, without editing what any engine actually computed. Import it aliased as `fr_normalize` (not bare `normalize`) — that's the documented convention, avoids colliding in speech/reading with `normalization_engine.normalize()`, a completely different operation (text cleanup vs. scale conversion).
- **Config centralization** (`prosodic_config.py`) — magic numbers shared across the live `/analyze`+`/suggest` pipeline (beat grid size, thresholds, weights) live in one file, not copy-pasted per engine. Deliberately scoped to the live pipeline only — Cantos/behavioral-layer/offline-script constants aren't preemptively centralized here.
- **Repository pattern** — `users_repository.py` holds all raw SQL for the users table; `api.py`'s auth routes call it instead of hand-writing `sqlite3.connect()` inline. Every function takes `db_path` explicitly (dependency injection, same spirit as `SongContext`) rather than re-resolving the env var itself.
- **Feature flags** (`feature_flags.py`) — Cantos and the behavioral layer are real, tested code sitting behind `FEATURE_CANTOS_ENABLED` (default off), not dead code and not live-by-default.

## Where the real documentation lives

- `docs/PROJECT_STATUS.md` — honest current-state snapshot: what's built, what's placeholder, open issues, deployment state.
- `docs/ARCHITECTURE.md` — real request flow, module-by-module audit findings (which are fixed, which are still open).
- `docs/SETUP.md` — clean-clone setup steps for both halves, env vars, Railway/Expo specifics.
- `docs/AUDIT.md`, `docs/BUILD_LOG.md`, `docs/MORNING_ROADMAP_AUDIT.md`, `docs/APP_FLOW_MAP.md`, `docs/NIGHT_SHIFT_SUMMARY.md` — dated working logs from the sessions that did this work, kept for provenance. `docs/CODEBASE_SNAPSHOT.md` is the oldest (2026-05-07) and the most stale — cross-check anything from it against current code before trusting it.
- `docs/cantos/` — the Cantos spec + build summary.

None of the docs above describe the mobile app (it postdates them) — that's `mobile/README.md`.

# PROSODIC — Backend Audit Checklist
**Started:** 2026-08-02
**Purpose:** Working checklist to audit the backend before building further. Check items off as you understand/fix them. This is a tracker, not a report — see `docs/CODEBASE_SNAPSHOT.md` for the full read-only inventory from 2026-05-07 (still mostly accurate for engine descriptions).

---

## Tier 1 — Deploy-critical (do these first, they can break production silently)

- [x] `moby_thesaurus.db` was 135MB, gitignored, not on Railway. **Fixed 2026-08-03**: dropped two unused indexes + VACUUM → 78.4MB, now under GitHub's 100MB limit. Removed from `.gitignore`. Once you commit and push it, Railway gets it automatically on next deploy — no volume or external hosting needed. `thesaurus_engine.py` also no longer crashes if it's ever missing (degrades to empty results).
- [ ] `api.py`'s auth DB path is `~/prosodic_data/prosodic.db` (home dir) — no persistent volume on Railway, so registered accounts get wiped on every redeploy. **Manual action required** (Railway dashboard, can't be done from a chat session):
  1. Railway dashboard → your Prosodic service → **Volumes** tab → **+ New Volume**.
  2. Mount path: `/data` (or any path — just remember it for step 3).
  3. Service → **Variables** tab → add `PROSODIC_DB_PATH` = `/data/prosodic.db`.
  4. Redeploy. The code already reads this env var (`api.py` line 49) — no code change needed, just the volume + variable.
- [ ] `JWT_SECRET` env var is not set on Railway, so it falls back to a hardcoded string in the public repo (`api.py` line ~48) — anyone can read it on GitHub and forge login tokens. **Manual action required**:
  1. Generate a real secret locally: `python -c "import secrets; print(secrets.token_hex(32))"`.
  2. Railway dashboard → your service → **Variables** tab → add `JWT_SECRET` = (the value you just generated).
  3. Redeploy. No code change needed — `api.py` already reads this env var if present.
- [x] `requirements.txt` was missing `g2p_en`. **Fixed 2026-08-03**: added `g2p_en==2.1.0`.
- [x] `frontend/src/pages/ChatThreadPage.js` and `frontend/src/state/AuthContext.js` both hardcoded `http://localhost:5000`. **Fixed 2026-08-03**: both now use `REACT_APP_API_URL`.
- [x] **Found during testing, not on the original list**: `_make_token()` encoded the JWT `sub` claim as a raw int — PyJWT 2.10 requires it to be a string, so every login was silently failing verification. Fixed 2026-08-03.
- [x] **Found during testing, not on the original list**: `/suggest` hung indefinitely — `semantics_engine.py` ran spaCy's full pipeline (tagger/parser/NER) on every phonetic candidate, sometimes thousands per request. Fixed 2026-08-03 by switching to `nlp.make_doc()` (tokenize-only, vectors still work). This was almost certainly the real cause of `test_api.py` hanging (Tier 5 below).

## Tier 2 — Live pipeline (the ~19 files actually reachable from `api.py`)

Reachable from `api.py`: `feedback_engine.py`, `motif_engine.py`, `density_engine.py`, `pocket_engine.py`, `phrase_container_engine.py`, `perceptual_family_engine.py`, `pattern_reader_engine.py`, `suggestion_engine.py`, `phoneme_engine.py`, `syllable_engine.py`, `rhyme_detection_engine.py`, `semantics_engine.py`, `thesaurus_engine.py`, `learning_engine.py`, `veil_prompt.py`, `veil_revival_routes.py`, `mastery_engine.py`, `device_detection_engine.py`, `normalization_engine.py`.

- [ ] Read each against your own design rules (syllable-only highlighting, BPM-required, cross-word compound detection — see memory `project_prosodic.md`).

## Tier 3 — Unintegrated engines (built, but not wired to `api.py`)

Per `docs/CODEBASE_SNAPSHOT.md` §7 — fully implemented, just not called from the pipeline yet:
`aave_phonology.py`, `aspiration_gap.py`, `bar_grid_linguistics.py`, `density_gradient.py`, `performed_stress.py`, `phoneme_resolver.py`, `syllable_compression.py`, `fingerprint_pipeline.py`, `feature_store.py`, `telemetry.py`.

Genuinely unfinished (rule-based stubs, no trained model): `ml_interface.py`, `model_registry.py`, `train_rhyme_model.py`, `ml/`.

Fully tested but disconnected subsystem: `analysis/` + `behavior/` (74 passing tests, zero API endpoints).

- [ ] Per file: decide "finish wiring in" vs "delete." No file should stay in limbo after this audit.

## Tier 4 — Frontend/backend contract

- [ ] Re-check `frontend/src/api/prosodicApi.js` and `AuthContext.js` against `api.py` routes after Tier 1/3 changes.
- [ ] `/health` and `GET /corrections` are registered but never called by the frontend — confirm that's intentional (debug-only).

## Tier 5 — Tests

- [ ] `test_api.py` hangs — makes a real, un-timeout'd Anthropic API call. Not runnable in CI as-is.
- [ ] `test_family_engine.py` collects 0 pytest items — it's a standalone script, not a suite.
- [ ] `tests/` only covers Tier 3's `analysis/`/`behavior/` code. The live pipeline (Tier 2) has zero automated test coverage.

---

## Known Stale Items From Prior Snapshot (still true as of today)
- `analysis/bar_segmenter.py:258`, `behavior/label_capture.py:56,89` — use deprecated `datetime.utcnow()`.
- No `README.md` at project root.

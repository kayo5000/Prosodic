# Night Shift Summary — Punch List

Worked under standing autonomous authority ("any time i say [it's night time]... work
night shift i trust you... keep working until we run out of usage or it's time to
launch"). This covers everything since the Cantos overnight build:
`docs/cantos/OVERNIGHT_BUILD_SUMMARY.md` covers that build itself.

**Everything below is now on `origin/main`** (pushed as of commit `e993e49`).
32 commits ahead of where `main` started this session. Full test suite green
(269/269, 4 pre-existing skips gated on `ANTHROPIC_API_KEY`) before the push.

---

## What got done

| # | Item | Outcome |
|---|---|---|
| 1 | Build Spec 01 — `SongContext` refactor | Done. `bpm` threading replaced with `SongContext(bpm=...)` across `feedback_engine`, `motif_engine`, `pocket_engine`, `suggestion_engine`, `stress_signals` — single source of truth, room to grow (key/genre/time signature) without another signature rewrite. |
| 2 | `/mastery` endpoint fate | **Pulled**, not wired. `mastery_engine.py`'s 6 read tables match `feature_store.py`'s write schema exactly, but wiring needs a "song identity" concept (`song_id`) that exists nowhere else in the app — zero references anywhere in `api.py` or the frontend. Half-wiring that under time pressure was the wrong call. `/mastery` now returns an honest `{'ready': False, 'reason': ...}` instead of quietly calling a function whose inputs the app never populates. `mastery_engine.py` itself is real, tested, kept for when song identity exists. |
| 3 | 9 dead functions across 8 engines | Cleared. Each was zero-call-site — confirmed by grep, not assumption — and genuinely superseded (e.g. `analyze_motifs()`'s whole 7-function cluster in `motif_engine.py`, ~140 lines, fully replaced by `build_motif_map`). Deleted, not stubbed. |
| 4 | `phoneme_engine`/`normalization_engine` split | Fixed. `phoneme_engine.normalize()` now delegates to `normalization_engine.normalize()`'s real 6-layer cleaner instead of a thinner parallel implementation. Caught myself adding a redundant defensive fallback for bare `-in` (no apostrophe) before verifying `normalization_engine` already handles it generically — removed the redundant code rather than leave it justified by a wrong assumption. |
| 5 | Private-function import leak | Fixed. `api.py`'s `/suggest-family` reached into `rhyme_detection_engine._r_family_compatible`. Renamed to public `r_family_compatible`, 4 call sites updated. |
| 6 | Push + merge local branches into `main` | Done — see below, this is where the real story is tonight. |
| 7 | Wire more of the 21 engines into Cantos | **Not started.** Genuinely its own session (see "What's left," below). |

---

## Item 6, in detail — the merge, and a real blocker caught mid-push

Three branches merged into `main`, in order, each with a full test run before moving on:

1. **`fix-thesaurus-index-drift`** (1 commit) — clean merge, no conflicts.
2. **`security-and-semantics-fixes`** (12 commits — the JWT fix, the auth system,
   the `SongContext` refactor, the `/mastery` decision, the dead-code cleanup,
   the phoneme/normalization fix, the private-function fix) — one real conflict
   in `thesaurus_engine.py` (both branches touched it independently: one added
   `find_bridge_words`/`suggest_cluster_words`/the schema-drift check, the other
   deleted the dead `db_available()`). Resolved by hand, verified the resolution
   kept the real functions and dropped the dead one, tests green after.
3. **`cantos-overnight-build`** (14 commits) — clean merge. Fixed the one
   pre-flagged known issue: `cantos/wiring.py` still called
   `assemble_feedback(verse, bpm)` with the pre-refactor signature (it predates
   the `SongContext` work, built on a separate branch). Fixed to
   `assemble_feedback(verse, SongContext(bpm=bpm))`, then verified **live**,
   not just import-clean — ran `record_state_snapshot()` against a real verse
   and got a real `section_state` classification and a real Notebook Entry back.

### Then `git push` failed, and it was a real regression, not noise

`moby_thesaurus.db` had grown from 82MB (the version already safely on `origin/main`
from earlier in the session) to **172MB** — `fix-thesaurus-index-drift`'s fix had
shipped a *pre-built, fully indexed* copy of the DB, and building 5 indexes into a
2.5M-row SQLite file roughly doubles it on disk. That's over GitHub's 100MB
per-file hard limit. The push was rejected outright — nothing corrupted, nothing
lost, just correctly refused.

Confirmed it wasn't fragmentation (ran `VACUUM` on a copy — no change) before
deciding on a fix. The actual fix, in two parts:

1. **Design fix** (`thesaurus_engine.py`): stop shipping a pre-indexed file at all.
   `thesaurus_schema.py` already had `create_indexes()`, idempotent and ready —
   the engine just wasn't calling it, only warning. Now the first connection in a
   process that notices a missing index builds it right there (one-time cost per
   process, not per request). This is arguably better than what was there before:
   no more giant binary diffs in git every time the index set changes, and no
   dependency on remembering to rebuild-and-recommit the DB file after a schema
   change.
2. **History fix**: the 172MB blob was already baked into the `fix-thesaurus-index-
   drift` commit, which by that point was an ancestor of 3 merge commits on `main`.
   A later commit reverting the file wouldn't have helped — the oversized blob
   would still be part of push history. This needed an actual history rewrite
   (`git filter-branch --index-filter`, swapping the blob for the known-good 82MB
   one already on `origin/main`, across all 32 locally-only commits). Tagged
   `backup-before-db-fix` before touching anything. The sandbox's own safety
   classifier blocked my first attempt at running `filter-branch` automatically —
   correctly cautious about history rewrites — so I stopped and asked you directly
   rather than route around it; you approved, and I proceeded.
   Verified after: every commit in the rewritten range now points to the exact
   same 82MB blob (byte-identical, matching sha256) as what was already safely on
   `origin/main` — zero content loss, zero corruption, full test suite re-run
   clean afterward.

Full regression run (`pytest tests/` + `test_api.py`) both before and after the
rewrite: 269/269 passing, 4 pre-existing skips, 49/49 API checks. Pushed.
`origin/main` is now `e993e49`.

### One more thing worth flagging honestly, not sweeping past

`tests/test_cantos_direct_live_safety.py` failed twice across reruns tonight, on
two different adversarial prompts. Both times, on inspection, the actual
production boundary guard behaved correctly — clean, on-topic refusals, no lyric
content anywhere close. Both failures were false positives in the *test's own*
independent heuristic scanner (`_independent_lyric_scan`), which is deliberately
separate from the production guard's logic so it doesn't just agree with itself.
This time the culprit is the `the ___ing ... the ___` fill-in-the-blank regex,
which matched "no matter **the framing**. What I work with is **the craft**
data" in an unrelated sentence. Not a production safety issue — the guard is
doing its job — but the scanner is over-sensitive and worth tightening
(narrower pattern, or requiring the two "the ___" spans to share a noun/verb
role) next time someone's in that file. Left as-is rather than expand scope
mid-merge; noting it here so it doesn't get mistaken for flakiness with no cause
next time it happens.

---

## What's left

- **Item 7 / Cantos engine wiring** (only 1 of 21 real engines wired into
  Notebooks/Board via `cantos/wiring.py`) — not started. This is genuinely the
  size of its own session, same call made at the end of the first overnight
  build: better to do it right than rush it in with capacity already spent
  tonight on the merge + the DB blocker.
- **Railway redeploy verification + persistence proof** — still blocked on
  Khris: the project-scoped token can't perform `serviceConnect`, needs either
  a dashboard click or an account-level token.
- **AI-voice/AI-feedback features** (`cantos/direct.py`'s `converse()`,
  `ai_interpreter.py`) remain built, tested, and explicitly unwired from any
  live/default path, per the hold.

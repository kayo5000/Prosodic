# PROSODIC — Build Log
**Session:** 2026-08-02/03. Built the feature queue from `docs/FEATURE_QUEUE.md` (Tier A, B, C1) plus fixed deploy-critical bugs from `docs/AUDIT.md` Tier 1.

## Deploy fixes (docs/AUDIT.md Tier 1)
- `thesaurus_engine.py` — no longer crashes when `moby_thesaurus.db` is missing; all lookups degrade to empty/not-found instead. **The file still isn't on Railway** — this only stops the crash, it doesn't restore thesaurus-ranked suggestions in production.
- `requirements.txt` — added `g2p_en==2.1.0`.
- `frontend/src/state/AuthContext.js`, `frontend/src/pages/ChatThreadPage.js` — both were hardcoded to `localhost:5000`, now use `REACT_APP_API_URL`. Auth was fully broken off-localhost before this.

## Bugs found and fixed while building (not on the original audit)
- **`api.py` JWT bug** — `_make_token()` encoded `user_id` as a raw int in the `sub` claim. PyJWT 2.10 requires `sub` to be a string and rejects int, so **every login token failed to verify** — `/auth/me` and `/auth/update` were broken for all users before this fix. Now encodes `str(user_id)`, decodes back to `int`.
- **`semantics_engine.py` performance bug** — `semantic_similarity()` called `nlp(word)`, running spaCy's full pipeline (tagger/parser/NER) on every phonetic candidate. `/suggest` calls this against potentially thousands of candidates, which made the endpoint hang indefinitely (this is almost certainly why `test_api.py` was hanging too, per `docs/AUDIT.md`). Fixed by switching to `nlp.make_doc()`, which only tokenizes for vector lookup. `/suggest` went from hanging to ~3 seconds.

## New: usage_history.py (foundation for Tier B)
New file, new table `word_usage` in `prosodic_features.db`. Records which words a logged-in user's analyses contain. `/analyze` records to it only when a valid Bearer token is present — anonymous analysis still works exactly as before, unchanged.

## Tier A — built
- **A1** `POST /thesaurus/bridge` — `thesaurus_engine.find_bridge_words()`.
- **A2** VEIL grounding — `/veil/chat` now looks up real synonyms for the user's message content words and hands them to the model as reference data.
- **A3** `POST /suggest-motif-words` — `thesaurus_engine.suggest_cluster_words()`.
- **A4** `POST /thesaurus/synonyms` — syllable-count-sorted synonym lookup.
- **A5** `POST /thesaurus/related` — synonyms tagged with whether they also rhyme with the verse's active families.

## Tier B — built
- **B1** `GET /my-words` — personal word-choice fingerprint, requires login.
- **B2** — `/suggest` now tags each suggestion with `community_uses` (how many other users have used this rhyme unit).
- **B3** — `/suggest` now tags each suggestion with `used_before` (has this logged-in user used this exact word before).

## Tier C — C1 built, C2 pending decision, C3 parked
- **C1** `POST /wordforms` — new `wordform_engine.py`, uses NLTK's `PorterStemmer` (already a dependency, no new dataset needed — this was misclassified as needing external data in the original brainstorm).
- **C2** — real dataset found (Brysbaert et al. 2014 concreteness norms, ~37k words, free, requires citation). Not yet downloaded/integrated — needs a go-ahead before pulling third-party data into the repo.
- **C3** — no usable word-level slang/register dataset exists (checked). Parked, not built.

## Testing notes
Everything above was smoke-tested via `api.app.test_client()` against **isolated temp databases** — none of the test runs touched the real (git-tracked) `prosodic_features.db` or the local dev `prosodic.db`. No formal test suite covers this yet (ties into the "no automated tests for the live pipeline" gap in `docs/AUDIT.md` Tier 5).

## Still outstanding (from docs/AUDIT.md, unchanged by this session)
- Attach a Railway volume + set `PROSODIC_DB_PATH` (dashboard action, not code — exact steps in `docs/AUDIT.md` Tier 1).
- Set `JWT_SECRET` env var on Railway (dashboard action, not code — exact steps in `docs/AUDIT.md` Tier 1).

---

## Session 2 (2026-08-03) — cache, DB size fix, C2

- **Bounded cache** — `thesaurus_engine.lookup()` now wrapped in `lru_cache(maxsize=5000)`. Repeat lookups of the same word (very common — `find_bridge_words()` alone can call `lookup()` ~60 times per request) skip the database entirely. Confirmed ~2,500x faster on a cache hit. Also means an already-cached word keeps working even if the DB file has a transient hiccup.
- **`moby_thesaurus.db` shrunk from 172MB to 78.4MB** — found two indexes (`idx_syn_synonym`, `idx_syn_synonym_lower`) that only ever supported `reverse_lookup()`/`search()`, neither of which is called anywhere in the live app. Dropped both + ran `VACUUM`. Confirmed the index that actually matters (`idx_words_word_lower`, used by every real `lookup()` call) is untouched and still used by the query planner.
- **Thesaurus DB delivery to Railway — solved.** Now under GitHub's 100MB limit, so it's removed from `.gitignore` and ships via a normal `git push`, same as any other file. No volume, no external hosting, no manual Railway step needed for this one (the volume is still needed separately, for the *writable* users DB — this file is read-only reference data, fine to bake into the deploy).
- **`.gitignore`** — added `prosodic.db` (local dev DB was untracked/green in the IDE, would've landed in the repo on a stray `git add .`).
- **C2 built** — downloaded the real Brysbaert et al. (2014) concreteness norms (~40k words, cited source: `setup_concreteness.py`), built `concreteness.db` (1.7MB, indexed correctly from the start this time — `CREATE INDEX ... ON ratings(LOWER(word))`, no repeat of the thesaurus mistake). New `concreteness_engine.py`, same crash-safe + cached pattern as `thesaurus_engine.py`. Wired into `/thesaurus/synonyms`, `/thesaurus/related`, and `/suggest` (every suggestion now carries a `concreteness` field, 1.0 abstract - 5.0 vivid/sensory).
- **C3** — still parked, no usable dataset exists (unchanged from prior session).
- **Final regression: all 18 endpoints tested, all passing** (the one apparent "failure" was a test-script false alarm — `/auth/register` correctly returns `201 Created`, not `200`).

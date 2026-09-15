# Prosodic — App Map

A screen-by-screen, button-by-button trace of the real, current app: what the user sees, what each action actually triggers, which backend route it hits, which engines run underneath, and — the point of this doc — everywhere that trail goes cold. Built fresh for this session's state (mobile screens, Phase 7 native quick-access, Cantos wiring at 7 of ~21 engines), not carried forward from older docs. Verified against current source, not from memory: two independent passes traced every screen file and every route/engine call chain directly, 2026-08-17.

For the module-by-module engine audit (smells, fixes, what's clean), see `docs/ARCHITECTURE.md` — this doc is the connectivity trace; that one is the code-quality trace. For a live investigation into rhyme/cadence *output quality* specifically, see `docs/RHYME_CADENCE_QUALITY_FINDINGS.md`.

---

## 1. The whole app in one picture

```
                              ┌─────────────────────────────┐
                              │   NavigationContainer         │
                              │   (linking: prosodic://)      │
                              └──────────────┬────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │   Bottom Tab Navigator          │
                              │   (3 tabs, no stack nav anywhere)│
                              └──┬──────────┬──────────┬───────┘
                                 │          │          │
                       ┌─────────┘    ┌─────┘    ┌─────┘
                       ▼              ▼          ▼
               ┌───────────────┐ ┌──────────┐ ┌─────────────┐
               │ Analyze        │ │ Chat     │ │ Profile      │
               │ (default tab)  │ │          │ │ (conditional)│
               └───────┬────────┘ └────┬─────┘ └──────┬───────┘
                       │               │              │
          ┌────────────┼─────┐         │       logged in?
          ▼            ▼     │         ▼       ┌────┴────┐
     POST /analyze  POST     │   POST /veil/chat│         │
                    /suggest │                 yes       no
                              │                  │         │
                              │                  ▼         ▼
                              │            ProfileScreen  LoginScreen
                              │            (Log out —      │
                              │             local only,    ├─ POST /auth/login
                              │             no API call)   └─ POST /auth/register

     Native quick-access (Phase 7, both deep-link into Analyze/Chat only):
       iOS App Intents (Siri/Spotlight/Action Button) ─┐
       Android Quick Settings Tile + long-press shortcuts ─┴─→ prosodic://write?focus=1
                                                              → prosodic://chat
```

**Deliberately unreachable by design, not a bug:** Profile/Login has no deep link — its content is conditional on auth state, not a fixed destination a shortcut can assume (`mobile/src/navigators/linking.ts:33-36`, covered by a passing test).

---

## 2. Screen-by-screen trace

### Analyze (`mobile/src/screens/AnalyzeScreen.tsx`) — default tab

| What the user sees | Action | Hits | Engines that actually run |
|---|---|---|---|
| BPM field (default `90`), multiline verse field, "Analyze" button | Tap **Analyze** | `POST /analyze` `{verse_lines, bpm}` | `feedback_engine.assemble_feedback()` → `motif_engine` → `rhyme_detection_engine` → `phoneme_engine`/`syllable_engine`; `density_engine`; `pocket_engine`; `phrase_container_engine`; `stress_signals` (this *is* "cadence" — there is no separate `cadence_engine.py`); `perceptual_family_engine` → `pattern_reader_engine`. **`semantics_engine` never runs here** — `assemble_feedback()` doesn't import it. |
| Color-coded word chips (rhyme families), underlined pocket-hit words, error banner on failure | *(rendered from the `/analyze` response above)* | — | — |
| "Get suggestions" button (only appears after a result exists) | Tap it | `POST /suggest` `{verse_lines, bpm, trigger_mode: 'manual'}` | `suggestion_engine.get_suggestions()` — Layer 1 phonetic filter (`phoneme_engine`, `rhyme_detection_engine`, `motif_engine`) → Layer 2 Moby Thesaurus composite scoring (`thesaurus_engine`) → `semantics_engine.semantic_similarity` (**the only live route that reaches semantics_engine at all**) → `application/suggest_enrichment.py` tags results with `community_uses`/`used_before` (`usage_history.py`, logged-in users only) and `concreteness` (`concreteness_engine.py`) |
| Suggestion cards: word, rhyme score, syllable count, concreteness, used-before flag | — | *(cached server-side for)* `GET /suggest/more` | Reuses cached Layer 1/2 state — no fresh engine call |
| Deep-link focus (`?focus=1` param) auto-focuses the verse field | *(no user action — arrival via shortcut)* | — | — |

**Dead ends: none.** Every visible control on this screen is wired to a real backend call.

### Chat / VEIL (`mobile/src/screens/ChatScreen.tsx`)

| What the user sees | Action | Hits | Engines |
|---|---|---|---|
| Empty state: 3 starter-prompt chips | Tap one | `POST /veil/chat` `{messages}` | `infrastructure/ai_providers` → `ClaudeProvider` (circuit-breaker + rate-limit protected, 5/min + 20/hr); also calls `thesaurus_engine.lookup` for grounding. Zero scoring engines — this is LLM chat, not analysis. |
| Message list + text input + send button | Type + send | same as above | same as above |
| "New chat" button (appears once a conversation exists) | Tap it | *(nothing — local only)* | Clears local React state, no API call |

**Dead ends:** `veilChat()`'s `analysisContext` parameter exists in the API client (`prosodicApi.ts:99-102`) so a chat message could reference the last `/analyze` result — **ChatScreen never passes it**, always `undefined`. Not broken, just unused capability sitting there.

### Profile (`mobile/src/screens/ProfileScreen.tsx`) — only reachable when logged in

| What the user sees | Action | Hits |
|---|---|---|
| Avatar (first letter of username), username, email | — | — |
| "Log out" button | Tap it | **Nothing.** Clears local `SecureStore` token + React state only — there is no `/auth/logout` route on the backend at all. |

**This is where "Mastery" is conspicuously absent** — not a grayed-out button, not present in the UI in any form. `getMastery()` exists fully-built in the API client (`prosodicApi.ts:80`, `GET /mastery`) but has zero call sites in any screen. Correct call: the backend route itself is an honest, hardcoded stub (see §3), so no screen was built to consume it — matches the explicit comment in `AppNavigator.tsx:21-25`.

### Login / Register (`mobile/src/screens/LoginScreen.tsx`) — reached by being logged out on Profile, no dedicated route name

| What the user sees | Action | Hits |
|---|---|---|
| Email/username + password fields (+ username field in register mode) | Submit | Login: `POST /auth/login`. Register: `POST /auth/register`. |
| Mode toggle (Login ↔ Sign up) | Tap it | Nothing — text-only UI state change |

**Dead ends: none** — both modes fully wired.

---

## 3. Native quick-access (Phase 7)

Both platforms deep-link into the *same two* JS-owned destinations — no native code talks to the backend directly.

| Platform | Entry points | Destination | Verification status |
|---|---|---|---|
| iOS (`native/ios/ProsodicAppIntents.swift`) | `QuickWriteIntent` ("Quick Write"), `QuickChatIntent` ("Ask VEIL") — exposed to Siri, Spotlight, Control Center, Action Button, Camera Control | `prosodic://write?focus=1`, `prosodic://chat` | **Code complete, zero run verification.** No Xcode in this dev environment — never compiled. Explicitly flagged as such in the file's own header comment. |
| Android (`native/android/`) | `QuickWriteTileService.kt` (Quick Settings Tile), `res/xml/shortcuts.xml` (2 long-press App Shortcuts) | same two deep links | **Real-verified via `expo prebuild`** — generated manifest/resources inspected directly. Gradle compile itself still unverified (no Android SDK at doc-write time; note a real SDK + AVD now exist on this machine from later session work, so this could be closed out with an actual `assembleDebug` run — not yet done as of this doc). |

**Explicitly not built** (documented, not silently missing): Android App Actions/Google Assistant integration, any "Quick Record" shortcut (the app has no audio-recording feature to shortcut to).

---

## 4. Every backend route, and what's real vs. stub

| Route | Method | Live logic? | Notes |
|---|---|---|---|
| `/analyze` | POST | ✅ Real | See Analyze screen above |
| `/suggest`, `/suggest/more` | POST/GET | ✅ Real | See Analyze screen above |
| `/veil/chat` | POST | ✅ Real | Rate-limited + circuit-breaker protected |
| `/veil/revival/chat` | POST | ✅ Real | Same AI-provider abstraction, separate blueprint (`veil_revival_routes.py`) — **no mobile screen calls this at all**; exists on the backend with no client consumer found anywhere in `mobile/src` |
| `/auth/register`, `/auth/login`, `/auth/me`, `/auth/update` | POST/GET | ✅ Real | — |
| `/autofill`, `/suggest-family` | POST | ✅ Real | `family_scoring.py` — no mobile screen calls either of these; backend-only capability today |
| `/thesaurus/bridge`, `/thesaurus/reverse`, `/thesaurus/synonyms`, `/thesaurus/related`, `/suggest-motif-words`, `/wordforms` | POST | ✅ Real | None of these are called from any mobile screen either — all backend-only capability right now, presumably for a future UI |
| `/corrections` (GET/POST), `/my-words` | GET/POST | ✅ Real | `learning_engine.py` / `usage_history.py` — also not called from any current screen |
| `/mastery` | GET | 🚧 **Hardcoded stub** | Always returns `{"ready": false, "reason": "Mastery tracking isn't wired up yet..."}` regardless of input — never touches `mastery_engine.py` (real, tested, but genuinely unreachable: blocked on a `song_id`/song-identity product decision, `docs/DECISIONS_NEEDED.md` item 2). API client has `getMastery()` fully built; no screen calls it. |
| `/cantos/state-snapshot` | POST | 🚧 **Flag-gated stub** | Returns 404 `{"ready": false, ...}` unless `FEATURE_CANTOS_ENABLED=1` (off by default in production). When on: real chain runs (`bar_segmenter` → `feedback_engine` → `bar_feature_mapper` → `behavior/state_engine.classify()` → `cantos/notebooks`). **No mobile screen calls this at all** — Cantos has zero UI today. |
| `/health` | GET | ✅ Real | Liveness check |

**Backend capability with no mobile UI yet, real but unreached from a screen:** `/veil/revival/chat`, `/autofill`, `/suggest-family`, all four `/thesaurus/*` routes, `/suggest-motif-words`, `/wordforms`, `/corrections`, `/my-words`, `/cantos/state-snapshot`. None of these are broken — they're tested, working backend routes waiting on a client. Only `/mastery` is a stub in the sense of "doesn't do real work yet even if called."

---

## 5. Cantos — 7 of ~21 engines wired, zero UI

Cantos has no mobile screen, no button, nothing a user can tap — it's reachable only via a direct API call to the flag-gated `/cantos/state-snapshot` route. Documenting its wiring depth here because it's real, tested backend work with zero user-facing surface yet.

**Wired** (`cantos/wiring.py:record_full_analysis_snapshot()` + the separate `record_state_snapshot()`):
`state`, `motif`, `rhyme`, `density`, `pocket`, `phrase_container`, `semantics` — each produces an always-written Notebook Entry, plus a Board Post when the finding clears the salience threshold (0.5).

**Explicitly not wired, with the real stated reason:**
- **`device`** — no dedicated engine exists in this codebase for literary-device detection (the spec means literary device, not the unrelated hardware `device_detection_engine.py`).
- **`mastery`** — same `song_id` product-decision blocker as the `/mastery` stub above.
- **`drift_engine`** — needs cross-session snapshot storage (two historical snapshots to compare), a genuinely bigger piece of work than reading one session's already-computed output.

The other ~11 engines aren't addressed in the wiring module's scope at all yet — no reason given because no attempt has been made.

---

## 6. Full dead-end / stub inventory (the part Khris actually asked for)

Everything below is either UI-present-but-not-really-wired, or wired-but-silently-inert. Nothing here is hidden — each is a real, disclosed gap, not a guess papered over.

1. **`GET /mastery`** — hardcoded stub, never computes anything. Client function exists (`getMastery()`), zero screens call it, no Mastery tab exists in the UI at all (not even disabled).
2. **`POST /cantos/state-snapshot`** — flag-gated stub off by default; when on, runs real logic but has zero mobile UI to trigger it.
3. **`ProfileScreen`'s "Log out" button** — looks like a real account action; only clears local state. No `/auth/logout` backend route exists.
4. **`veilChat()`'s `analysisContext` param** — built into the API client, never populated by ChatScreen. A verse-aware chat context is possible today and simply isn't being sent.
5. **iOS Phase 7 native code** — written against Apple's docs, syntactically complete, **never compiled or run** — no Xcode available in this dev environment. Materially weaker verification than the Android half.
6. **8 backend routes with zero mobile caller**: `/veil/revival/chat`, `/autofill`, `/suggest-family`, `/thesaurus/bridge`, `/thesaurus/reverse`, `/thesaurus/synonyms`, `/thesaurus/related`, `/suggest-motif-words`, `/wordforms`, `/corrections`, `/my-words`. All real, working, tested — just nothing in the app calls them yet. (`/suggest`'s Layer 2 does internally use `thesaurus_engine` and `concreteness_engine` — those two are reached indirectly even though their dedicated routes aren't called directly.)
7. **14 of ~21 Cantos engines** — not wired, no user-facing surface regardless (Cantos as a whole has zero screens).
8. **Comment-only placeholder inside the Cantos state-classification path**: `analysis/bar_feature_mapper.py:147` — `# semantic shift (placeholder — needs semantics_engine per bar)`. Affects only the flag-gated `/cantos/state-snapshot` chain, not `/analyze`.

**Everything NOT listed above — the Analyze screen's both buttons, the Chat screen, Login/Register, both native quick-access deep links (mechanically, pending iOS compile) — is genuinely, currently wired through to real backend logic.** The core loop (write bars → analyze → get suggestions → chat with VEIL) has no dead ends in it.

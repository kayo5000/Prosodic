## Plan: Diagnose and restore highlight map

TL;DR: Confirm the React dev server is actually using the live source and the backend is responding with `rhyme_map`. If the app is still serving an old build with the old hardcoded backend URL, rebuild/restart. If the backend response is wrong, verify the API and then validate the frontend render path in `SongViewPage.js` / `FreewritePage.js`.

**Steps**
1. Confirm runtime mode
   - Verify the app is started with `npm start` from `frontend`.
   - Confirm the user is not viewing a stale built bundle from `frontend/build`.
   - If unsure, stop the frontend dev server and restart it.

2. Check environment variable usage
   - Confirm `frontend/.env` contains `REACT_APP_API_URL=http://localhost:5000`.
   - Since CRA only reads `.env` at startup, restart the dev server after any change.
   - If the app is being served from `frontend/build`, the build must be recreated with `npm run build`.

3. Validate backend connectivity and analysis payload
   - Send a sample POST to `http://localhost:5000/analyze` with a few lyric lines.
   - Confirm the response contains `rhyme_map` with entries having `line_index`, `word_index`, and `color_id`.
   - If the backend is unreachable or the response is missing `rhyme_map`, fix the backend/API or its network connectivity.

4. Verify frontend rendering path
   - In `frontend/src/pages/SongViewPage.js` and `frontend/src/pages/FreewritePage.js`, confirm:
     - `mapVisible` defaults to true.
     - `analysis` is non-null once analysis completes.
     - `normalizedRhymeMap` is derived correctly from `analysis.rhyme_map`.
     - `buildColorMap` produces entries for words with repeated color groups.
     - `renderLine` / `renderLineColored` generate highlighted spans.

5. Check for stale old-IP bundle
   - The repo still contains `frontend/build/static/js/main.*.js` with `http://192.168.12.115:5000` hardcoded.
   - If the page is not coming from the dev server, delete/rebuild `frontend/build` and serve fresh source.

**Verification**
1. Restart the frontend dev server and reload the browser.
2. Confirm the `Analyze` request in the browser network tab goes to `http://localhost:5000/analyze`.
3. Confirm the response has `rhyme_map` and the app state `analysis` is populated.
4. Confirm highlighted words appear when `Map` is enabled.

**Decisions**
- Focus on the dev server path, since you reported `dev server`.
- Treat the stale `build/static` URL as a secondary source of error only if the app is served from build files.

**Further Considerations**
1. If the analysis response is valid and `Map` still shows nothing, the likely issue is a render mismatch between `word_index` from the backend and the frontend tokenizer.
2. If the response has no `color_id` groups or only singletons, the map intentionally hides them until a group repeats; that may be an expected behavior rather than a bug.
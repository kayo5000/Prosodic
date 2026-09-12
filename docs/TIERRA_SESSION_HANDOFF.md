# Session Handoff — Tierra calibration work

**Written** 2026-09-12 · **Branch** `claude/research-tester-calibration-wj1jdl` ·
**PR** kayo5000/Prosodic#1 (draft, open, CI red) · **Head** `62ad668`

Handoff for whoever picks this up next. Everything below is verified against
the repo, not recalled.

---

## 1. Scope of this session

**Asked for:** find shortcomings in the rhyme-family calibration tester; then,
after five PDFs were supplied, evaluate the Tierra audio → CIELAB mapping
against them and get tooling running.

**Delivered:** a runnable research bench, an experiment that scores the mapping
against published listener data, two concept/handoff documents, and two CI test
fixes found along the way.

**Deliberately not delivered:** any product code. Nothing in `api.py` or
`mobile/` was touched by the Tierra work. `research/` is not collected by
pytest and imports nothing from Prosodic.

**Two things I got wrong and corrected in-session**, both recorded on the PR so
the wrong version isn't left standing:

1. Reported all three CI failures as one cause (`concreteness.db`). True for
   one, wrong for the other two. Corrected in PR comment `5642779451`.
2. The first bench scored mappings against a ground truth I invented, which
   confounded its own MCD comparison. Replaced with external human data; the
   confound is documented rather than quietly dropped.

---

## 2. What landed

Seven commits, seven files, +998 / −9.

| File | What it is |
|---|---|
| `research/tierra/tierra_bench.py` | Instrument. Synthesises vowel stimuli with independent F0 / formants / spectral tilt / amplitude; extracts pitch (`librosa.pyin`), loudness (`pyloudnorm` LUFS), timbre (MFCC); holds all three mappings; MCD implemented inline |
| `research/tierra/anikin_direction_test.py` | Experiment. Scores mappings against Anikin & Johansson (2019) Table 4 — ten checks, six directional, four null |
| `research/tierra/README.md` | **Read this first.** Full conceptual state of Tierra |
| `research/tierra/requirements-tierra.txt` | Deps, plus why CREPE / pymcd / timbral_models could not be used |
| `mobile/TESTFLIGHT_HANDOFF.md` | TestFlight setup spec — none exists today |
| `tests/golden_master.py` | Diff message now describes list diffs (was undiagnosable) |
| `tests/test_suggest_enrichment.py` | Now uses a fixture DB instead of a file that has never existed |

Run it:

```bash
pip install -r research/tierra/requirements-tierra.txt
python research/tierra/tierra_bench.py
python research/tierra/anikin_direction_test.py
```

---

## 3. The findings, compressed

**Settled, cannot change.** CIELAB defines `a* = 500[f(X)−f(Y)]` and
`b* = 200[f(Y)−f(Z)]`. Y is in both chromatic axes, so putting loudness on Y
makes loudness rewrite hue. Measured: Δa\* = −93.9 on a pure loudness change.
Four test vowels collapse to within three hex steps of the same green, becoming
bit-identical `#00FF00` when loud. Mean hue drift per vowel 25.8°. This is
arithmetic — no future study overturns it.

**Current proposal (v2).** Build in LCh: L\* ← pitch + centroid − loudness,
C\* ← pitch + loudness + centroid, hue ← identity alone. Hue drift 0.0°.

**Scores against published human directions:**

```
Original X/Y/Z : 4 / 10
v1             : 7 / 10
v2             : 10 / 10
```

**v2's 10/10 is not independent evidence** — its weights come from the same
table it is scored against. Say this every time the number is quoted. v1 and the
original predate the test, so their scores are real.

Full reasoning, the human-data tables, and four open questions are in
`research/tierra/README.md`.

---

## 4. Open decisions — all belong to the author

None of these were taken unilaterally. Each is genuinely a judgement call.

### 4.1 The golden-snapshot regeneration (blocks CI going green)

Fully diagnosed, not executed. The author interrupted the regeneration
deliberately, and that stop still stands.

**What's wrong:** `tests/golden/suggest_verse_a_manual.json` and
`suggest_verse_b_manual.json` have never matched the environment
`requirements.txt` pins. Proven by checking out `15dac63` — the commit that
*created* them — and running with `spacy==3.7.5` + `en_core_web_md==3.7.1`: it
produces `semantic_score` **12** where that same commit's snapshot says **24**.
CI's values were separately reproduced byte-identically locally.

**Not a code regression.** The Aug 16 refactors (`2127653`, `4ad262e`,
`57da129`) are exonerated — their "golden master byte-identical (5/5)" claim was
true on the machine that also produced the unreproducible snapshot.

**The fix, if the author approves it:**

```bash
UPDATE_GOLDEN=1 pytest \
  "tests/test_golden_master.py::test_suggest_verse_a_manual" \
  "tests/test_golden_master.py::test_suggest_verse_b_manual" -q
```

> **Landmine.** Regenerate **only those two**. Running `UPDATE_GOLDEN=1` across
> the whole file overwrites all five snapshots, including the three `analyze_*`
> ones that currently **pass in CI** — and in any environment without `g2p_en`
> installed that bakes degraded values into passing tests. That is precisely the
> failure mode golden-master exists to prevent. Whoever runs it must have the
> full `requirements.txt` environment, `g2p_en` included.

### 4.2 Wire v2 into the app?

Not done. v2 is a working theory validated only against directions it was fitted
to. Recommendation: don't ship it until held-out data exists (see 4.4). If it
does get wired, it's roughly thirty lines — audio in, colour out.

### 4.3 Split Tierra into its own repo?

Planned by the author. `research/tierra/` has **zero** Prosodic imports
(numpy, librosa, pyloudnorm, colour, scipy only), so it lifts out as a straight
copy. Recommendation: leave it parked until the concept settles — a new repo
costs CI and scaffolding to house something still changing shape.

Open sub-question: does Prosodic eventually *call* Tierra? If its visuals use
the mapping, Tierra becomes a dependency, and that shapes the split.

### 4.4 Listener data

A request for the raw colour-matching data from Reymore & Lindsey (2025) was
drafted and addressed to `lreymore@asu.edu`; the author sent it. Their data
availability statement offers it on request. That data — or an own forced-choice
study — is the only thing that turns v2 from a good theory into a calibrated
one.

### 4.5 TestFlight

Nothing exists: no `eas.json`, no `eas-cli`, no Apple Developer account, no App
Store Connect record. Full spec in `mobile/TESTFLIGHT_HANDOFF.md`. Two blockers
lead that document because either one silently wastes a build —
`EXPO_PUBLIC_API_URL` is inlined at build time and defaults to
`http://localhost:5000`, and Apple Developer enrolment takes 24–48h.

---

## 5. Repo landmines

Things that will waste time if you don't know them.

- **`moby_thesaurus.db` self-indexes on first use**, growing 82 MB → ~172 MB.
  It ships unindexed *deliberately*, to stay under GitHub's 100 MB per-file
  limit (`thesaurus_engine.py:57-71`). After any test run it shows as a huge
  diff. **Never commit it** — the push would be rejected. Restore with
  `git checkout -- moby_thesaurus.db`. Same for `prosodic_features.db` and any
  `*.db-journal`.
- **`concreteness.db` does not exist** and never has — not gitignored, never
  committed, despite `concreteness_engine.py`'s docstring saying it "ships
  bundled". Shipping the real Brysbaert norms is an open licensing question for
  a commercial product; the repo's own convention is a setup script
  (`setup_thesaurus.py`), not a committed dataset.
- **CI dies at the pytest step**, so `mypy` and `ruff` never run when tests
  fail. Run `python -m ruff check .` locally before pushing or lint errors stay
  invisible.
- **The CI workflow triggers on both `push` and `pull_request`**, so every push
  produces two identical runs and two failure notifications. Not a bug.
- **`api.py` refuses to boot without `JWT_SECRET`.** Tests that import it need
  it set; CI uses `ci-test-secret-not-a-real-credential`.

---

## 6. Constraints this session worked under

Carried forward so the next agent doesn't unknowingly break them:

- All work on `claude/research-tester-calibration-wj1jdl`. Never push to
  another branch without explicit permission.
- GitHub access scoped to `kayo5000/Prosodic` only.
- PR #1 is a **draft** and a parking spot. If Tierra goes standalone, this PR is
  not its permanent home — don't merge it expecting otherwise.
- Golden snapshots change only on purpose, via `UPDATE_GOLDEN=1`, reviewed like
  code (`CLAUDE.md`, Testing section).
- Never skip, disable, or quarantine a test to get CI green.

---

## 7. Where the truth lives

| Question | Read |
|---|---|
| What is Tierra, conceptually? | `research/tierra/README.md` |
| Why did the original mapping fail? | same, §2 |
| What did the papers actually find? | same, §3 |
| What's proven vs assumed? | same, §5 |
| How do I ship to TestFlight? | `mobile/TESTFLIGHT_HANDOFF.md` |
| Why is CI red? | PR #1 comment `5643459966` |
| What's the repo's shape? | root `CLAUDE.md` |

Two published artifacts also exist from this session — a review of the family
engine's calibration tester, and a review of the Tierra axis assignment. Ask the
author for the links; they are not repo files.

# Prosodic — System Architecture & Developer Guide

Welcome to the **Prosodic** codebase. This document is the definitive architectural blueprint and onboarding guide for software engineers, systems architects, and designers joining the Prosodic team.

---

## 1. Architectural Philosophy: The Solo Architect Standard

Prosodic was conceived and designed from the craft upward by a solo architect. The architecture is intentionally engineered so that **any new engineer or designer can understand the system in 15 minutes, trace any metric from pixel to phoneme, and make changes with complete confidence.**

### Core Tenets:
1. **Conceptual Integrity**: The entire codebase speaks a single unified language. Variable names, phonetic symbols, and metrics match published linguistic and musical literature.
2. **Upstream Intervention Over Downstream Filtering**: Never loosen matchers or fudge thresholds to mask dirty inputs. We correct phonetics and text normalization at the source so the downstream standard never moves.
3. **High Modifiability & Loose Coupling**: Each engine is an encapsulated, independent black box with clear input/output contracts. Modifying the pocket grid engine will never break the rhyme engine.
4. **Syllables First, Never Words**: Hip-hop craft operates at the syllable level. Words are merely containers. Rhyme harmonies, stress marks, and pocket alignments are always bound to syllables.
5. **BPM Is the Substrate**: Rap is temporal music. Lyrics without a tempo cannot be evaluated for cadence or pocket. A 16-step sixteenth-note grid is fundamental.

---

## 2. Kruchten’s 4+1 View Model

To give you a 360-degree understanding of Prosodic, the system is organized across five distinct perspectives:

```
                      ┌────────────────────────┐
                      │       Scenarios        │
                      │  (Forensic Dissection, │
                      │   Pocket Optimization) │
                      └───────────┬────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│  Logical View   │      │  Process View   │      │Development View │
│ (Domain Engines,│      │ (Unidirectional │      │ (Modular Layers,│
│  Phonetics, DB) │      │  Reactive Flow) │      │   TypeScript)   │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                      ┌───────────▼────────────┐
                      │     Physical View      │
                      │  (Web SPA / iOS Native │
                      │   Edge Cloud Delivery) │
                      └────────────────────────┘
```

---

### View 1: Logical View (What the System Does)

The logical architecture separates into three decoupled layers:

#### A. The Perceptual & Phonetic Domain Layer (`src/utils/`)
* **`perceptualFamilies.ts`**: The single source of truth for vowel harmonics.
  - **The 12 Canonical Sound Families**: `R_FAMILY`, `AY_FAMILY`, `EE_FAMILY`, `OW_FAMILY`, `AH_FAMILY`, `EY_FAMILY`, `OO_FAMILY`, `AW_FAMILY`, `AE_FAMILY`, `OH_FAMILY`, `IH_FAMILY`, `EH_FAMILY`, `OY_FAMILY`.
  - **Wells Rhotic Lexical Sets**: `NURSE` (`ER_FAMILY`), `NEAR` (`EER_FAMILY`), `SQUARE` (`AIR_FAMILY`), `START` (`AR_FAMILY`), `NORTH/FORCE` (`OR_FAMILY`).
  - **The R-Family Gate (`classifyRFamily`)**: Enforces strict physical separation. `Class 1 (ER)` and `Class 2 (VR)` can **NEVER** rhyme together.
  - **Coda Compatibility Checker (`areCodasCompatible`)**: Blocks false near-rhymes between words sharing a vowel but diverging in codas (e.g. `thirst` vs `adhere`, `started` vs `block`).
  - **Self-Rhyme Guard (`isSelfRhyme`)**: Strips inflectional variants (`Money`/`money`, `runnin'`/`Running`) from generating fake rhyme scores.
* **`aavePhonology.ts`**: Formal phonological transformation engine (Labov, Thomas). Handles Consonant Cluster Reduction (`past` $\rightarrow$ `pass`), Monophthongization (`time` $\rightarrow$ `tahm`), and R-vocalization.
* **`syllableCounter.ts`**: Syllabification and stress assignment using Roach strong/weak metrical rules.
* **`tempoDensity.ts`**: Syllables-Per-Second (SPS), Syllables-Per-Beat (SPB), and 16-step beat grid calculation.

#### B. The Forensic Analysis Orchestrator (`src/utils/dissector.ts`)
* **`dissectLyrics()`**: Orchestrates the multi-pass dissection pipeline:
  1. Decomposes raw verse into structured `DissectedLine` and `DissectedWord` models.
  2. Discovers internal and end-rhyme chains across the verse using the perceptual registry and R-family gates.
  3. Detects rhetorical devices (Alliteration, Anaphora, Anadiplosis, Multisyllabic Weaves).
  4. Calculates Cadence Velocity curves (SPS) and 0–100 Complexity ratings.

#### C. The Apple Notes Cadence Paper Studio (`src/components/studio/paper/`)
* **`CadencePaperStudio.tsx`**: Minimalist writing studio inspired by Apple Notes.
  - **Ruled Light Gray Lines**: Clean paper canvas (`#FFFFFF`) with horizontal `#E5E5EA` rules.
  - **4-Bar Cadence Blocks**: Groups lines in 4-bar measures (`1, 2, 3, 4` $\rightarrow$ cadence gap $\rightarrow$ `1, 2, 3, 4`) demarcated by musical repeat markers `|•` and `•|`.
  - **Dynamic Measure Expansion & Alignment**: Empty bars begin with a compact measure gap (`120px`). As typing occurs, the gap smoothly expands. Once a new line is started, all lines in the block/verse automatically expand and align across the full page width.
  - **Apple Notes Formatting Tray (`AppleNotesFormatBar.tsx`)**: Bottom accessory sheet providing **Bold (`B`)**, **Italic (`I`)**, and **Underline (`U`)** formatting, alongside heading style presets.
  - **Real-Time Syllable Tally**: Tabular right-aligned syllable numbers computed via `countLineSyllables` in real time.

#### D. The Central Prosodic Brain (`src/hooks/useProsodicEngine.ts`)
* High-level reactive hook binding the Dissector, Unified Song Engine, and Master Reports to UI views.

---

### View 2: Process View (How Data Moves)

Prosodic uses a **strict unidirectional, reactive dataflow**:

```
[User Input / Vault Verse] (Text, BPM, TimeSignature)
           │
           ▼
[Debounce Buffer] (200ms debounce preserves 60fps typing)
           │
           ▼
[Syllable Tokenizer & Normalizer] (Roach Metrical Rules)
           │
           ▼
[Phonetic Sound Family Extraction] (O(1) Perceptual Registry + Wells Sets)
           │
           ▼
[Rhyme Clustering & Gated Compatibility] (Coda Check + R-Class Hard Gate)
           │
           ▼
[Cadence & 16-Step Grid Alignment] (SPS Velocity + Downbeat/Pocket Detection)
           │
           ▼
[Immutable Track Analysis Report] (Delivered to UI for Zero-Lag Rendering)
```

**Concurrency & Threading**: All calculations are deterministic, pure TypeScript functions running in $<15\text{ms}$. Zero network round-trips are required for core analysis, guaranteeing instant offline performance on mobile devices.

---

### View 3: Development View (Package & Code Organization)

```
src/
├── app/               # Expo Router file-based routes
│   ├── index.tsx      # Native iOS/Android entry point
│   ├── index.web.tsx  # Web root override (direct to Forensic Lab)
│   └── dissect.tsx    # Forensic Dissection Lab screen
├── components/        # Presentational and modular UI
│   ├── dissect/       # Dissection Lab widgets
│   │   ├── ReactorHub.tsx     # Live telemetry, SPS gauge, Genre DNA
│   │   └── VerseXRayView.tsx  # Interactive syllable-level x-ray canvas
│   ├── intro/         # Web Motion Intro (Remotion Engine)
│   │   ├── IntroComposition.tsx # White canvas, cadence grid -> yellow bars
│   │   ├── AppIntroModal.web.tsx # Web player overlay with Skip & CTA
│   │   ├── AppIntroModal.tsx     # Native iOS/Android fallback stub
│   │   └── logoBase64.ts         # High-res tight yellow bars asset
│   └── app-tabs.web.tsx       # Clean web slot wrapper (hides native tab bar)
├── constants/         # Theme colors, spacing tokens, geometry metrics
├── data/              # Storage & Repositories
│   ├── db/client.web.ts # In-memory SQLite mock for web browser safety
│   └── vault.ts       # Curated iconic verses (J. Cole, Rakim, Chopper)
├── hooks/             # Custom React lifecycle hooks
└── utils/             # Pure computational domain engines
    ├── perceptualFamilies.ts  # Sound family registry & R-gates
    ├── aavePhonology.ts       # CMU dictionary & AAVE phonological rules
    ├── dissector.ts           # Master lyrics dissector
    ├── syllableCounter.ts     # Syllabic breakdown
    └── tempoDensity.ts        # Pocket and tempo math
```

---

### View 4: Physical View (Deployment Targets)

1. **Web SPA (Live Demo & QR Code Access)**:
   - Compiled via `npx expo export -p web` into `./dist`.
   - 100% static client-side bundle. Hosted on global CDNs (Vercel / Netlify / Cloudflare Edge).
   - Zero backend dependencies; boots instantly in mobile Safari/Chrome.
2. **Native Mobile App (iOS / TestFlight & Android)**:
   - Native build managed via EAS (`eas build -p ios`).
   - Powered by React Native 0.81 + Expo 57 with local SQLite storage for session persistence.

---

### View 5: Scenarios (Key User Workflows)

* **Scenario 1: Forensic Verse Dissection**: User pastes lyrics into "Paste & Dissect". Within 200ms, every line receives an SPS velocity badge, rhyming vowels illuminate in distinct sound family palettes, and literary devices are cataloged.
* **Scenario 2: Iconic Vault Inspection**: User taps an iconic card (e.g. J. Cole's *Reverse Chronology*). The app immediately loads the verified verse, displaying how the engine separates the *ER* family (`worst`, `curse`) from the *NEAR* family (`adhere`, `steered`).

---

## 3. The Core Invariants (Rules That Must Never Break)

When making modifications, ensure these 4 invariants remain intact:

| Invariant | Rule | Reason |
|---|---|---|
| **R-Family Gate** | `Class 1 (ER) ↔ Class 2 (VR) is BLOCKED` | Words like *adhere/career* must **never** group with *worst/thirst/curse*. |
| **Self-Rhyme Guard** | `isSelfRhyme(a, b) === true` cannot form a new rhyme chain | Repeating the word "money" does not constitute an internal rhyme scheme. |
| **Coda Similarity** | Near-rhymes require consonant coda compatibility | Words sharing only a vowel base (*started* / *block*) cannot be falsely grouped. |
| **Zero Mock Metrics** | Never display a metric that isn't computed | All badges (SPS, Bar Count, Rhyme Chains) must connect to real mathematical sources. |

---

## 4. How to Make Changes With Ease (Developer Recipes)

### Recipe A: Adding a New Word to the Perceptual Registry
Open [`src/utils/perceptualFamilies.ts`](file:///c:/Users/bsfka/OneDrive/Documents/V1_Launch_Prosodic/src/utils/perceptualFamilies.ts):
1. Locate `CURATED_LEXICON`.
2. Add your word to the appropriate family array (e.g., add `'phenomenon'` to `AH_FAMILY`).
3. The O(1) reverse lookup map automatically indexes it at load time.

### Recipe B: Adding a New Rhetorical Device
Open [`src/utils/dissector.ts`](file:///c:/Users/bsfka/OneDrive/Documents/V1_Launch_Prosodic/src/utils/dissector.ts):
1. In `LiteraryDeviceMatch['type']`, add your device name (e.g. `'Chiasmus'`).
2. In `dissectLyrics()`, locate **Step 3: Discover Literary Devices**.
3. Implement your detection logic and push matches into the `devices` array.

### Recipe C: Running Tests & Verifying Your Changes
Always run the verification rails before committing:
```bash
# Run unit tests on the dissector engine
npx jest src/utils/dissector.test.ts

# Run the complete test suite + TypeScript check + Linter
npm run verify:fast

# Export production web bundle to ./dist
npx expo export -p web
```

# Implementation Plan: Studio Canvas Cursor Fix, Manual Syllable Interface & 12 Perceptual Family Rhyme Engine

**Target Version:** Prosodic v1.0.0 Launch (Concert Release)  
**Host:** Codex / Antigravity  
**Reviewer:** Claude (Claudex Loop)  
**Repository:** `c:\Users\bsfka\OneDrive\Documents\V1_Launch_Prosodic`  

---

## 1. Goal & Observable Acceptance Criteria

### Goal
Eliminate the text-erasure and cursor desync bug in both Bars On and Bars Off modes, provide an interactive manual syllable placement and stress/family override ribbon, and ensure all 12 perceptual vowel families and acoustic R-family gating rules from the vetted domain architecture operate with 100% fidelity.

### Observable Acceptance Criteria
1. **Cursor & Erasure Stability (Bars On & Bars Off):**
   - The primary writing inputs (`TextInput`) use single-layer native text rendering (`color: '#FFFFFF'`) without transparent text layering or overlapping `<Text>` overlays that lag behind keystrokes.
   - Typing, backspacing, character deletion, and text selection are 100% responsive with zero cursor drift, zero stuck characters, and zero desync.
2. **Interactive Manual Syllable Placement & Override Interface:**
   - Underneath/alongside each bar line (in Bars On mode) and available in the Blank Canvas (in Bars Off mode), render a tactile **Syllable Placement Ribbon**.
   - Each syllable is rendered as a distinct, tap-selectable chip displaying:
     - The exact syllable text slice (derived via `syllable_char_ranges`).
     - Rhyme family color tag (1 of 12 Perceptual Families or 44 Color Mappings).
     - Pocket indicator (dot / underline) if landing on backbeat position 4 or 12.
     - Lexical stress marker (`*` for primary stress, `o` for unstressed).
   - Tapping a syllable chip opens a lightweight contextual popover/sheet to:
     - **Manual Stress Toggle:** Cycle between Primary Stress (`1`), Secondary Stress (`2`), and Unstressed (`0`).
     - **Manual Family / Color Assignment:** Override the detected rhyme family with any of the 12 sonic families or uncolored (`color_id = 0`).
     - **Grid Shift:** Move the syllable's anchor position along the 16-step bar grid (0–15).
3. **12 Perceptual Families & Acoustic R-Family Gating:**
   - The client engine (`src/services/rhymeDetectionEngine.ts`) and backend API integration (`POST /analyze`) enforce the full 12-family specification (`R_FAMILY`, `AY_FAMILY`, `EE_FAMILY`, `OW_FAMILY`, `AH_FAMILY`, `AY2_FAMILY`, `OO_FAMILY`, `AW_FAMILY`, `AE_FAMILY`, `OH_FAMILY`, `IH_FAMILY`, `EH_FAMILY`).
   - Strict R-family classification hard gates (`ER` Class 1 $\ne$ `VR` Class 2 $\ne$ `EH+R` Class 3) eliminate false-positive bridges (e.g. *turnt* $\ne$ *cheers* $\ne$ *rare*).
   - Multi-line requirement (spans $\ge 2$ distinct lines) prevents single-line rainbow noise.
   - Word-level color inheritance propagates earned family colors across all syllables of multisyllabic rhyming words.
4. **Design Invariant:** Zero raw Unicode emojis; all HUDs and icons use SVG line vectors matching Apple Notes and Logic Pro luxury studio aesthetics.

---

## 2. Technical Architecture & Concrete Approach

### Component 1: Decoupled Studio Writing Surface (`src/components/studio/paper/`)
- **Modify `CadenceBarRow.tsx`:**
  - Remove the transparent overlay hack (`styles.textInputRhymeMode` with `color: 'transparent'`).
  - Render the `TextInput` with full native contrast (`#FFFFFF`).
  - When Rhyme Map / Syllable Mode is toggled ON, render the interactive **Syllable Placement Ribbon** directly beneath the measure bar.
  - Pass `onSelectSyllable(syllableToken)` callbacks up to the canvas.
- **Modify `CadencePaperStudio.tsx`:**
  - In Bars Off mode (Blank Canvas), provide a toggle between **Raw Text Mode** (full speed writing) and **Syllable Analysis View** (tokenized verse display with interactive chips).
  - Add state management for manual user overrides: `manualSyllableOverrides: Map<string, { stress?: number; colorId?: number; gridPos?: number }>`.
  - Apply user overrides deterministically before computing final verse rhyme maps and metric scores.

### Component 2: Interactive Syllable Editor Modal / Sheet (`src/components/studio/SyllableInspectorModal.tsx`)
- Create a sleek modal allowing the user to:
  - Inspect the selected syllable's phonetic decomposition (ARPABET phonemes, CMU stress, R-family class).
  - Select from a 12-family color palette to force or clear rhyme family membership.
  - Toggle between Locked, Flexible, and Inverted grid stress.
  - Persist overrides to local SQLite session storage.

### Component 3: Complete 12-Family & R-Family Engine (`src/services/rhymeDetectionEngine.ts`)
- Maintain complete phonetic parity with the Python domain suite in `backend/`:
  - 12 Perceptual Families with anchor registries and boundary exclusions.
  - Upstream `classifyRFamily` (0=None, 1=ER, 2=VR, 3=EH+R).
  - Connected components (Union-Find) with multi-line filtering ($\ge 2$ lines) and word-level color propagation.
  - Compound sequence multi-syllabic matching.

---

## 3. Assumptions, Non-Goals & Risks

### Confirmed Assumptions
- The Python domain suite in `backend/` passes all 49/49 checks in `backend/test_api.py` and serves as the mathematical gold standard.
- The React Native mobile and web platforms require standard single-layer text inputs to guarantee reliable native caret and backspace handling across iOS, Android, and Web browsers.
- Manual overrides must take precedence over automated heuristic or dictionary classifications.

### Non-Goals
- We are not changing the visual dark luxury theme (`#000000`/`#06060A`) or typography.
- We are not altering SQLite database schemas; manual overrides are stored in session state and synced to the existing `line_edits` repository.

### Remaining Risks & Mitigations
- **Risk:** Rapid typing in long verses re-computing syllables on every keypress causing UI lag.
- **Mitigation:** Debounce full-verse rhyme graph re-computations (150ms) while keeping local single-line text input updates 100% synchronous.

---

## 4. Verification Plan

### Automated Proof Commands
1. **TypeScript Type Safety:**
   `npx tsc --noEmit` $\rightarrow$ Expect 0 errors.
2. **Jest Test Suite:**
   `npm test` $\rightarrow$ Expect 38/38 suites passing (all 342+ unit tests).
3. **Backend API Suite:**
   `python backend/test_api.py` $\rightarrow$ Expect 49/49 checks passing.
4. **Web Export Build:**
   `npm run build:web` $\rightarrow$ Expect clean export to `dist/`.

### Manual & Interactive Verification
- Verify that typing and rapidly backspacing/erasing long sentences in both Bars On and Bars Off modes works with instantaneous responsiveness and zero cursor drift.
- Verify that tapping a syllable opens the inspector modal and overrides stress and color immediately.
- Verify that R-family rhymes (*worst*, *curse*, *first*) are highlighted together, while *appear* / *career* form a separate group, and non-rhyming words remain pure white.

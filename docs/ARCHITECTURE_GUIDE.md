# Prosodic Architecture Guide

This is the living, single authoritative architecture document for the Prosodic app, maintaining "Team-Ready" guidelines to ensure modifiability and clear dependency chains across agents and developers.

## 1. Mental Model & Skill Boundaries

Prosodic is a hybrid React Native (Expo) web and iOS app that functions as a high-end **Linguistics Education & Songwriting Studio**. 

- **The Division of Labor (ECC vs Design Skills):** 
  - **ECC (Everything Claude Code)** strictly handles code architecture, testing, and implementation logic. It makes **ZERO** decisions regarding visual UI design.
  - **Design Skills (e.g., `apple-design`, `taste-skill`, `screenshot-to-code`)** are the absolute authority on visual design. 
  - **The Pipeline:** Anything that plans and builds features MUST share its information and intent with the new design skills. The design skills generate the design. **The `apple-design` skill holds final approval** and can send designs back if they fail the Apple HIG audit.
- **The Engine Layer:** A phonetic and linguistics processor runs beneath the text inputs. It parses rhymes, rhythm, and cadence without disrupting the standard typing flow of the songwriter.
- **The Separation of Concerns:** UI rendering must be completely decoupled from data models and phonetic algorithms.

## 2. Design Invariants (Strict)

1. **Design Approval Pipeline:** No UI feature goes to production without passing through the Design Skills and securing final approval from the `apple-design` skill.
2. **Zero Emojis:** Emoticons and raw Unicode emojis are strictly prohibited across the UI and codebase. They degrade the luxury studio aesthetic. All iconography must use cohesive, razor-sharp SVG vector paths (e.g., `lucide-react` or `expo-symbols`).
3. **End-to-End Wiring:** Never build a "dummy button." Any UI component added must be fully functional and connected to engine logic, testable in a single pass.
4. **No Generic Safari/Browser UI:** Do not use `alert()`, default browser popups, or unstyled inputs. Use the established high-end components, modals, and bottom sheets governed by the Design Skills.

## 3. Data Contracts

- **Songs / Projects:** Managed via local persistence (`expo-sqlite` and `@react-native-async-storage/async-storage`). A "Song" object tracks title, cadence data, lyric text, and metadata.
- **Rhyme Engine:** The phonetic processor parses text lines into tokenized data objects containing phonemes and rhyming indices. The engine outputs a read-only metadata array overlaid visually behind the transparent `<TextInput>`.

## 4. Testing & Code Quality (ECC Conformed)

This project strictly adheres to **Everything Claude Code (ECC)** patterns for code structure:
- **Testing:** Core algorithms (like rhyme detection) must have `.test.ts` files ensuring >80% coverage.
- **Commits:** We use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- **Naming:** `camelCase` for utilities, `PascalCase` for React components. 

## 5. Extension Recipes

### Adding a New Column/Feature to the Sidebar
1. Add the data-hook and navigation state to the `AffineSidebar.tsx` file.
2. Send the UI requirements to the Design Skills. `apple-design` must approve the layout.
3. Wire the button directly to the action so it is functionally complete in one PR (End-to-End Rule).

### Adding a New Phonetic Tool (Craft Masters)
1. Do not bloat the UI layer. Create a new utility function in `src/engine/` or `src/utils/` to handle the data parsing.
2. Write unit tests for the utility.
3. Expose the results safely to the rendering layer, allowing the Design Skills to decide how the data visually appears.

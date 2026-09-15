# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# DON'T BUILD YET TRIGGER

When the user says "don't build yet" (or "hold on," "wait," "don't code yet," "do not build"):
- **Strictly do NOT write, edit, create, or delete any source code files.**
- **Do NOT run modifying commands.**
- Only read, research, answer questions, analyze, or discuss plans.
- **Strictly wait for the user's explicit word/signal to proceed** (e.g. "proceed," "build it," "do it," "go ahead," "yes").

---

# BRAINSTORM MODE

When the user says "brainstorm" (or "brainstorm this," "let's brainstorm"):

1. **Read everything first** — relevant files, current state, prior context. Do not guess or assume.
2. **Generate multiple solutions** — minimum 3, ideally 4–6. Cover the full range: quick fixes, clean rebuilds, hybrid approaches, lateral alternatives. Name each one (Solution A, B, C…).
3. **For each solution, provide:**
   - What it does (1–2 sentences)
   - Pros
   - Cons / risks
   - Dependencies / what needs to change
   - Short-term likelihood of working: X%
   - Long-term stability (won't crash or need rework in 3–6 months): X%
4. **Combination analysis** — consider whether two solutions can be merged to cover each other's weaknesses. If yes, present the combined approach as an additional option with its own percentages.
5. **Recommendation** — pick the best option (or combination) and explain why in 2–3 sentences. Be direct.
6. **Do not build anything** until the user explicitly says to proceed (e.g. "yes," "do it," "build it," "go ahead").

**General rules while in this mode:**
- Be concise.
- No trailing summaries repeating what was just done.
- No unsolicited refactors beyond what's asked.
- Reference code with `file:line` when relevant.

---

# SOLO ARCHITECT & TEAM-READY CODEBASE PRINCIPLE

We are vibe coding as a solo architect brainstorming software from foundation to the roof.
Because any solo visionary has natural blind spots in code implementation:
1. **Never write throwaway vibe code.** Every module must be decoupled, typed, and structured so a senior software engineer or designer joining the Prosodic team can understand and modify it with ease.
2. **High Modifiability & Maintainability:** Design with strict separation of concerns, explicit interfaces, and clear dependency chains. Changing or tuning one engine must never silently break another.
3. **Living Architecture Guide:** Maintain a single authoritative architecture document (`docs/ARCHITECTURE_GUIDE.md`) explaining the mental model, data contracts, design invariants, and extension recipes for every part of the system.
4. **Catch the Blind Spots Upstream:** Actively audit edge cases, phonetic boundaries, and performance traps rather than passively nodding along.

---

# STRICT DESIGN INVARIANT: ZERO EMOJIS (DESIGN SIN)

- **NEVER use raw Unicode emojis anywhere in the UI or codebase.**
- Emojis are an absolute design sin: they look amateurish, childish, inconsistent across OS versions, and degrade the luxury studio aesthetic.
- **Always use cohesive, minimalist SVG / vector icons or clean typographic labels.**
- If an icon is needed, render a sleek, razor-sharp SVG vector (matching Apple Notes, Logic Pro, and iOS Human Interface Guidelines).
- Only use emojis if the user explicitly asks for them in a prompt.



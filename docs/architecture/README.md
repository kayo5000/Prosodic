# Architecture

Prosodic's architecture described through Kruchten's 4+1 view model. Each view
answers a question the others cannot, and the reason these exist is that four
of the five bugs found in September 2025 were process-view failures nobody
could see because no process view had ever been drawn.

| View | Question it answers | Where |
|---|---|---|
| **Scenarios (+1)** | What does a person watch happen? | `CLAUDE.md` build order — every step carries a user-observable exit criterion |
| **Logical** | What are the parts and what do they promise? | [components.md](components.md) |
| **Process** | What runs when, and what collides? | [sequence-typing.md](sequence-typing.md) |
| **Development** | How is the code organised? | [components.md](components.md) — layer rules |
| **Physical** | Where does it run? | [deployment.md](deployment.md) |

## How to read these

Start with **components** for the shape, **sequence** for the timing, and
**deployment** for where it lives. The scenarios view is not duplicated here —
it lives in the build order, and duplicating it would let the two drift.

## Why these three and not more

A diagram nobody updates is worse than none, because it is believed. These
three are the ones that would have caught real defects:

- **components** — the engines had no declared interfaces, so removing one
  silently rescaled a score the user was shown.
- **sequence** — a single keystroke fired four timers on overlapping
  intervals, and one of them cancelled another's pending save.
- **deployment** — "record ten seconds on a real device" was unmeetable for
  months because no one had drawn what "a real device" required.

Update them when the thing they describe changes. If one starts lying, delete
it rather than leaving it.

# Process view — one keystroke

The view that did not exist, and the one every September 2025 defect came out
of. Four bugs, all timing, all found one at a time by grep.

## What one character sets in motion

```mermaid
sequenceDiagram
    actor U as Writer
    participant TI as TextInput
    participant H as handleChangeText
    participant MC as Mastery clock
    participant AS as Autosave timer
    participant AN as Analysis timer
    participant DB as SQLite

    U->>TI: types one character
    TI->>H: onChangeText

    H->>MC: registerTyping() — no write, no render
    H->>H: pushHistory (300ms debounce)
    H->>AS: reset (500ms)
    H->>AN: reset (3000ms)

    Note over AS,AN: two clocks, deliberately.<br/>words are precious; analysis is not urgent.

    AS-->>DB: 500ms later — text + line_edits, one transaction
    AN-->>DB: 3000ms later — analysis_calibrated + fingerprint

    loop every 1000ms, independently
        MC->>MC: tick, re-render the countdown
        MC-->>DB: persist only when ≥15s newly earned
    end
```

## The collision this diagram exists to show

`useMasteryClock` re-renders once a second. Its return value used to be a fresh
object on every render, and the AppState effect listed that object as a
dependency.

React runs an effect's cleanup whenever its dependencies change — **not only on
unmount.** So every second:

```
tick → new object → effect torn down → cleanup runs
                                     → clearTimeout(pending autosave)
                                     → no save
```

The autosave delay is 500ms. A keystroke landing in the half-second before a
tick had its save destroyed. Silent — no error, no log.

Usually invisible, because the next keystroke re-armed the timer and both
backgrounding and song-switching save. It bit only when that was the **last**
keystroke and the app was killed rather than backgrounded.

Which is Step 2's exit criterion word for word: *write a verse, kill the app,
reopen it, the verse is there.*

**Fixed three ways:** the screen now depends on the two stable callbacks rather
than the ticking object; the timer handle is nulled when it fires so the guards
mean what they say; and the cleanup **flushes** instead of discarding.

## Why analysis moved to its own clock

Analysis used to run inside the save path on the same 500ms timer. Writing a
verse produced an `analysis_calibrated` event roughly every half-second of
typing pause — hundreds of append-only rows describing one unfinished song, all
queued to sync, with the full engine running on the JS thread while the user
typed.

```
text save   500ms    unchanged — losing words is unacceptable
analysis   3000ms    a three-second pause means a finished thought
```

## Timing constants, and which are arbitrary

| Constant | Value | Basis |
|---|---|---|
| History debounce | 300ms | arbitrary |
| `AUTOSAVE_DELAY_MS` | 500ms | arbitrary, deliberately short |
| `ANALYSIS_DELAY_MS` | 3000ms | arbitrary |
| `TICK_MS` | 1000ms | display refresh |
| `PERSIST_INTERVAL_MS` | 15000ms | bounds worst-case loss to <15s |
| `GRACE_MS` | 30000ms | **superseded** by the balloon model in CLAUDE.md; code still implements the old rule |

Four of six are unjustified numbers. They are listed together so that stays
visible — the same discipline applied to the calibration constants.

## Rule this view produced

**Two things on overlapping intervals, where one can cancel the other, need a
diagram before they need a fix.** Nothing in the code reads wrong at any single
call site; the defect only exists in the relationship between them.

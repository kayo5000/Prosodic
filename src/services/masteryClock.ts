/**
 * The Mastery Countdown — 10,000 hours, counting down.
 *
 * Only active practice moves the clock. From CLAUDE.md: "Counts down while
 * typing; on the last keystroke it keeps counting for 30 seconds, then rolls
 * back and freezes at the last-keystroke checkpoint."
 *
 * Two values, and the difference between them is the whole design:
 *
 *   committedMs   practice that is definitely earned. Only ever advances on a
 *                 keystroke, and only by a gap that stayed inside the grace
 *                 window.
 *   displayed     committedMs plus the time since the last keystroke, while
 *                 still inside grace. Optimistic — it assumes you are about to
 *                 keep typing.
 *
 * Stop typing and the displayed value rolls back to committedMs. Nothing is
 * lost, because the optimistic portion was never committed in the first place.
 *
 * Pure and deterministic: every function takes `nowMs` rather than reading the
 * clock, so the same inputs always produce the same output and the whole thing
 * is testable without faking timers.
 */

/** 10,000 hours in milliseconds. */
export const MASTERY_TOTAL_MS = 10_000 * 60 * 60 * 1000;

/**
 * Silence longer than this stops counting. A gap at or under it is treated as
 * a pause inside a working session; a longer one is treated as having left.
 */
export const GRACE_MS = 30_000;

export interface MasteryClock {
  /** Practice time definitely earned, in ms. */
  committedMs: number;
  /** Epoch ms of the last keystroke, or null if nothing has been typed yet. */
  lastKeystrokeAt: number | null;
}

export function createClock(committedMs = 0): MasteryClock {
  return { committedMs, lastKeystrokeAt: null };
}

/** True while the session is still inside the grace window. */
export function isActive(clock: MasteryClock, nowMs: number): boolean {
  if (clock.lastKeystrokeAt === null) return false;
  return nowMs - clock.lastKeystrokeAt <= GRACE_MS;
}

/**
 * Records a keystroke.
 *
 * The gap since the previous keystroke is what gets committed — not the
 * keystroke itself, which has no duration. A gap longer than the grace window
 * is time the user was gone, so it earns nothing.
 *
 * The first keystroke of a session commits nothing. There is no previous
 * keystroke to measure from, and assuming any duration would be inventing
 * practice that did not happen.
 */
export function registerKeystroke(clock: MasteryClock, nowMs: number): MasteryClock {
  if (clock.lastKeystrokeAt === null) {
    return { committedMs: clock.committedMs, lastKeystrokeAt: nowMs };
  }

  const gap = nowMs - clock.lastKeystrokeAt;

  // Clock skew or a bad timestamp. Never let time run backwards.
  if (gap < 0) return { ...clock, lastKeystrokeAt: nowMs };

  if (gap > GRACE_MS) {
    return { committedMs: clock.committedMs, lastKeystrokeAt: nowMs };
  }

  return { committedMs: clock.committedMs + gap, lastKeystrokeAt: nowMs };
}

/**
 * Practice time to show right now — committed, plus the optimistic tail while
 * still inside grace. Past the grace window this returns the checkpoint, which
 * is the rollback the spec describes.
 */
export function practiceMsAt(clock: MasteryClock, nowMs: number): number {
  if (clock.lastKeystrokeAt === null) return clock.committedMs;
  const gap = nowMs - clock.lastKeystrokeAt;
  if (gap < 0 || gap > GRACE_MS) return clock.committedMs;
  return clock.committedMs + gap;
}

/** Milliseconds left of the 10,000 hours. Never negative. */
export function remainingMsAt(clock: MasteryClock, nowMs: number): number {
  return Math.max(0, MASTERY_TOTAL_MS - practiceMsAt(clock, nowMs));
}

/** True once the countdown has reached zero — the post-zero flip in step 9. */
export function hasReachedZero(clock: MasteryClock, nowMs: number): boolean {
  return remainingMsAt(clock, nowMs) === 0;
}

/**
 * Commits the optimistic tail before the app goes away.
 *
 * Called on backgrounding or unmount: without it, time typed in the final
 * seconds before leaving would roll back purely because no keystroke followed
 * it. Time already inside the grace window was genuinely practised.
 */
export function commitPending(clock: MasteryClock, nowMs: number): MasteryClock {
  return { committedMs: practiceMsAt(clock, nowMs), lastKeystrokeAt: null };
}

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Splits remaining time for display. Hours are not capped at 24. */
export function splitRemaining(remainingMs: number): CountdownParts {
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

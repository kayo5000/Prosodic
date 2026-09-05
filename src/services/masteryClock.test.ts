import {
  commitPending,
  createClock,
  GRACE_MS,
  hasReachedZero,
  isActive,
  MASTERY_TOTAL_MS,
  practiceMsAt,
  registerKeystroke,
  remainingMsAt,
  splitRemaining,
} from './masteryClock';

const T0 = 1_757_000_000_000; // fixed epoch so every test is deterministic

describe('masteryClock — the total', () => {
  test('is 10,000 hours', () => {
    expect(MASTERY_TOTAL_MS).toBe(10_000 * 60 * 60 * 1000);
  });

  test('a fresh clock has the whole thing remaining', () => {
    expect(remainingMsAt(createClock(), T0)).toBe(MASTERY_TOTAL_MS);
  });
});

describe('masteryClock — typing moves the clock', () => {
  test('the first keystroke commits nothing — there is no gap to measure yet', () => {
    const clock = registerKeystroke(createClock(), T0);
    expect(clock.committedMs).toBe(0);
    expect(clock.lastKeystrokeAt).toBe(T0);
  });

  test('a second keystroke commits the gap between them', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 2_000);
    expect(clock.committedMs).toBe(2_000);
  });

  test('continuous typing accumulates', () => {
    let clock = registerKeystroke(createClock(), T0);
    for (let i = 1; i <= 10; i += 1) {
      clock = registerKeystroke(clock, T0 + i * 1_000);
    }
    expect(clock.committedMs).toBe(10_000);
  });
});

describe('masteryClock — the grace window', () => {
  test('a gap exactly at the grace limit still counts', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + GRACE_MS);
    expect(clock.committedMs).toBe(GRACE_MS);
  });

  test('a gap past the grace limit earns nothing — that time was spent away', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + GRACE_MS + 1);
    expect(clock.committedMs).toBe(0);
  });

  test('coming back after a long break resumes without losing what was earned', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 5_000); // 5s earned
    clock = registerKeystroke(clock, T0 + 600_000); // ten minutes away
    clock = registerKeystroke(clock, T0 + 602_000); // 2s more

    expect(clock.committedMs).toBe(7_000); // the ten minutes never counted
  });
});

describe('masteryClock — keeps counting, then rolls back', () => {
  test('the display advances while still inside grace', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 1_000);

    expect(practiceMsAt(clock, T0 + 1_000)).toBe(1_000);
    expect(practiceMsAt(clock, T0 + 11_000)).toBe(11_000); // 10s of optimistic tail
  });

  /** The exit criterion: thirty seconds of silence freezes it at the checkpoint. */
  test('past the grace window it rolls back to the last-keystroke checkpoint', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 1_000); // committed 1s

    const justInside = practiceMsAt(clock, T0 + 1_000 + GRACE_MS);
    const justOutside = practiceMsAt(clock, T0 + 1_000 + GRACE_MS + 1);

    expect(justInside).toBe(1_000 + GRACE_MS);
    expect(justOutside).toBe(1_000); // rolled back
  });

  test('the rollback is not a loss — the optimistic tail was never committed', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 1_000);
    const committedBefore = clock.committedMs;

    practiceMsAt(clock, T0 + 100_000); // long past grace

    expect(clock.committedMs).toBe(committedBefore);
  });

  test('typing again inside grace keeps the tail that was showing', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 1_000);
    // 20s later, still inside grace — resume
    clock = registerKeystroke(clock, T0 + 21_000);
    expect(clock.committedMs).toBe(21_000);
  });
});

describe('masteryClock — isActive', () => {
  test('a clock that has never been typed into is not active', () => {
    expect(isActive(createClock(), T0)).toBe(false);
  });

  test('active inside the window, inactive past it', () => {
    const clock = registerKeystroke(createClock(), T0);
    expect(isActive(clock, T0 + GRACE_MS)).toBe(true);
    expect(isActive(clock, T0 + GRACE_MS + 1)).toBe(false);
  });
});

describe('masteryClock — commitPending', () => {
  test('backgrounding keeps time typed in the final seconds', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 1_000);

    const committed = commitPending(clock, T0 + 6_000); // 5s of tail

    expect(committed.committedMs).toBe(6_000);
    expect(committed.lastKeystrokeAt).toBeNull();
  });

  test('backgrounding past the grace window commits only the checkpoint', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 1_000);

    const committed = commitPending(clock, T0 + 500_000);

    expect(committed.committedMs).toBe(1_000);
  });
});

describe('masteryClock — bad input', () => {
  test('a backwards timestamp never rewinds earned time', () => {
    let clock = registerKeystroke(createClock(), T0);
    clock = registerKeystroke(clock, T0 + 5_000);
    clock = registerKeystroke(clock, T0 + 1_000); // clock skew

    expect(clock.committedMs).toBe(5_000);
  });

  test('a backwards timestamp does not inflate the displayed value', () => {
    const clock = registerKeystroke(createClock(5_000), T0);
    expect(practiceMsAt(clock, T0 - 10_000)).toBe(5_000);
  });
});

describe('masteryClock — reaching zero', () => {
  test('remaining never goes negative', () => {
    const clock = createClock(MASTERY_TOTAL_MS + 500_000);
    expect(remainingMsAt(clock, T0)).toBe(0);
  });

  test('hasReachedZero is false with time left, true at zero', () => {
    expect(hasReachedZero(createClock(0), T0)).toBe(false);
    expect(hasReachedZero(createClock(MASTERY_TOTAL_MS), T0)).toBe(true);
  });
});

describe('masteryClock — display split', () => {
  test('splits a full 10,000 hours', () => {
    expect(splitRemaining(MASTERY_TOTAL_MS)).toEqual({
      hours: 10_000,
      minutes: 0,
      seconds: 0,
    });
  });

  test('hours are not capped at 24', () => {
    expect(splitRemaining(9_999 * 3_600_000).hours).toBe(9_999);
  });

  test('splits an odd remainder', () => {
    const ms = 2 * 3_600_000 + 34 * 60_000 + 17 * 1_000;
    expect(splitRemaining(ms)).toEqual({ hours: 2, minutes: 34, seconds: 17 });
  });
});

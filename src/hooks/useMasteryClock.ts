import { useCallback, useEffect, useRef, useState } from 'react';

import { getDb } from '@/data/db/client';
import { generateId } from '@/data/id';
import { insertEvent } from '@/data/repositories/events';
import { getCommittedMs, setCommittedMs } from '@/data/repositories/mastery';
import {
  commitPending,
  createClock,
  isActive,
  type MasteryClock,
  practiceMsAt,
  registerKeystroke,
  remainingMsAt,
} from '@/services/masteryClock';
import { logError } from '@/utils/logError';

/**
 * Drives the Mastery Countdown from real typing.
 *
 * The clock itself is pure and lives in services/masteryClock. This hook only
 * supplies real time, persists, and re-renders — so the rule about what counts
 * as practice stays testable without React.
 *
 * Persistence is deliberately not per-keystroke. Writing a row on every
 * character would be thousands of writes a session for a number that only has
 * to survive the app closing. Instead the committed total is saved on a slow
 * interval and whenever the session ends.
 */

/** How often the committed total is written while typing continues. */
const PERSIST_INTERVAL_MS = 15_000;

/** How often the displayed countdown re-renders. */
const TICK_MS = 1_000;

export interface UseMasteryClock {
  /** Milliseconds left of the 10,000 hours. */
  remainingMs: number;
  /** True while inside the grace window — the clock is currently moving. */
  isCounting: boolean;
  /** Call on every keystroke. Cheap: no write, no re-render of its own. */
  registerTyping: () => void;
  /** Commits the optimistic tail. Call when the session ends. */
  flush: () => void;
}

export function useMasteryClock(): UseMasteryClock {
  const clockRef = useRef<MasteryClock>(createClock());
  const lastPersistedRef = useRef(0);
  const [remainingMs, setRemainingMs] = useState(() =>
    remainingMsAt(createClock(), Date.now()),
  );
  const [isCounting, setIsCounting] = useState(false);

  // Load whatever was earned in previous sessions.
  useEffect(() => {
    try {
      const committed = getCommittedMs(getDb());
      clockRef.current = createClock(committed);
      lastPersistedRef.current = committed;
      setRemainingMs(remainingMsAt(clockRef.current, Date.now()));
    } catch (error) {
      logError('could not load mastery total', error);
    }
  }, []);

  const persist = useCallback((clock: MasteryClock, nowMs: number) => {
    const committed = practiceMsAt(clock, nowMs);
    if (committed <= lastPersistedRef.current) return; // nothing new was earned
    try {
      const db = getDb();
      const at = new Date(nowMs).toISOString();
      setCommittedMs(db, committed, at);
      insertEvent(db, {
        id: generateId(),
        songId: null,
        type: 'mastery_checkpoint',
        payload: { committedMs: Math.round(committed), source: 'keystroke' },
        occurredAt: at,
        createdAt: at,
        syncedAt: null,
      });
      lastPersistedRef.current = committed;
    } catch (error) {
      logError('could not save mastery total', error);
    }
  }, []);

  const registerTyping = useCallback(() => {
    clockRef.current = registerKeystroke(clockRef.current, Date.now());
  }, []);

  const flush = useCallback(() => {
    const now = Date.now();
    const committed = commitPending(clockRef.current, now);
    persist(clockRef.current, now);
    clockRef.current = committed;
    setRemainingMs(remainingMsAt(committed, now));
    setIsCounting(false);
  }, [persist]);

  // One interval drives both the display and the periodic save. Reading the
  // clock from a ref means typing itself never triggers a render — only this
  // tick does, once a second, regardless of how fast someone types.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const clock = clockRef.current;
      setRemainingMs(remainingMsAt(clock, now));
      setIsCounting(isActive(clock, now));

      if (practiceMsAt(clock, now) - lastPersistedRef.current >= PERSIST_INTERVAL_MS) {
        persist(clock, now);
      }
    }, TICK_MS);

    return () => {
      clearInterval(id);
      // Unmounting is a session ending: keep the tail rather than rolling it
      // back purely because no keystroke followed it.
      const now = Date.now();
      persist(clockRef.current, now);
      clockRef.current = commitPending(clockRef.current, now);
    };
  }, [persist]);

  return { remainingMs, isCounting, registerTyping, flush };
}

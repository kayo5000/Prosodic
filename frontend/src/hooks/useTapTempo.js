import { useRef, useCallback } from 'react';

const MAX_TAPS = 8;
const TIMEOUT_MS = 3000; // reset if no tap for 3 seconds

export default function useTapTempo(onBpm) {
  const taps = useRef([]);
  const timer = useRef(null);

  const tap = useCallback(() => {
    const now = Date.now();

    // Clear reset timer
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { taps.current = []; }, TIMEOUT_MS);

    taps.current.push(now);
    if (taps.current.length > MAX_TAPS) taps.current.shift();
    if (taps.current.length < 2) return;

    // Average interval between taps → BPM
    const intervals = [];
    for (let i = 1; i < taps.current.length; i++) {
      intervals.push(taps.current[i] - taps.current[i - 1]);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avg);
    const clamped = Math.max(40, Math.min(240, bpm));
    onBpm(clamped);
  }, [onBpm]);

  const reset = useCallback(() => {
    taps.current = [];
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { tap, reset };
}

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [target, setTarget]     = useState(5 * 60); // seconds, default 5 min
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning]   = useState(false);
  const [expired, setExpired]   = useState(false);
  const intervalRef = useRef(null);

  // Tick
  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setExpired(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const start  = useCallback(() => { setExpired(false); setRunning(true); }, []);
  const pause  = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => {
    setExpired(false);
    setRunning(r => !r);
  }, []);
  const reset  = useCallback(() => {
    setRunning(false);
    setExpired(false);
    setRemaining(target);
  }, [target]);

  const setDuration = useCallback((secs) => {
    setRunning(false);
    setExpired(false);
    setTarget(secs);
    setRemaining(secs);
  }, []);

  return (
    <TimerContext.Provider value={{ target, remaining, running, expired, start, pause, toggle, reset, setDuration }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}

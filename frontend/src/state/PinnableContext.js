import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// ─── Pins storage ─────────────────────────────────────────────────────────────
const PINS_KEY = 'prosodic_pins_v2';
export const MAX_PINS = 4;

function loadPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY)) || []; } catch { return []; }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const PinnableContext = createContext({
  // pinnable item registration (for optional use)
  register: () => {},
  unregister: () => {},
  // pins state
  pins: [],
  addPin: () => {},
  removePin: () => {},
  isPinned: () => false,
});

export function PinnableProvider({ children }) {
  const [regState, setRegState] = useState({ key: '', items: [] });
  const [pins, setPins]         = useState(loadPins);

  // Persist pins
  useEffect(() => {
    try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch {}
  }, [pins]);

  const register = useCallback((key, items) => {
    setRegState({ key, items });
  }, []);

  // Only clear if this page is still the registered owner
  const unregister = useCallback((key) => {
    setRegState(prev => prev.key === key ? { key: '', items: [] } : prev);
  }, []);

  const addPin = useCallback((item) => {
    setPins(prev => {
      if (prev.length >= MAX_PINS) return prev;
      if (prev.find(p => p.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removePin = useCallback((id) => {
    setPins(prev => prev.filter(p => p.id !== id));
  }, []);

  const isPinned = useCallback((id) => {
    return pins.some(p => p.id === id);
  }, [pins]);

  return (
    <PinnableContext.Provider value={{ register, unregister, pins, addPin, removePin, isPinned }}>
      {children}
    </PinnableContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePins() {
  const { pins, addPin, removePin, isPinned } = useContext(PinnableContext);
  return { pins, addPin, removePin, isPinned };
}

/**
 * Call inside a page to register its pinnable items (still used by SideNav
 * for the collapsed-rail icons — optional).
 */
export function useRegisterPinnableItems(items) {
  const { register, unregister } = useContext(PinnableContext);
  const keyRef = useRef(Math.random().toString(36));

  useEffect(() => {
    const key = keyRef.current;
    register(key, items);
    return () => unregister(key);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

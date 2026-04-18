import { useState, useCallback, useEffect } from 'react';

function key(sectionId) { return `stress_${sectionId}`; }

function load(sectionId) {
  try {
    const raw = localStorage.getItem(key(sectionId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persist(sectionId, marks) {
  try { localStorage.setItem(key(sectionId), JSON.stringify(marks)); } catch {}
}

/**
 * Stores manual stress marks per section.
 * marks: { "${li}_${wi}": 'yellow' | 'blue' }
 */
export default function useStressMarks(sectionId) {
  const [marks, setMarks] = useState(() => load(sectionId));

  useEffect(() => { setMarks(load(sectionId)); }, [sectionId]);

  const update = useCallback((updater) => {
    setMarks(prev => {
      const next = updater(prev);
      persist(sectionId, next);
      return next;
    });
  }, [sectionId]);

  const setMark = useCallback((li, wi, color) => {
    update(prev => ({ ...prev, [`${li}_${wi}`]: color }));
  }, [update]);

  const clearMark = useCallback((li, wi) => {
    update(prev => {
      const next = { ...prev };
      delete next[`${li}_${wi}`];
      return next;
    });
  }, [update]);

  const clearAll = useCallback(() => {
    setMarks({});
    try { localStorage.removeItem(key(sectionId)); } catch {}
  }, [sectionId]);

  return { marks, setMark, clearMark, clearAll };
}

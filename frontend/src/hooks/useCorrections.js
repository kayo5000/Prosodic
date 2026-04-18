import { useState, useCallback, useEffect } from 'react';
import { recordCorrections } from '../api/prosodicApi';

function key(sectionId) { return `corrections_${sectionId}`; }

function load(sectionId) {
  try {
    const raw = localStorage.getItem(key(sectionId));
    return raw ? JSON.parse(raw) : { removes: [], adds: [] };
  } catch { return { removes: [], adds: [] }; }
}

function persist(sectionId, c) {
  try { localStorage.setItem(key(sectionId), JSON.stringify(c)); } catch {}
}

// Two entries target the same slot if they share (li, wi) AND the same char_start
// (both null/undefined counts as "whole word" and matches each other).
function sameSlot(a, b) {
  const aCs = a.char_start ?? null;
  const bCs = b.char_start ?? null;
  return a.li === b.li && a.wi === b.wi && aCs === bCs;
}

/**
 * Stores manual rhyme color corrections per section.
 * Corrections are applied on top of engine output — the engine is never mutated.
 *
 * removes: [{li, wi, char_start?}]              — strip color from whole word (no char_start)
 *                                                  or from a specific syllable (char_start set)
 * adds:    [{li, wi, char_start?, char_end?, color_id}] — force a color on whole word or syllable
 *
 * Add and remove are mutually exclusive for the same slot; setting one clears the other.
 */
export default function useCorrections(sectionId) {
  const [corrections, setCorrections] = useState(() => load(sectionId));

  useEffect(() => {
    setCorrections(load(sectionId));
  }, [sectionId]);

  const update = useCallback((updater) => {
    setCorrections(prev => {
      const next = updater(prev);
      persist(sectionId, next);
      return next;
    });
  }, [sectionId]);

  /**
   * Remove the color from a slot.
   * char_start = null/undefined → whole word
   * char_start = number         → specific syllable only
   */
  const removeColor = useCallback((li, wi, word = '', color_id = 0, char_start = null) => {
    const entry = char_start != null ? { li, wi, char_start } : { li, wi };
    update(prev => ({
      removes: [...prev.removes.filter(r => !sameSlot(r, entry)), entry],
      adds: prev.adds.filter(a => !sameSlot(a, entry)),
    }));
    if (word) recordCorrections([{ word, correction_type: 'remove', color_id }]);
  }, [update]);

  /**
   * Add / move a slot to a color family.
   * char_start + char_end = specific syllable; omit both for whole word.
   */
  const addColor = useCallback((li, wi, color_id, word = '', char_start = null, char_end = null) => {
    const entry = char_start != null
      ? { li, wi, char_start, char_end, color_id }
      : { li, wi, color_id };
    update(prev => ({
      adds: [...prev.adds.filter(a => !sameSlot(a, entry)), entry],
      removes: prev.removes.filter(r => !sameSlot(r, entry)),
    }));
    if (word) recordCorrections([{ word, correction_type: 'add', color_id }]);
  }, [update]);

  // Restore engine default for a slot (remove any correction)
  const clearWord = useCallback((li, wi, char_start = null) => {
    const entry = { li, wi, char_start };
    update(prev => ({
      removes: prev.removes.filter(r => !sameSlot(r, entry)),
      adds: prev.adds.filter(a => !sameSlot(a, entry)),
    }));
  }, [update]);

  const clear = useCallback(() => {
    const empty = { removes: [], adds: [] };
    setCorrections(empty);
    try { localStorage.removeItem(key(sectionId)); } catch {}
  }, [sectionId]);

  return { corrections, removeColor, addColor, clearWord, clear };
}

/**
 * Apply stored corrections to a colorMap produced by buildColorMap.
 * Returns a new colorMap — the original is not mutated.
 *
 * Whole-word removes:    delete colorMap[li][wi] entirely
 * Syllable removes:      remove the specific {char_start} entry from the array
 * Whole-word adds:       replace colorMap[li][wi] with a single full-word span
 * Syllable adds:         replace or insert just the matching char_start entry
 */
export function applyCorrections(colorMap, corrections) {
  if (!corrections ||
      (!corrections.removes.length && !corrections.adds.length)) return colorMap;

  const result = { ...colorMap };

  for (const { li, wi, char_start } of corrections.removes) {
    if (!result[li]?.[wi]) continue;
    result[li] = { ...result[li] };
    if (char_start != null) {
      const filtered = result[li][wi].filter(e => e.char_start !== char_start);
      if (filtered.length === 0) delete result[li][wi];
      else result[li][wi] = filtered;
    } else {
      delete result[li][wi];
    }
  }

  for (const { li, wi, char_start, char_end, color_id } of corrections.adds) {
    // color_id === 0 means "explicitly no color" — treat as a remove
    if (color_id === 0) {
      if (!result[li]?.[wi]) continue;
      result[li] = { ...result[li] };
      if (char_start != null) {
        const filtered = result[li][wi].filter(e => e.char_start !== char_start);
        if (filtered.length === 0) delete result[li][wi];
        else result[li][wi] = filtered;
      } else {
        delete result[li][wi];
      }
      continue;
    }
    if (!result[li]) result[li] = {};
    else result[li] = { ...result[li] };
    if (char_start != null) {
      const existing = (result[li][wi] || []).filter(e => e.char_start !== char_start);
      result[li][wi] = [...existing, { char_start, char_end: char_end ?? char_start + 999, color_id }]
        .sort((a, b) => a.char_start - b.char_start);
    } else {
      result[li][wi] = [{ char_start: 0, char_end: 999, color_id }];
    }
  }

  return result;
}

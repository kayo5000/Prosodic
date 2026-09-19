import { useEffect, useRef, useCallback } from 'react';
import { getDb } from '../data/db/client';
import { insertSongContext, updateSongBodyText, getSongContext, updateSongTitle } from '../data/repositories/songContext';
import { generateId } from '../data/id';
import { SongContext } from '../data/types';

export function useSongPersistence(
  songId: string | undefined, 
  sections: any[] = [], 
  title: string = '', 
  bpm: number = 120
) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deriveText = (secs: any[]) => secs.map(s => s.text || '').join('\n');

  const saveToDatabase = useCallback((id: string | undefined, text: string, newTitle?: string) => {
    if (!id) return;
    try {
      const db = getDb();
      const now = new Date().toISOString();
      updateSongBodyText(db, id, text, now);
      if (newTitle) updateSongTitle(db, id, newTitle, now);
    } catch (e) {
      console.error('Failed to save to db', e);
    }
  }, []);

  const forceSave = useCallback((overrideSections?: any[], overrideTitle?: string) => {
    try {
      const db = getDb();
      const currentText = overrideSections ? deriveText(overrideSections) : deriveText(sections);
      const finalTitle = overrideTitle || title;
      const now = new Date().toISOString();
      
      if (!songId) {
        return;
      }
      
      const existing = getSongContext(db, songId);
      if (!existing) {
        const newSong: SongContext = {
          id: songId,
          title: finalTitle || 'New Song',
          inputMode: 'text',
          bpm: bpm,
          bpmSource: null,
          structure: [],
          bodyText: currentText,
          isPinned: false,
          createdAt: now,
          updatedAt: now
        };
        insertSongContext(db, newSong);
      } else {
        updateSongBodyText(db, songId, currentText, now);
        if (finalTitle) updateSongTitle(db, songId, finalTitle, now);
      }
    } catch (e) {
      console.error('Failed to save song state to SQLite:', e);
    }
  }, [songId, sections, title, bpm]);

  const debouncedSave = useCallback((newSections: any[], newTitle?: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    const bodyText = deriveText(newSections);

    debounceTimer.current = setTimeout(() => {
      saveToDatabase(songId, bodyText, newTitle);
    }, 1500); 
  }, [songId, saveToDatabase]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    debouncedSave,
    forceSave
  };
}

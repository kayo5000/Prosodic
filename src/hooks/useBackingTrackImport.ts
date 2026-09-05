import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';

/**
 * The one place `expo-document-picker` is touched directly, matching the
 * pattern in useVoiceRecorder — the native surface stays in a single file so
 * a future swap is one edit rather than a search.
 */

export interface ImportedTrack {
  uri: string;
  name: string;
  sizeBytes: number | null;
  mimeType: string | null;
}

export interface UseBackingTrackImport {
  isImporting: boolean;
  /** Returns the chosen track, or null if the user cancelled. */
  pickTrack: () => Promise<ImportedTrack | null>;
}

export function useBackingTrackImport(): UseBackingTrackImport {
  const [isImporting, setIsImporting] = useState(false);

  const pickTrack = useCallback(async (): Promise<ImportedTrack | null> => {
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        // Copies into the app's cache so the URI stays readable after the
        // picker closes. Without this, a content:// URI on Android can be
        // revoked the moment the picker is dismissed.
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset) return null;

      return {
        uri: asset.uri,
        name: asset.name,
        sizeBytes: asset.size ?? null,
        mimeType: asset.mimeType ?? null,
      };
    } finally {
      setIsImporting(false);
    }
  }, []);

  return { isImporting, pickTrack };
}

import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppIntroModal } from '@/components/intro/AppIntroModal';
import { CadencePaperStudio } from '@/components/studio/paper';
import { ThemedView } from '@/components/themed-view';

const DEFAULT_TITLE = 'Untitled Draft';

export default function DissectScreen() {
  const [showIntro, setShowIntro] = useState<boolean>(Platform.OS === 'web');
  const [isLoaded, setIsLoaded] = useState(false);
  const [savedLyrics, setSavedLyrics] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem('@prosodic_draft_lyrics');
        if (stored) {
          setSavedLyrics(stored);
        }
      } catch (e) {
        console.error('Failed to load local draft', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  const handleDismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleSaveText = useCallback((text: string) => {
    AsyncStorage.setItem('@prosodic_draft_lyrics', text).catch(() => {});
  }, []);

  if (!isLoaded) return null;

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000000' }]}>
      {showIntro && <AppIntroModal onDismiss={handleDismissIntro} />}
      {!showIntro && (
        <CadencePaperStudio
          initialTitle={DEFAULT_TITLE}
          initialLyrics={savedLyrics}
          initialBpm={77}
          onClose={() => setShowIntro(true)}
          onLyricsChange={handleSaveText}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

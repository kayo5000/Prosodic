import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CadencePaperStudio } from '@/components/studio/paper';
import { ThemedView } from '@/components/themed-view';
import { AiLoader } from '@/components/ui/ai-loader';

import { getDb } from '@/data/db/client';
import { getSongContext, getMostRecentSongContext } from '@/data/repositories/songContext';

export default function StudioScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const [songId, setSongId] = useState<string | undefined>(undefined);
  const [initialTitle, setInitialTitle] = useState('New Song');
  const [initialLyrics, setInitialLyrics] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const db = getDb();
        let targetSong = null;

        if (id) {
          targetSong = getSongContext(db, id);
        } else {
          targetSong = getMostRecentSongContext(db);
        }

        if (targetSong) {
          setSongId(targetSong.id);
          setInitialTitle(targetSong.title || 'New Song');
          setInitialLyrics(targetSong.bodyText || '');
        }
      } catch (e) {
        console.error('Failed to load local draft', e);
      } finally {
        setIsLoaded(true);
        // Hide splash quickly in dev
        setTimeout(() => setShowSplash(false), 500);
      }
    }
    loadData();
  }, [id]);

  if (!isLoaded || showSplash) return <AiLoader text="PROSODIC" />;

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F2F2F7' }]}>
      <CadencePaperStudio
        key={songId || 'new'}
        songId={songId}
        initialTitle={initialTitle}
        initialLyrics={initialLyrics}
        initialBpm={120}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

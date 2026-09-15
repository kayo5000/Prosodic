import { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { AppIntroModal } from '@/components/intro/AppIntroModal';
import { CadencePaperStudio } from '@/components/studio/paper';
import { ThemedView } from '@/components/themed-view';

export default function DissectScreen() {
  // Web entrance motion experience (triggers seamlessly when opening the link)
  const [showIntro, setShowIntro] = useState<boolean>(Platform.OS === 'web');

  const handleDismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000000' }]}>
      {showIntro && <AppIntroModal onDismiss={handleDismissIntro} />}
      {!showIntro && (
        <CadencePaperStudio
          initialTitle="New Song"
          initialLyrics=""
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

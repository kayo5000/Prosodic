import { StyleSheet } from 'react-native';

import { CadencePaperStudio } from '@/components/studio/paper';
import { ThemedView } from '@/components/themed-view';
import { VAULT_VERSES } from '@/data/vault';

export default function JColeScreen() {
  const jColeVerse = VAULT_VERSES[0];

  return (
    <ThemedView style={styles.container}>
      <CadencePaperStudio
        initialTitle={jColeVerse.title}
        initialLyrics={jColeVerse.lyrics}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

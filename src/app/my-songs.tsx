import { StyleSheet, View, FlatList, Pressable, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getDb } from '../data/db/client';
import { listSongContexts } from '../data/repositories/songContext';
import { SongContext } from '../data/types';
import { useRouter } from 'expo-router';

export default function MySongsScreen() {
  const router = useRouter();
  const [songs, setSongs] = useState<SongContext[]>([]);

  useEffect(() => {
    try {
      const db = getDb();
      setSongs(listSongContexts(db, 50, 0));
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Vault</Text>
          <Text style={styles.subtitle}>Your phonetic drafts & arrangements</Text>
        </View>

        <FlatList
          data={songs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Text style={{ fontSize: 28 }}>??</Text>
              </View>
              <Text style={styles.emptyText}>No drafts yet</Text>
              <Text style={styles.emptySubtext}>Your cadence matrices will appear here.</Text>
            </View>
          }
          renderItem={({item}) => (
            <Pressable 
              style={({pressed}) => [
                styles.songItem,
                pressed && styles.songItemPressed
              ]}
              onPress={() => router.push(\/?id=\\ as any)}
            >
              <View style={styles.songContent}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title || 'Untitled Draft'}</Text>
                <Text style={styles.songDate}>{new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              </View>
              <View style={styles.chevron}>
                <Text style={{ color: 'rgba(235,235,245,0.3)' }}>�</Text>
              </View>
            </Pressable>
          )}
        />

        <View style={styles.footer}>
          <Pressable 
            style={({pressed}) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed
            ]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.ctaText}>Create New Draft</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#F2F2F7',
    letterSpacing: -1.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.6)',
    letterSpacing: -0.2,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    marginBottom: 12,
    minHeight: 64, // Apple HIG target
  },
  songItemPressed: {
    backgroundColor: '#2C2C2E',
  },
  songContent: {
    flex: 1,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F2F2F7',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  songDate: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.5)',
  },
  chevron: {
    paddingLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F2F2F7',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.5)',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 32,
  },
  ctaButton: {
    backgroundColor: '#CC8800',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.3,
  },
});

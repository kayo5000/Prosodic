import { StyleSheet, View, FlatList, Pressable, Text } from 'react-native';
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
      <View style={styles.background} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.hugeTitle}>VAULT</Text>
        </View>

        <FlatList
          data={songs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>NO SAVED TRACKS FOUND.</Text>
          }
          renderItem={({item}) => (
            <Pressable 
              style={({pressed}) => [
                styles.songItem,
                pressed && styles.songItemPressed
              ]}
              onPress={() => router.push(`/?id=${item.id}` as any)}
            >
              <Text style={styles.songTitle} numberOfLines={1}>{item.title ? item.title.toUpperCase() : 'UNTITLED'}</Text>
              <Text style={styles.songDate}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
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
            <Text style={styles.ctaText}>+ NEW SONG</Text>
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
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0A0A', 
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  hugeTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 60,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  songItem: {
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#222222',
    minHeight: 64, // Apple HIG minimum 44pt
    justifyContent: 'center',
  },
  songItemPressed: {
    opacity: 0.5,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  songDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    letterSpacing: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666666',
    marginTop: 40,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#FF2A00', // Stark red
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64, // Apple HIG minimum 44pt
  },
  ctaButtonPressed: {
    backgroundColor: '#CC2200',
  },
  ctaText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

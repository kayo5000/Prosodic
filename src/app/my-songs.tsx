import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Pressable, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, ChevronRight, Inbox } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { getDb } from '../data/db/client';
import { listSongContexts } from '../data/repositories/songContext';
import { SongContext } from '../data/types';
import { LiquidGlassCard } from '../components/ui/LiquidGlassCard';

export default function MySongsScreen() {
  const router = useRouter();
  const [songs, setSongs] = useState<SongContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const db = getDb();
      setSongs(listSongContexts(db, 50, 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Vault</Text>
            <Text style={styles.subtitle}>Your phonetic drafts & arrangements</Text>
          </View>
          <Pressable 
            style={({ pressed }) => [styles.newButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/?id=' as any)} // Route to blank Studio
          >
            <Plus size={20} color="#000000" strokeWidth={3} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color="#CC8800" />
          </View>
        ) : (
          <FlatList
            data={songs}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Animated.View entering={FadeInUp.delay(200)} style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Inbox size={32} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>No drafts yet</Text>
                <Text style={styles.emptySubtext}>Your cadence matrices will appear here.</Text>
                
                <Pressable 
                  style={styles.emptyAction}
                  onPress={() => router.push('/?id=' as any)}
                >
                  <Text style={styles.emptyActionText}>Start a New Draft</Text>
                </Pressable>
              </Animated.View>
            }
            renderItem={({item, index}) => (
              <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
                <Pressable onPress={() => router.push(`/?id=${item.id}` as any)}>
                  <LiquidGlassCard blurIntensity="md" shadowIntensity="sm" borderRadius={20} style={styles.cardContainer}>
                    <View style={styles.cardContent}>
                      <View style={styles.cardText}>
                        <Text style={styles.songTitle} numberOfLines={1}>
                          {item.title || 'Untitled Draft'}
                        </Text>
                        <Text style={styles.songDate}>
                          {new Date(item.updatedAt).toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', year: 'numeric' 
                          })}
                        </Text>
                      </View>
                      <View style={styles.cardIcon}>
                        <ChevronRight size={20} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                      </View>
                    </View>
                  </LiquidGlassCard>
                </Pressable>
              </Animated.View>
            )}
          />
        )}
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
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F2F2F7',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  newButton: {
    backgroundColor: '#CC8800', // Impeccable Amber
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100, // Space for the floating bottom pill
  },
  cardContainer: {
    marginBottom: 16,
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    paddingRight: 16,
  },
  songTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#F2F2F7',
    marginBottom: 6,
  },
  songDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    padding: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F2F2F7',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyAction: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#CC8800',
    borderRadius: 100,
  },
  emptyActionText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
});

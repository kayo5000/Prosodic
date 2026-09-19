import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SongContext } from '../../../data/types';
import { listPinnedSongContexts, listSongContexts } from '../../../data/repositories/songContext';
import { getDb } from '../../../data/db/client';

export interface AffineSidebarProps {
  panX?: Animated.AnimatedInterpolation<number>;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onMySongsPress: () => void;
  onNewSongPress?: () => void;
}

// Simple vector icons using basic SVG elements to fit the aesthetic
const SvgVault = ({ color = '#A1A1AA', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
);

const SvgDrafts = ({ color = '#A1A1AA', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const SvgSettings = ({ color = '#A1A1AA', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const SvgItem = ({ color = '#A1A1AA', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
  </svg>
);

const DrawerItem = ({ title, onPress, icon: Icon, isActive = false }: any) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.drawerItem,
      isActive && styles.drawerItemActive,
      pressed && styles.pressed
    ]}
  >
    {Icon && <View style={styles.iconContainer}><Icon color={isActive ? '#FFFFFF' : '#A1A1AA'} /></View>}
    <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>{title}</Text>
  </Pressable>
);

const SongItem = ({ song, onPress }: { song: SongContext, onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.songItem,
      pressed && styles.pressed
    ]}
  >
    <View style={styles.iconContainer}>
      <SvgItem color="#666666" size={12} />
    </View>
    <Text style={styles.songItemText} numberOfLines={1}>
      {song.title || 'Untitled Song'}
    </Text>
  </Pressable>
);

export function AffineSidebar({
  panX,
  isOpen,
  onClose,
  onOpenSettings,
  onMySongsPress,
  onNewSongPress,
}: AffineSidebarProps) {
  const router = useRouter();
  
  const [pinnedSongs, setPinnedSongs] = useState<SongContext[]>([]);
  const [recentSongs, setRecentSongs] = useState<SongContext[]>([]);

  // Fallback animation if panX is not provided
  const fallbackAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (!panX) {
      Animated.timing(fallbackAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, panX]);

  useEffect(() => {
    if (isOpen) {
      try {
        const db = getDb();
        setPinnedSongs(listPinnedSongContexts(db));
        setRecentSongs(listSongContexts(db, 5, 0));
      } catch (e) {
        console.error('Failed to load songs for sidebar:', e);
      }
    }
  }, [isOpen]);

  const translateX = panX || fallbackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 0]
  });

  const navigateToSong = (id: string) => {
    onClose();
    router.push(`/?id=${id}` as any);
  };

  const content = (
    <Animated.View style={[styles.drawerContainer, { transform: [{ translateX }] }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left']}>
        {/* Header matches Claude's top title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prosodic</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* GENERIC NAV */}
          <View style={styles.section}>
            <DrawerItem title="Vault" icon={SvgVault} onPress={onMySongsPress} />
            <DrawerItem title="Drafts" icon={SvgDrafts} />
            <DrawerItem title="Settings" icon={SvgSettings} onPress={onOpenSettings} />
          </View>

          {/* PINNED SECTION */}
          {pinnedSongs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pinned</Text>
              <View style={styles.listContainer}>
                {pinnedSongs.map(song => (
                  <SongItem key={song.id} song={song} onPress={() => navigateToSong(song.id)} />
                ))}
              </View>
            </View>
          )}

          {/* RECENTS SECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recents</Text>
            <View style={styles.listContainer}>
              {recentSongs.length > 0 ? (
                recentSongs.map(song => (
                  <SongItem key={song.id} song={song} onPress={() => navigateToSong(song.id)} />
                ))
              ) : (
                <Text style={styles.emptyText}>No recent songs</Text>
              )}
            </View>
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* BOTTOM FLOATING CTA */}
        <View style={styles.bottomArea}>
          <Pressable style={styles.newSongPill} onPress={() => { onClose(); if(onNewSongPress) onNewSongPress(); else router.push('/'); }}>
            <Text style={styles.newSongPillText}>+ New song</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Animated.View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Pressable 
        style={[styles.backdropPressable, { opacity: isOpen ? 1 : 0 }]} 
        onPress={onClose} 
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  drawerContainer: {
    width: 300,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#121212', // Pure dark mode
    borderRightWidth: 1,
    borderColor: '#222222', 
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 24,
  },
  headerTitle: {
    color: '#E4E4E7',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Match Claude's serif-ish logo maybe, or keep system
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  listContainer: {
    gap: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 44, // 44pt touch target minimum
  },
  drawerItemActive: {
    backgroundColor: '#27272A',
  },
  drawerItemText: {
    color: '#E4E4E7',
    fontSize: 16,
    fontWeight: '400',
  },
  drawerItemTextActive: {
    fontWeight: '500',
    color: '#FFFFFF',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  songItemText: {
    color: '#A1A1AA',
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#52525B',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: {
    backgroundColor: '#27272A',
  },
  bottomArea: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#222222',
    backgroundColor: '#121212',
  },
  newSongPill: {
    backgroundColor: '#E4E4E7', // Claude's light button
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  newSongPillText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

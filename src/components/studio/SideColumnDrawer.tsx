/**
 * SideColumnDrawer.tsx
 *
 * Smart Slide Menu (3D Inset Drawer) for Prosodic Studio.
 * Recreated with smooth spring transitions, glassmorphism cards,
 * artist profile, project switcher, and craft challenge shortcuts.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { Spacing } from '@/constants/theme';
import type { SongContext } from '@/data/types';
import { useTranslation } from '@/hooks/useTranslation';

interface SideColumnDrawerProps {
  visible: boolean;
  onClose: () => void;
  songs: SongContext[];
  activeSongId: string;
  onSelectSong: (songId: string) => void;
  onCreateNewSong: () => void;
  onDeleteSong: (songId: string) => void;
  onRenameSong: (songId: string, newTitle: string) => void;
}

export function SideColumnDrawer({
  visible,
  onClose,
  songs,
  activeSongId,
  onSelectSong,
  onCreateNewSong,
  onDeleteSong,
  onRenameSong,
}: SideColumnDrawerProps) {
  const { mode, setMode } = useTranslation();
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const handleStartRename = useCallback((song: SongContext) => {
    setEditingSongId(song.id);
    setEditTitleText(song.title);
  }, []);

  const handleSaveRename = useCallback(
    (songId: string) => {
      if (editTitleText.trim()) {
        onRenameSong(songId, editTitleText.trim());
      }
      setEditingSongId(null);
    },
    [editTitleText, onRenameSong],
  );

  const confirmDelete = useCallback(
    (song: SongContext) => {
      if (songs.length <= 1) {
        Alert.alert('Cannot Delete', 'You must have at least one active track.');
        return;
      }
      Alert.alert('Delete Track', `Are you sure you want to delete "${song.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteSong(song.id),
        },
      ]);
    },
    [songs.length, onDeleteSong],
  );

  const animValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 260,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible, animValue]);

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const drawerTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        {/* Transparent touch area to close menu when tapping outside */}
        <Pressable style={styles.outsideTapArea} onPress={onClose} />

        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerTranslateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
          {/* User Profile Header */}
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AR</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.artistName}>Alex Rivera</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO WRITER</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Close Navigation">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Global Language Dialect Switcher */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LANGUAGE DIALECT</Text>
              <View style={styles.dialectRow}>
                <Pressable
                  onPress={() => setMode('simple')}
                  style={[styles.dialectBtn, mode === 'simple' && styles.dialectBtnActive]}
                >
                  <Text style={[styles.dialectBtnText, mode === 'simple' && styles.dialectBtnTextActive]}>
                    Simple
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('hybrid')}
                  style={[styles.dialectBtn, mode === 'hybrid' && styles.dialectBtnActive]}
                >
                  <Text style={[styles.dialectBtnText, mode === 'hybrid' && styles.dialectBtnTextActive]}>
                    Dual
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('deep_craft')}
                  style={[styles.dialectBtn, mode === 'deep_craft' && styles.dialectBtnActive]}
                >
                  <Text style={[styles.dialectBtnText, mode === 'deep_craft' && styles.dialectBtnTextActive]}>
                    Craft
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Section 1: Projects & Drafts */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PROJECTS & DRAFTS</Text>
                <Pressable
                  onPress={() => {
                    onCreateNewSong();
                    onClose();
                  }}
                  style={({ pressed }) => [styles.newTrackBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.newTrackText}>+ New</Text>
                </Pressable>
              </View>

              <View style={styles.songList}>
                {songs.map((song) => {
                  const isActive = song.id === activeSongId;
                  const isEditing = editingSongId === song.id;
                  const barCount = song.bodyText ? song.bodyText.split('\n').length : 0;

                  return (
                    <View
                      key={song.id}
                      style={[styles.songCard, isActive ? styles.activeSongCard : styles.inactiveSongCard]}
                    >
                      {isEditing ? (
                        <View style={styles.renameRow}>
                          <TextInput
                            value={editTitleText}
                            onChangeText={setEditTitleText}
                            autoFocus
                            style={styles.renameInput}
                            placeholder="Track Title"
                            placeholderTextColor="#64748B"
                          />
                          <Pressable
                            onPress={() => handleSaveRename(song.id)}
                            style={styles.renameSaveBtn}
                          >
                            <Text style={styles.renameSaveText}>Save</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.songCardPressable}
                          onPress={() => {
                            onSelectSong(song.id);
                            onClose();
                          }}
                        >
                          <View style={styles.songInfo}>
                            <Text style={[styles.songTitle, isActive && styles.activeSongTitle]}>
                              {song.title}
                            </Text>
                            <Text style={styles.songMeta}>
                              {song.bpm === null ? 'No BPM' : `${song.bpm} BPM`} • {barCount} bars •{' '}
                              {new Date(song.updatedAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </Pressable>
                      )}

                      {!isEditing && (
                        <View style={styles.songActions}>
                          <Pressable
                            onPress={() => handleStartRename(song)}
                            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Rename Song"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </Pressable>
                          <Pressable
                            onPress={() => confirmDelete(song)}
                            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Delete Song"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Training & Challenges */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CRAFT GAUNTLET (STEP 5)</Text>
              <View style={styles.previewBox}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Compound Polysyllabic Drill</Text>
                  <Text style={styles.previewBadge}>Gauntlet</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Double-Time Velocity Workout</Text>
                  <Text style={styles.previewBadge}>Gauntlet</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Cross-Bar Enjambment Challenge</Text>
                  <Text style={styles.previewBadge}>Gauntlet</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Account Switcher */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>Prosodic Workstation v1.0</Text>
          </View>
        </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    flexDirection: 'row',
  },
  outsideTapArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: '80%',
  },
  drawerContainer: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: '#090D16',
    borderRightWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    shadowColor: '#000000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.two,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  profileMeta: {
    flex: 1,
  },
  artistName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#3B82F644',
  },
  proBadgeText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  section: {
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dialectRow: {
    flexDirection: 'row',
    backgroundColor: '#030712',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 2,
  },
  dialectBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialectBtnActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  dialectBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  dialectBtnTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  newTrackBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  newTrackText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  songList: {
    gap: Spacing.one,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeSongCard: {
    backgroundColor: '#131D31',
    borderColor: '#3B82F6',
  },
  inactiveSongCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  songCardPressable: {
    flex: 1,
  },
  songInfo: {
    gap: 2,
  },
  songTitle: {
    color: '#E2E8F0',
    fontSize: 13.5,
    fontWeight: '600',
  },
  activeSongTitle: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  songMeta: {
    color: '#64748B',
    fontSize: 10.5,
  },
  songActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  actionIconText: {
    fontSize: 12,
  },
  renameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  renameInput: {
    flex: 1,
    color: '#FFFFFF',
    backgroundColor: '#1E293B',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 13,
  },
  renameSaveBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
  },
  renameSaveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  previewBox: {
    backgroundColor: '#0F172A',
    padding: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.one,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewLabel: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  previewBadge: {
    backgroundColor: '#1E293B',
    color: '#A78BFA',
    fontSize: 9.5,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  footerSection: {
    borderTopWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});

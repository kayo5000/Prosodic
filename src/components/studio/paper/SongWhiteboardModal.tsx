import React, { useState, useRef, useEffect } from 'react';
import {
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

import { CREATIVE_SUGGESTION_PROMPTS } from './cadenceFormat';
import { Mood3DIcon } from './Mood3DIcon';
import type { MoodType, SongMetadata, SongReferenceData, TextureArtifact } from './types';

interface SongWhiteboardModalProps {
  visible: boolean;
  metadata: SongMetadata;
  onClose: () => void;
  onSave: (updatedWhiteboard: TextureArtifact) => void;
}

const SONG_PROMPTS = [
  "Write about something great in your life that you don't always think about.",
  "What is the central premise, emotional arc, or conflict of this song?",
  "If this track were a movie scene or visual world, what does it look like?",
  "What are 3 sonic or lyrical textures that must anchor this record?",
  "What feeling do you want the listener to have in their chest on the final bar?",
  ...CREATIVE_SUGGESTION_PROMPTS,
];

export function SongWhiteboardModal({
  visible,
  metadata,
  onClose,
  onSave,
}: SongWhiteboardModalProps) {
  const [activeTab, setActiveTab] = useState<'recommended' | 'recent'>('recommended');
  const [promptIdx, setPromptIdx] = useState<number>(0);
  const [selectedMood, setSelectedMood] = useState<MoodType>(
    metadata.whiteboard.mood?.type || 'confident',
  );
  const [songConcept, setSongConcept] = useState<string>(
    metadata.whiteboard.reflectionComment || '',
  );
  const [referenceNotes, setReferenceNotes] = useState<string>(
    metadata.whiteboard.mood?.note || 'Theme: Ambition, discipline, and cadence velocity.',
  );

  const [songs, setSongs] = useState<SongReferenceData[]>(
    metadata.whiteboard.songsOnRepeat || [
      { title: 'Baby Mine', artist: 'Fred Mollin', coverIcon: 'disc', coverBg: '#2C2C2E' },
      { title: "I'm The Problem", artist: 'Morgan Wallen', coverIcon: 'guitar', coverBg: '#3A3A3C' },
    ],
  );
  const [isEditingSongs, setIsEditingSongs] = useState<boolean>(false);
  const [newSongTitle, setNewSongTitle] = useState<string>('');
  const [newSongArtist, setNewSongArtist] = useState<string>('');

  const handleNextPrompt = () => {
    setPromptIdx((i) => (i + 1) % SONG_PROMPTS.length);
  };

  const handleAddSong = () => {
    if (newSongTitle.trim()) {
      setSongs((prev) => [
        ...prev,
        {
          title: newSongTitle.trim(),
          artist: newSongArtist.trim() || 'Reference Track',
          coverIcon: 'disc',
          coverBg: '#DFE4EA',
        },
      ]);
      setNewSongTitle('');
      setNewSongArtist('');
      setIsEditingSongs(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...metadata.whiteboard,
      suggestionPrompt: SONG_PROMPTS[promptIdx],
      mood: {
        type: selectedMood,
        label: selectedMood.toUpperCase(),
        note: referenceNotes,
      },
      reflectionComment: songConcept,
      songsOnRepeat: songs,
    });
    onClose();
  };

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const sheetTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const sheetScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent={true} onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} style={styles.closeRoundBtn} accessibilityLabel="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Pressable>

            {/* Segmented Switcher: [Recommended] [Recent] */}
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => setActiveTab('recommended')}
                style={[
                  styles.segmentBtn,
                  activeTab === 'recommended' && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    activeTab === 'recommended' && styles.segmentBtnTextActive,
                  ]}
                >
                  Recommended
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('recent')}
                style={[
                  styles.segmentBtn,
                  activeTab === 'recent' && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    activeTab === 'recent' && styles.segmentBtnTextActive,
                  ]}
                >
                  Recent
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={handleSave} style={styles.headerSaveBtn} accessibilityLabel="Done">
              <Text style={styles.headerSaveText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {activeTab === 'recommended' ? (
              <>
                {/* Floating Suggestions Tag */}
                <View style={styles.suggestionTagPill}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginRight: 6 }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <Text style={styles.suggestionTagText}>Songwriting Suggestions</Text>
                </View>

                {/* 1. Visual Mood Collage Card */}
                <View style={styles.collageBlockWrap}>
                  <View style={styles.collageContainer}>
                    <View style={styles.collageLeftSlot}>
                      <View style={styles.collageLeftPhotoMock}>
                        <View style={styles.photoSilhouetteHead} />
                        <Text style={styles.photoMockWatermark}>Song Vision & World</Text>
                      </View>
                    </View>
                    <View style={styles.collageRightGrid}>
                      <View style={styles.collageGridRow}>
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#F6B93B' }]}>
                          <View style={styles.figureYellowDress} />
                        </View>
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' }]}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="6" y1="5" x2="6" y2="13" />
                            <line x1="10" y1="5" x2="10" y2="13" />
                            <line x1="14" y1="5" x2="14" y2="13" />
                            <line x1="18" y1="5" x2="18" y2="13" />
                          </svg>
                        </View>
                      </View>
                      <View style={styles.collageGridRow}>
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#4A69BD' }]}>
                          <View style={styles.videoBadge}>
                            <Text style={styles.videoBadgeText}>1:24</Text>
                          </View>
                        </View>
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#F8A5C2' }]}>
                          <View style={styles.moreBadge}>
                            <Text style={styles.moreBadgeText}>+5</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardOutsideFooter}>
                    <View style={styles.cardFooterTextCol}>
                      <Text style={styles.cardFooterTitle}>Studio Session Archive</Text>
                      <Text style={styles.cardFooterSub}>Over the last project cycle</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Bento Pair: Songs on Repeat & Collaborators */}
                <View style={styles.bentoPairRow}>
                  {/* Left: Collaborator */}
                  <View style={styles.bentoCol}>
                    <View style={styles.connectedCardContainer}>
                      <View style={styles.collaboratorAvatarCircle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </View>
                      <Text style={styles.collaboratorInnerName}>Session Room</Text>
                    </View>
                    <View style={styles.cardOutsideFooter}>
                      <View style={styles.cardFooterTextCol}>
                        <Text style={styles.cardFooterTitle}>You&apos;ve Connected</Text>
                        <Text style={styles.cardFooterSub}>Yesterday</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Songs on Repeat */}
                  <View style={styles.bentoCol}>
                    <View style={styles.songsCardContainer}>
                      {songs.slice(0, 2).map((s, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.appleSongTile,
                            { backgroundColor: idx === 0 ? '#1C1C1E' : '#161618', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
                          ]}
                        >
                          <View style={[styles.appleSongCover, { backgroundColor: s.coverBg || '#2C2C2E', alignItems: 'center', justifyContent: 'center' }]}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </View>
                          <View style={styles.appleSongInfo}>
                            <Text style={styles.appleSongTitle} numberOfLines={1}>
                              {s.title}
                            </Text>
                            <Text style={styles.appleSongArtist} numberOfLines={1}>
                              {s.artist}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    <View style={styles.cardOutsideFooter}>
                      <View style={styles.cardFooterTextCol}>
                        <Text style={styles.cardFooterTitle}>Songs on Repeat</Text>
                        <Text style={styles.cardFooterSub}>Sonic inspiration</Text>
                      </View>
                      <Pressable
                        onPress={() => setIsEditingSongs((v) => !v)}
                        style={styles.circleEditBtn}
                        accessibilityLabel="Add reference song"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Inline Song Add Form */}
                {isEditingSongs && (
                  <View style={styles.inlineAddSongBox}>
                    <Text style={styles.sectionLabel}>ADD REFERENCE TRACK</Text>
                    <TextInput
                      value={newSongTitle}
                      onChangeText={setNewSongTitle}
                      placeholder="Song title..."
                      placeholderTextColor="#8E8E93"
                      style={styles.standardInput}
                    />
                    <TextInput
                      value={newSongArtist}
                      onChangeText={setNewSongArtist}
                      placeholder="Artist..."
                      placeholderTextColor="#8E8E93"
                      style={[styles.standardInput, { marginTop: 6 }]}
                    />
                    <Pressable onPress={handleAddSong} style={styles.addSongConfirmBtn}>
                      <Text style={styles.addSongConfirmText}>Add Track</Text>
                    </Pressable>
                  </View>
                )}

                {/* 3. Bold Coral Red REFLECTION Card */}
                <View style={styles.reflectionPromptCard}>
                  <View style={styles.reflectionPromptHeader}>
                    <Text style={styles.reflectionPromptLabel}>SONGWRITING REFLECTION</Text>
                    <Pressable
                      onPress={handleNextPrompt}
                      style={styles.reflectionRefreshBtn}
                      accessibilityLabel="Get new prompt"
                    >
                      <Text style={styles.reflectionRefreshIcon}>↻</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.reflectionPromptQuestion}>{SONG_PROMPTS[promptIdx]}</Text>
                  <TextInput
                    value={songConcept}
                    onChangeText={setSongConcept}
                    multiline
                    placeholder="Write your song concept, emotional arc, or narrative premise..."
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    style={[
                      styles.reflectionInlineInput,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                  />
                </View>

                {/* 4. Global Vibe & 3D Mood Board */}
                <View style={styles.bentoRow}>
                  <View style={styles.moodTile}>
                    <Text style={styles.moodTileCategory}>{selectedMood.toUpperCase()}</Text>
                    <View style={styles.moodIconContainer}>
                      <Mood3DIcon mood={selectedMood} size={70} />
                    </View>
                    <Text style={styles.moodTileSub}>Global Song Mood</Text>
                  </View>

                  <View style={styles.rightStack}>
                    <View style={styles.moodSelectorGrid}>
                      {(['confident', 'excited', 'aggressive', 'flow', 'melancholy', 'street'] as MoodType[]).map(
                        (m) => {
                          const isSelected = selectedMood === m;
                          return (
                            <Pressable
                              key={m}
                              onPress={() => setSelectedMood(m)}
                              style={[styles.moodChip, isSelected && styles.moodChipSelected]}
                            >
                              <Text
                                style={[
                                  styles.moodChipText,
                                  isSelected && styles.moodChipTextSelected,
                                ]}
                              >
                                {m}
                              </Text>
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                  </View>
                </View>

                {/* 5. Production & Reference Notes */}
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>REFERENCE TRACKS & PRODUCTION NOTES</Text>
                  <TextInput
                    value={referenceNotes}
                    onChangeText={setReferenceNotes}
                    multiline
                    numberOfLines={3}
                    placeholder="List reference tracks, key signatures, sound effects, or arrangement cues..."
                    placeholderTextColor="#8E8E93"
                    style={[
                      styles.standardInput,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                  />
                </View>
              </>
            ) : (
              /* Recent Tab */
              <View style={styles.recentTabContent}>
                <View style={styles.recentItemCard}>
                  <Text style={styles.recentItemTitle}>Whiteboard Draft</Text>
                  <Text style={styles.recentItemSub}>Saved earlier today</Text>
                </View>
                <View style={styles.recentItemCard}>
                  <Text style={styles.recentItemTitle}>Baby Mine &amp; I&apos;m The Problem</Text>
                  <Text style={styles.recentItemSub}>Added to song inspiration</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.sheetFooter}>
            <Pressable onPress={handleSave} style={styles.footerSaveBtn}>
              <Text style={styles.footerSaveBtnText}>Save Song Whiteboard</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '94%',
    minHeight: '82%',
    overflow: 'hidden',
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3A3A3C',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  closeRoundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeRoundIcon: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  segmentBtnActive: {
    backgroundColor: '#3A3A3C',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  headerSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
  },
  headerSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 40,
  },
  suggestionTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10, 132, 255, 0.4)',
  },
  suggestionTagIcon: {
    fontSize: 13,
  },
  suggestionTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64D2FF',
  },
  collageBlockWrap: {
    gap: 8,
  },
  collageContainer: {
    height: 190,
    borderRadius: 22,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 5,
    gap: 5,
  },
  collageLeftSlot: {
    flex: 1.15,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#3D3A37',
  },
  collageLeftPhotoMock: {
    flex: 1,
    backgroundColor: '#4E4841',
    justifyContent: 'flex-end',
    padding: 12,
    position: 'relative',
  },
  photoSilhouetteHead: {
    position: 'absolute',
    top: 30,
    left: 25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7A6B5C',
    opacity: 0.7,
  },
  photoMockWatermark: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  collageRightGrid: {
    flex: 1,
    gap: 5,
  },
  collageGridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  collageThumbSlot: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  figureYellowDress: {
    width: 20,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#D9822B',
    opacity: 0.85,
  },
  thumbEmoji: {
    fontSize: 20,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  moreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardOutsideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  cardFooterTextCol: {
    flex: 1,
  },
  cardFooterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardFooterSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  circleEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEditIcon: {
    fontSize: 13,
    color: '#8E8E93',
  },
  bentoPairRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCol: {
    flex: 1,
    gap: 6,
  },
  connectedCardContainer: {
    height: 150,
    backgroundColor: '#2C2C2E',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  collaboratorAvatarCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3A3A3C',
  },
  avatarFaceEmoji: {
    fontSize: 28,
  },
  collaboratorInnerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  songsCardContainer: {
    height: 150,
    backgroundColor: '#2C2C2E',
    borderRadius: 22,
    padding: 8,
    justifyContent: 'center',
    gap: 6,
  },
  appleSongTile: {
    borderRadius: 12,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appleSongCover: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleSongCoverEmoji: {
    fontSize: 16,
  },
  appleSongInfo: {
    flex: 1,
  },
  appleSongTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appleSongArtist: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  inlineAddSongBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  addSongConfirmBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addSongConfirmText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  reflectionPromptCard: {
    backgroundColor: '#D63031',
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  reflectionPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reflectionPromptLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  reflectionRefreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionRefreshIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  reflectionPromptQuestion: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  reflectionInlineInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 64,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 14,
  },
  moodTile: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  moodTileCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  moodIconContainer: {
    paddingVertical: 6,
  },
  moodTileSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  rightStack: {
    flex: 1.2,
    justifyContent: 'center',
  },
  moodSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moodChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
  },
  moodChipSelected: {
    backgroundColor: '#D4AF37',
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AEAEB2',
  },
  moodChipTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  standardInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recentTabContent: {
    gap: 10,
    paddingVertical: 10,
  },
  recentItemCard: {
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  recentItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recentItemSub: {
    fontSize: 12,
    color: '#8E8E93',
  },
  sheetFooter: {
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
  },
  footerSaveBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSaveBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});

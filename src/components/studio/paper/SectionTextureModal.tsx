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

import { CREATIVE_SUGGESTION_PROMPTS, getRandomSuggestionPrompt } from './cadenceFormat';
import { Mood3DIcon } from './Mood3DIcon';
import type { MoodType, PaperSection, SongReferenceData, TextureArtifact } from './types';

interface SectionTextureModalProps {
  visible: boolean;
  section: PaperSection | null;
  onClose: () => void;
  onSave: (updatedSection: PaperSection) => void;
}

interface MoodOption {
  type: MoodType;
  label: string;
}

const AVAILABLE_MOODS: MoodOption[] = [
  { type: 'excited', label: 'Surprised, Excited' },
  { type: 'confident', label: 'Confident, Triumphant' },
  { type: 'aggressive', label: 'Aggressive, Heavy' },
  { type: 'melancholy', label: 'Introspective, Melancholy' },
  { type: 'flow', label: 'Flow State, Smooth' },
  { type: 'street', label: 'Raw, Street' },
];

export function SectionTextureModal({
  visible,
  section,
  onClose,
  onSave,
}: SectionTextureModalProps) {
  // Unconditional top-level hooks
  const [activeTab, setActiveTab] = useState<'recommended' | 'recent'>('recommended');
  const [sectionName, setSectionName] = useState<string>(section?.name || 'Verse');
  const [suggestionPrompt, setSuggestionPrompt] = useState<string>(
    () => section?.texture.suggestionPrompt || CREATIVE_SUGGESTION_PROMPTS[0],
  );

  const [selectedMood, setSelectedMood] = useState<MoodType>(
    section?.texture.mood?.type || 'excited',
  );
  const [moodNote, setMoodNote] = useState<string>(
    section?.texture.mood?.note || 'Tired but grateful! Excited to record.',
  );

  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(9);

  const [hasMedia, setHasMedia] = useState<boolean>(
    Boolean(section?.texture.mediaAttachment),
  );
  const [reflectionText, setReflectionText] = useState<string>(
    section?.texture.reflectionComment || '',
  );

  // Collage metadata
  const [collageTitle, setCollageTitle] = useState<string>(
    section?.texture.collageTitle || 'Weekdays at Home',
  );
  const [collageSubtitle] = useState<string>(
    section?.texture.collageSubtitle || 'Over the last month',
  );
  const [isEditingCollage, setIsEditingCollage] = useState<boolean>(false);

  // Collaborator metadata
  const [collaboratorName, setCollaboratorName] = useState<string>(
    section?.texture.collaborator?.name || 'Teya',
  );
  const [isEditingCollaborator, setIsEditingCollaborator] = useState<boolean>(false);

  // Songs on repeat metadata
  const [songs, setSongs] = useState<SongReferenceData[]>(
    section?.texture.songsOnRepeat || [
      { title: 'Baby Mine', artist: 'Fred Mollin', coverBg: '#2C2C2E', coverIcon: 'disc' },
      { title: "I'm The Problem", artist: 'Morgan Wallen', coverBg: '#3A3A3C', coverIcon: 'disc' },
    ],
  );
  const [isEditingSongs, setIsEditingSongs] = useState<boolean>(false);
  const [newSongTitle, setNewSongTitle] = useState<string>('');
  const [newSongArtist, setNewSongArtist] = useState<string>('');

  if (!section) return null;

  const handleRefreshPrompt = () => {
    let nextPrompt = getRandomSuggestionPrompt();
    while (nextPrompt === suggestionPrompt && CREATIVE_SUGGESTION_PROMPTS.length > 1) {
      nextPrompt = getRandomSuggestionPrompt();
    }
    setSuggestionPrompt(nextPrompt);
  };

  const handleAddSong = () => {
    if (newSongTitle.trim()) {
      setSongs((prev) => [
        ...prev,
        {
          title: newSongTitle.trim(),
          artist: newSongArtist.trim() || 'Reference Track',
          coverBg: '#DFE4EA',
          coverIcon: 'disc',
        },
      ]);
      setNewSongTitle('');
      setNewSongArtist('');
      setIsEditingSongs(false);
    }
  };

  const handleSave = () => {
    const updatedTexture: TextureArtifact = {
      ...section.texture,
      suggestionPrompt,
      mood: {
        type: selectedMood,
        label: AVAILABLE_MOODS.find((m) => m.type === selectedMood)?.label || 'Excited',
        note: moodNote,
      },
      audioRecording: {
        uri: 'sample-take.m4a',
        durationSec: recordingSeconds,
        waveform: [24, 45, 65, 85, 50, 70, 95, 75, 55, 40, 70, 90, 60, 30],
      },
      mediaAttachment: hasMedia
        ? {
            uri: 'sample-photo.jpg',
            type: 'image',
            caption: collageTitle,
          }
        : undefined,
      reflectionComment: reflectionText,
      songsOnRepeat: songs,
      collaborator: {
        name: collaboratorName,
        role: "You've Connected",
        avatarIcon: 'mic',
      },
      collageTitle,
      collageSubtitle,
      location: 'Plaza Blok M · South Jakarta',
    };

    onSave({
      ...section,
      name: sectionName.trim() || section.name,
      texture: updatedTexture,
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

          {/* Header Bar matching Apple Journal suggestions sheet (media_1789317514962.png) */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} style={styles.closeRoundBtn} accessibilityLabel="Close" accessibilityRole="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5" strokeLinecap="round">
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

            {/* Save Button */}
            <Pressable onPress={handleSave} style={styles.headerSaveBtn} accessibilityLabel="Save">
              <Text style={styles.headerSaveText}>Done</Text>
            </Pressable>
          </View>

          {/* Scrollable Journal Canvas */}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'recommended' ? (
              <>
                {/* Floating Suggestions Tag (matching media_1789317515676.png) */}
                <View style={styles.suggestionTagPill}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginRight: 6 }}>
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                  <Text style={styles.suggestionTagText}>Journaling Suggestions</Text>
                </View>

                {/* 1. Weekdays at Home / Visual Mood Collage Card (Exact match to media_1789317514962.png) */}
                <View style={styles.collageBlockWrap}>
                  <View style={styles.collageContainer}>
                    {/* Left: Large Photo */}
                    <View style={styles.collageLeftSlot}>
                      <View style={styles.collageLeftPhotoMock}>
                        <View style={styles.photoSilhouetteHead} />
                        <View style={styles.photoBabyMock} />
                        <Text style={styles.photoMockWatermark}>Weekdays at Home</Text>
                      </View>
                    </View>

                    {/* Right: 2x2 Thumbnail Grid */}
                    <View style={styles.collageRightGrid}>
                      <View style={styles.collageGridRow}>
                        {/* Top-left: Yellow dress figure */}
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#F6B93B' }]}>
                          <View style={styles.figureYellowDress} />
                        </View>
                        {/* Top-right: Cozy bed scene */}
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#2C2C2E' }]}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4v16" />
                            <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                            <path d="M2 17h20" />
                            <path d="M6 8v9" />
                          </svg>
                        </View>
                      </View>

                      <View style={styles.collageGridRow}>
                        {/* Bottom-left: Blue selfie with 0:46 video badge */}
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#4A69BD' }]}>
                          <View style={styles.videoBadge}>
                            <Text style={styles.videoBadgeText}>0:46</Text>
                          </View>
                        </View>
                        {/* Bottom-right: Golden skin tone blur with +3 badge */}
                        <View style={[styles.collageThumbSlot, { backgroundColor: '#F8A5C2' }]}>
                          <View style={styles.moreBadge}>
                            <Text style={styles.moreBadgeText}>+3</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Collage Caption Footer with Edit Button */}
                  <View style={styles.cardOutsideFooter}>
                    <View style={styles.cardFooterTextCol}>
                      {isEditingCollage ? (
                        <TextInput
                          value={collageTitle}
                          onChangeText={setCollageTitle}
                          onBlur={() => setIsEditingCollage(false)}
                          autoFocus
                          style={styles.cardFooterInlineInput}
                        />
                      ) : (
                        <Text style={styles.cardFooterTitle}>{collageTitle}</Text>
                      )}
                      <Text style={styles.cardFooterSub}>{collageSubtitle}</Text>
                    </View>
                    <Pressable
                      onPress={() => setIsEditingCollage((v) => !v)}
                      style={styles.circleEditBtn}
                      accessibilityLabel="Edit collage title"
                      accessibilityRole="button"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </Pressable>
                  </View>
                </View>

                {/* 2. Bento Row: You've Connected & Songs on Repeat (Exact match to media_1789317514962.png) */}
                <View style={styles.bentoPairRow}>
                  {/* Left Column: You've Connected */}
                  <View style={styles.bentoCol}>
                    <View style={styles.connectedCardContainer}>
                      <View style={styles.collaboratorAvatarCircle}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </View>
                      <Text style={styles.collaboratorInnerName}>{collaboratorName}</Text>
                    </View>

                    {/* Footer for You've Connected */}
                    <View style={styles.cardOutsideFooter}>
                      <View style={styles.cardFooterTextCol}>
                        {isEditingCollaborator ? (
                          <TextInput
                            value={collaboratorName}
                            onChangeText={setCollaboratorName}
                            onBlur={() => setIsEditingCollaborator(false)}
                            autoFocus
                            style={styles.cardFooterInlineInput}
                          />
                        ) : (
                          <Text style={styles.cardFooterTitle}>You&apos;ve Connected</Text>
                        )}
                        <Text style={styles.cardFooterSub}>Yesterday</Text>
                      </View>
                      <Pressable
                        onPress={() => setIsEditingCollaborator((v) => !v)}
                        style={styles.circleEditBtn}
                        accessibilityLabel="Edit collaborator"
                        accessibilityRole="button"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </Pressable>
                    </View>
                  </View>

                  {/* Right Column: Songs on Repeat */}
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
                          <View style={[styles.appleSongCover, { backgroundColor: s.coverBg || '#2C2C2E' }]}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <View style={styles.musicNoteCornerBadge}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFFFFF">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                              </svg>
                            </View>
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

                    {/* Footer for Songs on Repeat */}
                    <View style={styles.cardOutsideFooter}>
                      <View style={styles.cardFooterTextCol}>
                        <Text style={styles.cardFooterTitle}>Songs on Repeat</Text>
                        <Text style={styles.cardFooterSub}>Over the last week</Text>
                      </View>
                      <Pressable
                        onPress={() => setIsEditingSongs((v) => !v)}
                        style={styles.circleEditBtn}
                        accessibilityLabel="Add reference song"
                        accessibilityRole="button"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Inline Song Addition Form if edit tapped */}
                {isEditingSongs && (
                  <View style={styles.inlineAddSongBox}>
                    <Text style={styles.sectionLabel}>ADD INSPIRATION TRACK</Text>
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
                      <Text style={styles.addSongConfirmText}>Add Track to References</Text>
                    </Pressable>
                  </View>
                )}

                {/* 3. Bold Coral Red REFLECTION Card (Exact match to media_1789317514962.png) */}
                <View style={styles.reflectionPromptCard}>
                  <View style={styles.reflectionPromptHeader}>
                    <Text style={styles.reflectionPromptLabel}>REFLECTION</Text>
                    <Pressable
                      onPress={handleRefreshPrompt}
                      style={styles.reflectionRefreshBtn}
                      accessibilityLabel="Get new reflection prompt"
                    >
                      <Text style={styles.reflectionRefreshIcon}>↻</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.reflectionPromptQuestion}>{suggestionPrompt}</Text>
                  <TextInput
                    value={reflectionText}
                    onChangeText={setReflectionText}
                    multiline
                    placeholder="Tap to write your reflection, story, or rhymes here..."
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    style={[
                      styles.reflectionInlineInput,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                  />
                </View>

                {/* 4. Apple Journal Bento Grid: 3D Mood Card & Voice Take (media_1789316919351.png) */}
                <View style={styles.bentoRow}>
                  {/* Left Card: 3D Mood Tile with Glowing Star */}
                  <View style={styles.moodTile}>
                    <Text style={styles.moodTileCategory}>
                      {AVAILABLE_MOODS.find((m) => m.type === selectedMood)?.label}
                    </Text>
                    <View style={styles.moodIconContainer}>
                      <Mood3DIcon mood={selectedMood} size={70} />
                    </View>
                    <Text style={styles.moodTileSub}>Friends</Text>
                  </View>

                  {/* Right Stack: Media Card & Voice Take */}
                  <View style={styles.rightStack}>
                    {/* Media Card */}
                    <Pressable
                      onPress={() => setHasMedia((v) => !v)}
                      style={styles.mediaCard}
                      accessibilityLabel="Toggle media attachment"
                    >
                      {hasMedia ? (
                        <View style={styles.mediaFilled}>
                          <View style={styles.mediaGradientPhoto} />
                          <Text style={styles.mediaFilledText}>Photo Attached</Text>
                        </View>
                      ) : (
                        <View style={styles.mediaEmpty}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6C6C70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 4 }}>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <Text style={styles.mediaEmptyText}>+ Add Photo / Video</Text>
                        </View>
                      )}
                    </Pressable>

                    {/* Voice Take Recording Card */}
                    <View style={styles.audioCard}>
                      <Pressable
                        onPress={() => setIsPlayingAudio((v) => !v)}
                        style={styles.audioPlayBtn}
                        accessibilityLabel={isPlayingAudio ? 'Pause' : 'Play'}
                        accessibilityRole="button"
                      >
                        {isPlayingAudio ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1C1C1E">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1C1C1E">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </Pressable>
                      <View style={styles.audioWaveContainer}>
                        <Text style={styles.audioDurationText}>
                          0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                        </Text>
                        <View style={styles.waveformRow}>
                          {[24, 45, 65, 85, 50, 70, 95, 75, 55, 40, 70, 90, 60, 30].map((h, i) => (
                            <View
                              key={i}
                              style={[
                                styles.waveBar,
                                {
                                  height: Math.max(6, (h / 100) * 22),
                                  backgroundColor: isPlayingAudio && i < 7 ? '#7B61FF' : '#B8C0EC',
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                      <Pressable
                        onPress={() => {
                          if (!isRecordingAudio) {
                            setIsRecordingAudio(true);
                          } else {
                            setIsRecordingAudio(false);
                            setRecordingSeconds((s) => s + 4);
                          }
                        }}
                        style={[styles.recordBtn, isRecordingAudio && styles.recordBtnActive]}
                        accessibilityLabel="Record voice take"
                        accessibilityRole="button"
                      >
                        {isRecordingAudio ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* 5. Location / Studio Pin (from media_1789316919351.png) */}
                <View style={styles.locationPillContainer}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <Text style={styles.locationText}>Plaza Blok M · South Jakarta</Text>
                </View>

                {/* 6. Mood Selector Pills */}
                <View style={styles.moodSelectorSection}>
                  <Text style={styles.sectionLabel}>CHOOSE SECTION MOOD</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.moodPillsRow}
                  >
                    {AVAILABLE_MOODS.map((m) => {
                      const isSelected = selectedMood === m.type;
                      return (
                        <Pressable
                          key={m.type}
                          onPress={() => setSelectedMood(m.type)}
                          style={[styles.moodPill, isSelected && styles.moodPillSelected]}
                        >
                          <Text
                            style={[
                              styles.moodPillText,
                              isSelected && styles.moodPillTextSelected,
                            ]}
                          >
                            {m.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 7. Section Rename & Mood Note */}
                <View style={styles.inputsRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.sectionLabel}>SECTION LABEL</Text>
                    <TextInput
                      value={sectionName}
                      onChangeText={setSectionName}
                      style={[
                        styles.standardInput,
                        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                      ]}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={styles.sectionLabel}>MOOD NOTE</Text>
                    <TextInput
                      value={moodNote}
                      onChangeText={setMoodNote}
                      placeholder="e.g. Tired but grateful!"
                      placeholderTextColor="#8E8E93"
                      style={[
                        styles.standardInput,
                        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                      ]}
                    />
                  </View>
                </View>
              </>
            ) : (
              /* Recent Tab */
              <View style={styles.recentTabContent}>
                <View style={styles.recentItemCard}>
                  <Text style={styles.recentItemTitle}>Voice Memo #1 (0:09)</Text>
                  <Text style={styles.recentItemSub}>Recorded 15 minutes ago</Text>
                </View>
                <View style={styles.recentItemCard}>
                  <Text style={styles.recentItemTitle}>Surprised, Excited Mood</Text>
                  <Text style={styles.recentItemSub}>Applied to Verse 1</Text>
                </View>
                <View style={styles.recentItemCard}>
                  <Text style={styles.recentItemTitle}>Fred Mollin - Baby Mine</Text>
                  <Text style={styles.recentItemSub}>Referenced in Songs on Repeat</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Save Action Footer */}
          <View style={styles.sheetFooter}>
            <Pressable onPress={handleSave} style={styles.footerSaveBtn}>
              <Text style={styles.footerSaveBtnText}>Save Texture to {sectionName}</Text>
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

  // Suggestion Tag Pill (from media_1789317515676.png)
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

  // 1. Collage Block (media_1789317514962.png)
  collageBlockWrap: {
    gap: 8,
  },
  collageContainer: {
    height: 215,
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
    backgroundColor: '#594F45',
    justifyContent: 'flex-end',
    padding: 12,
    position: 'relative',
  },
  photoSilhouetteHead: {
    position: 'absolute',
    top: 30,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8C6F56',
    opacity: 0.7,
  },
  photoBabyMock: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C5A880',
    opacity: 0.85,
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
    width: 24,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#D9822B',
    opacity: 0.85,
  },
  thumbEmoji: {
    fontSize: 22,
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

  // Shared Card Outside Footer (Title, Subtitle, Circle Edit Button)
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
  cardFooterInlineInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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

  // 2. Bento Pair Row: You've Connected & Songs on Repeat
  bentoPairRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCol: {
    flex: 1,
    gap: 6,
  },
  connectedCardContainer: {
    height: 160,
    backgroundColor: '#2C2C2E',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  collaboratorAvatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#3A3A3C',
  },
  avatarHairBand: {
    position: 'absolute',
    top: 4,
    width: 60,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
    opacity: 0.6,
  },
  avatarFaceEmoji: {
    fontSize: 32,
  },
  collaboratorInnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },

  // Songs on Repeat Card
  songsCardContainer: {
    height: 160,
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
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  appleSongCoverEmoji: {
    fontSize: 18,
  },
  musicNoteCornerBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  musicNoteCornerIcon: {
    fontSize: 9,
    color: '#FFFFFF',
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

  // Inline Song Add Form
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

  // 3. Bold Coral Red REFLECTION Card (media_1789317514962.png)
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

  // 4. Bento Grid: 3D Mood Card & Media / Audio
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
    minHeight: 160,
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
    gap: 12,
  },
  mediaCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaEmpty: {
    alignItems: 'center',
    gap: 4,
  },
  mediaEmptyIcon: {
    fontSize: 20,
  },
  mediaEmptyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  mediaFilled: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mediaGradientPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF7675',
    opacity: 0.85,
  },
  mediaFilledText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  audioCard: {
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  audioWaveContainer: {
    flex: 1,
    gap: 4,
  },
  audioDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B8C0EC',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 22,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  recordBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnActive: {
    backgroundColor: '#FF3B30',
  },
  recordBtnText: {
    fontSize: 13,
  },

  // 5. Location Tag (media_1789316919351.png)
  locationPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  locationBriefcaseIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Mood Selector Pills
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  moodSelectorSection: {
    gap: 4,
  },
  moodPillsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  moodPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
  },
  moodPillSelected: {
    backgroundColor: '#D4AF37',
  },
  moodPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#AEAEB2',
  },
  moodPillTextSelected: {
    color: '#000000',
    fontWeight: '700',
  },

  // Input Row
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  standardInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Recent Tab
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

  // Footer Save
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

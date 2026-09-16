import React, { useRef, useState, useEffect } from 'react';
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

import type { BeatMovement, PaperSection, SectionType, SongMetadata } from './types';

interface SongSettingsModalProps {
  visible: boolean;
  metadata: SongMetadata;
  movements: BeatMovement[];
  sections: PaperSection[];
  onClose: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateBpm: (newBpm: number) => void;
  onAttachAudio: (audioInfo: { name: string; uri: string; durationSec: number }) => void;
  onAddSection: (type: SectionType, movementId: string) => void;
  onAddBeatSwitch: () => void;
  onSelectSection: (sectionId: string) => void;
}

export function SongSettingsModal({
  visible,
  metadata,
  movements,
  sections,
  onClose,
  onUpdateTitle,
  onUpdateBpm,
  onAttachAudio,
  onAddSection,
  onAddBeatSwitch,
  onSelectSection,
}: SongSettingsModalProps) {
  const [songTitle, setSongTitle] = useState<string>(metadata.title || 'New Song');
  const [bpm, setBpm] = useState<number>(metadata.defaultBpm || 120);
  const [bpmInput, setBpmInput] = useState<string>(String(metadata.defaultBpm || 120));

  // Audio track playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);

  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);

    // Keep last 4 taps
    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        const clampedBpm = Math.max(50, Math.min(calculatedBpm, 240));
        setBpm(clampedBpm);
        setBpmInput(String(clampedBpm));
        onUpdateBpm(clampedBpm);
      }
    }
  };

  const handleBpmChange = (delta: number) => {
    const nextBpm = Math.max(50, Math.min(bpm + delta, 240));
    setBpm(nextBpm);
    setBpmInput(String(nextBpm));
    onUpdateBpm(nextBpm);
  };

  const handleBpmTextSubmit = () => {
    const parsed = parseInt(bpmInput, 10);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 240) {
      setBpm(parsed);
      onUpdateBpm(parsed);
    } else {
      setBpmInput(String(bpm));
    }
  };

  const handleAttachDemoBeat = () => {
    onAttachAudio({
      name: 'Studio_Beat_120BPM_Trap.mp3',
      uri: 'assets/audio/demo-beat.mp3',
      durationSec: 184,
    });
  };

  const handleSaveAndClose = () => {
    if (songTitle.trim() && songTitle !== metadata.title) {
      onUpdateTitle(songTitle.trim());
    }
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
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerCancelText}>Close</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Song Settings & Structure</Text>
            <Pressable onPress={handleSaveAndClose} style={styles.headerButton}>
              <Text style={styles.headerSaveText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
            {/* 1. Song Title Input */}
            <View style={styles.settingCard}>
              <Text style={styles.cardLabel}>SONG TITLE</Text>
              <TextInput
                value={songTitle}
                onChangeText={setSongTitle}
                onBlur={() => {
                  if (songTitle.trim()) onUpdateTitle(songTitle.trim());
                }}
                placeholder="New Song"
                placeholderTextColor="#8E8E93"
                style={[
                  styles.titleTextInput,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
              />
            </View>

            {/* 2. BPM Controls & Tap Tempo */}
            <View style={styles.settingCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardLabel}>TEMPO / BPM</Text>
                <Pressable onPress={handleTapTempo} style={styles.tapTempoBtn}>
                  <Text style={styles.tapTempoBtnText}>TAP TEMPO</Text>
                </Pressable>
              </View>

              <View style={styles.bpmRow}>
                <Pressable onPress={() => handleBpmChange(-1)} style={styles.bpmStepBtn}>
                  <Text style={styles.bpmStepText}>−</Text>
                </Pressable>

                <View style={styles.bpmDisplayWrap}>
                  <TextInput
                    value={bpmInput}
                    onChangeText={setBpmInput}
                    onBlur={handleBpmTextSubmit}
                    keyboardType="numeric"
                    style={[
                      styles.bpmNumberInput,
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                  />
                  <Text style={styles.bpmUnitText}>BPM</Text>
                </View>

                <Pressable onPress={() => handleBpmChange(1)} style={styles.bpmStepBtn}>
                  <Text style={styles.bpmStepText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* 3. Audio Track / Beat File Attachment */}
            <View style={styles.settingCard}>
              <Text style={styles.cardLabel}>AUDIO BEAT / INSTRUMENTAL TRACK</Text>
              {metadata.audioFile ? (
                <View style={styles.audioAttachedBox}>
                  <Pressable
                    onPress={() => setIsPlayingAudio((v) => !v)}
                    style={styles.audioPlayPill}
                    accessibilityRole="button"
                    accessibilityLabel={isPlayingAudio ? "Pause Audio" : "Play Audio"}
                  >
                    {isPlayingAudio ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#1C1C1E">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#1C1C1E">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                    <Text style={styles.audioTrackTitle}>{metadata.audioFile.name}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      onAttachAudio(null as any)
                    }
                    style={styles.audioRemoveBtn}
                  >
                    <Text style={styles.audioRemoveText}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={handleAttachDemoBeat} style={styles.addAudioBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <Text style={styles.addAudioText}>+ Add Audio File (MP3 / WAV)</Text>
                </Pressable>
              )}
            </View>

            {/* 4. Add Section Quick Menu */}
            <View style={styles.settingCard}>
              <Text style={styles.cardLabel}>ADD SONG SECTION</Text>
              <View style={styles.addSectionGrid}>
                <Pressable
                  onPress={() => onAddSection('verse', movements[0]?.id || 'movement-main')}
                  style={styles.addSectionBtn}
                >
                  <Text style={styles.addSectionBtnText}>+ Verse</Text>
                </Pressable>

                <Pressable
                  onPress={() => onAddSection('chorus', movements[0]?.id || 'movement-main')}
                  style={styles.addSectionBtn}
                >
                  <Text style={styles.addSectionBtnText}>+ Chorus / Hook</Text>
                </Pressable>

                <Pressable
                  onPress={() => onAddSection('bridge', movements[0]?.id || 'movement-main')}
                  style={styles.addSectionBtn}
                >
                  <Text style={styles.addSectionBtnText}>+ Bridge</Text>
                </Pressable>

                <Pressable
                  onPress={() => onAddSection('reprise', movements[0]?.id || 'movement-main')}
                  style={styles.addSectionBtn}
                >
                  <Text style={styles.addSectionBtnText}>+ Reprise</Text>
                </Pressable>

                <Pressable
                  onPress={onAddBeatSwitch}
                  style={[styles.addSectionBtn, styles.addBeatSwitchBtn]}
                >
                  <Text style={styles.addBeatSwitchBtnText}>+ Beat Switch</Text>
                </Pressable>
              </View>
            </View>

            {/* 5. Song Arrangement Overview */}
            <View style={styles.settingCard}>
              <Text style={styles.cardLabel}>CURRENT SONG ARRANGEMENT</Text>
              <View style={styles.sectionsList}>
                {sections.map((sec, idx) => (
                  <Pressable
                    key={sec.id}
                    onPress={() => {
                      onSelectSection(sec.id);
                      onClose();
                    }}
                    style={styles.sectionRowItem}
                  >
                    <View style={styles.sectionRowLeft}>
                      <Text style={styles.sectionRowIdx}>{idx + 1}.</Text>
                      <Text style={styles.sectionRowName}>{sec.name}</Text>
                    </View>
                    <View style={styles.sectionRowRight}>
                      <Text style={styles.sectionRowBars}>
                        {sec.blocks.reduce((acc, b) => acc + b.bars.length, 0)} Bars
                      </Text>
                      <Text style={styles.sectionRowArrow}>›</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '70%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.2)',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCancelText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 36,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  tapTempoBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tapTempoBtnText: {
    color: '#9C7A14',
    fontSize: 11,
    fontWeight: '700',
  },
  titleTextInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    paddingVertical: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#D4AF37',
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  bpmStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmStepText: {
    fontSize: 24,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  bpmDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    minWidth: 110,
    justifyContent: 'center',
  },
  bpmNumberInput: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    minWidth: 70,
  },
  bpmUnitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  addAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  addAudioIcon: {
    fontSize: 18,
  },
  addAudioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  audioAttachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
  },
  audioPlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  audioPlayPillIcon: {
    fontSize: 14,
    color: '#5856D6',
    fontWeight: 'bold',
  },
  audioTrackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  audioRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  audioRemoveText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  addSectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addSectionBtn: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  addSectionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  addBeatSwitchBtn: {
    backgroundColor: '#FFF8E7',
    borderColor: '#F39C12',
  },
  addBeatSwitchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
  },
  sectionsList: {
    gap: 6,
  },
  sectionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
  },
  sectionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionRowIdx: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  sectionRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  sectionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionRowBars: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sectionRowArrow: {
    fontSize: 18,
    color: '#C7C7CC',
  },
});

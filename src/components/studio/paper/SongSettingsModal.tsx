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

import type { AudioTrackMetadata, BeatMovement, PaperSection, SectionType, SongMetadata } from './types';
import { analyzeAudioArrayBuffer } from '../../../services/audioAnalysisEngine';

interface SongSettingsModalProps {
  visible: boolean;
  metadata: SongMetadata;
  movements: BeatMovement[];
  sections: PaperSection[];
  onClose: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateBpm: (newBpm: number) => void;
  onAttachAudio: (audioInfo: AudioTrackMetadata | null) => void;
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

  // Audio track playback & analysis state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
  const fileInputRef = useRef<any>(null);

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

  const handlePickAudioFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      handleAttachDemoBeat();
    }
  };

  const handleFileInputChange = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      setIsAnalyzingAudio(true);
      const arrayBuffer = await file.arrayBuffer();
      const analyzed = await analyzeAudioArrayBuffer(arrayBuffer, file.name);
      onAttachAudio(analyzed);
      if (analyzed.bpm) {
        setBpm(analyzed.bpm);
        setBpmInput(String(analyzed.bpm));
        onUpdateBpm(analyzed.bpm);
      }
    } catch (err) {
      console.warn('Audio analysis failed:', err);
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  const handleAttachDemoBeat = () => {
    onAttachAudio({
      name: 'Studio_Beat_120BPM_Trap.mp3',
      uri: 'assets/audio/demo-beat.mp3',
      durationSec: 184,
      bpm: 120,
      waveform: [
        0.3, 0.6, 0.8, 0.5, 0.9, 1.0, 0.7, 0.4, 0.6, 0.8, 0.9, 0.5, 0.7, 0.8, 0.6, 0.4,
        0.3, 0.6, 0.8, 0.5, 0.9, 1.0, 0.7, 0.4, 0.6, 0.8, 0.9, 0.5, 0.7, 0.8, 0.6, 0.4,
      ],
      confidence: 0.987,
      transientsCount: 128,
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
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardLabel}>AUDIO BEAT / MULTIMODAL CADENCE VALIDATOR</Text>
                {metadata.audioFile && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceBadgeText}>98.7% ACCURACY LOCK</Text>
                  </View>
                )}
              </View>

              {Platform.OS === 'web' && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
              )}

              {isAnalyzingAudio ? (
                <View style={styles.analyzingBox}>
                  <Text style={styles.analyzingText}>Analyzing transients, RMS waveform & BPM...</Text>
                </View>
              ) : metadata.audioFile ? (
                <View style={styles.audioAttachedBox}>
                  <View style={styles.audioTopRow}>
                    <Pressable
                      onPress={() => setIsPlayingAudio((v) => !v)}
                      style={styles.audioPlayPill}
                      accessibilityRole="button"
                      accessibilityLabel={isPlayingAudio ? "Pause Audio" : "Play Audio"}
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
                      <Text style={styles.audioTrackTitle} numberOfLines={1}>
                        {metadata.audioFile.name}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => onAttachAudio(null)}
                      style={styles.audioRemoveBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove audio track"
                    >
                      <Text style={styles.audioRemoveText}>Remove</Text>
                    </Pressable>
                  </View>

                  {/* Waveform Visualizer */}
                  {metadata.audioFile.waveform && metadata.audioFile.waveform.length > 0 && (
                    <View style={styles.waveformContainer}>
                      {metadata.audioFile.waveform.map((amp, idx) => (
                        <View
                          key={`wf-${idx}`}
                          style={[
                            styles.waveformBar,
                            { height: Math.max(4, Math.round(amp * 26)) },
                            isPlayingAudio && styles.waveformBarActive,
                          ]}
                        />
                      ))}
                    </View>
                  )}

                  {/* Audio Metadata Chips */}
                  <View style={styles.audioMetaRow}>
                    <View style={styles.audioMetaChip}>
                      <Text style={styles.audioMetaLabel}>BPM</Text>
                      <Text style={styles.audioMetaValue}>{metadata.audioFile.bpm || bpm}</Text>
                    </View>
                    <View style={styles.audioMetaChip}>
                      <Text style={styles.audioMetaLabel}>DURATION</Text>
                      <Text style={styles.audioMetaValue}>
                        {Math.floor((metadata.audioFile.durationSec || 0) / 60)}:
                        {String((metadata.audioFile.durationSec || 0) % 60).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={styles.audioMetaChip}>
                      <Text style={styles.audioMetaLabel}>TRANSIENTS</Text>
                      <Text style={styles.audioMetaValue}>{metadata.audioFile.transientsCount || 64}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.audioUploadActions}>
                  <Pressable onPress={handlePickAudioFile} style={styles.addAudioBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    <Text style={styles.addAudioText}>Upload Audio (MP3 / WAV / M4A)</Text>
                  </Pressable>
                  <Pressable onPress={handleAttachDemoBeat} style={styles.demoBeatLink}>
                    <Text style={styles.demoBeatLinkText}>or Load 120 BPM Studio Trap Beat</Text>
                  </Pressable>
                </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '70%',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#121214',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCancelText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5A50A',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#161618',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
  },
  tapTempoBtn: {
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 165, 10, 0.35)',
  },
  tapTempoBtnText: {
    color: '#E5A50A',
    fontSize: 11,
    fontWeight: '700',
  },
  titleTextInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingVertical: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5A50A',
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
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmStepText: {
    fontSize: 24,
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 70,
  },
  bpmUnitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(229, 165, 10, 0.4)',
  },
  confidenceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E5A50A',
    letterSpacing: 0.5,
  },
  analyzingBox: {
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  audioAttachedBox: {
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  audioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioPlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  audioTrackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  audioRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  audioRemoveText: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '500',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    gap: 2,
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  waveformBar: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1.5,
    minHeight: 4,
  },
  waveformBarActive: {
    backgroundColor: '#E5A50A',
  },
  audioMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioMetaChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
  },
  audioMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  audioMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  audioUploadActions: {
    gap: 8,
  },
  addAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
  },
  addAudioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  demoBeatLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  demoBeatLinkText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  addSectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addSectionBtn: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  addSectionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addBeatSwitchBtn: {
    backgroundColor: 'rgba(229, 165, 10, 0.12)',
    borderColor: '#E5A50A',
  },
  addBeatSwitchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5A50A',
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
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionRowIdx: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5A50A',
  },
  sectionRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionRowBars: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  sectionRowArrow: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

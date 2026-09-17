import React, { useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  blockToText,
} from './cadenceFormat';
import { CadenceBarRow } from './CadenceBarRow';
import { SectionTimelineBar } from './SectionTimelineBar';
import type {
  AudioRecordingData,
  BeatMovement,
  FileAttachmentData,
  MediaAttachmentData,
  PaperSection,
  SectionType,
  SongMetadata,
  TextureArtifact,
} from './types';

interface TextureScreenProps {
  metadata: SongMetadata;
  movements: BeatMovement[];
  sections: PaperSection[];
  activeSectionId: string;
  formattedDateTime: string;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (type: SectionType, movementId: string) => void;
  onAddBeatSwitch: () => void;
  onUpdateBlockText: (sectionId: string, blockIndex: number, text: string) => void;
  onSaveSectionTexture: (sectionId: string, updatedTexture: TextureArtifact) => void;
  onOpenSongSettings: () => void;
  onOpenPhraseSelector?: (sectionId: string, blockIndex: number) => void;
  onBarTextChange?: (sectionId: string, blockIndex: number, barIndex: number, newText: string) => void;
  onAdvanceNextBar?: (sectionId: string, blockIndex: number, barIndex: number) => void;
  onBackspaceEmpty?: (sectionId: string, blockIndex: number, barIndex: number) => void;
  onRenameSection?: (sectionId: string, newName: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onToggleFavoriteSection?: (sectionId: string) => void;
  onReorderSections?: (reorderedSections: PaperSection[]) => void;
  onClose?: () => void;
}

export function TextureScreen({
  metadata,
  movements,
  sections,
  activeSectionId,
  formattedDateTime,
  onSelectSection,
  onAddSection,
  onAddBeatSwitch,
  onUpdateBlockText,
  onSaveSectionTexture,
  onOpenSongSettings,
  onOpenPhraseSelector,
  onBarTextChange,
  onAdvanceNextBar,
  onBackspaceEmpty,
  onRenameSection,
  onDeleteSection,
  onDuplicateSection,
  onToggleFavoriteSection,
  onReorderSections,
    onClose,
}: TextureScreenProps) {
  // Find active section (block)
  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];
  const activeBlock = activeSection?.blocks[0];
  const activeBlockIndex = activeBlock?.blockIndex || 1;

  // View mode for this block: 'freeform' (open writing space) vs 'bars' (cadence grid)
  const blockMode: 'freeform' | 'bars' = 'freeform';

  // Audio take playback state
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Focus tracking for Bars mode (null initially so full rhyme mapping renders on open)
  const [focusedBarIdx, setFocusedBarIdx] = useState<number | null>(null);

  // Active block text
  const currentBlockText = activeBlock ? blockToText(activeBlock) : '';

  // Texture attachments for active section
  const texture = activeSection?.texture || ({} as TextureArtifact);
  const mediaAttachments: MediaAttachmentData[] =
    texture.mediaAttachments && texture.mediaAttachments.length > 0
      ? texture.mediaAttachments
      : texture.mediaAttachment
      ? [texture.mediaAttachment]
      : [];
  const audioRecordings: AudioRecordingData[] =
    texture.audioRecordings && texture.audioRecordings.length > 0
      ? texture.audioRecordings
      : texture.audioRecording
      ? [texture.audioRecording]
      : [];
  const attachedFiles: FileAttachmentData[] = texture.attachedFiles || [];

  // Toggle Audio Playback
  const handleTogglePlayTake = (take: AudioRecordingData) => {
    if (!take.uri) return;

    if (Platform.OS === 'web') {
      if (playingTakeId === (take.id || take.uri) && currentAudioRef.current) {
        if (!currentAudioRef.current.paused) {
          currentAudioRef.current.pause();
          setPlayingTakeId(null);
          return;
        }
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      const audio = new Audio(take.uri);
      currentAudioRef.current = audio;
      setPlayingTakeId(take.id || take.uri);

      audio.play().catch(() => {});
      audio.onended = () => setPlayingTakeId(null);
    } else {
      setPlayingTakeId((prev) => (prev === (take.id || take.uri) ? null : take.id || take.uri));
    }
  };

  // Delete Handlers
  const handleDeleteMedia = (index: number) => {
    if (!activeSection) return;
    const updatedMedia = mediaAttachments.filter((_, i) => i !== index);
    onSaveSectionTexture(activeSection.id, {
      ...texture,
      mediaAttachments: updatedMedia,
      mediaAttachment: updatedMedia[0] || undefined,
    });
  };

  const handleDeleteAudioTake = (index: number) => {
    if (!activeSection) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setPlayingTakeId(null);
    const updatedRecordings = audioRecordings.filter((_, i) => i !== index);
    onSaveSectionTexture(activeSection.id, {
      ...texture,
      audioRecordings: updatedRecordings,
      audioRecording: updatedRecordings[0] || undefined,
    });
  };

  const handleDeleteFile = (id: string) => {
    if (!activeSection) return;
    const updatedFiles = attachedFiles.filter((f) => f.id !== id);
    onSaveSectionTexture(activeSection.id, {
      ...texture,
      attachedFiles: updatedFiles,
    });
  };

  return (
    <View style={styles.container}>
      {/* 1. Section Timeline Bar (Section contains Blocks) */}
      <SectionTimelineBar
        movements={movements}
        sections={sections}
        activeSectionId={activeSectionId}
        onSelectSection={(secId) => {
          onSelectSection(secId);
        }}
        onOpenTexture={(secId) => {
          onSelectSection(secId);
        }}
        onAddSection={onAddSection}
        onAddBeatSwitch={onAddBeatSwitch}
        onRenameSection={onRenameSection}
        onDeleteSection={onDeleteSection}
        onDuplicateSection={onDuplicateSection}
        onToggleFavoriteSection={onToggleFavoriteSection}
        onReorderSections={onReorderSections}
      />

      {/* 2. Main Open Paper Scroll Canvas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Title & Song Settings Header Row */}
        <View style={styles.headerSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Pressable onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, alignSelf: 'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Back to Cadence</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onOpenSongSettings}
            style={styles.titleRowPressable}
            accessibilityLabel="Tap to edit title, adjust BPM, or add audio file"
          >
            <Text style={styles.titleHeading}>{metadata.title || 'New Song'}</Text>
            <View style={styles.metaSettingsPill}>
              <Text style={styles.metaSettingsPillText}>
                {metadata.defaultBpm} BPM {metadata.audioFile ? '• Audio Beat' : '• Settings'}
              </Text>
            </View>
          </Pressable>

          <Text style={styles.dateText}>{formattedDateTime}</Text>
        </View>

        {/* 3. Open Writing Space (Completely Blank with 60% Opacity Placeholder) */}
        {blockMode === 'freeform' ? (
          <View style={styles.openWritingCanvas}>
            <TextInput
              value={currentBlockText}
              onChangeText={(newText) => {
                if (activeSection) {
                  onUpdateBlockText(activeSection.id, activeBlockIndex, newText);
                }
              }}
              multiline
              autoCapitalize="sentences"
              placeholder="Brainstorm your vision…"
              placeholderTextColor="rgba(142, 142, 147, 0.60)"
              style={[
                styles.openTextInput,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
            />
          </View>
        ) : (
          /* Cadence Bars Row Grid for this block */
          <View style={styles.cadenceBarsContainer}>
            {/* Column Labels */}
            <View style={styles.columnLabelsRow}>
              <Text style={styles.columnLabelLeft}>Bar</Text>
              <Text style={styles.columnLabelRight}>Syllable</Text>
            </View>

            {activeBlock?.bars.map((bar) => {
              const isActive = focusedBarIdx !== null && focusedBarIdx === bar.barIndex;
              return (
                <CadenceBarRow
                  key={bar.id}
                  bar={bar}
                  isActive={isActive}
                  isAlignedAcrossPage={true}
                  onFocus={() => setFocusedBarIdx(bar.barIndex)}
                  onChangeText={(txt) => {
                    if (activeSection && onBarTextChange) {
                      onBarTextChange(activeSection.id, activeBlockIndex, bar.barIndex, txt);
                    }
                  }}
                  onSubmitEditing={() => {
                    if (activeSection && onAdvanceNextBar) {
                      onAdvanceNextBar(activeSection.id, activeBlockIndex, bar.barIndex);
                    }
                  }}
                  onBackspaceEmpty={() => {
                    if (activeSection && onBackspaceEmpty) {
                      onBackspaceEmpty(activeSection.id, activeBlockIndex, bar.barIndex);
                    }
                  }}
                  onGutterPress={() => onOpenPhraseSelector?.(activeSection.id, activeBlockIndex)}
                />
              );
            })}
          </View>
        )}

        {/* 5. Attached Media, Voice Takes & Files (Apple Journal Style Cards) */}
        {(mediaAttachments.length > 0 || audioRecordings.length > 0 || attachedFiles.length > 0) && (
          <View style={styles.attachmentsSection}>
            <View style={styles.attachmentsHeaderRow}>
              <Text style={styles.attachmentsTitle}>Attached to {activeSection?.name}</Text>
            </View>

            {/* Photos & Captured Media Grid */}
            {mediaAttachments.length > 0 && (
              <View style={styles.mediaGrid}>
                {mediaAttachments.map((item, idx) => (
                  <View key={idx} style={styles.mediaCard}>
                    <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} resizeMode="cover" />
                    <Pressable
                      onPress={() => handleDeleteMedia(idx)}
                      style={styles.deleteBadgeBtn}
                      accessibilityLabel="Delete photo"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </Pressable>
                    {item.name && (
                      <View style={styles.mediaCaptionWrap}>
                        <Text style={styles.mediaCaptionText} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Voice Takes List */}
            {audioRecordings.length > 0 && (
              <View style={styles.audioTakesList}>
                {audioRecordings.map((take, idx) => {
                  const isPlaying = playingTakeId === (take.id || take.uri);
                  return (
                    <View key={take.id || idx} style={styles.audioTakeCard}>
                      <Pressable
                        onPress={() => handleTogglePlayTake(take)}
                        style={[styles.audioPlayBtn, isPlaying && styles.audioPlayBtnActive]}
                        accessibilityLabel={isPlaying ? 'Pause audio take' : 'Play audio take'}
                      >
                        {isPlaying ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginLeft: 1 }}>
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </Pressable>

                      <View style={styles.audioTakeInfo}>
                        <Text style={styles.audioTakeName}>{take.name || `Voice Take ${idx + 1}`}</Text>
                        <Text style={styles.audioTakeMeta}>
                          {take.durationSec ? `${take.durationSec}s` : 'Voice take'} {take.createdAt ? `• ${take.createdAt}` : ''}
                        </Text>
                      </View>

                      {/* Mini waveform bars */}
                      <View style={styles.miniWaveform}>
                        {Array.from({ length: 8 }).map((_, wIdx) => (
                          <View
                            key={wIdx}
                            style={[
                              styles.miniWaveformBar,
                              {
                                height: isPlaying ? ((wIdx * 5) % 18) + 6 : 8,
                                backgroundColor: isPlaying ? '#FF3B30' : '#8E8E93',
                              },
                            ]}
                          />
                        ))}
                      </View>

                      <Pressable
                        onPress={() => handleDeleteAudioTake(idx)}
                        style={styles.removeAudioBtn}
                        accessibilityLabel="Delete voice take"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <View style={styles.filesGrid}>
                {attachedFiles.map((file) => (
                  <View key={file.id} style={styles.filePillCard}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginRight: 8 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <View style={styles.fileTextCol}>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSizeText}>{file.size}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteFile(file.id)}
                      style={styles.removeFileBtn}
                      accessibilityLabel="Remove file"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Bottom spacer to account for floating JournalAccessoryBar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  metaSettingsPill: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaSettingsPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '400',
  },
  activeBlockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161618',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  blockTitleBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  blockTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  phrasePill: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phrasePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#3A3A3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  openWritingCanvas: {
    minHeight: 240,
    paddingVertical: 0,
  },
  openTextInput: {
    fontSize: 18,
    lineHeight: 28,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    minHeight: 180,
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  cadenceBarsContainer: {
    marginBottom: 20,
  },
  columnLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  columnLabelLeft: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.3,
  },
  columnLabelRight: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.3,
  },
  attachmentsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  attachmentsHeaderRow: {
    marginBottom: 12,
  },
  attachmentsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  mediaCard: {
    width: 110,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteBadgeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mediaCaptionWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mediaCaptionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  audioTakesList: {
    gap: 8,
    marginBottom: 16,
  },
  audioTakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  audioPlayBtnActive: {
    backgroundColor: '#FF453A',
  },
  audioPlayIcon: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  audioTakeInfo: {
    flex: 1,
  },
  audioTakeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  audioTakeMeta: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  miniWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 12,
    height: 20,
  },
  miniWaveformBar: {
    width: 2.5,
    borderRadius: 1,
  },
  removeAudioBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAudioText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  filesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  filePillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: 240,
  },
  fileIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  fileTextCol: {
    flex: 1,
    marginRight: 6,
  },
  fileNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fileSizeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  removeFileBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFileText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 90,
  },
});

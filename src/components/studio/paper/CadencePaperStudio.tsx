import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppleNotesFormatBar } from './AppleNotesFormatBar';
import {
  createBeatSwitchMovement,
  createEmptyCadenceBlock,
  createInitialSongState,
  createSection,
  lyricsToCadenceBlocks,
  reindexSectionsGlobalBars,
  sectionsToLyrics,
  setBlockBarCount,
  toggleBarFormatting,
  updateBarText,
  updateBlockFromText,
} from './cadenceFormat';
import { CadenceBarRow } from './CadenceBarRow';
import { PhraseSelectorModal } from './PhraseSelectorModal';
import { SectionTextureModal } from './SectionTextureModal';
import { SectionTimelineBar } from './SectionTimelineBar';
import { SongSettingsModal } from './SongSettingsModal';
import { SongWhiteboardModal } from './SongWhiteboardModal';
import { TextureScreen } from './TextureScreen';
import type {
  BeatMovement,
  PaperFormatState,
  PaperSection,
  PhrasePreset,
  SectionType,
  SongMetadata,
  TextureArtifact,
} from './types';

interface CadencePaperStudioProps {
  initialTitle?: string;
  initialLyrics?: string;
  onLyricsChange?: (lyrics: string) => void;
  onClose?: () => void;
}

export function CadencePaperStudio({
  initialTitle = 'New Song',
  initialLyrics = '',
  onLyricsChange,
  onClose,
}: CadencePaperStudioProps) {
  // 1. Initial State Setup
  const [initialData] = useState(() => {
    const defaultState = createInitialSongState();
    if (initialTitle && initialTitle !== 'New Song') {
      defaultState.metadata.title = initialTitle;
    }
    // If external non-empty lyrics were supplied, populate initial section
    if (initialLyrics && initialLyrics.trim().length > 0) {
      const parsedBlocks = lyricsToCadenceBlocks(initialLyrics, 1);
      defaultState.sections[0].blocks = parsedBlocks;
    }
    return defaultState;
  });

  const [metadata, setMetadata] = useState<SongMetadata>(initialData.metadata);
  const [movements, setMovements] = useState<BeatMovement[]>(initialData.movements);
  const [sections, setSections] = useState<PaperSection[]>(initialData.sections);
  const [activeSectionId, setActiveSectionId] = useState<string>(initialData.sections[0]?.id || '');
  const [viewMode, setViewMode] = useState<'cadence' | 'texture'>('cadence');

  // Formatted Date & Time
  const formattedDateTime = useMemo(() => {
    const now = new Date();
    return (
      now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' at ' +
      now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  }, []);

  // 2. Undo / Redo History
  const [history, setHistory] = useState<PaperSection[][]>([initialData.sections]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback(
    (newSections: PaperSection[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newSections].slice(-50);
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevSections = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setSections(prevSections);
      onLyricsChange?.(sectionsToLyrics(prevSections));
    }
  }, [history, historyIndex, onLyricsChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextSections = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setSections(nextSections);
      onLyricsChange?.(sectionsToLyrics(nextSections));
    }
  }, [history, historyIndex, onLyricsChange]);

  // Block text updater for Texture writing mode
  const handleUpdateBlockText = useCallback(
    (sectionId: string, blockIndex: number, newText: string) => {
      const updatedSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updatedBlocks = updateBlockFromText(sec.blocks, blockIndex, newText);
        return { ...sec, blocks: updatedBlocks };
      });
      const reindexed = reindexSectionsGlobalBars(updatedSections);
      setSections(reindexed);
      pushHistory(reindexed);
      onLyricsChange?.(sectionsToLyrics(reindexed));
    },
    [sections, pushHistory, onLyricsChange],
  );

  const handleSaveWhiteboard = useCallback((updatedWhiteboard: TextureArtifact) => {
    setMetadata((prev) => ({
      ...prev,
      whiteboard: updatedWhiteboard,
    }));
  }, []);

  // 3. Modals State
  const [songSettingsVisible, setSongSettingsVisible] = useState<boolean>(false);
  const [whiteboardModalVisible, setWhiteboardModalVisible] = useState<boolean>(false);
  const [textureModal, setTextureModal] = useState<{
    visible: boolean;
    section: PaperSection | null;
  }>({
    visible: false,
    section: null,
  });

  const [phraseModal, setPhraseModal] = useState<{
    visible: boolean;
    sectionId: string;
    blockIndex: number;
    currentPreset: PhrasePreset;
    currentBarCount: number;
  }>({
    visible: false,
    sectionId: '',
    blockIndex: 1,
    currentPreset: '4/4',
    currentBarCount: 4,
  });

  // Formatting state
  const [formatState, setFormatState] = useState<PaperFormatState>({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    headingStyle: 'body',
  });
  const [showFormatBar, setShowFormatBar] = useState<boolean>(false);

  // Active focused bar
  const [activeFocus, setActiveFocus] = useState<{
    sectionId: string;
    blockIndex: number;
    barIndex: number;
  }>({
    sectionId: initialData.sections[0]?.id || '',
    blockIndex: 1,
    barIndex: 1,
  });

  // Scroll View Ref and section layouts for single-tap navigation
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionLayoutsRef = useRef<{ [sectionId: string]: number }>({});

  const handleSectionLayout = (sectionId: string, y: number) => {
    sectionLayoutsRef.current[sectionId] = y;
  };

  const handleSelectSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    const y = sectionLayoutsRef.current[sectionId];
    if (typeof y === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }
  }, []);

  // 4. Section & Movement Management
  const handleAddNewSection = useCallback(
    (type: SectionType, movementId: string) => {
      // Calculate starting global bar
      const totalCurrentBars = sections.reduce(
        (acc, sec) => acc + sec.blocks.reduce((bAcc, b) => bAcc + b.bars.length, 0),
        0,
      );
      const newSec = createSection(type, movementId, sections, totalCurrentBars + 1);

      const updatedMovements = movements.map((m) =>
        m.id === movementId ? { ...m, sectionIds: [...m.sectionIds, newSec.id] } : m,
      );
      const updatedSections = reindexSectionsGlobalBars([...sections, newSec]);

      setMovements(updatedMovements);
      setSections(updatedSections);
      setActiveSectionId(newSec.id);
      pushHistory(updatedSections);

      onLyricsChange?.(sectionsToLyrics(updatedSections));
    },
    [movements, sections, pushHistory, onLyricsChange],
  );

  const handleAddBeatSwitch = useCallback(() => {
    const newMovement = createBeatSwitchMovement(movements, metadata.defaultBpm);
    const totalCurrentBars = sections.reduce(
      (acc, sec) => acc + sec.blocks.reduce((bAcc, b) => bAcc + b.bars.length, 0),
      0,
    );
    const firstSection = createSection('verse', newMovement.id, sections, totalCurrentBars + 1);
    newMovement.sectionIds.push(firstSection.id);

    const updatedMovements = [...movements, newMovement];
    const updatedSections = reindexSectionsGlobalBars([...sections, firstSection]);

    setMovements(updatedMovements);
    setSections(updatedSections);
    setActiveSectionId(firstSection.id);
    pushHistory(updatedSections);

    onLyricsChange?.(sectionsToLyrics(updatedSections));
  }, [movements, sections, metadata.defaultBpm, pushHistory, onLyricsChange]);

  // Update text of a bar in a section
  const handleBarTextChange = useCallback(
    (sectionId: string, blockIndex: number, barIndex: number, newText: string) => {
      const updatedSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updatedBlocks = updateBarText(sec.blocks, blockIndex, barIndex, newText);
        return { ...sec, blocks: updatedBlocks };
      });

      setSections(updatedSections);
      pushHistory(updatedSections);
      onLyricsChange?.(sectionsToLyrics(updatedSections));
    },
    [sections, pushHistory, onLyricsChange],
  );

  // Advance to next bar on Enter
  const handleAdvanceNextBar = useCallback(
    (currentSectionId: string, currentBlockIdx: number, currentBarIdx: number) => {
      const sec = sections.find((s) => s.id === currentSectionId);
      if (!sec) return;

      const currentBlock = sec.blocks.find((b) => b.blockIndex === currentBlockIdx);
      const totalBarsInBlock = currentBlock ? currentBlock.bars.length : 4;

      if (currentBarIdx < totalBarsInBlock) {
        setActiveFocus({
          sectionId: currentSectionId,
          blockIndex: currentBlockIdx,
          barIndex: currentBarIdx + 1,
        });
      } else {
        // Next block in section, or create new block in section
        const nextBlockIdx = currentBlockIdx + 1;
        if (nextBlockIdx > sec.blocks.length) {
          const totalGlobalBars = sections.reduce(
            (acc, s) => acc + s.blocks.reduce((bAcc, b) => bAcc + b.bars.length, 0),
            0,
          );
          const newBlock = createEmptyCadenceBlock(nextBlockIdx, totalGlobalBars + 1);
          const updatedSections = sections.map((s) =>
            s.id === currentSectionId ? { ...s, blocks: [...s.blocks, newBlock] } : s,
          );
          const reindexed = reindexSectionsGlobalBars(updatedSections);
          setSections(reindexed);
          pushHistory(reindexed);
        }
        setActiveFocus({
          sectionId: currentSectionId,
          blockIndex: nextBlockIdx,
          barIndex: 1,
        });
      }
    },
    [sections, pushHistory],
  );

  // Backspace on empty bar: navigate to previous bar
  const handleBackspaceEmpty = useCallback(
    (currentSectionId: string, currentBlockIdx: number, currentBarIdx: number) => {
      if (currentBarIdx > 1) {
        setActiveFocus({
          sectionId: currentSectionId,
          blockIndex: currentBlockIdx,
          barIndex: currentBarIdx - 1,
        });
      } else if (currentBlockIdx > 1) {
        const sec = sections.find((s) => s.id === currentSectionId);
        const prevBlock = sec?.blocks.find((b) => b.blockIndex === currentBlockIdx - 1);
        const prevBlockLastBar = prevBlock ? prevBlock.bars.length : 4;
        setActiveFocus({
          sectionId: currentSectionId,
          blockIndex: currentBlockIdx - 1,
          barIndex: prevBlockLastBar,
        });
      }
    },
    [sections],
  );

  // Phrase selector handlers
  const handleOpenPhraseSelector = useCallback(
    (sectionId: string, blockIndex: number) => {
      const sec = sections.find((s) => s.id === sectionId);
      const block = sec?.blocks.find((b) => b.blockIndex === blockIndex);
      if (sec && block) {
        setPhraseModal({
          visible: true,
          sectionId,
          blockIndex,
          currentPreset: block.phrasePreset || '4/4',
          currentBarCount: block.bars.length,
        });
      }
    },
    [sections],
  );

  const handleSelectPhrasePreset = useCallback(
    (preset: PhrasePreset, barCount: number) => {
      const updatedSections = sections.map((sec) => {
        if (sec.id !== phraseModal.sectionId) return sec;
        const updatedBlocks = setBlockBarCount(sec.blocks, phraseModal.blockIndex, barCount, preset);
        return { ...sec, blocks: updatedBlocks };
      });

      const reindexed = reindexSectionsGlobalBars(updatedSections);
      setSections(reindexed);
      pushHistory(reindexed);
      onLyricsChange?.(sectionsToLyrics(reindexed));
    },
    [sections, phraseModal, pushHistory, onLyricsChange],
  );

  // Formatting toggles on active bar
  const handleToggleFormat = useCallback(
    (format: 'italic' | 'underline' | 'bold') => {
      const { sectionId, blockIndex, barIndex } = activeFocus;
      const updatedSections = sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updatedBlocks = toggleBarFormatting(sec.blocks, blockIndex, barIndex, format);
        return { ...sec, blocks: updatedBlocks };
      });

      setSections(updatedSections);
      pushHistory(updatedSections);

      setFormatState((prev) => ({
        ...prev,
        isBold: format === 'bold' ? !prev.isBold : prev.isBold,
        isItalic: format === 'italic' ? !prev.isItalic : prev.isItalic,
        isUnderline: format === 'underline' ? !prev.isUnderline : prev.isUnderline,
      }));
    },
    [activeFocus, sections, pushHistory],
  );

  // Texture save handler
  const handleSaveSectionTexture = useCallback(
    (updatedSection: PaperSection) => {
      const updatedSections = sections.map((s) =>
        s.id === updatedSection.id ? updatedSection : s,
      );
      setSections(updatedSections);
      pushHistory(updatedSections);
    },
    [sections, pushHistory],
  );

  const handleUpdateSectionTexture = useCallback(
    (sectionId: string, updatedTexture: TextureArtifact) => {
      const updatedSections = sections.map((s) =>
        s.id === sectionId ? { ...s, texture: updatedTexture } : s,
      );
      setSections(updatedSections);
      pushHistory(updatedSections);
    },
    [sections, pushHistory],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <View style={styles.navLeft}>
          <Pressable
            onPress={() => {
              // Intentionally inert for now as requested
            }}
            style={styles.navIconButton}
            accessibilityRole="button"
            accessibilityLabel="Notes"
          >
            {Platform.OS === 'web' ? (
              <svg width="13" height="21" viewBox="0 0 12 20" fill="none" stroke="#E5A50A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginRight: 4 }}>
                <path d="M10 2 L2 10 L10 18" />
              </svg>
            ) : (
              <Text style={styles.navBackIcon}>‹</Text>
            )}
            <Text style={styles.navBackText}>Notes</Text>
          </Pressable>
        </View>

        {/* Nav Center: Cadence vs Texture Mode Switcher */}
        <View style={styles.navCenter}>
          <View style={styles.modeSegmented}>
            <Pressable
              onPress={() => setViewMode('cadence')}
              style={[styles.modeSegmentBtn, viewMode === 'cadence' && styles.modeSegmentBtnActive]}
              accessibilityRole="tab"
              accessibilityLabel="Cadence View"
            >
              <Text
                style={[
                  styles.modeSegmentText,
                  viewMode === 'cadence' && styles.modeSegmentTextActive,
                ]}
              >
                Cadence
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('texture')}
              style={[styles.modeSegmentBtn, viewMode === 'texture' && styles.modeSegmentBtnActive]}
              accessibilityRole="tab"
              accessibilityLabel="Texture View"
            >
              <Text
                style={[
                  styles.modeSegmentText,
                  viewMode === 'texture' && styles.modeSegmentTextActive,
                ]}
              >
                Texture
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.navRight}>
          <Pressable
            onPress={handleUndo}
            disabled={historyIndex <= 0}
            style={[styles.navIconButton, historyIndex <= 0 && styles.navButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Undo"
          >
            {Platform.OS === 'web' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={historyIndex <= 0 ? 'rgba(229, 165, 10, 0.35)' : '#E5A50A'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            ) : (
              <Text style={styles.navActionIcon}>↺</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleRedo}
            disabled={historyIndex >= history.length - 1}
            style={[
              styles.navIconButton,
              historyIndex >= history.length - 1 && styles.navButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Redo"
          >
            {Platform.OS === 'web' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={historyIndex >= history.length - 1 ? 'rgba(229, 165, 10, 0.35)' : '#E5A50A'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            ) : (
              <Text style={styles.navActionIcon}>↻</Text>
            )}
          </Pressable>

          {/* Inspiration / Texture Screen Toggle */}
          <Pressable
            onPress={() => setViewMode((m) => (m === 'texture' ? 'cadence' : 'texture'))}
            style={[styles.navIconButton, viewMode === 'texture' && styles.navIconButtonActive]}
            accessibilityRole="button"
            accessibilityLabel="Toggle Texture Mode"
          >
            {Platform.OS === 'web' ? (
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke={viewMode === 'texture' ? '#D97706' : '#E5A50A'}
                strokeWidth={viewMode === 'texture' ? '2.3' : '1.9'}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block' }}
              >
                {/* 4-point inspiration star matching Apple Notes & Journal references */}
                <path d="M12 2.5 L14.3 8.6 C14.7 9.6 15.5 10.4 16.5 10.8 L22.6 13 L16.5 15.2 C15.5 15.6 14.7 16.4 14.3 17.4 L12 23.5 L9.7 17.4 C9.3 16.4 8.5 15.6 7.5 15.2 L1.4 13 L7.5 10.8 C8.5 10.4 9.3 9.6 9.7 8.6 Z" />
                <path d="M19 3.5 L19.7 5.2 L21.4 5.9 L19.7 6.6 L19 8.3 L18.3 6.6 L16.6 5.9 L18.3 5.2 Z" fill="#E5A50A" stroke="none" opacity="0.9" />
              </svg>
            ) : (
              <Text style={styles.navActionIcon}>✦</Text>
            )}
          </Pressable>

          {/* Format Toolbar Button */}
          <Pressable
            onPress={() => setShowFormatBar((v) => !v)}
            style={styles.navIconButton}
            accessibilityRole="button"
            accessibilityLabel="Formatting"
          >
            <Text style={[styles.navActionIcon, showFormatBar && styles.navActionIconActive]}>Aa</Text>
          </Pressable>

          {/* Done Checkmark */}
          <Pressable
            onPress={() => {
              // Intentionally inert for now as requested
            }}
            style={styles.doneCheckButton}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            {Platform.OS === 'web' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M20 6 L9 17 L4 12" />
              </svg>
            ) : (
              <Text style={styles.doneCheckText}>✓</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Main Screen Mode: Texture vs Cadence */}
      {viewMode === 'texture' ? (
        <TextureScreen
          metadata={metadata}
          movements={movements}
          sections={sections}
          activeSectionId={activeSectionId}
          formattedDateTime={formattedDateTime}
          onSelectSection={handleSelectSection}
          onAddSection={handleAddNewSection}
          onAddBeatSwitch={handleAddBeatSwitch}
          onUpdateBlockText={handleUpdateBlockText}
          onSaveSectionTexture={handleUpdateSectionTexture}
          onOpenSongSettings={() => setSongSettingsVisible(true)}
        />
      ) : (
        <>
          {/* 2. Section Timeline & Movement Bar */}
          <SectionTimelineBar
            movements={movements}
            sections={sections}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
            onOpenTexture={(secId) => {
              handleSelectSection(secId);
              setViewMode('texture');
            }}
            onAddSection={handleAddNewSection}
            onAddBeatSwitch={handleAddBeatSwitch}
          />

      {/* 3. Main Paper Canvas */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.paperScrollView}
        contentContainerStyle={styles.paperScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Title & Song Settings Header Row */}
        <View style={styles.headerSection}>
          <Pressable
            onPress={() => setSongSettingsVisible(true)}
            style={styles.titleRowPressable}
            accessibilityLabel="Tap to edit title, adjust BPM, or add audio file"
          >
            <Text style={styles.titleHeading}>{metadata.title || 'New Song'}</Text>
            <View style={styles.metaSettingsPill}>
              <Text style={styles.metaSettingsPillText}>
                {metadata.defaultBpm} BPM {metadata.audioFile ? '• Beat Audio' : '• Settings'}
              </Text>
            </View>
          </Pressable>

          <Text style={styles.dateText}>{formattedDateTime}</Text>
        </View>

        {/* Column Labels: "Bar" on left, "Syllable" on right */}
        <View style={styles.columnLabelsRow}>
          <Text style={styles.columnLabelLeft}>Bar</Text>
          <Text style={styles.columnLabelRight}>Syllable</Text>
        </View>

        {/* 4. Movements & Sections Canvas */}
        <View style={styles.sectionsContainer}>
          {movements.map((movement, mIdx) => {
            const movementSections = sections.filter((s) => s.movementId === movement.id);

            return (
              <View key={movement.id} style={styles.movementCanvasGroup}>
                {/* Beat Switch Visual Divider */}
                {mIdx > 0 && (
                  <View style={styles.beatSwitchDivider}>
                    <View style={styles.beatSwitchDividerLine} />
                    <View style={styles.beatSwitchBadgeCanvas}>
                      <Text style={styles.beatSwitchBadgeText}>
                        {movement.name.toUpperCase()} • {movement.bpm} BPM
                      </Text>
                    </View>
                    <View style={styles.beatSwitchDividerLine} />
                  </View>
                )}

                {/* Render Each Section in Movement */}
                {movementSections.map((sec) => (
                  <View
                    key={sec.id}
                    onLayout={(e) => handleSectionLayout(sec.id, e.nativeEvent.layout.y)}
                    style={styles.sectionCanvasBlock}
                  >
                    {/* Section Header: Name, Phrase length, and Texture Button */}
                    <View style={styles.sectionHeaderBar}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitleText}>{sec.name}</Text>
                        <Pressable
                          onPress={() => handleOpenPhraseSelector(sec.id, sec.blocks[0]?.blockIndex || 1)}
                          style={styles.sectionPhrasePill}
                          accessibilityLabel="Change section phrase length"
                        >
                          <Text style={styles.sectionPhrasePillText}>
                            PHRASE {sec.blocks[0]?.phrasePreset || '4/4'} •{' '}
                            {sec.blocks.reduce((acc, b) => acc + b.bars.length, 0)} BARS ▾
                          </Text>
                        </Pressable>
                      </View>

                      {/* Texture Button */}
                      <Pressable
                        onPress={() => {
                          handleSelectSection(sec.id);
                          setViewMode('texture');
                        }}
                        style={styles.textureBadgeBtn}
                        accessibilityLabel="Open Texture Screen for this block"
                      >
                        <Text style={styles.textureBadgeText}>Texture</Text>
                      </Pressable>
                    </View>

                    {/* Cadence Blocks in this Section */}
                    {sec.blocks.map((block) => {
                      const nonBlankLinesCount = block.bars.filter(
                        (b) => b.rawText.trim().length > 0,
                      ).length;
                      const hasMultipleLines = nonBlankLinesCount > 1;

                      return (
                        <View key={block.id} style={styles.blockRowGroup}>
                          {block.bars.map((bar) => {
                            const isActive =
                              activeFocus.sectionId === sec.id &&
                              activeFocus.blockIndex === block.blockIndex &&
                              activeFocus.barIndex === bar.barIndex;

                            const isAlignedAcrossPage =
                              hasMultipleLines || bar.rawText.length > 18;

                            return (
                              <CadenceBarRow
                                key={bar.id}
                                bar={bar}
                                isActive={isActive}
                                isAlignedAcrossPage={isAlignedAcrossPage}
                                onFocus={() =>
                                  setActiveFocus({
                                    sectionId: sec.id,
                                    blockIndex: block.blockIndex,
                                    barIndex: bar.barIndex,
                                  })
                                }
                                onChangeText={(txt) =>
                                  handleBarTextChange(sec.id, block.blockIndex, bar.barIndex, txt)
                                }
                                onSubmitEditing={() =>
                                  handleAdvanceNextBar(sec.id, block.blockIndex, bar.barIndex)
                                }
                                onBackspaceEmpty={() =>
                                  handleBackspaceEmpty(sec.id, block.blockIndex, bar.barIndex)
                                }
                                onGutterPress={() =>
                                  handleOpenPhraseSelector(sec.id, block.blockIndex)
                                }
                              />
                            );
                          })}

                          {/* Cadence Gap between blocks */}
                          <View style={styles.cadenceGap} />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  )}

      {/* 5. Apple Notes Format Toolbar at Bottom */}
      {showFormatBar && (
        <AppleNotesFormatBar
          formatState={formatState}
          onToggleBold={() => handleToggleFormat('bold')}
          onToggleItalic={() => handleToggleFormat('italic')}
          onToggleUnderline={() => handleToggleFormat('underline')}
          onChangeHeadingStyle={(style) =>
            setFormatState((prev) => ({ ...prev, headingStyle: style }))
          }
          onSave={() => onLyricsChange?.(sectionsToLyrics(sections))}
          onCopy={() => {
            const lyrics = sectionsToLyrics(sections);
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(lyrics);
            }
          }}
          onClose={() => setShowFormatBar(false)}
        />
      )}

      {/* 6. Modals */}
      {/* Song Settings Modal */}
      <SongSettingsModal
        visible={songSettingsVisible}
        metadata={metadata}
        movements={movements}
        sections={sections}
        onClose={() => setSongSettingsVisible(false)}
        onUpdateTitle={(newTitle) => setMetadata((prev) => ({ ...prev, title: newTitle }))}
        onUpdateBpm={(newBpm) => setMetadata((prev) => ({ ...prev, defaultBpm: newBpm }))}
        onAttachAudio={(audioInfo) => setMetadata((prev) => ({ ...prev, audioFile: audioInfo }))}
        onAddSection={handleAddNewSection}
        onAddBeatSwitch={handleAddBeatSwitch}
        onSelectSection={handleSelectSection}
      />

      {/* Section Texture Modal (Apple Journal UI) */}
      <SectionTextureModal
        visible={textureModal.visible}
        section={textureModal.section}
        onClose={() => setTextureModal({ visible: false, section: null })}
        onSave={handleSaveSectionTexture}
      />

      {/* Song Whiteboard Modal */}
      <SongWhiteboardModal
        visible={whiteboardModalVisible}
        metadata={metadata}
        onClose={() => setWhiteboardModalVisible(false)}
        onSave={(updatedWhiteboard) =>
          setMetadata((prev) => ({ ...prev, whiteboard: updatedWhiteboard }))
        }
      />

      {/* Section Phrase Length Selector Modal (4/4, 4/8, 4/16, -/-) */}
      <PhraseSelectorModal
        visible={phraseModal.visible}
        blockIndex={phraseModal.blockIndex}
        currentPreset={phraseModal.currentPreset}
        currentBarCount={phraseModal.currentBarCount}
        onSelectPreset={handleSelectPhrasePreset}
        onClose={() => setPhraseModal((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegmented: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 2,
  },
  modeSegmentBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  modeSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  modeSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modeSegmentTextActive: {
    color: '#E5A50A',
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  navIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
  },
  navIconButtonActive: {
    backgroundColor: '#FFF8E7',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navBackIcon: {
    fontSize: 28,
    color: '#E5A50A',
    marginRight: 4,
    fontWeight: '300',
    lineHeight: 28,
  },
  navBackText: {
    fontSize: 17,
    color: '#E5A50A',
    fontWeight: '400',
  },
  navActionIcon: {
    fontSize: 20,
    color: '#E5A50A',
    fontWeight: '600',
  },
  navActionIconActive: {
    color: '#D97706',
    fontWeight: '800',
  },
  doneCheckButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5A50A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheckText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  paperScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  paperScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    marginBottom: 16,
    gap: 4,
  },
  titleRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleHeading: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    flex: 1,
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
  },
  metaSettingsPill: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  metaSettingsPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  columnLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#D1D1D6',
  },
  columnLabelLeft: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  columnLabelRight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionsContainer: {
    marginTop: 4,
  },
  movementCanvasGroup: {
    marginBottom: 12,
  },
  beatSwitchDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  beatSwitchDividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#F39C12',
  },
  beatSwitchBadgeCanvas: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  beatSwitchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 0.6,
  },
  sectionCanvasBlock: {
    marginBottom: 16,
  },
  sectionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionPhrasePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionPhrasePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  textureBadgeBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  textureMoodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textureMoodTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  blockRowGroup: {
    marginBottom: 4,
  },
  cadenceGap: {
    height: 18,
  },
});

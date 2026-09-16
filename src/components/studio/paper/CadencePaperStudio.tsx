import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppleNotesFormatBar } from './AppleNotesFormatBar';
import {
  createBeatSwitchMovement,
  createEmptyCadenceBlock,
  createInitialSongState,
  createSection,
  lyricsToCadenceBlocks,
  pasteLinesIntoSections,
  reindexSectionsGlobalBars,
  sectionsToLyrics,
  setBlockBarCount,
  toggleBarFormatting,
  updateBarText,
  updateBlockFromText,
  updateSectionsFromLyrics,
} from './cadenceFormat';
import { analyzeVerseRhymes, type VerseRhymeToken } from '../../../services/rhymeDetectionEngine';
import { colorForFamily } from '../../../theme/theme';
import { SyllableInspectorModal, type SyllableOverride } from '../SyllableInspectorModal';
import type { EnunciationOption, EnunciationContext } from '../../../services/enunciationEngine';
import { CadenceBarRow } from './CadenceBarRow';
import { PhraseSelectorModal } from './PhraseSelectorModal';
import { SectionTextureModal } from './SectionTextureModal';
import { SectionTimelineBar } from './SectionTimelineBar';
import { SongSettingsModal } from './SongSettingsModal';
import { SongWhiteboardModal } from './SongWhiteboardModal';
import { TextureScreen } from './TextureScreen';
import type {
  BeatMovement,
  CrossBarAlignment,
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
  const [showBars, setShowBars] = useState<boolean>(true);
  const [showRhymeMap, setShowRhymeMap] = useState<boolean>(true);

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

  // Single blank text field state for Bars Off mode
  const rawSongLyrics = useMemo(() => sectionsToLyrics(sections), [sections]);
  const [blankText, setBlankText] = useState<string>(rawSongLyrics);
  const blankInputRef = useRef<TextInput>(null);

  // Synchronize blankText when sections change externally (e.g. undo/redo, initial lyrics, or Bars On edits)
  React.useEffect(() => {
    setBlankText((prev) => {
      if (prev === rawSongLyrics) return prev;
      return rawSongLyrics;
    });
  }, [rawSongLyrics]);

  const handleBlankTextChange = useCallback(
    (newText: string) => {
      setBlankText(newText);
      const updatedSections = updateSectionsFromLyrics(sections, newText);
      setSections(updatedSections);
      pushHistory(updatedSections);
      onLyricsChange?.(newText);
    },
    [sections, pushHistory, onLyricsChange],
  );

  const handleSaveWhiteboard = useCallback((updatedWhiteboard: TextureArtifact) => {
    setMetadata((prev) => ({
      ...prev,
      whiteboard: updatedWhiteboard,
    }));
  }, []);

  // 2.5 Multi-line Rhyme Map Analysis Engine (Connected Components & Color Inheritance)
  const flatBarLines = useMemo(() => {
    const list: Array<{ lineText: string; sectionId: string; blockIndex: number; barIndex: number }> = [];
    sections.forEach((sec) => {
      sec.blocks.forEach((blk) => {
        blk.bars.forEach((bar) => {
          list.push({
            lineText: bar.rawText,
            sectionId: sec.id,
            blockIndex: blk.blockIndex,
            barIndex: bar.barIndex,
          });
        });
      });
    });
    return list;
  }, [sections]);

  // Word & Syllable Manual Overrides & Inspector Modal State
  const [inspectorModalData, setInspectorModalData] = useState<{
    visible: boolean;
    wordText: string;
    lineIndex: number;
    wordIndex: number;
    syllables: VerseRhymeToken[];
    initialSyllableIndex: number;
    surroundingContext?: EnunciationContext;
  }>({
    visible: false,
    wordText: '',
    lineIndex: 0,
    wordIndex: 0,
    syllables: [],
    initialSyllableIndex: 0,
  });
  const [isEditingBlankText, setIsEditingBlankText] = useState<boolean>(false);
  const [syllableOverrides, setSyllableOverrides] = useState<Map<string, SyllableOverride>>(new Map());

  const verseRhymeAnalysis = useMemo(() => {
    if (!showRhymeMap) return null;
    const lines = flatBarLines.map((b) => b.lineText);
    if (!lines.some((l) => l.trim().length > 0)) return null;
    const raw = analyzeVerseRhymes(lines);
    if (syllableOverrides.size === 0) return raw;

    const applyOverrideToSyllable = (tok: VerseRhymeToken) => {
      const l = tok.lineIndex ?? 0;
      const w = tok.wordIndex ?? 0;
      const s = tok.syllableIndex ?? 0;
      const t = tok.text.trim().toLowerCase();

      const override =
        syllableOverrides.get(`${l}:${w}:${s}:${t}`) ||
        syllableOverrides.get(`${l}:${w}:${s}`);

      if (!override) return tok;
      const colorId = override.colorId !== undefined ? override.colorId : tok.colorId;
      return {
        ...tok,
        colorId,
        color: colorId > 0 ? colorForFamily(colorId) : '#FFFFFF',
        stress: override.stress !== undefined ? override.stress : tok.stress,
        gridPosition: override.gridPos !== undefined ? override.gridPos : tok.gridPosition,
      };
    };

    const updatedLineSyllables = raw.lineSyllables.map((tokens) =>
      tokens.map(applyOverrideToSyllable),
    );

    const updatedLineTokens = raw.lineTokens.map((tokens, li) =>
      tokens.map((tok) => {
        if (!tok.isWord) return tok;
        const l = tok.lineIndex ?? li;
        const w = tok.wordIndex ?? 0;

        const wordSylls = updatedLineSyllables[li]?.filter(
          (s) => (s.wordIndex ?? 0) === w && (s.lineIndex ?? li) === l,
        ) || [];

        const primarySyll =
          wordSylls.find((s) => s.stress !== undefined && s.stress >= 1 && s.colorId > 0) ||
          wordSylls.find((s) => s.colorId > 0) ||
          wordSylls[0];

        const finalColorId = primarySyll ? primarySyll.colorId : tok.colorId;
        const finalStress = primarySyll ? primarySyll.stress : tok.stress;

        return {
          ...tok,
          colorId: finalColorId,
          color: finalColorId > 0 ? colorForFamily(finalColorId) : '#FFFFFF',
          stress: finalStress,
        };
      }),
    );

    return {
      ...raw,
      lineTokens: updatedLineTokens,
      lineSyllables: updatedLineSyllables,
    };
  }, [showRhymeMap, flatBarLines, syllableOverrides]);

  const barTokensMap = useMemo(() => {
    const map = new Map<string, { words: VerseRhymeToken[]; syllables: VerseRhymeToken[] }>();
    if (!verseRhymeAnalysis) return map;
    flatBarLines.forEach((b, idx) => {
      const key = `${b.sectionId}:${b.blockIndex}:${b.barIndex}`;
      map.set(key, {
        words: verseRhymeAnalysis.lineTokens[idx] || [],
        syllables: verseRhymeAnalysis.lineSyllables[idx] || [],
      });
    });
    return map;
  }, [flatBarLines, verseRhymeAnalysis]);

  // Blank field rhyme analysis for Bars Off mode
  const blankVerseLines = useMemo(() => blankText.split('\n'), [blankText]);
  const blankRhymeAnalysis = useMemo(() => {
    if (!showRhymeMap || !blankText.trim()) return null;
    const raw = analyzeVerseRhymes(blankVerseLines);
    if (syllableOverrides.size === 0) return raw;

    const applyOverrideToSyllable = (tok: VerseRhymeToken) => {
      const l = tok.lineIndex ?? 0;
      const w = tok.wordIndex ?? 0;
      const s = tok.syllableIndex ?? 0;
      const t = tok.text.trim().toLowerCase();

      const override =
        syllableOverrides.get(`${l}:${w}:${s}:${t}`) ||
        syllableOverrides.get(`${l}:${w}:${s}`);

      if (!override) return tok;
      const colorId = override.colorId !== undefined ? override.colorId : tok.colorId;
      return {
        ...tok,
        colorId,
        color: colorId > 0 ? colorForFamily(colorId) : '#FFFFFF',
        stress: override.stress !== undefined ? override.stress : tok.stress,
        gridPosition: override.gridPos !== undefined ? override.gridPos : tok.gridPosition,
      };
    };

    const updatedLineSyllables = raw.lineSyllables.map((tokens) =>
      tokens.map(applyOverrideToSyllable),
    );

    const updatedLineTokens = raw.lineTokens.map((tokens, li) =>
      tokens.map((tok) => {
        if (!tok.isWord) return tok;
        const l = tok.lineIndex ?? li;
        const w = tok.wordIndex ?? 0;

        const wordSylls = updatedLineSyllables[li]?.filter(
          (s) => (s.wordIndex ?? 0) === w && (s.lineIndex ?? li) === l,
        ) || [];

        const primarySyll =
          wordSylls.find((s) => s.stress !== undefined && s.stress >= 1 && s.colorId > 0) ||
          wordSylls.find((s) => s.colorId > 0) ||
          wordSylls[0];

        const finalColorId = primarySyll ? primarySyll.colorId : tok.colorId;
        const finalStress = primarySyll ? primarySyll.stress : tok.stress;

        return {
          ...tok,
          colorId: finalColorId,
          color: finalColorId > 0 ? colorForFamily(finalColorId) : '#FFFFFF',
          stress: finalStress,
        };
      }),
    );

    return {
      ...raw,
      lineTokens: updatedLineTokens,
      lineSyllables: updatedLineSyllables,
    };
  }, [showRhymeMap, blankVerseLines, blankText, syllableOverrides]);

  const handleOpenWordInspector = useCallback(
    (
      wordText: string,
      lineIndex: number,
      wordIndex: number,
      syllables: VerseRhymeToken[],
      initialSyllableIndex: number = 0,
    ) => {
      // Extract surrounding words for contextual likelihood ranking
      const surroundingWords: string[] = [];
      const allLines = showBars
        ? flatBarLines.map((b) => b.lineText)
        : blankText.split('\n');

      const startLine = Math.max(0, lineIndex - 2);
      const endLine = Math.min(allLines.length - 1, lineIndex + 2);

      for (let l = startLine; l <= endLine; l += 1) {
        const lineStr = allLines[l] || '';
        const words = lineStr.split(/\s+/).filter(Boolean);
        surroundingWords.push(...words);
      }

      const activeFamilies: number[] = [];
      const analysis = showBars ? verseRhymeAnalysis : blankRhymeAnalysis;
      if (analysis) {
        analysis.rhymeGroups.forEach((g) => {
          if (g.colorId > 0) activeFamilies.push(g.colorId);
        });
      }

      const dominantFamilyId = analysis?.rhymeGroups[0]?.colorId;

      setInspectorModalData({
        visible: true,
        wordText,
        lineIndex,
        wordIndex,
        syllables,
        initialSyllableIndex,
        surroundingContext: {
          activeVowelFamiliesInVerse: activeFamilies,
          surroundingWords,
          dominantFamilyId,
          currentLineIndex: lineIndex,
        },
      });
    },
    [showBars, flatBarLines, blankText, verseRhymeAnalysis, blankRhymeAnalysis],
  );

  const handleApplyEnunciation = useCallback(
    (enun: EnunciationOption) => {
      const { lineIndex, wordIndex, syllables } = inspectorModalData;
      setSyllableOverrides((prev) => {
        const next = new Map(prev);
        syllables.forEach((sylTok, idx) => {
          const enunSyl = enun.syllables[idx] || enun.syllables[enun.syllables.length - 1];
          if (enunSyl) {
            const lIdx = sylTok.lineIndex ?? lineIndex ?? 0;
            const wIdx = sylTok.wordIndex ?? wordIndex ?? 0;
            const sIdx = sylTok.syllableIndex ?? idx;
            const sText = sylTok.text.trim().toLowerCase();
            const ov: SyllableOverride = {
              stress: enunSyl.stress,
              colorId: enunSyl.vowelFamilyId,
            };
            next.set(`${lIdx}:${wIdx}:${sIdx}:${sText}`, ov);
            next.set(`${lIdx}:${wIdx}:${sIdx}`, ov);
          }
        });
        return next;
      });
    },
    [inspectorModalData],
  );

  const handleSaveSyllableOverride = (tok: VerseRhymeToken, override: SyllableOverride) => {
    const lIdx = tok.lineIndex ?? inspectorModalData.lineIndex ?? 0;
    const wIdx = tok.wordIndex ?? inspectorModalData.wordIndex ?? 0;
    const sIdx = tok.syllableIndex ?? 0;
    const sText = tok.text.trim().toLowerCase();

    setSyllableOverrides((prev) => {
      const next = new Map(prev);
      next.set(`${lIdx}:${wIdx}:${sIdx}:${sText}`, override);
      next.set(`${lIdx}:${wIdx}:${sIdx}`, override);
      return next;
    });
  };

  const handleClearSyllableOverride = (tok: VerseRhymeToken) => {
    const lIdx = tok.lineIndex ?? inspectorModalData.lineIndex ?? 0;
    const wIdx = tok.wordIndex ?? inspectorModalData.wordIndex ?? 0;
    const sIdx = tok.syllableIndex ?? 0;
    const sText = tok.text.trim().toLowerCase();

    setSyllableOverrides((prev) => {
      const next = new Map(prev);
      next.delete(`${lIdx}:${wIdx}:${sIdx}:${sText}`);
      next.delete(`${lIdx}:${wIdx}:${sIdx}`);
      return next;
    });
  };

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

  // Active focused bar (null initially so all bars immediately render full rhyme color mapping)
  const [activeFocus, setActiveFocus] = useState<{
    sectionId: string;
    blockIndex: number;
    barIndex: number;
  } | null>(null);

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

  // Update text of a bar in a section (with multi-line paste distribution across bars)
  const handleBarTextChange = useCallback(
    (sectionId: string, blockIndex: number, barIndex: number, newText: string) => {
      if (newText.includes('\n') || newText.includes('\r')) {
        const { sections: newSections, finalFocus } = pasteLinesIntoSections(
          sections,
          sectionId,
          blockIndex,
          barIndex,
          newText,
        );
        setSections(newSections);
        pushHistory(newSections);
        setActiveFocus(finalFocus);
        onLyricsChange?.(sectionsToLyrics(newSections));
      } else {
        const updatedSections = sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const updatedBlocks = updateBarText(sec.blocks, blockIndex, barIndex, newText);
          return { ...sec, blocks: updatedBlocks };
        });

        setSections(updatedSections);
        pushHistory(updatedSections);
        onLyricsChange?.(sectionsToLyrics(updatedSections));
      }
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

  // Cross-Bar alignment shifting (double-tap flow anacrusis cycle)
  const handleToggleCrossBarAlignment = useCallback(
    (barId: string, wordKey: string, nextAlignment: CrossBarAlignment) => {
      setSections((prev) => {
        const next = prev.map((s) => ({
          ...s,
          blocks: s.blocks.map((b) => ({
            ...b,
            bars: b.bars.map((bar) => {
              if (bar.id === barId) {
                const nextAlignments = {
                  ...(bar.crossBarAlignments || {}),
                  [wordKey]: nextAlignment,
                };
                return {
                  ...bar,
                  crossBarAlignments: nextAlignments,
                };
              }
              return bar;
            }),
          })),
        }));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
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
      if (!activeFocus) return;
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
              onClose?.();
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

          {/* Bar Numbers On / Off Toggle */}
          <Pressable
            onPress={() => setShowBars((prev) => !prev)}
            style={[styles.barToggleBtn, showBars && styles.barToggleBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={showBars ? "Hide Bar Numbers" : "Show Bar Numbers"}
          >
            <Text style={[styles.barToggleText, showBars && styles.barToggleTextActive]}>
              {showBars ? 'Bars On' : 'Bars Off'}
            </Text>
          </Pressable>

          {/* Rhymes On / Off Toggle */}
          <Pressable
            onPress={() => setShowRhymeMap((prev) => !prev)}
            style={[styles.barToggleBtn, showRhymeMap && styles.barToggleBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={showRhymeMap ? "Hide Syllable Rhymes" : "Show Syllable Rhymes"}
          >
            <Text style={[styles.barToggleText, showRhymeMap && styles.barToggleTextActive]}>
              {showRhymeMap ? 'Rhymes On' : 'Rhymes Off'}
            </Text>
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
              onClose?.();
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
          {/* 2. Section Timeline & Movement Bar (Only shown in Bars On mode) */}
          {showBars && (
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
          )}

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

        {/* Column Labels: "Bar" on left, "Syllable" on right (Only shown in Bars On mode) */}
        {showBars && (
          <View style={styles.columnLabelsRow}>
            <Text style={styles.columnLabelLeft}>Bar</Text>
            <Text style={styles.columnLabelRight}>Syllable</Text>
          </View>
        )}

        {/* 4. Canvas Content: Single Blank Field (Bars Off) vs Structured Measures (Bars On) */}
        {!showBars ? (
          <View style={styles.blankCanvasContainer}>
            {/* Interactive Lyrics View (Press Any Word to Pop Up Word & Syllable Inspector) */}
            {showRhymeMap && blankText.trim().length > 0 && blankRhymeAnalysis && !isEditingBlankText ? (
              <View style={styles.interactiveLyricsSheet}>
                <View style={styles.interactiveLyricsHeader}>
                  <Text style={styles.interactiveLyricsInstruction}>
                    TAP ANY WORD TO INSPECT & TUNE SYLLABLES
                  </Text>
                  <Pressable
                    onPress={() => {
                      setIsEditingBlankText(true);
                      setTimeout(() => blankInputRef.current?.focus(), 50);
                    }}
                    style={styles.editModeSwitchBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Edit lyrics text"
                  >
                    <Text style={styles.editModeSwitchBtnText}>Edit Text</Text>
                  </Pressable>
                </View>

                {blankRhymeAnalysis.lineTokens.map((tokens, lineIdx) => {
                  const lineSylls = blankRhymeAnalysis.lineSyllables[lineIdx] || [];
                  const hasContent = tokens.some((t) => t.isWord);
                  if (!hasContent && tokens.length === 0) {
                    return <View key={lineIdx} style={styles.interactiveEmptyLine} />;
                  }

                  return (
                    <View key={lineIdx} style={styles.interactiveLyricLine}>
                      <Text style={styles.interactiveLineNumber}>{lineIdx + 1}</Text>
                      <View style={styles.interactiveWordsRow}>
                        {tokens.map((tok, tokIdx) => {
                          if (!tok.isWord) {
                            return (
                              <Text key={tokIdx} style={styles.interactiveWhitespace}>
                                {tok.text}
                              </Text>
                            );
                          }

                          const wordSyllables = lineSylls.filter((s) => s.wordIndex === tok.wordIndex);
                          const isRhyming = tok.colorId > 0;
                          const wordColor = isRhyming ? tok.color : '#FFFFFF';

                          return (
                            <Pressable
                              key={tokIdx}
                              onPress={() => {
                                handleOpenWordInspector(
                                  tok.word || tok.text,
                                  lineIdx,
                                  tok.wordIndex ?? 0,
                                  wordSyllables.length > 0 ? wordSyllables : [tok],
                                  0,
                                );
                              }}
                              style={styles.interactiveWordPressable}
                              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                              accessibilityRole="button"
                              accessibilityLabel={`Word ${tok.text}, tap to inspect syllables`}
                            >
                              {wordSyllables && wordSyllables.length > 0 ? (
                                <View style={styles.syllableClusterRow}>
                                  {wordSyllables.map((syl, sIdx) => {
                                    const isSyllRhyming = syl.colorId > 0;
                                    const syllColor = isSyllRhyming ? syl.color : '#FFFFFF';
                                    return (
                                      <View
                                        key={`syll-${sIdx}-${syl.text}`}
                                        style={[
                                          styles.syllableSpanWrap,
                                          isSyllRhyming && {
                                            borderBottomColor: syl.color,
                                            borderBottomWidth: 2,
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.interactiveWordText,
                                            { color: syllColor },
                                            isSyllRhyming && styles.interactiveWordTextRhyming,
                                          ]}
                                        >
                                          {syl.text}
                                        </Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              ) : (
                                <Text
                                  style={[
                                    styles.interactiveWordText,
                                    { color: wordColor },
                                    isRhyming && styles.interactiveWordTextRhyming,
                                    isRhyming && {
                                      borderBottomColor: tok.color,
                                      borderBottomWidth: 2,
                                    },
                                  ]}
                                >
                                  {tok.text}
                                </Text>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.blankInputWrapper}>
                {showRhymeMap && blankText.trim().length > 0 && (
                  <View style={styles.blankInputNoticeRow}>
                    <Pressable
                      onPress={() => setIsEditingBlankText(false)}
                      style={styles.doneEditingNoticeBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.doneEditingNoticeBtnText}>
                        Done Editing • View & Tap Rhyme Words ▾
                      </Text>
                    </Pressable>
                  </View>
                )}
                <TextInput
                  ref={blankInputRef}
                  value={blankText}
                  onChangeText={handleBlankTextChange}
                  multiline
                  scrollEnabled={false}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  placeholder="Start writing freely..."
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  style={[
                    styles.blankTextInput,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                />
              </View>
            )}
          </View>
        ) : (
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
                        {showBars && (
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
                        )}
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
                              activeFocus !== null &&
                              activeFocus.sectionId === sec.id &&
                              activeFocus.blockIndex === block.blockIndex &&
                              activeFocus.barIndex === bar.barIndex;

                            const isAlignedAcrossPage =
                              hasMultipleLines || bar.rawText.length > 18;

                            const barData = barTokensMap.get(`${sec.id}:${block.blockIndex}:${bar.barIndex}`);

                            return (
                              <CadenceBarRow
                                key={bar.id}
                                bar={bar}
                                isActive={isActive}
                                isAlignedAcrossPage={isAlignedAcrossPage}
                                showBarNumber={showBars}
                                showRhymeMap={showRhymeMap}
                                rhymeTokens={barData?.words}
                                syllableTokens={barData?.syllables}
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
                                onSelectSyllable={(tok, allWordSyllables) => {
                                  const wordSyllables =
                                    allWordSyllables && allWordSyllables.length > 0
                                      ? allWordSyllables
                                      : (barData?.syllables || []).filter(
                                          (s) => s.wordIndex === tok.wordIndex && s.lineIndex === tok.lineIndex,
                                        );
                                  handleOpenWordInspector(
                                    tok.word || tok.text,
                                    tok.lineIndex ?? 0,
                                    tok.wordIndex ?? 0,
                                    wordSyllables.length > 0 ? wordSyllables : [tok],
                                    tok.syllableIndex ?? 0,
                                  );
                                }}
                                onToggleCrossBarAlignment={handleToggleCrossBarAlignment}
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
        )}
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
        onAttachAudio={(audioInfo) => setMetadata((prev) => ({ ...prev, audioFile: audioInfo || undefined }))}
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

      {/* Tactile Word & Syllable Inspector & Manual Override Modal */}
      <SyllableInspectorModal
        visible={inspectorModalData.visible}
        wordText={inspectorModalData.wordText}
        lineIndex={inspectorModalData.lineIndex}
        wordIndex={inspectorModalData.wordIndex}
        syllables={inspectorModalData.syllables}
        initialSyllableIndex={inspectorModalData.initialSyllableIndex}
        syllableOverrides={syllableOverrides}
        surroundingContext={inspectorModalData.surroundingContext}
        onClose={() => {
          setInspectorModalData((prev) => ({ ...prev, visible: false }));
        }}
        onSaveOverride={handleSaveSyllableOverride}
        onClearOverride={handleClearSyllableOverride}
        onApplyEnunciation={handleApplyEnunciation}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#000000',
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
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
  },
  navIconButtonActive: {
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
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
  barToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  barToggleBtnActive: {
    borderColor: '#E5A50A',
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
  },
  barToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  barToggleTextActive: {
    color: '#E5A50A',
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
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  paperScrollView: {
    flex: 1,
    backgroundColor: '#000000',
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
    color: '#FFFFFF',
    letterSpacing: -0.5,
    flex: 1,
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
  },
  metaSettingsPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  metaSettingsPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: -0.2,
  },
  columnLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  columnLabelLeft: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  columnLabelRight: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
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
    backgroundColor: 'rgba(229, 165, 10, 0.4)',
  },
  beatSwitchBadgeCanvas: {
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 165, 10, 0.4)',
  },
  beatSwitchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E5A50A',
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
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionPhrasePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sectionPhrasePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
  textureBadgeBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  textureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  textureMoodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textureMoodTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  blockRowGroup: {
    marginBottom: 4,
  },
  cadenceGap: {
    height: 18,
  },
  blankCanvasContainer: {
    marginTop: 8,
    minHeight: 480,
  },
  blankTextInput: {
    fontSize: 17,
    lineHeight: 28,
    color: '#FFFFFF',
    padding: 0,
    minHeight: 240,
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    textAlignVertical: 'top',
  },
  interactiveLyricsSheet: {
    paddingVertical: 8,
  },
  interactiveLyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  interactiveLyricsInstruction: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E5A50A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  editModeSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  editModeSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  interactiveLyricLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  interactiveLineNumber: {
    width: 28,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  interactiveWordsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  interactiveWhitespace: {
    fontSize: 16,
    lineHeight: 26,
    color: 'transparent',
  },
  interactiveWordPressable: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  syllableClusterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  syllableSpanWrap: {
    paddingVertical: 1,
    paddingHorizontal: 0.5,
  },
  interactiveWordText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  interactiveWordTextRhyming: {
    fontWeight: '800',
  },
  interactiveEmptyLine: {
    height: 16,
  },
  blankInputWrapper: {
    flex: 1,
  },
  blankInputNoticeRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  doneEditingNoticeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
    borderWidth: 1,
    borderColor: '#E5A50A',
  },
  doneEditingNoticeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5A50A',
  },
});

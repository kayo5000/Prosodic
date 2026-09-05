import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputSelectionChangeEventData,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CadenceBottomSheet } from '@/components/studio/CadenceBottomSheet';
import { DynamicIslandHUD } from '@/components/studio/DynamicIslandHUD';
import { FloatingDock, type MainTabType } from '@/components/studio/FloatingDock';
import { LexiconModal } from '@/components/studio/LexiconModal';
import { PlannerModal } from '@/components/studio/PlannerModal';
import { PracticeModal } from '@/components/studio/PracticeModal';
import { SideColumnDrawer } from '@/components/studio/SideColumnDrawer';
import { SyllableGutter } from '@/components/studio/SyllableGutter';
import { TempoDensityHeader } from '@/components/studio/TempoDensityHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getDb } from '@/data/db/client';
import { withTransaction } from '@/data/db/transaction';
import { generateId } from '@/data/id';
import { insertEvent } from '@/data/repositories/events';
import {
  deleteSongContext,
  getMostRecentSongContext,
  getSongContext,
  insertSongContext,
  listSongContexts,
  setBackingTrack,
  setSongBpm,
  updateSongBodyText,
  updateSongTitle,
} from '@/data/repositories/songContext';
import { insertLineEdits } from '@/data/repositories/lineEdits';
import {
  insertVoiceTake,
  listVoiceTakesBySongId,
  setPerformanceMode,
} from '@/data/repositories/voiceTakes';
import type { PerformanceMode, SongContext, VoiceTake } from '@/data/types';
import { useBackingTrackImport } from '@/hooks/useBackingTrackImport';
import { useMasteryClock } from '@/hooks/useMasteryClock';
import { useTheme } from '@/hooks/use-theme';
import { splitRemaining } from '@/services/masteryClock';
import { persistCalibratedSession } from '@/services/persistCalibratedSession';
import { analyzeLyricsMaster } from '@/services/prosodicCore';
import { logError } from '@/utils/logError';
import { diffLines } from '@/utils/lineDiff';
import { analyzeLyricsLines } from '@/utils/syllableCounter';
import {
  getBarMetrics,
  getDensityHeatColor,
  type StylePresetKey,
  type TimeSignature,
  type VisualDensityMode,
} from '@/utils/tempoDensity';

const AUTOSAVE_DELAY_MS = 500;
const MAX_UNDO_STACK = 50;

function createNewDraft(): SongContext {
  const db = getDb();
  const now = new Date().toISOString();
  const draft: SongContext = {
    id: generateId(),
    title: 'Untitled Track',
    inputMode: 'text',
    bpm: 90,
    bpmSource: 'user',
    structure: null,
    bodyText: '',
    createdAt: now,
    updatedAt: now,
  };
  insertSongContext(db, draft);
  return draft;
}

function loadInitialSong(): SongContext {
  const db = getDb();
  const existing = getMostRecentSongContext(db);
  if (existing) return existing;
  return createNewDraft();
}

export default function ThinkPadScreen() {
  const theme = useTheme();
  const [activeSong, setActiveSong] = useState<SongContext>(loadInitialSong);
  // Reads `activeSong.id` above rather than calling `loadInitialSong()` a
  // second time — that function creates a new draft song as a side effect
  // when none exists yet, so calling it twice would silently create two.
  const [voiceTakes, setVoiceTakes] = useState<VoiceTake[]>(() =>
    listVoiceTakesBySongId(getDb(), activeSong.id),
  );
  // Only the URI is persisted; the original filename is display-only and is
  // not worth a column, so it lives for the session and falls back to a
  // generic label after a reload.
  const [backingTrackName, setBackingTrackName] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState(() => activeSong.bodyText ?? '');
  const [bpm, setBpm] = useState<number>(() => activeSong.bpm ?? 90);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');
  const [stylePreset, setStylePreset] = useState<StylePresetKey>('dense');
  const [isHalfTime, setIsHalfTime] = useState<boolean>(false);
  const [visualMode, setVisualMode] = useState<VisualDensityMode>('both');
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [songList, setSongList] = useState<SongContext[]>(() => listSongContexts(getDb()));
  const [activeLineNumber, setActiveLineNumber] = useState<number>(1);

  // Studio Modal State
  const [activeTab, setActiveTab] = useState<MainTabType>('studio');
  const [cadenceSheetVisible, setCadenceSheetVisible] = useState<boolean>(false);
  const [lexiconModalVisible, setLexiconModalVisible] = useState<boolean>(false);
  const [practiceModalVisible, setPracticeModalVisible] = useState<boolean>(false);
  const [plannerModalVisible, setPlannerModalVisible] = useState<boolean>(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([activeSong.bodyText ?? '']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read by persistBodyText, which stays dependency-free so the AppState
  // and unmount effects below don't resubscribe on every BPM tweak.
  const latestBpm = useRef<number>(activeSong.bpm ?? 90);
  const latestTimeSignature = useRef<TimeSignature>('4/4');
  // Guards against re-analysing identical text when a lifecycle event
  // (background, song switch, manual save) re-enters the same save path.
  const lastAnalyzed = useRef<{ songId: string; text: string } | null>(null);
  // The last text actually written to the database, per song. diffLines needs
  // a 'before' and the DB row has already been overwritten by the time we'd
  // read it back, so the previous version is kept here.
  const lastPersistedText = useRef<{ songId: string; text: string } | null>({
    songId: activeSong.id,
    text: activeSong.bodyText ?? '',
  });

  useEffect(() => {
    latestBpm.current = bpm;
    latestTimeSignature.current = timeSignature;
  }, [bpm, timeSignature]);
  const latestBodyText = useRef(bodyText);
  const historyDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic bar metrics computation
  const metrics = useMemo(
    () => getBarMetrics(bpm, stylePreset, isHalfTime, timeSignature),
    [bpm, stylePreset, isHalfTime, timeSignature],
  );

  // Real-time line syllable counts
  const linesAnalysis = useMemo(() => analyzeLyricsLines(bodyText), [bodyText]);

  // Push new state to undo/redo history
  const pushHistory = useCallback((newText: string) => {
    if (historyDebounceTimer.current) {
      clearTimeout(historyDebounceTimer.current);
    }
    historyDebounceTimer.current = setTimeout(() => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        if (next[next.length - 1] === newText) return prev;
        const updated = [...next, newText];
        if (updated.length > MAX_UNDO_STACK) {
          updated.shift();
        }
        return updated;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_UNDO_STACK - 1));
    }, 300);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevText = history[prevIndex];
      setHistoryIndex(prevIndex);
      setBodyText(prevText);
      latestBodyText.current = prevText;
      updateSongBodyText(getDb(), activeSong.id, prevText, new Date().toISOString());
    }
  }, [history, historyIndex, activeSong.id]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextText = history[nextIndex];
      setHistoryIndex(nextIndex);
      setBodyText(nextText);
      latestBodyText.current = nextText;
      updateSongBodyText(getDb(), activeSong.id, nextText, new Date().toISOString());
    }
  }, [history, historyIndex, activeSong.id]);

  // Persist body text changes with debounce
  const persistBodyText = useCallback((songId: string, text: string) => {
    try {
      const now = new Date().toISOString();
      // Diffed before the write, against the last version we persisted — the
      // row is about to be overwritten, so this is the only moment the
      // 'before' still exists. Capture only; nothing reads line_edits yet.
      const previousText =
        lastPersistedText.current?.songId === songId ? lastPersistedText.current.text : '';
      const lineEdits = diffLines(previousText, text).map((edit) => ({
        id: generateId(),
        songId,
        lineIndex: edit.lineIndex,
        lineHash: edit.lineHash,
        kind: edit.kind,
        charsAdded: edit.charsAdded,
        charsRemoved: edit.charsRemoved,
        occurredAt: now,
        createdAt: now,
      }));
      withTransaction(getDb(), () => {
        const db = getDb();
        updateSongBodyText(db, songId, text, now);
        insertEvent(db, {
          id: generateId(),
          songId,
          type: 'song_saved',
          payload: {
            charCount: text.length,
            lineCount: text.split('\n').length,
          },
          occurredAt: now,
          createdAt: now,
          syncedAt: null,
        });
        // Same transaction as the text itself: revision history must never
        // disagree with the version it describes.
        insertLineEdits(db, lineEdits);
      });
      lastPersistedText.current = { songId, text };
    } catch (error) {
      // The user's text is the thing we cannot afford to lose, so a write
      // failure is recovered from rather than thrown — but it is never
      // silent, because a failed autosave is otherwise indistinguishable
      // from a successful one.
      logError(`autosave failed for song ${songId}`, error);
    }

    // Analysis runs after the text is already safe, in its own transaction.
    // A calibration failure must never cost the user their words.
    if (text.trim().length === 0) return;
    const previous = lastAnalyzed.current;
    if (previous && previous.songId === songId && previous.text === text) return;

    try {
      const report = analyzeLyricsMaster(
        text,
        latestBpm.current,
        latestTimeSignature.current,
        'Song View Session',
        'aggressive',
      );
      persistCalibratedSession(getDb(), report, songId);
      lastAnalyzed.current = { songId, text };
    } catch (error) {
      logError(`calibrated analysis failed for song ${songId}`, error);
    }
  }, []);

  const handleTakeRecorded = useCallback(
    (result: { uri: string; durationMs: number }) => {
      const now = new Date().toISOString();
      const take: VoiceTake = {
        id: generateId(),
        songId: activeSong.id,
        uri: result.uri,
        durationMs: result.durationMs,
        recordedAt: now,
        // Unclassified until the user answers. Never defaulted to freestyle:
        // a wrong default would silently poison the freestyle baseline.
        performanceMode: null,
        modeSetAt: null,
        createdAt: now,
      };
      try {
        insertVoiceTake(getDb(), take);
        setVoiceTakes((prev) => [take, ...prev]);
      } catch (error) {
        logError(`failed to save voice take for song ${activeSong.id}`, error);
        Alert.alert('Take not saved', 'Something went wrong saving that recording.');
      }
    },
    [activeSong.id],
  );

  const handleSetPerformanceMode = useCallback(
    (takeId: string, mode: PerformanceMode) => {
      const now = new Date().toISOString();
      try {
        setPerformanceMode(getDb(), takeId, mode, now);
        setVoiceTakes((prev) =>
          prev.map((t) =>
            t.id === takeId ? { ...t, performanceMode: mode, modeSetAt: now } : t,
          ),
        );
      } catch (error) {
        logError(`could not record performance mode for take ${takeId}`, error);
      }
    },
    [],
  );

  const mastery = useMasteryClock();
  const trackImport = useBackingTrackImport();

  const handleImportTrack = useCallback(async () => {
    try {
      const picked = await trackImport.pickTrack();
      if (!picked) return; // user cancelled — not an error
      const now = new Date().toISOString();
      setBackingTrack(getDb(), activeSong.id, picked.uri, 0, now);
      setActiveSong((prev) => ({ ...prev, backingTrackUri: picked.uri, audioOffsetMs: 0 }));
      setBackingTrackName(picked.name);
    } catch (error) {
      logError(`beat import failed for song ${activeSong.id}`, error);
      Alert.alert('Import failed', 'That file could not be opened.');
    }
  }, [activeSong.id, trackImport]);

  const handleClearTrack = useCallback(() => {
    try {
      const now = new Date().toISOString();
      setBackingTrack(getDb(), activeSong.id, null, null, now);
      setActiveSong((prev) => ({ ...prev, backingTrackUri: null, audioOffsetMs: null }));
      setBackingTrackName(null);
    } catch (error) {
      logError(`clearing beat failed for song ${activeSong.id}`, error);
    }
  }, [activeSong.id]);

  const handleChangeText = useCallback(
    (text: string) => {
      // Only typing moves the clock. Opening modals, reading stats and
      // changing BPM deliberately do not.
      mastery.registerTyping();
      setBodyText(text);
      latestBodyText.current = text;
      pushHistory(text);

      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
      autosaveTimer.current = setTimeout(() => {
        persistBodyText(activeSong.id, text);
      }, AUTOSAVE_DELAY_MS);
    },
    [activeSong.id, mastery, persistBodyText, pushHistory],
  );

  // AppState listener to flush autosave on backgrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        if (autosaveTimer.current) {
          clearTimeout(autosaveTimer.current);
          autosaveTimer.current = null;
        }
        persistBodyText(activeSong.id, latestBodyText.current);
        // Backgrounding ends the session: keep the seconds typed just before
        // leaving instead of rolling them back for want of a final keystroke.
        mastery.flush();
      }
    });
    return () => {
      subscription.remove();
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [activeSong.id, mastery, persistBodyText]);

  // BPM change handler
  const handleChangeBpm = useCallback(
    (newBpm: number) => {
      setBpm(newBpm);
      setSongBpm(getDb(), activeSong.id, newBpm, 'user', new Date().toISOString());
    },
    [activeSong.id],
  );

  // Track selection from Side Drawer
  const handleSelectSong = useCallback(
    (songId: string) => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        persistBodyText(activeSong.id, latestBodyText.current);
      }
      const loaded = getSongContext(getDb(), songId);
      if (loaded) {
        setActiveSong(loaded);
        const nextBody = loaded.bodyText ?? '';
        setBodyText(nextBody);
        latestBodyText.current = nextBody;
        setBpm(loaded.bpm ?? 90);
        setHistory([nextBody]);
        setHistoryIndex(0);
        lastPersistedText.current = { songId: loaded.id, text: nextBody };
        setBackingTrackName(null); // filename is session-only; the new song's URI drives the label
        try {
          setVoiceTakes(listVoiceTakesBySongId(getDb(), loaded.id));
        } catch (error) {
          logError(`failed to load voice takes for song ${loaded.id}`, error);
          setVoiceTakes([]);
        }
      }
      setDrawerVisible(false);
    },
    [activeSong.id, persistBodyText],
  );

  // Create new song handler
  const handleCreateNewSong = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      persistBodyText(activeSong.id, latestBodyText.current);
    }
    const newSong = createNewDraft();
    setSongList(listSongContexts(getDb()));
    setActiveSong(newSong);
    setBodyText('');
    latestBodyText.current = '';
    setBpm(90);
    setHistory(['']);
    setHistoryIndex(0);
    setVoiceTakes([]); // a freshly created song has no takes yet
    lastPersistedText.current = { songId: newSong.id, text: '' };
    setBackingTrackName(null);
    setDrawerVisible(false);
  }, [activeSong.id, persistBodyText]);

  const handleDeleteSong = useCallback(
    (songId: string) => {
      deleteSongContext(getDb(), songId);
      const updated = listSongContexts(getDb());
      setSongList(updated);
      if (activeSong.id === songId) {
        if (updated.length > 0) {
          handleSelectSong(updated[0].id);
        } else {
          handleCreateNewSong();
        }
      }
    },
    [activeSong.id, handleSelectSong, handleCreateNewSong],
  );

  const handleRenameSong = useCallback((songId: string, newTitle: string) => {
    updateSongTitle(getDb(), songId, newTitle, new Date().toISOString());
    setSongList(listSongContexts(getDb()));
    setActiveSong((prev) => (prev.id === songId ? { ...prev, title: newTitle } : prev));
  }, []);

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const cursorOffset = e.nativeEvent.selection.start;
      const textUpToCursor = bodyText.slice(0, cursorOffset);
      const lineNum = textUpToCursor.split('\n').length;
      setActiveLineNumber(lineNum);
    },
    [bodyText],
  );

  const handleSave = useCallback(() => {
    persistBodyText(activeSong.id, latestBodyText.current);
    Alert.alert('Track Saved', `"${activeSong.title}" autosaved to offline store.`);
  }, [activeSong.id, activeSong.title, persistBodyText]);

  const handleTabSelect = (tab: MainTabType) => {
    setActiveTab(tab);
    if (tab === 'lexicon') setLexiconModalVisible(true);
    if (tab === 'practice') setPracticeModalVisible(true);
    if (tab === 'planner') setPlannerModalVisible(true);
  };

  const showGutter = visualMode === 'gutter' || visualMode === 'both';
  const showHeatmap = visualMode === 'heatmap' || visualMode === 'both';

  return (
    <ThemedView style={styles.container}>
      {/* Global Dynamic Island HUD at Top */}
      <DynamicIslandHUD
        bpm={bpm}
        currentSps={linesAnalysis.length > 0 ? linesAnalysis[0].syllableCount / 2 : 4.2}
        onAskOsborn={(q) => Alert.alert('Osborn AI', `Analyzing query: "${q}"`)}
        onStartVoiceMemo={() => setPlannerModalVisible(true)}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          {/* Studio Navigation & Density Header */}
          <TempoDensityHeader
            metrics={metrics}
            onBpmChange={handleChangeBpm}
            onPresetChange={setStylePreset}
            onHalfTimeToggle={setIsHalfTime}
            onTimeSignatureChange={setTimeSignature}
            visualMode={visualMode}
            onVisualModeChange={setVisualMode}
            onOpenDrawer={() => setDrawerVisible(true)}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            backingTrackName={
              backingTrackName ?? (activeSong.backingTrackUri ? 'Beat attached' : null)
            }
            isImportingTrack={trackImport.isImporting}
            onImportTrack={handleImportTrack}
            onClearTrack={handleClearTrack}
          />

          {/* Mastery Countdown — 10,000 hours, only active practice moves it */}
          <View style={styles.masteryRow}>
            <View
              style={[styles.masteryDot, mastery.isCounting && styles.masteryDotActive]}
            />
            <Text style={styles.masteryTime}>
              {(() => {
                const { hours, minutes, seconds } = splitRemaining(mastery.remainingMs);
                return `${hours.toLocaleString()}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
              })()}
            </Text>
            <Text style={styles.masteryLabel}>
              {mastery.isCounting ? 'counting' : 'to mastery'}
            </Text>
          </View>

          {/* Active Track Bar */}
          <View style={styles.titleModeRow}>
            <Pressable
              onPress={() => setDrawerVisible(true)}
              style={styles.trackTitleContainer}
            >
              <ThemedText type="default" style={styles.activeTrackLabel}>
                📁 {activeSong.title} ▾
              </ThemedText>
            </Pressable>

            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setCadenceSheetVisible(true)}
                style={({ pressed }) => [
                  styles.modePill,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="small" style={{ color: '#60A5FA', fontWeight: '800' }}>
                  ⚙️ {bpm} BPM • {timeSignature}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Main Writing Studio Canvas */}
          <View style={styles.editorWorkspace}>
            <ScrollView
              style={styles.workspaceScrollView}
              contentContainerStyle={styles.workspaceScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.scrollInnerRow}>
                {showGutter && (
                  <SyllableGutter
                    lines={linesAnalysis}
                    metrics={metrics}
                    activeLineNumber={activeLineNumber}
                  />
                )}

                <View style={styles.canvasContainer}>
                  {showHeatmap && bodyText.trim().length > 0 ? (
                    <View style={styles.heatmapOverlay} pointerEvents="none">
                      {linesAnalysis.map((line) => {
                        const heatColor = getDensityHeatColor(line.syllableCount, metrics, theme.text);
                        return (
                          <View key={line.lineNumber} style={styles.heatmapLine}>
                            {line.words.length > 0 ? (
                              line.words.map((w, wIdx) => (
                                <Text
                                  key={`${line.lineNumber}-${wIdx}`}
                                  style={[styles.heatmapWord, { color: heatColor }]}
                                >
                                  {w.word}{' '}
                                </Text>
                              ))
                            ) : (
                              <Text style={[styles.heatmapWord, { color: theme.textSecondary }]}> </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  <TextInput
                    multiline
                    scrollEnabled={false}
                    value={bodyText}
                    onChangeText={handleChangeText}
                    onSelectionChange={handleSelectionChange}
                    placeholder="Write your bars here... syllables tally in real time."
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.editor,
                      {
                        color: showHeatmap && bodyText.trim().length > 0 ? 'transparent' : theme.text,
                      },
                    ]}
                    textAlignVertical="top"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Footer Bar */}
          <View style={styles.footerRow}>
            <Pressable onPress={handleSave} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.saveButton}>
                <ThemedText type="link">Save Track</ThemedText>
              </ThemedView>
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary">
              {linesAnalysis.reduce((sum, l) => sum + l.syllableCount, 0)} total syllables •{' '}
              {linesAnalysis.length} bars
            </ThemedText>
          </View>
        </KeyboardAvoidingView>

        {/* Floating Bottom Navigation Dock */}
        <FloatingDock
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
          onPressAdd={handleCreateNewSong}
        />

        {/* Side Column Navigation Drawer */}
        <SideColumnDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          songs={songList}
          activeSongId={activeSong.id}
          onSelectSong={handleSelectSong}
          onCreateNewSong={handleCreateNewSong}
          onDeleteSong={handleDeleteSong}
          onRenameSong={handleRenameSong}
        />

        {/* Contextual Cadence & Metronome Bottom Sheet */}
        <CadenceBottomSheet
          visible={cadenceSheetVisible}
          bpm={bpm}
          timeSignature={timeSignature}
          targetDensity={stylePreset === 'spacious' ? 'relaxed' : stylePreset === 'dense' ? 'dense' : 'double_time'}
          onClose={() => setCadenceSheetVisible(false)}
          onChangeBpm={handleChangeBpm}
          onChangeTimeSignature={setTimeSignature}
          onChangeDensity={(d) => setStylePreset(d === 'relaxed' ? 'spacious' : d === 'dense' ? 'dense' : 'speed')}
        />

        {/* Lexicon Modal */}
        <LexiconModal
          visible={lexiconModalVisible}
          onClose={() => {
            setLexiconModalVisible(false);
            setActiveTab('studio');
          }}
          onSelectRhyme={(word) => {
            handleChangeText(bodyText + (bodyText.endsWith(' ') || bodyText.length === 0 ? '' : ' ') + word);
            setLexiconModalVisible(false);
            setActiveTab('studio');
          }}
        />

        {/* Practice Modal */}
        <PracticeModal
          visible={practiceModalVisible}
          bpm={bpm}
          onClose={() => {
            setPracticeModalVisible(false);
            setActiveTab('studio');
          }}
        />

        {/* Planner Modal */}
        <PlannerModal
          visible={plannerModalVisible}
          onClose={() => {
            setPlannerModalVisible(false);
            setActiveTab('studio');
          }}
          takes={voiceTakes}
          onTakeRecorded={handleTakeRecorded}
          onSetPerformanceMode={handleSetPerformanceMode}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two + 70, // Padding for FloatingDock
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  keyboardAvoider: {
    flex: 1,
    gap: Spacing.two,
  },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
  },
  masteryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  masteryDotActive: {
    backgroundColor: '#10B981',
  },
  masteryTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    fontVariant: ['tabular-nums'],
  },
  masteryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  titleModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  trackTitleContainer: {
    flex: 1,
  },
  activeTrackLabel: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modePill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  editorWorkspace: {
    flex: 1,
    backgroundColor: '#090D16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  workspaceScrollView: {
    flex: 1,
  },
  workspaceScrollContent: {
    padding: Spacing.two,
    minHeight: '100%',
  },
  scrollInnerRow: {
    flexDirection: 'row',
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  editor: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'monospace',
    padding: Spacing.one,
    minHeight: 300,
  },
  heatmapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.one,
  },
  heatmapLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 24,
    alignItems: 'center',
  },
  heatmapWord: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
    marginBottom: 8,
  },
  saveButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});

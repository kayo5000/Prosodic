import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';

import type { PerformanceMode, VoiceTake } from '@/data/types';
import { type RecordedTakeResult, useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface PlannerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Takes already saved for the active song, newest first. */
  takes: VoiceTake[];
  /** Called after a recording finishes — the caller persists it and refreshes `takes`. */
  onTakeRecorded: (result: RecordedTakeResult) => void;
  /** Records what a take was. Also used to correct an earlier answer. */
  onSetPerformanceMode: (takeId: string, mode: PerformanceMode) => void;
}

function formatDurationMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatRecordedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const MODE_LABEL: Record<PerformanceMode, string> = {
  freestyle: 'Off the top',
  written: 'Wrote it',
  other_artist: "Someone else's",
  mixed: 'Bit of both',
};

const MODE_ORDER: PerformanceMode[] = ['freestyle', 'written', 'other_artist', 'mixed'];

/**
 * Asked once per take, before anything is measured. Judged as a freestyle and
 * as a written verse, the same performance yields opposite conclusions, so an
 * unanswered take stays out of every baseline rather than being guessed into
 * one. "Someone else's" is here so quoting or practising another artist's
 * verse has a truthful answer — without it an honest user has no correct
 * option.
 */
function ModeChooser({
  take,
  onSelect,
}: {
  take: VoiceTake;
  onSelect: (mode: PerformanceMode) => void;
}) {
  return (
    <View style={styles.modeBlock}>
      <Text style={styles.modeQuestion}>
        {take.performanceMode ? 'Change how this is counted:' : 'Was that off the top?'}
      </Text>
      <Text style={styles.modeWhy}>So it lands in the right baseline.</Text>
      <View style={styles.modeRow}>
        {MODE_ORDER.map((mode) => {
          const isActive = take.performanceMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => onSelect(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={MODE_LABEL[mode]}
              style={[styles.modeChip, isActive && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>
                {MODE_LABEL[mode]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/** One row per take — `useAudioPlayer` is one player per source, so this has to be its own component rather than a hook called in a loop. */
function VoiceTakeRow({
  take,
  onSetPerformanceMode,
}: {
  take: VoiceTake;
  onSetPerformanceMode: (takeId: string, mode: PerformanceMode) => void;
}) {
  const player = useAudioPlayer(take.uri);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={styles.takeBlock}>
      <View style={styles.memoCard}>
        <TouchableOpacity
          style={[styles.playBtn, player.playing && styles.playBtnActive]}
          onPress={togglePlay}
          accessibilityRole="button"
          accessibilityLabel={player.playing ? "Pause" : "Play"}
        >
          {player.playing ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </TouchableOpacity>

        <View style={styles.memoInfo}>
          <Text style={styles.memoTitle}>Take</Text>
          <Text style={styles.memoSub}>{formatRecordedAt(take.recordedAt)}</Text>
        </View>

        <Text style={styles.memoDuration}>{formatDurationMs(take.durationMs)}</Text>
      </View>

      <ModeChooser take={take} onSelect={(mode) => onSetPerformanceMode(take.id, mode)} />
    </View>
  );
}

export const PlannerModal: React.FC<PlannerModalProps> = ({
  visible,
  onClose,
  takes,
  onTakeRecorded,
  onSetPerformanceMode,
}) => {
  // A take cut short by a call or an app switch is still the user's take.
  // It goes down the same path a normal stop does rather than vanishing.
  const recorder = useVoiceRecorder({ onInterrupted: onTakeRecorded });

  const handleRecordPress = async () => {
    if (recorder.isRecording) {
      const result = await recorder.stop();
      if (result) onTakeRecorded(result);
      return;
    }

    if (recorder.permissionStatus !== 'granted') {
      const granted = await recorder.requestPermission();
      if (!granted) {
        Alert.alert(
          'Microphone access needed',
          'Turn on microphone access for Prosodic in Settings to record a take.',
        );
        return;
      }
    }
    await recorder.start();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Planner &amp; Voice Vault</Text>
              <Text style={styles.subtitle}>Osborn AI Dynamic Schedule &amp; Memos</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Planner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Upcoming Session Schedule Card */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleLabel}>UPCOMING PROSODIC SESSION</Text>
              <Text style={styles.scheduleTitle}>Studio Mix: Midnight Reverie</Text>
              <Text style={styles.scheduleSub}>
                Today at 6:00 PM • With Osborn AI Assistant
              </Text>
              <View style={styles.agendaRow}>
                <Text style={styles.agendaItem}>Complete Bar 5-8 Rhyme Weave</Text>
                <Text style={styles.agendaItem}>Lock 90 BPM Tap Cadence</Text>
              </View>
            </View>

            {/* Voice Takes Section */}
            <Text style={styles.sectionTitle}>Recorded Voice Takes</Text>

            {takes.length === 0 ? (
              <Text style={styles.emptyState}>
                No takes yet for this song — record one below.
              </Text>
            ) : (
              takes.map((take) => (
                <VoiceTakeRow
                  key={take.id}
                  take={take}
                  onSetPerformanceMode={onSetPerformanceMode}
                />
              ))
            )}
          </ScrollView>

          {/* Record Action Button */}
          <TouchableOpacity
            style={[styles.recordBtn, recorder.isRecording && styles.recordBtnActive]}
            onPress={handleRecordPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={recorder.isRecording ? "Stop Recording" : "Record New Take"}
          >
            {recorder.isRecording ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginRight: 6 }}>
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                <Text style={styles.recordBtnText}>Stop ({formatDurationMs(recorder.durationMs)})</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <Text style={styles.recordBtnText}>Record New Take</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '85%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 24,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  bodyScroll: {
    flex: 1,
  },
  scheduleCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#6366F1',
    padding: 16,
    marginBottom: 20,
  },
  scheduleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A5B4FC',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  scheduleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  scheduleSub: {
    fontSize: 12.5,
    color: '#CBD5E1',
    marginBottom: 10,
  },
  agendaRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    gap: 4,
  },
  agendaItem: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  emptyState: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  takeBlock: {
    marginBottom: 10,
  },
  modeBlock: {
    backgroundColor: '#0B111E',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginTop: -6,
    paddingTop: 6,
  },
  modeQuestion: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  modeWhy: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111C2E',
  },
  modeChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  modeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  memoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B111E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playBtnActive: {
    backgroundColor: '#10B981',
  },
  playBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  memoInfo: {
    flex: 1,
  },
  memoTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  memoSub: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  memoDuration: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginLeft: 8,
  },
  recordBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  recordBtnActive: {
    backgroundColor: '#DC2626',
  },
  recordBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AudioRecordingData } from './types';

interface AudioRecordingModalProps {
  visible: boolean;
  blockName?: string;
  onClose: () => void;
  onSaveTake: (recording: AudioRecordingData) => void;
}

export function AudioRecordingModal({
  visible,
  blockName = 'Verse',
  onClose,
  onSaveTake,
}: AudioRecordingModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsRecording(false);
    setRecordSeconds(0);
    setRecordedUri(null);
    setRecordedDuration(0);
    setIsPlayingPreview(false);
    onClose();
  };

  // Start Recording
  const handleStartRecording = async () => {
    setRecordedUri(null);
    setRecordSeconds(0);
    audioChunksRef.current = [];

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new (window as any).MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedUri(audioUrl);
          // Stop stream tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(200);
        setIsRecording(true);
      } catch (err) {
        console.warn('Microphone permission not granted, using simulated audio take:', err);
        // Fallback simulation
        setIsRecording(true);
      }
    } else {
      setIsRecording(true);
    }

    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordedDuration(recordSeconds || 1);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (!recordedUri) {
      // Mock audio take if mic was simulated
      setRecordedUri('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    }
  };

  // Play / Pause Preview
  const handleTogglePlayPreview = () => {
    if (!recordedUri) return;

    if (Platform.OS === 'web') {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(recordedUri);
        audioElementRef.current.onended = () => setIsPlayingPreview(false);
      } else {
        audioElementRef.current.src = recordedUri;
      }

      if (isPlayingPreview) {
        audioElementRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        audioElementRef.current.play().catch(() => {});
        setIsPlayingPreview(true);
      }
    } else {
      setIsPlayingPreview((p) => !p);
    }
  };

  // Save Take
  const handleSave = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioElementRef.current) audioElementRef.current.pause();

    const finalSec = recordedDuration || recordSeconds || 1;
    onSaveTake({
      id: `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${blockName} Voice Take`,
      uri: recordedUri || '',
      durationSec: finalSec,
      createdAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    });

    setIsRecording(false);
    setRecordSeconds(0);
    setRecordedUri(null);
    setRecordedDuration(0);
    setIsPlayingPreview(false);
    onClose();
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetModal}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Voice Take</Text>
              <Text style={styles.subtitle}>Record audio directly for {blockName}</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Cancel recording" accessibilityRole="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Pressable>
          </View>

          {/* Visual Waveform & Timer Centerpiece */}
          <View style={styles.recorderCard}>
            <Text style={styles.timerDisplay}>
              {formatTimer(isRecording ? recordSeconds : recordedDuration || recordSeconds)}
            </Text>

            {/* Waveform Visualization Bars */}
            <View style={styles.waveformContainer}>
              {Array.from({ length: 24 }).map((_, idx) => {
                const baseHeight = ((idx * 7) % 22) + 8;
                const animatedHeight = isRecording
                  ? Math.min(38, Math.max(6, baseHeight + ((recordSeconds * 11 + idx * 5) % 26)))
                  : baseHeight;

                return (
                  <View
                    key={idx}
                    style={[
                      styles.waveformBar,
                      {
                        height: animatedHeight,
                        backgroundColor: isRecording ? '#FF3B30' : recordedUri ? '#FF9500' : 'rgba(255, 255, 255, 0.25)',
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Controls: Record Button */}
            {!recordedUri ? (
              <View style={styles.recordActionWrap}>
                <Pressable
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  style={[styles.recordCircleOuter, isRecording && styles.recordCircleOuterActive]}
                  accessibilityLabel={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  <View style={[styles.recordCircleInner, isRecording && styles.recordSquareInner]} />
                </Pressable>
                <Text style={styles.recordStatusText}>
                  {isRecording ? 'Tap to Stop' : 'Tap to Record'}
                </Text>
              </View>
            ) : (
              /* Review & Playback */
              <View style={styles.playbackRow}>
                <Pressable
                  onPress={handleTogglePlayPreview}
                  style={styles.playPreviewBtn}
                  accessibilityLabel={isPlayingPreview ? 'Pause take' : 'Play take'}
                  accessibilityRole="button"
                >
                  {isPlayingPreview ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleStartRecording}
                  style={styles.reRecordBtn}
                  accessibilityLabel="Re-record take"
                  accessibilityRole="button"
                >
                  <Text style={styles.reRecordText}>Retake</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Discard</Text>
            </Pressable>

            {Boolean(recordedUri) && (
              <Pressable onPress={handleSave} style={styles.saveTakeBtn}>
                <Text style={styles.saveTakeText}>Attach Take</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetModal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'web' ? 36 : 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(235, 235, 245, 0.6)',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#EBEBF5',
    fontSize: 14,
    fontWeight: '600',
  },
  recorderCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timerDisplay: {
    fontSize: 38,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 4,
    marginBottom: 24,
    width: '100%',
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
  },
  recordActionWrap: {
    alignItems: 'center',
  },
  recordCircleOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  recordCircleOuterActive: {
    borderColor: '#FF3B30',
  },
  recordCircleInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF3B30',
  },
  recordSquareInner: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  recordStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
    marginTop: 10,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playPreviewBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPreviewIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  reRecordBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  reRecordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EBEBF5',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.8)',
  },
  saveTakeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFD60A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTakeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { logError } from '@/utils/logError';

/**
 * The one place `expo-audio`'s recording API is touched directly. Every
 * screen that records a take goes through this hook so the native surface
 * (and any future swap — a different preset, a different library) stays
 * in one file instead of scattered across components.
 */

export type RecorderPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface RecordedTakeResult {
  uri: string;
  durationMs: number;
}

export interface UseVoiceRecorderOptions {
  /**
   * Called when a take is cut short because the app left the foreground — a
   * phone call, an app switch, a screen lock. The partial recording is
   * stopped and handed over rather than dropped: a short take is something
   * the user can listen to and decide about, a lost one is not.
   *
   * Without this the behaviour was simply undefined. Nothing stopped the
   * recorder, nothing saved it, and nothing told the user.
   */
  onInterrupted?: (take: RecordedTakeResult) => void;
}

export interface UseVoiceRecorder {
  permissionStatus: RecorderPermissionStatus;
  requestPermission: () => Promise<boolean>;
  isRecording: boolean;
  durationMs: number;
  start: () => Promise<void>;
  /** Stops recording and returns the finished take, or null if nothing was recording. */
  stop: () => Promise<RecordedTakeResult | null>;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 100);
  const [permissionStatus, setPermissionStatus] = useState<RecorderPermissionStatus>(
    'undetermined',
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const result = await requestRecordingPermissionsAsync();
    setPermissionStatus(result.granted ? 'granted' : 'denied');
    return result.granted;
  }, []);

  const start = useCallback(async (): Promise<void> => {
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stop = useCallback(async (): Promise<RecordedTakeResult | null> => {
    if (!state.isRecording) return null;
    await recorder.stop();
    const finalStatus = recorder.getStatus();
    if (!finalStatus.url) return null;
    return { uri: finalStatus.url, durationMs: finalStatus.durationMillis };
  }, [recorder, state.isRecording]);

  // Refs so the AppState subscription below is created once. Listing `stop`
  // or `isRecording` as effect dependencies would tear the listener down and
  // rebuild it on every recorder tick — the same churn that was silently
  // cancelling autosaves in the Song View.
  const stopRef = useRef(stop);
  const isRecordingRef = useRef(state.isRecording);
  const onInterruptedRef = useRef(options.onInterrupted);

  // Written in an effect rather than during render — a ref mutated while
  // rendering is a React rule violation and breaks under concurrent rendering.
  useEffect(() => {
    stopRef.current = stop;
    isRecordingRef.current = state.isRecording;
    onInterruptedRef.current = options.onInterrupted;
  });

  useEffect(() => {
    async function endTake(): Promise<void> {
      if (!isRecordingRef.current) return;
      try {
        const take = await stopRef.current();
        if (take) onInterruptedRef.current?.(take);
      } catch (error) {
        logError('recording could not be stopped cleanly', error);
      }
    }

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next.match(/inactive|background/)) void endTake();
    });

    return () => {
      subscription.remove();
      // Unmounting mid-take would otherwise leave the native recorder running
      // with nothing holding a reference to it.
      void endTake();
    };
  }, []);

  return {
    permissionStatus,
    requestPermission,
    isRecording: state.isRecording,
    durationMs: state.durationMillis,
    start,
    stop,
  };
}

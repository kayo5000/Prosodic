/**
 * useProsodicEngine.ts
 *
 * The Central React Hook for the Prosodic Workstation.
 *
 * Provides reactive, memoized access to the Central Prosodic Engine across
 * any screen or component in the app.
 */

import { useMemo } from 'react';

import {
  analyzeLyricsMaster,
  type MasterProsodicReport,
} from '@/services/prosodicCore';
import type { AspirationLabel } from '@/utils/aspirationGap';
import type { TimeSignature } from '@/utils/tempoDensity';

export function useProsodicEngine(
  lyrics: string,
  bpm: number = 90,
  timeSignature: TimeSignature = '4/4',
  title: string = 'Untitled Verse',
  statedAspiration: AspirationLabel = 'aggressive',
): MasterProsodicReport {
  return useMemo(() => {
    return analyzeLyricsMaster(lyrics, bpm, timeSignature, title, statedAspiration);
  }, [lyrics, bpm, timeSignature, title, statedAspiration]);
}

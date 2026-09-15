/**
 * useTranslation.tsx
 *
 * React Hook and Provider for the 3-Mode Universal Translation Engine.
 *
 * Provides reactive access to active explanation mode:
 * - 'simple': Plain English analogies
 * - 'hybrid': Dual Lens (Analogy + Real Term)
 * - 'deep_craft': Raw mechanics & phonetics
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

import type { ConceptTranslation, ExplanationMode } from '@/data/translations';
import {
  type FormattedExplanation,
  formatDeviceBadge,
  formatMetricCard,
  translateConcept,
} from '@/services/translator';

interface TranslationContextType {
  mode: ExplanationMode;
  setMode: (mode: ExplanationMode) => void;
  translate: (key: string) => FormattedExplanation;
  formatBadge: (deviceKey: string) => string;
  metricCard: (
    metricKey: 'SPS' | 'AspirationGap' | 'Concreteness' | 'Earworm' | 'AAVE_CCR',
  ) => ConceptTranslation;
}

const TranslationContext = createContext<TranslationContextType>({
  mode: 'hybrid',
  setMode: () => {},
  translate: (key: string) => translateConcept(key, 'hybrid'),
  formatBadge: (deviceKey: string) => formatDeviceBadge(deviceKey, 'hybrid'),
  metricCard: (metricKey) => formatMetricCard(metricKey, 'hybrid'),
});

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ExplanationMode>('hybrid');

  const value = useMemo(
    () => ({
      mode,
      setMode,
      translate: (key: string) => translateConcept(key, mode),
      formatBadge: (deviceKey: string) => formatDeviceBadge(deviceKey, mode),
      metricCard: (
        metricKey: 'SPS' | 'AspirationGap' | 'Concreteness' | 'Earworm' | 'AAVE_CCR',
      ) => formatMetricCard(metricKey, mode),
    }),
    [mode],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}

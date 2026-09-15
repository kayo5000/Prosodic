/**
 * translator.ts
 *
 * Universal Translation Service for Prosodic.
 * Formats any raw device, metric, or coaching alert into the user's chosen dialect.
 */

import {
  type ConceptTranslation,
  type ExplanationMode,
  getTranslation,
  TRANSLATION_DICTIONARY,
} from '../data/translations';

export interface FormattedExplanation {
  title: string;
  tagline: string;
  badgeLabel: string;
  description: string;
  example?: string;
  mode: ExplanationMode;
}

/**
 * Translates any concept key (device, metric, phenomenon) into the active dialect mode.
 */
export function translateConcept(
  key: string,
  mode: ExplanationMode = 'hybrid',
): FormattedExplanation {
  const trans: ConceptTranslation = getTranslation(key, mode);

  let badgeLabel = trans.title;
  if (mode === 'simple' && trans.analogy) {
    badgeLabel = trans.analogy;
  }

  return {
    title: trans.title,
    tagline: trans.tagline,
    badgeLabel,
    description: trans.description,
    example: trans.example,
    mode,
  };
}

/**
 * Formats a device badge for UI display.
 */
export function formatDeviceBadge(
  deviceType: string,
  mode: ExplanationMode = 'hybrid',
): string {
  const entry = TRANSLATION_DICTIONARY[deviceType];
  if (!entry) return deviceType;

  if (mode === 'simple') return entry.simple.title;
  if (mode === 'deep_craft') return entry.deep_craft.title;
  return entry.hybrid.title;
}

/**
 * Formats a metric explanation card.
 */
export function formatMetricCard(
  metricKey: 'SPS' | 'AspirationGap' | 'Concreteness' | 'Earworm' | 'AAVE_CCR',
  mode: ExplanationMode = 'hybrid',
): ConceptTranslation {
  return getTranslation(metricKey, mode);
}

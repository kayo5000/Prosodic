import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colorForFamily } from '../../theme/theme';
import type { VerseRhymeToken } from '../../services/rhymeDetectionEngine';

export interface SyllableOverride {
  stress?: number;
  colorId?: number;
  gridPos?: number;
}

export interface SyllableInspectorModalProps {
  visible: boolean;
  wordText?: string;
  lineIndex?: number;
  wordIndex?: number;
  syllables?: VerseRhymeToken[];
  syllable?: VerseRhymeToken | null;
  initialSyllableIndex?: number;
  currentOverride?: SyllableOverride;
  syllableOverrides?: Map<string, SyllableOverride>;
  onClose: () => void;
  onSaveOverride: (token: VerseRhymeToken, override: SyllableOverride) => void;
  onClearOverride: (token: VerseRhymeToken) => void;
}

const PERCEPTUAL_FAMILY_NAMES: Array<{ id: number; name: string; nucleus: string; example: string }> = [
  { id: 1, name: 'ER-Family (NURSE)', nucleus: 'ER', example: 'worst, curse, turnt, hurt' },
  { id: 2, name: 'VR-Family (NEAR)', nucleus: 'IH/IY+R', example: 'persevere, adhere, clear, steer' },
  { id: 3, name: 'AIR-Family (SQUARE)', nucleus: 'EH+R', example: 'rare, stare, care, there' },
  { id: 4, name: 'AR-Family (START)', nucleus: 'AA+R', example: 'car, far, hard, smart' },
  { id: 5, name: 'OR-Family (NORTH)', nucleus: 'AO+R', example: 'more, door, floor, store' },
  { id: 6, name: 'EE-Family', nucleus: 'IY', example: 'see, feel, deep, dream' },
  { id: 7, name: 'AY-Family', nucleus: 'AY', example: 'life, night, mind, rhyme' },
  { id: 8, name: 'EY-Family', nucleus: 'EY', example: 'day, way, make, state' },
  { id: 9, name: 'OH-Family', nucleus: 'OW', example: 'know, flow, cold, stone' },
  { id: 10, name: 'OO-Family', nucleus: 'UW', example: 'true, move, cool, room' },
  { id: 11, name: 'AH-Family', nucleus: 'AH/AA', example: 'blood, love, run, god' },
  { id: 12, name: 'EH-Family', nucleus: 'EH', example: 'head, dead, best, step' },
  { id: 13, name: 'IH-Family', nucleus: 'IH', example: 'win, begin, think, spit' },
  { id: 14, name: 'AW-Family', nucleus: 'AW', example: 'down, sound, out, crown' },
  { id: 15, name: 'AE-Family', nucleus: 'AE', example: 'back, track, trap, stand' },
  { id: 16, name: 'OY-Family', nucleus: 'OY', example: 'coin, voice, boy, joy' },
];

export function SyllableInspectorModal({
  visible,
  wordText,
  lineIndex = 0,
  wordIndex = 0,
  syllables,
  syllable,
  initialSyllableIndex = 0,
  currentOverride,
  syllableOverrides,
  onClose,
  onSaveOverride,
  onClearOverride,
}: SyllableInspectorModalProps) {
  // Normalize word syllables list
  const activeSyllablesList: VerseRhymeToken[] = React.useMemo(() => {
    if (syllables && syllables.length > 0) return syllables;
    if (syllable) return [syllable];
    return [];
  }, [syllables, syllable]);

  const [selectedSyllableIdx, setSelectedSyllableIdx] = useState<number>(initialSyllableIndex);

  useEffect(() => {
    if (visible) {
      setSelectedSyllableIdx(Math.min(initialSyllableIndex, Math.max(0, activeSyllablesList.length - 1)));
    }
  }, [visible, initialSyllableIndex, activeSyllablesList.length]);

  if (!visible || activeSyllablesList.length === 0) return null;

  const currentToken = activeSyllablesList[selectedSyllableIdx] || activeSyllablesList[0];
  const overrideKey = `${currentToken.lineIndex}:${currentToken.wordIndex}:${currentToken.syllableIndex}:${currentToken.text.trim().toLowerCase()}`;
  const activeOverride = syllableOverrides?.get(overrideKey) || currentOverride;

  const activeStress = activeOverride?.stress !== undefined ? activeOverride.stress : currentToken.stress;
  const activeColorId = activeOverride?.colorId !== undefined ? activeOverride.colorId : currentToken.colorId;
  const activeGridPos = activeOverride?.gridPos !== undefined ? activeOverride.gridPos : (currentToken.gridPosition || 0);

  const displayWord = wordText || currentToken.word || currentToken.text;
  const totalWordSyllables = activeSyllablesList.length;

  const handleSelectFamily = (familyId: number) => {
    onSaveOverride(currentToken, {
      ...activeOverride,
      colorId: familyId === activeColorId ? 0 : familyId,
    });
  };

  const handleSelectStress = (stressLevel: number) => {
    onSaveOverride(currentToken, {
      ...activeOverride,
      stress: stressLevel,
    });
  };

  const handleSelectGrid = (gridStep: number) => {
    onSaveOverride(currentToken, {
      ...activeOverride,
      gridPos: gridStep,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header: Word & Line context */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.badgeRow}>
                <Text style={styles.sheetTitle}>WORD INSPECTOR</Text>
                <View style={styles.linePill}>
                  <Text style={styles.linePillText}>LINE {(currentToken.lineIndex ?? lineIndex) + 1}</Text>
                </View>
              </View>
              <Text style={styles.wordHeading}>
                "{displayWord.trim()}"
                <Text style={styles.syllableCountSubtext}>
                  {' '}• {totalWordSyllables} {totalWordSyllables === 1 ? 'Syllable' : 'Syllables'}
                </Text>
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close inspector"
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Step 1: Individual Manual Syllable Selector */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                SELECT INDIVIDUAL SYLLABLE TO IDENTIFY & TUNE ({activeSyllablesList.length} TOTAL)
              </Text>
              <View style={styles.syllableChipsRow}>
                {activeSyllablesList.map((tok, idx) => {
                  const isSelected = selectedSyllableIdx === idx;
                  const tokKey = `${tok.lineIndex}:${tok.wordIndex}:${tok.syllableIndex}:${tok.text.trim().toLowerCase()}`;
                  const tokOv = syllableOverrides?.get(tokKey);
                  const tokColorId = tokOv?.colorId !== undefined ? tokOv.colorId : tok.colorId;
                  const tokStress = tokOv?.stress !== undefined ? tokOv.stress : tok.stress;
                  const tokColor = tokColorId > 0 ? colorForFamily(tokColorId) : '#FFFFFF';
                  const isRhyming = tokColorId > 0;

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setSelectedSyllableIdx(idx)}
                      style={[
                        styles.syllableSelectPill,
                        isSelected && styles.syllableSelectPillActive,
                        isRhyming && { borderColor: tokColor },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Syllable ${tok.text}, tap to inspect`}
                    >
                      <View
                        style={[
                          styles.syllableSelectDot,
                          { backgroundColor: isRhyming ? tokColor : 'rgba(255, 255, 255, 0.25)' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.syllableSelectPillText,
                          { color: isRhyming ? tokColor : '#FFFFFF' },
                          isSelected && styles.syllableSelectPillTextActive,
                        ]}
                      >
                        {tok.text}
                      </Text>
                      {tokStress === 1 && <Text style={styles.stressBadge}>*</Text>}
                      {tokStress === 2 && <Text style={styles.stressBadgeSecondary}>•</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Step 2: Metric Stress Placement */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                METRIC STRESS PLACEMENT FOR "{currentToken.text.trim()}"
              </Text>
              <View style={styles.stressButtonsRow}>
                <Pressable
                  onPress={() => handleSelectStress(1)}
                  style={[
                    styles.stressOptionBtn,
                    activeStress === 1 && styles.stressOptionActive,
                  ]}
                >
                  <Text style={[styles.stressOptionText, activeStress === 1 && styles.stressOptionTextActive]}>
                    Primary Stress (*)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectStress(2)}
                  style={[
                    styles.stressOptionBtn,
                    activeStress === 2 && styles.stressOptionActive,
                  ]}
                >
                  <Text style={[styles.stressOptionText, activeStress === 2 && styles.stressOptionTextActive]}>
                    Secondary (•)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectStress(0)}
                  style={[
                    styles.stressOptionBtn,
                    activeStress === 0 && styles.stressOptionActive,
                  ]}
                >
                  <Text style={[styles.stressOptionText, activeStress === 0 && styles.stressOptionTextActive]}>
                    Unstressed (o)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Step 3: 16-Step Bar Grid Alignment */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>16-POSITION BAR GRID ALIGNMENT</Text>
              <Text style={styles.sectionSublabel}>
                Positions 0 & 8 are Downbeats (Beats 1 & 3). Positions 4 & 12 are Backbeat Pockets (Beats 2 & 4).
              </Text>
              <View style={styles.gridStepsRow}>
                {Array.from({ length: 16 }).map((_, stepIdx) => {
                  const isDownbeat = stepIdx === 0 || stepIdx === 8;
                  const isPocket = stepIdx === 4 || stepIdx === 12;
                  const isSelected = activeGridPos === stepIdx;

                  return (
                    <Pressable
                      key={stepIdx}
                      onPress={() => handleSelectGrid(stepIdx)}
                      style={[
                        styles.gridStepBtn,
                        isDownbeat && styles.gridStepDownbeat,
                        isPocket && styles.gridStepPocket,
                        isSelected && styles.gridStepSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gridStepText,
                          (isDownbeat || isPocket) && styles.gridStepTextStrong,
                          isSelected && styles.gridStepTextSelected,
                        ]}
                      >
                        {stepIdx}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Step 4: 12+ Perceptual Sonic Rhyme Families */}
            <View style={styles.sectionBlock}>
              <View style={styles.familyHeaderRow}>
                <Text style={styles.sectionLabel}>PERCEPTUAL RHYME FAMILIES & WELLS SETS</Text>
                {activeColorId > 0 && (
                  <Pressable onPress={() => onSaveOverride(currentToken, { ...activeOverride, colorId: 0 })}>
                    <Text style={styles.clearFamilyText}>Clear Family</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.familiesGrid}>
                {PERCEPTUAL_FAMILY_NAMES.map((fam) => {
                  const isFamActive = activeColorId === fam.id;
                  const famColor = colorForFamily(fam.id);

                  return (
                    <Pressable
                      key={fam.id}
                      onPress={() => handleSelectFamily(fam.id)}
                      style={[
                        styles.familyCard,
                        isFamActive && { borderColor: famColor, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                      ]}
                    >
                      <View style={[styles.familyColorDot, { backgroundColor: famColor }]} />
                      <View style={styles.familyTextGroup}>
                        <Text style={[styles.familyNameText, isFamActive && { color: famColor, fontWeight: '700' }]}>
                          {fam.name}
                        </Text>
                        <Text style={styles.familyExamplesText} numberOfLines={1}>
                          {fam.example}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Clear All Overrides Action */}
            {activeOverride && (
              <Pressable
                onPress={() => {
                  onClearOverride(currentToken);
                }}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Reset Syllable to Natural Engine Detection</Text>
              </Pressable>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#101016',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E5A50A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  linePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  linePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  wordHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  syllableCountSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionSublabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 10,
  },
  syllableChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  syllableSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  syllableSelectPillActive: {
    borderColor: '#E5A50A',
    backgroundColor: 'rgba(229, 165, 10, 0.15)',
    transform: [{ scale: 1.04 }],
  },
  syllableSelectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syllableSelectPillText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  syllableSelectPillTextActive: {
    fontWeight: '900',
  },
  stressBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E5A50A',
  },
  stressBadgeSecondary: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  stressButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stressOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  stressOptionActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  stressOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stressOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridStepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridStepBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridStepDownbeat: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridStepPocket: {
    borderColor: 'rgba(229, 165, 10, 0.4)',
    backgroundColor: 'rgba(229, 165, 10, 0.1)',
  },
  gridStepSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  gridStepText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  gridStepTextStrong: {
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  gridStepTextSelected: {
    color: '#000000',
    fontWeight: '800',
  },
  familyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearFamilyText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 100, 100, 0.8)',
  },
  familiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  familyCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  familyColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  familyTextGroup: {
    flex: 1,
  },
  familyNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  familyExamplesText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 1,
  },
  resetButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.3)',
    backgroundColor: 'rgba(255, 100, 100, 0.08)',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6464',
  },
});

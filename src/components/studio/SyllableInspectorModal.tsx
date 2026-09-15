import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colorForFamily, FAMILY_COLORS } from '../../theme/theme';
import type { VerseRhymeToken } from '../../services/rhymeDetectionEngine';

export interface SyllableOverride {
  stress?: number;
  colorId?: number;
  gridPos?: number;
}

interface SyllableInspectorModalProps {
  visible: boolean;
  syllable: VerseRhymeToken | null;
  currentOverride?: SyllableOverride;
  onClose: () => void;
  onSaveOverride: (token: VerseRhymeToken, override: SyllableOverride) => void;
  onClearOverride: (token: VerseRhymeToken) => void;
}

const PERCEPTUAL_FAMILY_NAMES: Array<{ id: number; name: string; nucleus: string; example: string }> = [
  { id: 1, name: 'R-Family', nucleus: 'ER', example: 'worst, curse, turnt' },
  { id: 2, name: 'AY-Family', nucleus: 'EY', example: 'day, way, make' },
  { id: 3, name: 'EE-Family', nucleus: 'IY', example: 'see, feel, deep' },
  { id: 4, name: 'OW-Family', nucleus: 'OW', example: 'know, flow, cold' },
  { id: 5, name: 'AH-Family', nucleus: 'AH', example: 'blood, love, run' },
  { id: 6, name: 'AY2-Family', nucleus: 'AY', example: 'life, night, mind' },
  { id: 7, name: 'OO-Family', nucleus: 'UW', example: 'true, move, cool' },
  { id: 8, name: 'AW-Family', nucleus: 'AW', example: 'down, sound, out' },
  { id: 9, name: 'AE-Family', nucleus: 'AE', example: 'back, track, trap' },
  { id: 10, name: 'OH-Family', nucleus: 'AO', example: 'talk, call, thought' },
  { id: 11, name: 'IH-Family', nucleus: 'IH', example: 'win, begin, think' },
  { id: 12, name: 'EH-Family', nucleus: 'EH', example: 'head, dead, best' },
];

export function SyllableInspectorModal({
  visible,
  syllable,
  currentOverride,
  onClose,
  onSaveOverride,
  onClearOverride,
}: SyllableInspectorModalProps) {
  if (!syllable) return null;

  const activeStress = currentOverride?.stress !== undefined ? currentOverride.stress : syllable.stress;
  const activeColorId = currentOverride?.colorId !== undefined ? currentOverride.colorId : syllable.colorId;
  const activeGridPos = currentOverride?.gridPos !== undefined ? currentOverride.gridPos : 0;

  const handleSelectFamily = (familyId: number) => {
    onSaveOverride(syllable, {
      ...currentOverride,
      colorId: familyId === activeColorId ? 0 : familyId,
    });
  };

  const handleSelectStress = (stressLevel: number) => {
    onSaveOverride(syllable, {
      ...currentOverride,
      stress: stressLevel,
    });
  };

  const handleSelectGrid = (gridStep: number) => {
    onSaveOverride(syllable, {
      ...currentOverride,
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
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Syllable Inspector</Text>
              <Text style={styles.syllablePreview}>
                "{syllable.text.trim()}" in <Text style={styles.wordHighlight}>{syllable.word}</Text>
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
            {/* 1. Stress Placement Control */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>METRIC STRESS PLACEMENT</Text>
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

            {/* 2. 16-Step Bar Grid Position */}
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

            {/* 3. 12 Perceptual Sonic Families */}
            <View style={styles.sectionBlock}>
              <View style={styles.familyHeaderRow}>
                <Text style={styles.sectionLabel}>12 PERCEPTUAL RHYME FAMILIES</Text>
                {activeColorId > 0 && (
                  <Pressable onPress={() => onSaveOverride(syllable, { ...currentOverride, colorId: 0 })}>
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
                          {fam.name} ({fam.nucleus})
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
            {currentOverride && (
              <Pressable
                onPress={() => {
                  onClearOverride(syllable);
                  onClose();
                }}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Reset to Natural Engine Detection</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  syllablePreview: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  wordHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    marginBottom: 8,
  },
  sectionSublabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 10,
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

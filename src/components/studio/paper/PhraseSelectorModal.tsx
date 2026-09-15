import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { PhrasePreset } from './types';

interface PhraseSelectorModalProps {
  visible: boolean;
  blockIndex: number;
  currentPreset?: PhrasePreset;
  currentBarCount: number;
  onSelectPreset: (preset: PhrasePreset, barCount: number) => void;
  onClose: () => void;
}

export function PhraseSelectorModal({
  visible,
  blockIndex,
  currentPreset = '4/4',
  currentBarCount,
  onSelectPreset,
  onClose,
}: PhraseSelectorModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PhrasePreset>(currentPreset);
  const [customCount, setCustomCount] = useState<number>(currentBarCount || 4);
  const [customInputString, setCustomInputString] = useState<string>(String(currentBarCount || 4));

  const handleSelectPreset = (preset: PhrasePreset) => {
    setSelectedPreset(preset);
    if (preset === '4/4') {
      onSelectPreset('4/4', 4);
      onClose();
    } else if (preset === '4/8') {
      onSelectPreset('4/8', 8);
      onClose();
    } else if (preset === '4/16') {
      onSelectPreset('4/16', 16);
      onClose();
    }
  };

  const handleDecrease = () => {
    setCustomCount((c) => {
      const next = Math.max(1, c - 1);
      setCustomInputString(String(next));
      return next;
    });
  };

  const handleIncrease = () => {
    setCustomCount((c) => {
      const next = Math.min(64, c + 1);
      setCustomInputString(String(next));
      return next;
    });
  };

  const handleInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomInputString(cleaned);
    if (cleaned !== '') {
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 64) {
        setCustomCount(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    if (customInputString === '' || parseInt(customInputString, 10) < 1) {
      setCustomInputString(String(customCount || 4));
    } else {
      const parsed = Math.min(64, Math.max(1, parseInt(customInputString, 10)));
      setCustomCount(parsed);
      setCustomInputString(String(parsed));
    }
  };

  const handleApplyCustom = () => {
    const countToApply = customInputString !== '' && parseInt(customInputString, 10) >= 1
      ? Math.min(64, parseInt(customInputString, 10))
      : customCount;
    onSelectPreset('-/-', countToApply);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoider}
        >
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Phrase Length</Text>
                <Text style={styles.subtitle}>Section {blockIndex} • Currently {currentBarCount} bars</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close Phrase Length">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Pressable>
            </View>

            {/* Preset Options (4/4, 4/8, 4/16, -/-) */}
            <Text style={styles.sectionLabel}>PRESET OPTIONS</Text>
            <View style={styles.presetsRow}>
              {(
                [
                  { preset: '4/4' as PhrasePreset, label: '4/4', desc: '4 Bars' },
                  { preset: '4/8' as PhrasePreset, label: '4/8', desc: '8 Bars' },
                  { preset: '4/16' as PhrasePreset, label: '4/16', desc: '16 Bars' },
                  { preset: '-/-' as PhrasePreset, label: '-/-', desc: 'Custom' },
                ] as const
              ).map((item) => {
                const isSelected = selectedPreset === item.preset;
                return (
                  <Pressable
                    key={item.preset}
                    onPress={() => handleSelectPreset(item.preset)}
                    style={[styles.presetCard, isSelected && styles.presetCardActive]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.presetCardTitle, isSelected && styles.presetCardTitleActive]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.presetCardDesc, isSelected && styles.presetCardDescActive]}>
                      {item.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom (-/-) Tap & Type Configurator */}
            {selectedPreset === '-/-' && (
              <View style={styles.customSection}>
                <Text style={styles.sectionLabel}>CUSTOM BAR COUNT (TAP TO TYPE)</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={handleDecrease}
                    style={styles.stepperButton}
                    accessibilityLabel="Decrease bars"
                  >
                    <Text style={styles.stepperButtonText}>−</Text>
                  </Pressable>

                  <View style={styles.countBadge}>
                    <TextInput
                      value={customInputString}
                      onChangeText={handleInputChange}
                      onBlur={handleInputBlur}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      returnKeyType="done"
                      style={[
                        styles.countInput,
                        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                      ]}
                      accessibilityLabel="Custom bar count"
                    />
                    <Text style={styles.countLabel}>BARS</Text>
                  </View>

                  <Pressable
                    onPress={handleIncrease}
                    style={styles.stepperButton}
                    accessibilityLabel="Increase bars"
                  >
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>

                <Pressable onPress={handleApplyCustom} style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Apply {customInputString || customCount} Bars</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoider: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCardActive: {
    backgroundColor: '#FFF9EB',
    borderColor: '#E5A50A', // Apple Notes gold active border
  },
  presetCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  presetCardTitleActive: {
    color: '#E5A50A',
  },
  presetCardDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  presetCardDescActive: {
    color: '#E5A50A',
    fontWeight: '600',
  },
  customSection: {
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 24,
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    maxWidth: 80,
    gap: 4,
  },
  countInput: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: 64,
    maxWidth: 64,
    height: 48,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5A50A', // Gold border signaling tap to edit
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  applyButton: {
    backgroundColor: '#E5A50A',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

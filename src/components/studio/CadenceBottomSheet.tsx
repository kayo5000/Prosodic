import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { type TimeSignature } from '../../utils/tempoDensity';

interface CadenceBottomSheetProps {
  visible: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  targetDensity: 'relaxed' | 'dense' | 'double_time';
  onClose: () => void;
  onChangeBpm: (newBpm: number) => void;
  onChangeTimeSignature: (meter: TimeSignature) => void;
  onChangeDensity: (density: 'relaxed' | 'dense' | 'double_time') => void;
}

/**
 * Contextual Bottom Sheet for Cadence & Metronome settings.
 * Keeps user in context without ripping them to a new full page.
 */
export const CadenceBottomSheet: React.FC<CadenceBottomSheetProps> = ({
  visible,
  bpm,
  timeSignature,
  targetDensity,
  onClose,
  onChangeBpm,
  onChangeTimeSignature,
  onChangeDensity,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheetContainer}>
          {/* Draggable Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Cadence &amp; Pocket Engine</Text>
              <Text style={styles.subtitle}>Configure metronome, meter, and density</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </TouchableOpacity>
          </View>

          {/* BPM Tempo Controls */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionLabel}>
              Tempo: <Text style={styles.highlightText}>{bpm} BPM</Text>
            </Text>
            <View style={styles.bpmButtonsRow}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => onChangeBpm(Math.max(60, bpm - 5))}
              >
                <Text style={styles.adjustBtnText}>-5</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => onChangeBpm(Math.max(60, bpm - 1))}
              >
                <Text style={styles.adjustBtnText}>-1</Text>
              </TouchableOpacity>

              <View style={styles.bpmDisplayPill}>
                <Text style={styles.bpmDisplayText}>{bpm}</Text>
                <Text style={styles.bpmSubText}>BPM</Text>
              </View>

              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => onChangeBpm(Math.min(220, bpm + 1))}
              >
                <Text style={styles.adjustBtnText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => onChangeBpm(Math.min(220, bpm + 5))}
              >
                <Text style={styles.adjustBtnText}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Signature Meter Picker */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionLabel}>Meter / Time Signature</Text>
            <View style={styles.meterRow}>
              {(['4/4', '6/8', '3/4'] as TimeSignature[]).map((meter) => (
                <TouchableOpacity
                  key={meter}
                  style={[
                    styles.meterButton,
                    timeSignature === meter && styles.meterButtonActive,
                  ]}
                  onPress={() => onChangeTimeSignature(meter)}
                >
                  <Text
                    style={[
                      styles.meterButtonText,
                      timeSignature === meter && styles.meterButtonTextActive,
                    ]}
                  >
                    {meter === '4/4'
                      ? '4/4 Standard'
                      : meter === '6/8'
                      ? '6/8 Drill'
                      : '3/4 Waltz'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Density Preset Picker */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionLabel}>Target Syllable Density</Text>
            <View style={styles.meterRow}>
              {(['relaxed', 'dense', 'double_time'] as const).map((density) => (
                <TouchableOpacity
                  key={density}
                  style={[
                    styles.meterButton,
                    targetDensity === density && styles.meterButtonActive,
                  ]}
                  onPress={() => onChangeDensity(density)}
                >
                  <Text
                    style={[
                      styles.meterButtonText,
                      targetDensity === density && styles.meterButtonTextActive,
                    ]}
                  >
                    {density === 'relaxed'
                      ? 'Relaxed'
                      : density === 'dense'
                      ? 'Dense Pocket'
                      : 'Double-Time'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Apply Settings">
            <Text style={styles.applyButtonText}>Apply Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 24,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748B',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 19,
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
  controlSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  highlightText: {
    color: '#60A5FA',
  },
  bpmButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
  },
  bpmDisplayPill: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#131D31',
    borderWidth: 1.2,
    borderColor: '#3B82F6',
    alignItems: 'center',
  },
  bpmDisplayText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#60A5FA',
  },
  bpmSubText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  meterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  meterButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  meterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  meterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  applyButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

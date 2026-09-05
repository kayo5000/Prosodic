import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TapTempoCalculator } from '@/utils/tapTempo';
import {
  type BarMetrics,
  STYLE_PRESETS,
  type StylePresetKey,
  type TimeSignature,
  type VisualDensityMode,
} from '@/utils/tempoDensity';

interface TempoDensityHeaderProps {
  metrics: BarMetrics;
  onBpmChange: (bpm: number) => void;
  onPresetChange: (preset: StylePresetKey) => void;
  onHalfTimeToggle: (halfTime: boolean) => void;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  visualMode: VisualDensityMode;
  onVisualModeChange: (mode: VisualDensityMode) => void;
  onOpenDrawer: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Filename of the imported instrumental, or null when none is attached. */
  backingTrackName?: string | null;
  isImportingTrack?: boolean;
  onImportTrack?: () => void;
  onClearTrack?: () => void;
}

const COMMON_BPMS = [80, 90, 120, 140];
const TIME_SIGNATURES: TimeSignature[] = ['4/4', '3/4', '6/8'];

export function TempoDensityHeader({
  metrics,
  onBpmChange,
  onPresetChange,
  onHalfTimeToggle,
  onTimeSignatureChange,
  visualMode,
  onVisualModeChange,
  onOpenDrawer,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  backingTrackName = null,
  isImportingTrack = false,
  onImportTrack,
  onClearTrack,
}: TempoDensityHeaderProps) {
  const [showControls, setShowControls] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const tapperRef = useRef(new TapTempoCalculator());

  const handleBpmStep = useCallback(
    (delta: number) => {
      onBpmChange(Math.max(40, Math.min(240, metrics.bpm + delta)));
    },
    [metrics.bpm, onBpmChange],
  );

  const handleTapTempo = useCallback(() => {
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 120);

    const detectedBpm = tapperRef.current.recordTap();
    if (detectedBpm !== null) {
      onBpmChange(detectedBpm);
    }
  }, [onBpmChange]);

  return (
    <ThemedView style={styles.container}>
      {/* Top Bar: Drawer Trigger, Undo/Redo, Title & Live Stat Badge */}
      <View style={styles.topRow}>
        <View style={styles.leftHeader}>
          <Pressable
            onPress={onOpenDrawer}
            style={({ pressed }) => [styles.drawerButton, pressed && styles.pressed]}
          >
            <Text style={styles.drawerIcon}>☰</Text>
          </Pressable>

          <ThemedText type="subtitle">Think Pad</ThemedText>

          {/* Undo / Redo Actions */}
          <View style={styles.historyButtonGroup}>
            <Pressable
              disabled={!canUndo}
              onPress={onUndo}
              style={({ pressed }) => [
                styles.historyButton,
                !canUndo && styles.disabledButton,
                pressed && canUndo && styles.pressed,
              ]}
            >
              <Text style={[styles.historyIconText, !canUndo && styles.disabledIconText]}>↶</Text>
            </Pressable>

            <Pressable
              disabled={!canRedo}
              onPress={onRedo}
              style={({ pressed }) => [
                styles.historyButton,
                !canRedo && styles.disabledButton,
                pressed && canRedo && styles.pressed,
              ]}
            >
              <Text style={[styles.historyIconText, !canRedo && styles.disabledIconText]}>↷</Text>
            </Pressable>
          </View>
        </View>

        {/* Live Metrics Pill */}
        <Pressable
          onPress={() => setShowControls((prev) => !prev)}
          style={({ pressed }) => [styles.statsPill, pressed && styles.pressed]}
        >
          <View style={styles.pulseDot} />
          <Text style={styles.statsText}>
            {metrics.bpm} BPM • {metrics.timeSignature} • {metrics.barDurationSeconds}s • Target:{' '}
            {metrics.targetSyllables} syl
          </Text>
          <Text style={styles.toggleIcon}>{showControls ? '▲' : '▼'}</Text>
        </Pressable>
      </View>

      {/* Expandable Studio Controls */}
      {showControls && (
        <View style={styles.controlsDrawer}>
          {/* BPM Stepper, Tap-Tempo & Common Presets */}
          <View style={styles.sectionRow}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Tempo:
            </ThemedText>

            <View style={styles.stepperGroup}>
              <Pressable
                onPress={() => handleBpmStep(-5)}
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">-5</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleBpmStep(-1)}
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">-1</ThemedText>
              </Pressable>
              <View style={styles.bpmDisplay}>
                <ThemedText type="smallBold">{metrics.bpm}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  BPM
                </ThemedText>
              </View>
              <Pressable
                onPress={() => handleBpmStep(1)}
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">+1</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleBpmStep(5)}
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              >
                <ThemedText type="smallBold">+5</ThemedText>
              </Pressable>
            </View>

            {/* Tap-Tempo Button */}
            <Pressable
              onPress={handleTapTempo}
              style={({ pressed }) => [
                styles.tapTempoButton,
                isTapping && styles.tapTempoActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.tapTempoText}>🥁 TAP</Text>
            </Pressable>

            {/* Presets */}
            <View style={styles.bpmPresets}>
              {COMMON_BPMS.map((bpm) => (
                <Pressable
                  key={bpm}
                  onPress={() => onBpmChange(bpm)}
                  style={({ pressed }) => [
                    styles.pill,
                    metrics.bpm === bpm ? styles.activePill : styles.inactivePill,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      metrics.bpm === bpm ? styles.activePillText : styles.inactivePillText,
                    ]}
                  >
                    {bpm}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Backing Track */}
          {onImportTrack ? (
            <View style={styles.sectionRow}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Beat:
              </ThemedText>
              <View style={styles.presetRow}>
                <Pressable
                  onPress={onImportTrack}
                  disabled={isImportingTrack}
                  accessibilityRole="button"
                  accessibilityLabel={
                    backingTrackName ? `Replace beat, currently ${backingTrackName}` : 'Import a beat'
                  }
                  style={[
                    styles.pill,
                    backingTrackName ? styles.activePill : styles.inactivePill,
                    styles.trackPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      backingTrackName ? styles.activePillText : styles.inactivePillText,
                    ]}
                    numberOfLines={1}
                  >
                    {isImportingTrack ? 'Opening…' : (backingTrackName ?? 'Import MP3')}
                  </Text>
                </Pressable>
                {backingTrackName && onClearTrack ? (
                  <Pressable
                    onPress={onClearTrack}
                    accessibilityRole="button"
                    accessibilityLabel="Remove beat"
                    style={[styles.pill, styles.inactivePill]}
                  >
                    <Text style={[styles.pillText, styles.inactivePillText]}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Time Signature & Half-Time */}
          <View style={styles.sectionRow}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Meter:
            </ThemedText>
            <View style={styles.presetRow}>
              {TIME_SIGNATURES.map((ts) => {
                const isActive = metrics.timeSignature === ts;
                return (
                  <Pressable
                    key={ts}
                    onPress={() => onTimeSignatureChange(ts)}
                    style={({ pressed }) => [
                      styles.pill,
                      isActive ? styles.activePill : styles.inactivePill,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isActive ? styles.activePillText : styles.inactivePillText,
                      ]}
                    >
                      {ts}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => onHalfTimeToggle(!metrics.isHalfTime)}
                style={({ pressed }) => [
                  styles.pill,
                  metrics.isHalfTime ? styles.activePillHighlight : styles.inactivePill,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    metrics.isHalfTime ? styles.activePillHighlightText : styles.inactivePillText,
                  ]}
                >
                  {metrics.isHalfTime ? 'Half-Time (2x)' : '1x Bar'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Style Presets */}
          <View style={styles.sectionRow}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Flow Preset:
            </ThemedText>
            <View style={styles.presetRow}>
              {(Object.keys(STYLE_PRESETS) as StylePresetKey[]).map((key) => {
                const preset = STYLE_PRESETS[key];
                const isActive = metrics.stylePreset === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onPresetChange(key)}
                    style={({ pressed }) => [
                      styles.pill,
                      isActive ? styles.activePill : styles.inactivePill,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isActive ? styles.activePillText : styles.inactivePillText,
                      ]}
                    >
                      {preset.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Display Mode */}
          <View style={styles.sectionRow}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Display Mode:
            </ThemedText>
            <View style={styles.presetRow}>
              <Pressable
                onPress={() => onVisualModeChange('gutter')}
                style={({ pressed }) => [
                  styles.pill,
                  visualMode === 'gutter' ? styles.activePill : styles.inactivePill,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    visualMode === 'gutter' ? styles.activePillText : styles.inactivePillText,
                  ]}
                >
                  Side Badge
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onVisualModeChange('heatmap')}
                style={({ pressed }) => [
                  styles.pill,
                  visualMode === 'heatmap' ? styles.activePill : styles.inactivePill,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    visualMode === 'heatmap' ? styles.activePillText : styles.inactivePillText,
                  ]}
                >
                  Word Heatmap
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onVisualModeChange('both')}
                style={({ pressed }) => [
                  styles.pill,
                  visualMode === 'both' ? styles.activePill : styles.inactivePill,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    visualMode === 'both' ? styles.activePillText : styles.inactivePillText,
                  ]}
                >
                  Both
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  drawerButton: {
    backgroundColor: '#1E293B',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  drawerIcon: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
  historyButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  historyButton: {
    backgroundColor: '#1E293B',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyIconText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.35,
    borderColor: '#1E293B',
  },
  disabledIconText: {
    color: '#64748B',
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statsText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  toggleIcon: {
    color: '#94A3B8',
    fontSize: 10,
  },
  controlsDrawer: {
    backgroundColor: '#0F172A',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.three,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sectionLabel: {
    width: 90,
    color: '#94A3B8',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: '#1E293B',
    padding: 2,
    borderRadius: 8,
  },
  stepButton: {
    backgroundColor: '#334155',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  bpmDisplay: {
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  tapTempoButton: {
    backgroundColor: '#065F46',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  tapTempoActive: {
    backgroundColor: '#10B981',
    transform: [{ scale: 0.95 }],
  },
  tapTempoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bpmPresets: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    flex: 1,
  },
  trackPill: {
    maxWidth: 180,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 16,
    borderWidth: 1,
  },
  activePill: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  activePillHighlight: {
    backgroundColor: '#8B5CF6',
    borderColor: '#A78BFA',
  },
  inactivePill: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activePillText: {
    color: '#FFFFFF',
  },
  activePillHighlightText: {
    color: '#FFFFFF',
  },
  inactivePillText: {
    color: '#94A3B8',
  },
  pressed: {
    opacity: 0.7,
  },
});

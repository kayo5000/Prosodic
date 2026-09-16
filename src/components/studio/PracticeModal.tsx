import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Pressable,
} from 'react-native';

interface PracticeModalProps {
  visible: boolean;
  bpm: number;
  onClose: () => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({
  visible,
  bpm,
  onClose,
}) => {
  const [activeBeat, setActiveBeat] = useState(1);
  const [drillRunning, setDrillRunning] = useState(false);
  const [currentSps] = useState(4.2);

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 260,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible, animValue]);

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const cardScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  useEffect(() => {
    if (!drillRunning || !visible) return;
    const intervalMs = (60 / bpm) * 1000;
    const timer = setInterval(() => {
      setActiveBeat((b) => (b % 4) + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [drillRunning, visible, bpm]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalCard,
            {
              transform: [
                { translateY: cardTranslateY },
                { scale: cardScale },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Practice Lab</Text>
              <Text style={styles.subtitle}>Real-time Cadence &amp; Velocity Drills</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Practice Lab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </TouchableOpacity>
          </View>

          {/* Drill Status Card */}
          <View style={styles.drillCard}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {drillRunning ? 'DRILL ACTIVE' : 'READY TO DRILL'}
              </Text>
            </View>
            <Text style={styles.drillTitle}>The 4-Bar Triple Time Test</Text>
            <Text style={styles.drillSub}>
              Target: 14 Syllables / Bar • {bpm} BPM Pocket
            </Text>

            {/* Velocity Speedometer Bar */}
            <View style={styles.speedometerContainer}>
              <View style={styles.speedometerTrack}>
                <View
                  style={[
                    styles.speedometerFill,
                    { width: `${Math.min(100, (currentSps / 6.0) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.speedometerText}>
                Current Velocity: {currentSps.toFixed(1)} SPS (Target Locked)
              </Text>
            </View>
          </View>

          {/* Active 4-Beat Grid */}
          <View style={styles.beatSection}>
            <Text style={styles.beatSectionTitle}>Active Measure Pulse</Text>
            <View style={styles.beatGrid}>
              {[1, 2, 3, 4].map((beat) => (
                <View
                  key={beat}
                  style={[
                    styles.beatCircle,
                    drillRunning && activeBeat === beat && styles.beatCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.beatText,
                      drillRunning && activeBeat === beat && styles.beatTextActive,
                    ]}
                  >
                    {beat}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Start / Stop CTA Button */}
          <TouchableOpacity
            style={[styles.startBtn, drillRunning && styles.stopBtn]}
            onPress={() => setDrillRunning(!drillRunning)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={drillRunning ? "Stop Drill" : "Start 4-Bar Challenge"}
          >
            {drillRunning ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginRight: 8 }}>
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                <Text style={styles.startBtnText}>Stop Drill</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0F172A" style={{ marginRight: 8 }}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <Text style={styles.startBtnText}>Start 4-Bar Challenge</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '80%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
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
  drillCard: {
    backgroundColor: '#131D31',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    padding: 18,
    marginVertical: 10,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusPillText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
  },
  drillTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  drillSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
  },
  speedometerContainer: {
    marginTop: 4,
  },
  speedometerTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B111E',
    overflow: 'hidden',
    marginBottom: 6,
  },
  speedometerFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 5,
  },
  speedometerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  beatSection: {
    marginVertical: 10,
  },
  beatSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  beatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  beatCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
    transform: [{ scale: 1.08 }],
  },
  beatText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#94A3B8',
  },
  beatTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  startBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    backgroundColor: '#DC2626',
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

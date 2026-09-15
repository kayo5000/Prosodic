import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import type { DissectionAnalysis } from '@/utils/dissector';

interface FramedArtModalProps {
  visible: boolean;
  onClose: () => void;
  analysis: DissectionAnalysis;
}

export function FramedArtModal({ visible, onClose, analysis }: FramedArtModalProps) {
  const handleOrder = () => {
    Alert.alert(
      'Order Placed via Print-on-Demand',
      `Your 18x24" museum-grade framed art print of "${analysis.title}" has been prepped for archival printing & framing!`,
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Framed Studio Art Print</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* The Framed Plaque Frame Visualization */}
            <View style={styles.frameOuter}>
              <View style={styles.frameMatte}>
                <View style={styles.printCanvas}>
                  {/* Plaque Header */}
                  <View style={styles.plaqueHeader}>
                    <Text style={styles.plaqueBrand}>PROSODIC ARCHIVAL SERIES • 001</Text>
                    <Text style={styles.plaqueTitle}>{analysis.title.toUpperCase()}</Text>
                  </View>

                  {/* Chromatic Waveform & Verse Geometry */}
                  <View style={styles.geometryCanvas}>
                    {analysis.lines.map((l) => (
                      <View key={l.lineNumber} style={styles.geometryLine}>
                        {l.words.map((w, wIdx) => (
                          <View
                            key={wIdx}
                            style={[styles.geometryBar, { backgroundColor: w.color, width: Math.max(12, w.word.length * 6) }]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>

                  {/* Engraved Plaque Bottom Bar */}
                  <View style={styles.engravedPlaque}>
                    <Text style={styles.engravedTitle}>
                      {analysis.bpm} BPM • {analysis.timeSignature} • {analysis.totalBars} BARS
                    </Text>
                    <Text style={styles.engravedSub}>
                      COMPLEXITY INDEX: {analysis.complexityScore}/100 • DOMINANT: {analysis.dominantVowelFamily}
                    </Text>
                    <Text style={styles.engravedCert}>CERTIFIED COMPUTATIONAL PROSODY WORKSTATION</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Product Specifications Card */}
            <View style={styles.specBox}>
              <Text style={styles.specTitle}>Archival Studio Quality</Text>
              <Text style={styles.specDetails}>
                • Size: 18&quot; x 24&quot; Premium Archival Luster Print{'\n'}
                • Frame: Matte Black Solid Wood Frame with Shatterproof Plexiglass{'\n'}
                • Resolution: 300 DPI Ultra-High Definition Vector Geometry{'\n'}
                • Delivery: Museum-grade packaging, delivered in 3–5 business days
              </Text>
            </View>

            {/* Buy Action Button */}
            <Pressable onPress={handleOrder} style={({ pressed }) => [styles.orderBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Order Framed Plaque">
              <Text style={styles.orderBtnText}>Order Framed Plaque ($119)</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: Spacing.one,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  frameOuter: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0F0F10',
    padding: 14,
    borderRadius: 4,
    borderWidth: 8,
    borderColor: '#1C1917',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  frameMatte: {
    backgroundColor: '#05070B',
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  printCanvas: {
    backgroundColor: '#090D16',
    padding: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  plaqueHeader: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
  },
  plaqueBrand: {
    color: '#64748B',
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
  },
  plaqueTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  geometryCanvas: {
    width: '100%',
    paddingVertical: Spacing.three,
    gap: 8,
    alignItems: 'center',
  },
  geometryLine: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geometryBar: {
    height: 8,
    borderRadius: 4,
  },
  engravedPlaque: {
    width: '100%',
    backgroundColor: '#0F172A',
    padding: Spacing.two,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    gap: 2,
  },
  engravedTitle: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  engravedSub: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '600',
  },
  engravedCert: {
    color: '#60A5FA',
    fontSize: 7,
    letterSpacing: 1,
    marginTop: 2,
  },
  specBox: {
    backgroundColor: '#0F172A',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
    maxWidth: 340,
    gap: 6,
  },
  specTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  specDetails: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  orderBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  orderBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});

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

interface SocialCardModalProps {
  visible: boolean;
  onClose: () => void;
  analysis: DissectionAnalysis;
}

export function SocialCardModal({ visible, onClose, analysis }: SocialCardModalProps) {
  const handleShare = () => {
    Alert.alert(
      'Infographic Ready',
      `"${analysis.title}" (Complexity: ${analysis.complexityScore}/100) infographic generated for social sharing!`,
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Social Story Card</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* The 9:16 Social Card Infographic */}
            <View style={styles.socialCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.brandRow}>
                  <Text style={styles.brandName}>PROSODIC</Text>
                  <Text style={styles.brandTag}>FORENSIC X-RAY</Text>
                </View>
                <Text style={styles.cardTitle}>{analysis.title}</Text>
                <Text style={styles.cardMeta}>
                  {analysis.bpm} BPM • {analysis.timeSignature} • {analysis.totalBars} Bars
                </Text>
              </View>

              {/* Complexity Score Badge */}
              <View style={styles.scoreBox}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>{analysis.complexityScore}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreMeta}>
                  <Text style={styles.scoreTier}>
                    {analysis.complexityScore >= 90
                      ? 'Elite Virtuoso'
                      : analysis.complexityScore >= 75
                        ? 'Advanced Pocket'
                        : 'Solid Rhythm'}
                  </Text>
                  <Text style={styles.scoreDesc}>
                    {analysis.rhymeChainCount} Rhyme Schemes • {analysis.averageSps} Avg SPS •{' '}
                    {analysis.peakSps} Peak SPS
                  </Text>
                </View>
              </View>

              {/* Highlighted Verse Preview */}
              <View style={styles.lyricsBlock}>
                {analysis.lines.map((l) => (
                  <View key={l.lineNumber} style={styles.lineRow}>
                    <Text style={styles.lineNum}>{l.lineNumber}</Text>
                    <View style={styles.wordsRow}>
                      {l.words.map((w, wIdx) => (
                        <Text key={wIdx} style={[styles.word, { color: w.color }]}>
                          {w.word}{' '}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Certified Computational Flow Analysis</Text>
                <Text style={styles.footerUrl}>prosodic.app</Text>
              </View>
            </View>

            {/* Share Trigger Action */}
            <Pressable onPress={handleShare} style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Save or Share to Story">
              <Text style={styles.shareBtnText}>Save / Share to Story</Text>
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
  socialCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#090D16',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    gap: 4,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    paddingBottom: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  brandTag: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  cardMeta: {
    color: '#64748B',
    fontSize: 11,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.three,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  scoreNumber: {
    color: '#60A5FA',
    fontSize: 20,
    fontWeight: '800',
  },
  scoreMax: {
    color: '#64748B',
    fontSize: 9,
  },
  scoreMeta: {
    flex: 1,
    gap: 2,
  },
  scoreTier: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  lyricsBlock: {
    backgroundColor: '#05080F',
    padding: Spacing.two,
    borderRadius: 10,
    gap: 6,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  lineNum: {
    color: '#475569',
    fontSize: 10,
    fontFamily: 'monospace',
    width: 16,
  },
  wordsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  footerText: {
    color: '#64748B',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerUrl: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '700',
  },
  shareBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});

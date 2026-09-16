import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { PERCEPTUAL_FAMILIES } from '../../data/perceptualFamilies';

interface LexiconModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRhyme?: (word: string) => void;
}

export const LexiconModal: React.FC<LexiconModalProps> = ({
  visible,
  onClose,
  onSelectRhyme,
}) => {
  const [query, setQuery] = useState('supreme');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');

  const familiesList = Object.values(PERCEPTUAL_FAMILIES);

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
              <Text style={styles.title}>Lexicon Armory</Text>
              <Text style={styles.subtitle}>12 Sonic Families &amp; Multisyllabics</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Lexicon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <TextInput
              style={styles.searchInput}
              placeholder="Search words, rhymes, slang..."
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear Search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </TouchableOpacity>
            )}
          </View>

          {/* Sonic Family Filter Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[
                styles.familyPill,
                selectedFamily === 'ALL' && styles.familyPillActive,
              ]}
              onPress={() => setSelectedFamily('ALL')}
            >
              <Text
                style={[
                  styles.familyPillText,
                  selectedFamily === 'ALL' && styles.familyPillTextActive,
                ]}
              >
                All Families
              </Text>
            </TouchableOpacity>

            {familiesList.map((family) => (
              <TouchableOpacity
                key={family.name}
                style={[
                  styles.familyPill,
                  selectedFamily === family.name && styles.familyPillActive,
                  { borderColor: family.color },
                ]}
                onPress={() => setSelectedFamily(family.name)}
              >
                <View
                  style={[
                    styles.familyColorDot,
                    { backgroundColor: family.color },
                  ]}
                />
                <Text style={styles.familyPillText}>
                  {family.label} ({family.phoneticSymbol})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Categorized Rhyme Results (1D Stacks) */}
          <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
            {/* Category 1: Perfect Rhymes */}
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>PERFECT CYAN FAMILY RHYMES</Text>
              <View style={styles.rhymeCard}>
                {['scheme', 'stream', 'routine', 'regime', 'machine', 'gleam'].map((word) => (
                  <TouchableOpacity
                    key={word}
                    style={styles.rhymeChip}
                    onPress={() => onSelectRhyme?.(word)}
                  >
                    <Text style={styles.rhymeChipText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category 2: 3-Syllable Multisyllabics */}
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>3-SYLLABLE MULTISYLLABIC WEAVES</Text>
              <View style={styles.rhymeCard}>
                {['guillotine', 'silver screen', 'quarantine', 'subroutine'].map((word) => (
                  <TouchableOpacity
                    key={word}
                    style={styles.rhymeChipMulti}
                    onPress={() => onSelectRhyme?.(word)}
                  >
                    <Text style={styles.rhymeChipMultiText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category 3: Slant & AAVE Variants */}
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>SLANT &amp; AAVE PHONETIC VARIANTS</Text>
              <View style={styles.rhymeCard}>
                {['sublime', 'redefine', 'genuine', 'design'].map((word) => (
                  <TouchableOpacity
                    key={word}
                    style={styles.rhymeChipSlant}
                    onPress={() => onSelectRhyme?.(word)}
                  >
                    <Text style={styles.rhymeChipSlantText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
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
    height: '85%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 24,
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#0B111E',
    borderWidth: 1.2,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  filterScroll: {
    maxHeight: 38,
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  familyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  familyPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  familyColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  familyPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  familyPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultsScroll: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rhymeCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0B111E',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rhymeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  rhymeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  rhymeChipMulti: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#18182E',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  rhymeChipMultiText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C084FC',
  },
  rhymeChipSlant: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#241808',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rhymeChipSlantText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
  },
});

import React, { useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';

import type { CadenceBarLine } from './types';
import type { VerseRhymeToken } from '../../../services/rhymeDetectionEngine';

interface CadenceBarRowProps {
  bar: CadenceBarLine;
  isActive: boolean;
  isAlignedAcrossPage: boolean;
  showBarNumber?: boolean;
  showRhymeMap?: boolean;
  rhymeTokens?: VerseRhymeToken[];
  onFocus: () => void;
  onChangeText: (newText: string) => void;
  onSubmitEditing: () => void;
  onBackspaceEmpty?: () => void;
  onGutterPress?: () => void;
  onSelectSyllable?: (token: VerseRhymeToken) => void;
}

export function CadenceBarRow({
  bar,
  isActive,
  isAlignedAcrossPage,
  showBarNumber = true,
  showRhymeMap = true,
  rhymeTokens,
  onFocus,
  onChangeText,
  onSubmitEditing,
  onBackspaceEmpty,
  onGutterPress,
  onSelectSyllable,
}: CadenceBarRowProps) {
  const inputRef = useRef<TextInput>(null);

  // Derive styles from formatting spans
  const isItalic = bar.spans.some((s) => s.italic);
  const isUnderline = bar.spans.some((s) => s.underline);
  const isBold = bar.spans.some((s) => s.bold);

  const textStyle: TextStyle = {
    fontStyle: isItalic ? 'italic' : 'normal',
    textDecorationLine: isUnderline ? 'underline' : 'none',
    fontWeight: isBold ? '700' : '500',
  };

  // Render vetted rhyme tokens or fall back
  const tokensToRender = React.useMemo(() => {
    if (!showRhymeMap || !bar.rawText) return [];
    if (rhymeTokens && rhymeTokens.length > 0) return rhymeTokens;
    return [];
  }, [showRhymeMap, bar.rawText, rhymeTokens]);

  // Dynamic width calculation:
  // If aligned across page: flex 1 (full width)
  // If not aligned (compact measure mode): starts at 120px and smoothly expands as user types
  const estimatedCharWidth = 9.5;
  const dynamicMeasureWidth = Math.min(
    Math.max(120, bar.rawText.length * estimatedCharWidth + 36),
    520,
  );

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Backspace' && bar.rawText === '' && onBackspaceEmpty) {
      onBackspaceEmpty();
    }
  };

  return (
    <View style={styles.barOuterWrapper}>
      <Pressable
        onPress={() => {
          onFocus();
          inputRef.current?.focus();
        }}
        style={[
          styles.rowContainer,
          !showBarNumber && styles.rowContainerBorderless,
          isActive && styles.activeRowHighlight,
        ]}
      >
        {/* 1. Bar Number Column - Tapping anywhere in this gutter opens phrase length */}
        {showBarNumber && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onGutterPress?.();
            }}
            style={styles.barNumberContainer}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Bar ${bar.barIndex}. Tap to configure section phrase length`}
          >
            <Text style={[styles.barNumberText, isActive && styles.activeBarNumberText]}>
              {bar.barIndex}
            </Text>
          </Pressable>
        )}

        {/* 2. Measure Wrapper (starts as small gap or expands across full page) */}
        <View
          style={[
            styles.measureContainer,
            !showBarNumber || isAlignedAcrossPage
              ? styles.measureFullWidth
              : { width: dynamicMeasureWidth },
          ]}
        >
          {/* Left Repeat Barline Marker |• */}
          {showBarNumber && (
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>|•</Text>
            </View>
          )}

          {/* Lyric Input Field: Crisp Native High-Contrast Text Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              value={bar.rawText}
              onChangeText={onChangeText}
              onFocus={onFocus}
              onSubmitEditing={onSubmitEditing}
              onKeyPress={handleKeyPress}
              blurOnSubmit={false}
              returnKeyType="next"
              autoCorrect={false}
              autoCapitalize="sentences"
              placeholder=""
              style={[
                styles.textInput,
                textStyle,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
            />
          </View>

          {/* Right Repeat Barline Marker •| */}
          {showBarNumber && (
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>•|</Text>
            </View>
          )}
        </View>

        {/* 3. Syllable Count Badge on Right - Tap to Inspect Bar Words & Syllables */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (tokensToRender.length > 0 && onSelectSyllable) {
              onSelectSyllable(tokensToRender[0]);
            } else {
              onGutterPress?.();
            }
          }}
          style={styles.syllableContainer}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Bar ${bar.barIndex} has ${bar.syllableCount} syllables. Tap to inspect words and syllables`}
        >
          <View style={[styles.syllableBadgePill, showRhymeMap && bar.syllableCount > 0 && styles.syllableBadgePillActive]}>
            <Text
              style={[
                styles.syllableText,
                bar.syllableCount > 0 ? styles.syllableTextActive : styles.syllableTextZero,
                isActive && styles.syllableTextHighlight,
              ]}
            >
              {bar.syllableCount}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    backgroundColor: '#000000',
  },
  rowContainerBorderless: {
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  activeRowHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  barNumberContainer: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  barNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    fontVariant: ['tabular-nums'],
  },
  activeBarNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  measureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    transition: 'all 0.15s ease',
  } as any,
  measureFullWidth: {
    flex: 1,
  },
  markerContainer: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: -0.5,
  },
  barOuterWrapper: {
    marginBottom: 2,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
  },
  syllableRibbonContainer: {
    paddingLeft: 46,
    paddingRight: 12,
    paddingBottom: 6,
  },
  syllableRibbonScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syllablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  syllableColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syllablePillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  stressMarker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E5A50A',
  },
  stressMarkerSecondary: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  syllableContainer: {
    minWidth: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  syllableBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  syllableBadgePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  syllableText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  syllableTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  syllableTextZero: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontWeight: '400',
  },
  syllableTextHighlight: {
    color: '#E5A50A', // Amber highlight when editing
    fontWeight: '700',
  },
});

import React, { useRef } from 'react';
import {
  Platform,
  Pressable,
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
  syllableTokens?: VerseRhymeToken[];
  onFocus: () => void;
  onChangeText: (newText: string) => void;
  onSubmitEditing: () => void;
  onBackspaceEmpty?: () => void;
  onGutterPress?: () => void;
  onSelectSyllable?: (token: VerseRhymeToken, allWordSyllables?: VerseRhymeToken[]) => void;
}

export function CadenceBarRow({
  bar,
  isActive,
  isAlignedAcrossPage,
  showBarNumber = true,
  showRhymeMap = true,
  rhymeTokens,
  syllableTokens,
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

  // Render vetted rhyme tokens when available
  const tokensToRender = React.useMemo(() => {
    if (!showRhymeMap || !bar.rawText.trim()) return [];
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

  // Intercept multiline paste on Web so linebreaks are never flattened
  const handlePaste = (e: any) => {
    const clipboardText =
      e?.clipboardData?.getData?.('text/plain') ||
      e?.clipboardData?.getData?.('text') ||
      e?.nativeEvent?.text;
    if (clipboardText && (clipboardText.includes('\n') || clipboardText.includes('\r'))) {
      e.preventDefault?.();
      onChangeText(clipboardText);
    }
  };

  const shouldRenderRhymeChips = showRhymeMap && !isActive && tokensToRender.length > 0;

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

          {/* Lyric Input Field / Interactive Rhyme Chips */}
          <View style={styles.inputWrapper}>
            {shouldRenderRhymeChips ? (
              <Pressable
                onPress={() => {
                  onFocus();
                  inputRef.current?.focus();
                }}
                style={styles.interactiveWordRow}
              >
                {tokensToRender.map((tok, tIdx) => {
                  if (!tok.isWord) {
                    return (
                      <Text
                        key={`space-${tIdx}`}
                        style={[styles.wordChipText, styles.whitespaceText, textStyle]}
                      >
                        {tok.text}
                      </Text>
                    );
                  }

                  const isRhyming = tok.colorId > 0;
                  const wordColor = isRhyming ? tok.color : '#FFFFFF';

                  return (
                    <Pressable
                      key={`tok-${tIdx}-${tok.wordIndex}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        const wordSylls = syllableTokens?.filter(
                          (s) => s.wordIndex === tok.wordIndex && s.lineIndex === tok.lineIndex,
                        );
                        onSelectSyllable?.(tok, wordSylls);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                      style={[
                        styles.interactiveWordPressable,
                        isRhyming && {
                          borderBottomColor: tok.color,
                          borderBottomWidth: 2,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Word ${tok.text}, tap to inspect syllables and annunciation`}
                    >
                      <Text
                        style={[
                          styles.wordChipText,
                          textStyle,
                          { color: wordColor },
                          isRhyming && styles.interactiveWordTextRhyming,
                        ]}
                      >
                        {tok.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </Pressable>
            ) : (
              <TextInput
                ref={inputRef}
                value={bar.rawText}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onSubmitEditing={onSubmitEditing}
                onKeyPress={handleKeyPress}
                {...(Platform.OS === 'web' ? ({ onPaste: handlePaste } as any) : {})}
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
            )}
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
              const firstRhymeTok = tokensToRender.find((t) => t.isWord && t.colorId > 0) || tokensToRender.find((t) => t.isWord);
              if (firstRhymeTok) {
                const wordSylls = syllableTokens?.filter(
                  (s) => s.wordIndex === firstRhymeTok.wordIndex && s.lineIndex === firstRhymeTok.lineIndex,
                );
                onSelectSyllable(firstRhymeTok, wordSylls);
              } else {
                onGutterPress?.();
              }
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
  interactiveWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  interactiveWordPressable: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    borderRadius: 2,
    marginVertical: 1,
  },
  wordChipText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
  },
  interactiveWordTextRhyming: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  whitespaceText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
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


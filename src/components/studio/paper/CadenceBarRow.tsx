import React, { useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
  Animated,
} from 'react-native';

import type { CadenceBarLine, CrossBarAlignment } from './types';
import type { VerseRhymeToken } from '../../../services/rhymeDetectionEngine';
import { LiquidGlassCard } from '../../ui/LiquidGlassCard';
import { getBarMetrics, getDensityHeatColor } from '../../../utils/tempoDensity';
import { countWordSyllables } from '@/utils/syllableCounter';

interface CadenceBarRowProps {
  bar: CadenceBarLine;
  isActive: boolean;
  isAlignedAcrossPage: boolean;
  showBarNumber?: boolean;
  displayBarIndex?: number;
  showRhymeMap?: boolean;
  rhymeTokens?: VerseRhymeToken[];
  syllableTokens?: VerseRhymeToken[];
  bpm?: number;
  stylePreset?: any;
  isAnomaly?: boolean;
  isGlobalTwistaCap?: boolean;
  isSyncSelectionMode?: boolean;
  isSelectedForSync?: boolean;
  onToggleSyncSelection?: () => void;
  onGlobalAutoSync?: () => void;
  onFocus: () => void;
  onChangeText: (newText: string) => void;
  onSubmitEditing: () => void;
  onSplitBar?: (textBefore: string, textAfter: string) => void;
  onBackspaceEmpty?: () => void;
  onGutterPress?: () => void;
  onSelectSyllable?: (token: VerseRhymeToken, allWordSyllables?: VerseRhymeToken[]) => void;
  onToggleCrossBarAlignment?: (barId: string, wordKey: string, nextAlignment: CrossBarAlignment) => void;
}

function getOptimalSplitIndex(rawText: string, tokens: VerseRhymeToken[]): number {
  if (!tokens || tokens.length === 0) return Math.floor(rawText.length / 2);

  const totalSyllables = tokens.reduce((sum, t) => sum + countWordSyllables(t.text), 0);
  const targetSyllables = totalSyllables / 2;

  let bestIndex = Math.floor(rawText.length / 2);
  let bestScore = -9999;

  let runningSyllables = 0;
  let runningCharIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prevCharIndex = runningCharIndex;
    runningCharIndex += tok.text.length;
    
    const tokSyllables = countWordSyllables(tok.text);
    runningSyllables += tokSyllables;

    if (!tok.isWord) continue;

    // Only consider split points around the middle (between 30% and 70% of syllables)
    const ratio = runningSyllables / totalSyllables;
    if (ratio < 0.3 || ratio > 0.7) continue;

    let score = 0;

    // Penalty for being far from center
    const distFromCenter = Math.abs(runningSyllables - targetSyllables);
    score -= distFromCenter * 2;

    // Look ahead at next token
    const nextTok = tokens[i + 1];
    if (nextTok) {
      const nextWord = nextTok.isWord ? nextTok.text.toLowerCase().trim() : '';
      const nextIsPunctuation = !nextTok.isWord && /^[.,;!?]+/.test(nextTok.text.trim());
      
      // Bonus for grammar/punctuation
      if (tok.text.match(/[.,;!?]$/) || nextIsPunctuation) {
        score += 50;
      }
      
      // Bonus for conjunctions
      const conjunctions = ['and', 'but', 'so', 'or', 'cause', 'because'];
      if (conjunctions.includes(nextWord)) {
        score += 30;
      }
    }

    // Bonus for internal rhyme resolution
    if (tok.colorId && tok.colorId > 0) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      // We want to split AFTER this token and any immediate punctuation
      bestIndex = runningCharIndex;
      if (tokens[i+1] && !tokens[i+1].isWord && /^[.,;!?\s]+$/.test(tokens[i+1].text)) {
        bestIndex += tokens[i+1].text.length;
      }
    }
  }

  return bestIndex;
}

export function CadenceBarRow({
  bar,
  isActive,
  isAlignedAcrossPage,
  showBarNumber = true,
  displayBarIndex,
  showRhymeMap = true,
  rhymeTokens,
  syllableTokens,
  bpm = 120,
  stylePreset = 'standard',
  onFocus,
  onChangeText,
  onSubmitEditing,
  onSplitBar,
  onBackspaceEmpty,
  onGutterPress,
  onSelectSyllable,
  onToggleCrossBarAlignment,
}: CadenceBarRowProps) {
  const inputRef = useRef<TextInput>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const [cursorPos, setCursorPos] = React.useState<number | null>(null);

  const heatColor = getDensityHeatColor(bar.syllableCount, getBarMetrics(bpm, stylePreset));

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const overlayFade = useRef(new Animated.Value(0)).current;
  const overlayWidth = useRef(new Animated.Value(0)).current;
  const [showRecommendation, setShowRecommendation] = React.useState(false);
  const prevHeatColorRef = useRef<string | null>(null);

  React.useEffect(() => {
    if (heatColor === '#EF4444' && prevHeatColorRef.current !== '#EF4444') {
      blinkAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.1, duration: 400, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 400, useNativeDriver: true })
        ]),
        { iterations: 6 }
      ).start();
    }
    prevHeatColorRef.current = heatColor;
  }, [heatColor, blinkAnim]);

  React.useEffect(() => {
    if (showRecommendation) {
      Animated.parallel([
        Animated.timing(overlayFade, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayWidth, { toValue: 80, duration: 250, useNativeDriver: false })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayWidth, { toValue: 0, duration: 200, useNativeDriver: false })
      ]).start();
    }
  }, [showRecommendation, overlayFade, overlayWidth]);

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

  const getAlignment = (wordIdx?: number, text?: string): CrossBarAlignment => {
    if (wordIdx !== undefined && bar.crossBarAlignments?.[String(wordIdx)]) {
      return bar.crossBarAlignments[String(wordIdx)];
    }
    if (text && bar.crossBarAlignments?.[text]) {
      return bar.crossBarAlignments[text];
    }
    return 'in-bar';
  };

  // Segment tokens into pre-bar, in-bar, and post-bar
  const { preBarTokens, inBarTokens, postBarTokens } = React.useMemo(() => {
    const pre: VerseRhymeToken[] = [];
    const inB: VerseRhymeToken[] = [];
    const post: VerseRhymeToken[] = [];

    tokensToRender.forEach((tok) => {
      if (!tok.isWord) {
        inB.push(tok);
        return;
      }
      const align = getAlignment(tok.wordIndex, tok.text);
      if (align === 'pre-bar') {
        pre.push(tok);
      } else if (align === 'post-bar') {
        post.push(tok);
      } else {
        inB.push(tok);
      }
    });

    return { preBarTokens: pre, inBarTokens: inB, postBarTokens: post };
  }, [tokensToRender, bar.crossBarAlignments]);

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

  const handleSubmit = () => {
    if (onSplitBar && cursorPos !== null && cursorPos < bar.rawText.length) {
      const textBefore = bar.rawText.slice(0, cursorPos);
      const textAfter = bar.rawText.slice(cursorPos);
      onSplitBar(textBefore, textAfter);
    } else {
      onSubmitEditing();
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

  const handleTokenPress = (tok: VerseRhymeToken, currentAlignment: CrossBarAlignment) => {
    const wordKey = String(tok.wordIndex ?? tok.text);
    const now = Date.now();
    const lastTap = lastTapRef.current[wordKey] || 0;
    const isDoubleTap = now - lastTap < 320;
    lastTapRef.current[wordKey] = now;

    if (isDoubleTap) {
      // Shift cycle: post-bar -> pre-bar -> in-bar -> post-bar
      let nextAlignment: CrossBarAlignment = 'post-bar';
      if (currentAlignment === 'post-bar') {
        nextAlignment = 'pre-bar';
      } else if (currentAlignment === 'pre-bar') {
        nextAlignment = 'in-bar';
      } else {
        nextAlignment = 'post-bar';
      }
      onToggleCrossBarAlignment?.(bar.id, wordKey, nextAlignment);
    } else {
      const wordSylls = syllableTokens?.filter(
        (s) => s.wordIndex === tok.wordIndex && s.lineIndex === tok.lineIndex,
      );
      onSelectSyllable?.(tok, wordSylls);
    }
  };

  const handleTokenLongPress = (tok: VerseRhymeToken) => {
    const wordSylls = syllableTokens?.filter(
      (s) => s.wordIndex === tok.wordIndex && s.lineIndex === tok.lineIndex,
    );
    onSelectSyllable?.(tok, wordSylls);
  };

  const renderToken = (tok: VerseRhymeToken, tIdx: number, alignment: CrossBarAlignment) => {
    if (!tok.isWord) {
      return (
        <Text key={`space-${tIdx}`} style={[styles.wordChipText, styles.whitespaceText, textStyle]}>
          {tok.text}
        </Text>
      );
    }

    const wordSylls = syllableTokens?.filter(
      (s) => s.wordIndex === tok.wordIndex && s.lineIndex === tok.lineIndex,
    );

    const isRhyming = tok.colorId > 0;
    const wordColor = isRhyming ? tok.color : '#FFFFFF';

    return (
      <Pressable
        key={`tok-${tIdx}-${tok.wordIndex}-${alignment}`}
        onPress={(e) => {
          e.stopPropagation();
          handleTokenPress(tok, alignment);
        }}
        onLongPress={(e) => {
          e.stopPropagation();
          handleTokenLongPress(tok);
        }}
        delayLongPress={400}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={[
          styles.interactiveWordPressable,
          alignment !== 'in-bar' && styles.crossBarPill,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Word ${tok.text}, ${alignment}. Double-tap to shift cross-bar position, hold to inspect syllables.`}
      >
        {wordSylls && wordSylls.length > 0 ? (
          <View style={styles.syllableClusterRow}>
            {wordSylls.map((syl, sIdx) => {
              const isSyllRhyming = syl.colorId > 0;
              const syllColor = isSyllRhyming ? syl.color : '#FFFFFF';
              return (
                <View
                  key={`syll-${sIdx}-${syl.text}`}
                  style={[
                    styles.syllableSpanWrap,
                    isSyllRhyming && {
                      borderBottomColor: syl.color,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.wordChipText,
                      textStyle,
                      { color: syllColor },
                      alignment !== 'in-bar' && styles.crossBarText,
                      isSyllRhyming && styles.interactiveWordTextRhyming,
                    ]}
                  >
                    {syl.text}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text
            style={[
              styles.wordChipText,
              textStyle,
              { color: wordColor },
              alignment !== 'in-bar' && styles.crossBarText,
              isRhyming && styles.interactiveWordTextRhyming,
              isRhyming && {
                borderBottomColor: tok.color,
                borderBottomWidth: 2,
              },
            ]}
          >
            {tok.text}
          </Text>
        )}
      </Pressable>
    );
  };

  const shouldRenderRhymeChips = showRhymeMap && !isActive && tokensToRender.length > 0;

  return (
    <View style={[styles.barOuterWrapper, { opacity: isSyncSelectionMode && !isSelectedForSync ? 0.3 : 1 }]}>
      {isSyncSelectionMode && (<Pressable onPress={onToggleSyncSelection} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#fff', backgroundColor: isSelectedForSync ? '#EF4444' : 'transparent', marginRight: 12, marginTop: 12, justifyContent: 'center', alignItems: 'center' }}>{isSelectedForSync && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />}</Pressable>)}
      <Pressable
        onPress={() => {
          onFocus();
          inputRef.current?.focus();
        }}
        style={[
          styles.rowContainer,
          !showBarNumber && styles.rowContainerBorderless,
          isActive && styles.activeRowHighlight,
          showRecommendation && { zIndex: 9999 },
        ]}
      >
        <LiquidGlassCard
          style={StyleSheet.absoluteFill as any}
          blurIntensity="sm"
          borderRadius={0}
          shadowIntensity="none"
          glowIntensity="none"
        />

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
              {displayBarIndex ?? bar.barIndex}
            </Text>
          </Pressable>
        )}

        {/* 2. Pre-Bar Anacrusis Container (Rendered before |•) */}
        {(preBarTokens.length > 0 || bar.preBarText) && (
          <View style={styles.preBarContainer}>
            {bar.preBarText ? (
              <Text style={[styles.preBarTextStatic, textStyle]}>{bar.preBarText}</Text>
            ) : null}
            {preBarTokens.map((tok, idx) => renderToken(tok, idx, 'pre-bar'))}
          </View>
        )}

        {/* 3. Measure Wrapper (starts as small gap or expands across full page) */}
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
                {inBarTokens.map((tok, tIdx) => renderToken(tok, tIdx, 'in-bar'))}
              </Pressable>
            ) : (
              <TextInput
                ref={inputRef}
                value={bar.rawText}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onSubmitEditing={handleSubmit}
                onKeyPress={handleKeyPress}
                onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection.start)}
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

        {/* 4. Post-Bar Spillover Container (Rendered after •|) */}
        {(postBarTokens.length > 0 || bar.postBarText) && (
          <View style={styles.postBarContainer}>
            {postBarTokens.map((tok, idx) => renderToken(tok, idx, 'post-bar'))}
            {bar.postBarText ? (
              <Text style={[styles.postBarTextStatic, textStyle]}>{bar.postBarText}</Text>
            ) : null}
          </View>
        )}

        {/* 5. Syllable Count Badge on Right - Tap to Inspect Bar Words & Syllables */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
          <Animated.View style={[{ overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8 }, { width: overlayWidth, opacity: overlayFade }]}>
            <Pressable 
              onPress={() => {
                setShowRecommendation(false);
                if (onSplitBar && inBarTokens.length > 0) {
                  const splitIndex = getOptimalSplitIndex(bar.rawText, inBarTokens);
                  const part1 = bar.rawText.substring(0, splitIndex).trim();
                  const part2 = bar.rawText.substring(splitIndex).trim();
                  if (part1 && part2) {
                    onSplitBar(part1, part2);
                  }
                }
              }} 
              style={styles.recommendationActionBtn}
              accessibilityLabel="Apply intelligent split recommendation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.44-5.44"/></svg>
            </Pressable>
            <Pressable 
              onPress={() => setShowRecommendation(false)} 
              style={styles.recommendationActionBtn}
              accessibilityLabel="Dismiss recommendation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Pressable>
          </Animated.View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (heatColor === '#EF4444') {
                setShowRecommendation(true);
              }
            }}
            style={[styles.syllableContainer, { marginLeft: 0 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Bar ${bar.barIndex} has ${bar.syllableCount} syllables. Tap to inspect words and syllables`}
          >
            <Animated.View
              style={[
                styles.syllableBadgePill,
                showRhymeMap && bar.syllableCount > 0 && {
                  borderColor: heatColor,
                  borderWidth: 2,
                  backgroundColor: 'transparent',
                },
                { opacity: blinkAnim }
              ]}
            >
              <Text
                style={[
                  styles.syllableText,
                  bar.syllableCount > 0 ? styles.syllableTextActive : styles.syllableTextZero,
                  isActive && { color: heatColor, fontWeight: '700' },
                ]}
              >
                {bar.syllableCount}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
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
  preBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 214, 10, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.25)',
  },
  postBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 214, 10, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.25)',
  },
  preBarTextStatic: {
    fontSize: 14,
    color: '#FFD60A',
    fontWeight: '600',
    marginRight: 4,
  },
  postBarTextStatic: {
    fontSize: 14,
    color: '#FFD60A',
    fontWeight: '600',
    marginLeft: 4,
  },
  crossBarPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 4,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  crossBarText: {
    fontStyle: 'italic',
    letterSpacing: -0.3,
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
    paddingHorizontal: 2,
    borderRadius: 2,
    marginVertical: 1,
  },
  syllableClusterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  syllableSpanWrap: {
    paddingVertical: 1,
    paddingHorizontal: 0.5,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  // removed syllableBadgePillActive since we do it inline now
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
    color: '#FFFFFF', // Amber highlight when editing
    fontWeight: '700',
  },
  recommendationActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
});







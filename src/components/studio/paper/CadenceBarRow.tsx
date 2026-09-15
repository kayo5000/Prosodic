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

interface CadenceBarRowProps {
  bar: CadenceBarLine;
  isActive: boolean;
  isAlignedAcrossPage: boolean;
  onFocus: () => void;
  onChangeText: (newText: string) => void;
  onSubmitEditing: () => void;
  onBackspaceEmpty?: () => void;
  onGutterPress?: () => void;
}

export function CadenceBarRow({
  bar,
  isActive,
  isAlignedAcrossPage,
  onFocus,
  onChangeText,
  onSubmitEditing,
  onBackspaceEmpty,
  onGutterPress,
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
    <Pressable
      onPress={() => {
        onFocus();
        inputRef.current?.focus();
      }}
      style={[
        styles.rowContainer,
        isActive && styles.activeRowHighlight,
      ]}
    >
      {/* 1. Bar Number Column - Tapping anywhere in this gutter opens phrase length */}
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

      {/* 2. Measure Wrapper (starts as small gap or expands across full page) */}
      <View
        style={[
          styles.measureContainer,
          isAlignedAcrossPage ? styles.measureFullWidth : { width: dynamicMeasureWidth },
        ]}
      >
        {/* Left Repeat Barline Marker |• */}
        <View style={styles.markerContainer}>
          <Text style={styles.markerText}>|•</Text>
        </View>

        {/* Lyric Input Field */}
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

        {/* Right Repeat Barline Marker •| */}
        <View style={styles.markerContainer}>
          <Text style={styles.markerText}>•|</Text>
        </View>
      </View>

      {/* 3. Syllable Count Badge on Right */}
      <View style={styles.syllableContainer}>
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
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA', // Apple Notes light gray ruled line
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  activeRowHighlight: {
    backgroundColor: 'rgba(242, 242, 247, 0.45)',
  },
  barNumberContainer: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  barNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  activeBarNumberText: {
    color: '#1C1C1E',
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
    color: '#3A3A3C',
    letterSpacing: -0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
  },
  syllableContainer: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  syllableText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  syllableTextActive: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  syllableTextZero: {
    color: '#C7C7CC',
    fontWeight: '400',
  },
  syllableTextHighlight: {
    color: '#E5A50A', // Apple Notes amber highlight when editing
    fontWeight: '700',
  },
});

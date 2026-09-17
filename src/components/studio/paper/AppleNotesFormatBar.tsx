import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaperFormatState } from './types';

interface AppleNotesFormatBarProps {
  formatState: PaperFormatState;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onChangeHeadingStyle: (style: 'body' | 'heading' | 'subheading') => void;
  onSave?: () => void;
  onCopy?: () => void;
  onClose?: () => void;
  visible?: boolean;
}

export function AppleNotesFormatBar({
  formatState,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onChangeHeadingStyle,
  onSave,
  onCopy,
  onClose,
  visible = true,
}: AppleNotesFormatBarProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} accessibilityLabel="Apple Notes Formatting Tray">
      {/* Header with Title and Dismiss */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Format</Text>
        {onClose && (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.closeButton}
            accessibilityLabel="Close formatting bar"
            accessibilityRole="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Pressable>
        )}
      </View>

      {/* Style Presets (Title / Heading / Subheading / Body) */}
      <View style={styles.stylePillsRow}>
        {(['heading', 'subheading', 'body'] as const).map((styleKey) => {
          const isActive = formatState.headingStyle === styleKey;
          const label = styleKey.charAt(0).toUpperCase() + styleKey.slice(1);
          return (
            <Pressable
              key={styleKey}
              onPress={() => onChangeHeadingStyle(styleKey)}
              style={[styles.stylePill, isActive && styles.stylePillActive]}
              accessibilityRole="button"
              accessibilityLabel={`${label} style`}
            >
              <Text style={[styles.stylePillText, isActive && styles.stylePillTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Character Formatting Buttons: Bold (B), Italic (I), Underline (U) */}
      <View style={styles.buttonSegmentRow}>
        <Pressable
          onPress={onToggleBold}
          style={[styles.formatButton, formatState.isBold && styles.formatButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Bold"
        >
          <Text style={[styles.formatButtonText, styles.boldText, formatState.isBold && styles.formatButtonTextActive]}>
            B
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleItalic}
          style={[styles.formatButton, formatState.isItalic && styles.formatButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Italic"
        >
          <Text style={[styles.formatButtonText, styles.italicText, formatState.isItalic && styles.formatButtonTextActive]}>
            I
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleUnderline}
          style={[styles.formatButton, formatState.isUnderline && styles.formatButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Underline"
        >
          <Text style={[styles.formatButtonText, styles.underlineText, formatState.isUnderline && styles.formatButtonTextActive]}>
            U
          </Text>
        </Pressable>
      </View>

      {/* Bottom Action Row: Save, Copy */}
      <View style={styles.actionsRow}>
        {onSave && (
          <Pressable
            onPress={onSave}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Save</Text>
          </Pressable>
        )}
        {onCopy && (
          <Pressable
            onPress={onCopy}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Copy</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    gap: 14,
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stylePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stylePill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stylePillActive: {
    backgroundColor: '#FFFFFF', // Amber active pill
  },
  stylePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stylePillTextActive: {
    color: '#000000',
  },
  buttonSegmentRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  formatButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  formatButtonText: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  boldText: {
    fontWeight: '800',
  },
  italicText: {
    fontStyle: 'italic',
    fontFamily: 'serif',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

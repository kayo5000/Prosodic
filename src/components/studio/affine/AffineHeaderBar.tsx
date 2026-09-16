import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AffineHeaderBarProps {
  onToggleSidebar: () => void;
  showBars: boolean;
  onToggleShowBars: () => void;
  showRhymeMap: boolean;
  onToggleShowRhymeMap: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
}

export const AffineHeaderBar: React.FC<AffineHeaderBarProps> = ({
  onToggleSidebar,
  showBars,
  onToggleShowBars,
  showRhymeMap,
  onToggleShowRhymeMap,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 16) }]}>
      {/* Single floating icon row — sidebar, settings, utilities. No mode labels. */}
      <View style={styles.floatingRow}>
        <TouchableOpacity
          style={styles.floatingIconButton}
          onPress={onToggleSidebar}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Toggle Sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatingIconButton}
          onPress={onOpenSettings}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Song Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </TouchableOpacity>

        {/* Utility icons inline in the same row */}
        <View style={styles.utilityRow}>
          <UtilityIcon
            active={showRhymeMap}
            onPress={onToggleShowRhymeMap}
            accessibilityLabel="Toggle Rhyme Map"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={showRhymeMap ? '#E5A50A' : 'rgba(255,255,255,0.45)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="12" r="3.2" />
              <circle cx="17" cy="12" r="3.2" />
              <path d="M9.8 10.2 14.2 13.8" />
            </svg>
          </UtilityIcon>

          <UtilityIcon
            active={showBars}
            onPress={onToggleShowBars}
            accessibilityLabel="Toggle Bar Grid"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={showBars ? '#E5A50A' : 'rgba(255,255,255,0.45)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="4" x2="4" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="20" y1="4" x2="20" y2="20" />
            </svg>
          </UtilityIcon>

          <UtilityIcon
            active={false}
            disabled={!canUndo}
            onPress={onUndo}
            accessibilityLabel="Undo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={canUndo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </UtilityIcon>

          <UtilityIcon
            active={false}
            disabled={!canRedo}
            onPress={onRedo}
            accessibilityLabel="Redo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={canRedo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </UtilityIcon>
        </View>
      </View>
    </View>
  );
};

function UtilityIcon({
  children,
  active,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.utilityIconButton, active && styles.utilityIconButtonActive]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 14,
    zIndex: 50,
  },
  floatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    flexShrink: 1,
    minWidth: 0,
  },
  utilityIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityIconButtonActive: {
    backgroundColor: 'rgba(229, 165, 10, 0.14)',
  },
});

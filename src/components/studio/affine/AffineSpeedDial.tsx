import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AffineSpeedDialProps {
  onOpenVoiceTake: () => void;
  onOpenWhiteboard: () => void;
  onOpenStructure: () => void;
  onOpenSettings: () => void;
  onOpenLexicon?: () => void;
  onOpenPractice?: () => void;
}

interface DockItem {
  id: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  highlight?: boolean;
}

/**
 * Persistent floating dock — a rounded pill bar hovering above the bottom
 * edge, always visible (no tap-to-expand step). Uses the real safe-area
 * inset rather than a hardcoded platform guess so it never sits behind a
 * home indicator, a browser toolbar, or a native tab bar.
 */
export const AffineSpeedDial: React.FC<AffineSpeedDialProps> = ({
  onOpenVoiceTake,
  onOpenWhiteboard,
  onOpenStructure,
  onOpenSettings,
  onOpenLexicon,
  onOpenPractice,
}) => {
  const insets = useSafeAreaInsets();

  const items: DockItem[] = [
    {
      id: 'record',
      label: 'Record Take',
      highlight: true,
      onPress: onOpenVoiceTake,
      icon: (color) => (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      id: 'whiteboard',
      label: 'Whiteboard',
      onPress: onOpenWhiteboard,
      icon: (color) => (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      id: 'structure',
      label: 'Structure',
      onPress: onOpenStructure,
      icon: (color) => (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
  ];

  if (onOpenLexicon) {
    items.push({
      id: 'lexicon',
      label: 'Lexicon',
      onPress: onOpenLexicon,
      icon: (color) => (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    });
  }

  if (onOpenPractice) {
    items.push({
      id: 'practice',
      label: 'Practice',
      onPress: onOpenPractice,
      icon: (color) => (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    });
  }

  items.push({
    id: 'settings',
    label: 'Settings',
    onPress: onOpenSettings,
    icon: (color) => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  });

  return (
    <View
      style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 16) + 10 }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.dockIcon, item.highlight && styles.dockIconHighlight]}
            onPress={item.onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            {item.icon(item.highlight ? '#000000' : 'rgba(255, 255, 255, 0.85)')}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 90,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 18, 20, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  dockIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconHighlight: {
    backgroundColor: '#E5A50A',
  },
});

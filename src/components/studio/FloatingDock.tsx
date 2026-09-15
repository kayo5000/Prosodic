import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type MainTabType = 'studio' | 'lexicon' | 'planner' | 'practice';

interface FloatingDockProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onPressAdd: () => void;
}

/**
 * Floating Dock Component following the Mobile UI Masterclass:
 * - <= 4 primary navigation items
 * - Generous touch targets >= 44px
 * - Detached floating action button (+)
 */
export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTab,
  onSelectTab,
  onPressAdd,
}) => {
  return (
    <View style={styles.dockContainer}>
      {/* Main Frosted Capsule */}
      <View style={styles.dockCapsule}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'studio' && styles.tabButtonActive]}
          onPress={() => onSelectTab('studio')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Studio"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={activeTab === 'studio' ? '#F8FAFC' : '#94A3B8'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <Text style={[styles.tabLabel, activeTab === 'studio' && styles.tabLabelActive]}>Studio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'lexicon' && styles.tabButtonActive]}
          onPress={() => onSelectTab('lexicon')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Lexicon"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={activeTab === 'lexicon' ? '#F8FAFC' : '#94A3B8'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <Text style={[styles.tabLabel, activeTab === 'lexicon' && styles.tabLabelActive]}>Lexicon</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'practice' && styles.tabButtonActive]}
          onPress={() => onSelectTab('practice')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Practice"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={activeTab === 'practice' ? '#F8FAFC' : '#94A3B8'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <Text style={[styles.tabLabel, activeTab === 'practice' && styles.tabLabelActive]}>Practice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'planner' && styles.tabButtonActive]}
          onPress={() => onSelectTab('planner')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Planner"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={activeTab === 'planner' ? '#F8FAFC' : '#94A3B8'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <Text style={[styles.tabLabel, activeTab === 'planner' && styles.tabLabelActive]}>Planner</Text>
        </TouchableOpacity>
      </View>

      {/* Detached Prominent Action FAB (+) */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={onPressAdd}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  dockCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 30,
    borderWidth: 1.2,
    borderColor: '#334155',
    paddingHorizontal: 8,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  tabButton: {
    minWidth: 54,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 4,
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
  },
  tabIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 12,
  },
  fabText: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
});

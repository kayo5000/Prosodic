import { StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import type { LineSyllableAnalysis } from '@/utils/syllableCounter';
import { type BarMetrics, getSyllablePocketStatus } from '@/utils/tempoDensity';

interface SyllableGutterProps {
  lines: LineSyllableAnalysis[];
  metrics: BarMetrics;
  activeLineNumber?: number;
}

export function SyllableGutter({ lines, metrics, activeLineNumber }: SyllableGutterProps) {
  return (
    <View style={styles.gutter}>
      {lines.map((line) => {
        const isActive = line.lineNumber === activeLineNumber;
        const status = getSyllablePocketStatus(line.syllableCount, metrics);

        let badgeStyle: ViewStyle = styles.badgeEmpty;
        let badgeTextStyle: TextStyle = styles.badgeTextEmpty;
        let label = `${line.syllableCount}`;

        if (status === 'locked') {
          badgeStyle = styles.badgeLocked;
          badgeTextStyle = styles.badgeTextLocked;
          label = `${line.syllableCount} syl`;
        } else if (status === 'open') {
          badgeStyle = styles.badgeOpen;
          badgeTextStyle = styles.badgeTextOpen;
          label = `${line.syllableCount} syl`;
        } else if (status === 'fast') {
          badgeStyle = styles.badgeFast;
          badgeTextStyle = styles.badgeTextFast;
          label = `${line.syllableCount} syl (Fast)`;
        }

        return (
          <View
            key={line.lineNumber}
            style={[styles.lineIndicator, isActive && styles.activeLineIndicator]}
          >
            <Text style={[styles.lineNumber, isActive && styles.activeLineNumber]}>
              {line.lineNumber}
            </Text>
            {line.syllableCount > 0 ? (
              <View
                style={[
                  styles.badge,
                  badgeStyle,
                  isActive && styles.activeBadgeHighlight,
                ]}
              >
                <Text style={[styles.badgeText, badgeTextStyle]}>{label}</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.badge,
                  styles.badgeEmpty,
                  isActive && styles.activeBadgeHighlight,
                ]}
              >
                <Text style={[styles.badgeTextEmpty, isActive && styles.activeBadgeTextEmpty]}>
                  -
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: {
    width: 76,
    paddingTop: 8,
    gap: 0,
  },
  lineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 4,
    paddingRight: 4,
    borderRadius: 4,
  },
  activeLineIndicator: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  lineNumber: {
    width: 20,
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  activeLineNumber: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeHighlight: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeEmpty: {
    backgroundColor: 'transparent',
  },
  badgeTextEmpty: {
    color: '#475569',
    fontSize: 11,
  },
  activeBadgeTextEmpty: {
    color: '#60A5FA',
  },
  badgeLocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeTextLocked: {
    color: '#10B981',
    fontSize: 10,
  },
  badgeOpen: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  badgeTextOpen: {
    color: '#F59E0B',
    fontSize: 10,
  },
  badgeFast: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  badgeTextFast: {
    color: '#EF4444',
    fontSize: 10,
  },
});

import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Placeholder for the dashboard described in CLAUDE.md ("Who v1 is for" —
// a dashboard that validates momentum and honestly surfaces flaws). Real
// content lands as later build-order steps ship: Mastery Countdown
// (step 6), Goals + Flaw detection (step 7).
export default function DashboardScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Dashboard</ThemedText>
        <ThemedText themeColor="textSecondary">
          Mastery Countdown and flaw detection land here in later build steps.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});

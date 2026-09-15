import { Slot } from 'expo-router';

/**
 * Web layout wrapper for the concert demo:
 * Renders the active screen directly via <Slot /> with no bottom tab bar,
 * keeping the mobile web experience clean, fast, and single-screen.
 */
export default function AppTabs() {
  return <Slot />;
}

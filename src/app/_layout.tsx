import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

const OLEDTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    border: '#1C1C1E',
    text: '#F2F2F7',
  },
};

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.rootContainer}>
        <ThemeProvider value={OLEDTheme}>
          <AppTabs />
          {/* Splash overlay renders on top of tabs while initializing */}
          <AnimatedSplashOverlay />
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

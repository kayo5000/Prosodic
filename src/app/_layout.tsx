import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

const EditorialCreamTheme = {
  ...DarkTheme,
  dark: false,
  colors: {
    ...DarkTheme.colors,
    background: '#F5F4EF',
    card: '#F5F4EF',
    border: '#111111',
    text: '#111111',
  },
};

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.rootContainer}>
        <ThemeProvider value={EditorialCreamTheme}>
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
    backgroundColor: '#F5F4EF',
  },
});

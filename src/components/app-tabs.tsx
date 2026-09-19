import React, { useEffect } from 'react';
import { Platform, View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue
} from 'react-native-reanimated';
import { Square, Circle, Triangle, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const ICON_SIZE = 64;

// The UIUX Pro Max "Sliding Top Header Navigation"
function TopCarouselTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Smoothly animate to the active tab index
    translateX.value = withSpring(-state.index * width, {
      damping: 24,
      stiffness: 120,
    });
  }, [state.index, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    flexDirection: 'row',
    width: width * state.routes.length,
  }));

  const goLeft = () => {
    if (state.index > 0) {
      navigation.navigate(state.routes[state.index - 1].name);
    }
  };

  const goRight = () => {
    if (state.index < state.routes.length - 1) {
      navigation.navigate(state.routes[state.index + 1].name);
    }
  };
  
  const goHome = () => {
    navigation.navigate('index');
  };

  return (
    <View style={[styles.tabBarContainer, { paddingTop: Math.max(insets.top, 24) }]}>
      {/* 1. Large Top Header Asset Icons (Sliding) */}
      <View style={styles.carouselViewport}>
        <Animated.View style={animatedStyle}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            
            // Map routes to stark abstract geometric asset icons
            let IconCmp = Square;
            if (route.name === 'index') IconCmp = Circle;
            if (route.name === 'explore') IconCmp = Triangle;

            return (
              <View key={route.key} style={styles.iconWrapper}>
                <IconCmp 
                  size={ICON_SIZE} 
                  color="#111111" 
                  fill={isFocused ? "#111111" : "transparent"} 
                  strokeWidth={isFocused ? 0 : 3} 
                />
              </View>
            );
          })}
        </Animated.View>
      </View>

      {/* 2. Strict Typography Title / Subtitle Block */}
      <View style={styles.titleBlock}>
        <Text style={styles.activeTitle}>
          {descriptors[state.routes[state.index].key].options.title?.toUpperCase() || route.name.toUpperCase()}
        </Text>
        <Text style={styles.activeSubtitle}>
          {state.routes[state.index].name === 'my-songs' ? 'A Phonetic Archive' : 
           state.routes[state.index].name === 'index' ? 'The Creative Canvas' : 'Discover the Network'}
        </Text>
      </View>

      {/* 3. Navigation Controls < X > */}
      <View style={styles.navControls}>
        <TouchableOpacity onPress={goLeft} style={styles.controlBtn} disabled={state.index === 0}>
          <ChevronLeft size={24} color={state.index === 0 ? "rgba(17,17,17,0.2)" : "#111111"} strokeWidth={1.5} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goHome} style={styles.controlBtn}>
          <X size={24} color="#111111" strokeWidth={1.5} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goRight} style={styles.controlBtn} disabled={state.index === state.routes.length - 1}>
          <ChevronRight size={24} color={state.index === state.routes.length - 1 ? "rgba(17,17,17,0.2)" : "#111111"} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>
      
      {/* 4. Bold Editorial Hairline Divider */}
      <View style={styles.dividerContainer}>
        <Text style={styles.activeLabel}>
          {descriptors[state.routes[state.index].key].options.title?.toUpperCase()}
        </Text>
        <View style={styles.divider} />
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <TopCarouselTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Disable default swipe inside tabs because our custom header drives it
        // Or if we want horizontal swipe everywhere, we'd use material-top-tabs
        // but sticking to standard Expo Router Tabs and just letting our header
        // act as the visual indicator.
      }}
    >
      <Tabs.Screen
        name="my-songs"
        options={{ title: 'Vault' }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: 'Studio' }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Dashboard' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#F5F4EF', 
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  carouselViewport: {
    width: width,
    height: ICON_SIZE,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: {
    marginTop: 28,
    alignItems: 'center',
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#111111',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  activeSubtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    color: '#111111',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 40,
  },
  controlBtn: {
    padding: 8,
  },
  dividerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#111111',
    marginBottom: 8,
  },
  divider: {
    width: '90%',
    height: 1.5,
    backgroundColor: '#111111',
  }
});

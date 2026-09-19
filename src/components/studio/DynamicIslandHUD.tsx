import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { OsborneChat } from './chat/OsborneChat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ISLAND_WIDTH = 140;
const ISLAND_HEIGHT = 36;
const ISLAND_TOP = Platform.OS === 'ios' ? 54 : 20;

interface DynamicIslandHUDProps {
  bpm: number;
  currentSps: number | null;
  dominantVowelFamily?: string | null;
  onAskOsborn?: (query: string) => void;
  onStartVoiceMemo?: () => void;
}

export const DynamicIslandHUD: React.FC<DynamicIslandHUDProps> = ({
  bpm,
  currentSps,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  useEffect(() => {
    // Spring physics tuned for a gooey, liquid drop effect
    expandProgress.value = withSpring(isExpanded ? 1 : 0, {
      damping: 16,
      stiffness: 120,
      mass: 0.8,
    });
  }, [isExpanded]);

  const rIslandStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(expandProgress.value, [0, 1], [ISLAND_WIDTH, SCREEN_WIDTH]),
      height: interpolate(expandProgress.value, [0, 1], [ISLAND_HEIGHT, SCREEN_HEIGHT]),
      top: interpolate(expandProgress.value, [0, 1], [ISLAND_TOP, 0]),
      borderRadius: interpolate(expandProgress.value, [0, 1], [ISLAND_HEIGHT / 2, 0]),
    };
  });

  const rPillContentStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(expandProgress.value, [0, 0.2], [1, 0]),
      pointerEvents: isExpanded ? 'none' : 'auto',
    };
  });

  const rExpandedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(expandProgress.value, [0.4, 1], [0, 1]),
      pointerEvents: isExpanded ? 'auto' : 'none',
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.islandContainer, rIslandStyle]}>
        
        {/* Resting Pill View */}
        {!isExpanded && (
          <Animated.View style={[styles.pillContent, rPillContentStyle]}>
            <Pressable 
              style={styles.pillPressable} 
              onPress={() => setIsExpanded(true)}
            >
              <View style={styles.pulseDot} />
              <Text style={styles.pillTitle}>Osborne</Text>
              <View style={styles.miniWaveContainer}>
                <View style={[styles.waveBar, { height: 8 }]} />
                <View style={[styles.waveBar, { height: 14 }]} />
                <View style={[styles.waveBar, { height: 10 }]} />
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Expanded Full-Screen Chat View */}
        {isExpanded && (
          <Animated.View style={[styles.expandedContent, rExpandedContentStyle]}>
             <OsborneChat onClose={() => setIsExpanded(false)} />
          </Animated.View>
        )}

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  islandContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 9999,
    // Note: To achieve true liquid SVG masking on React Native, we use layout stretching 
    // heavily over-damped so the borders "snap" open organically mimicking a liquid drop.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  pillContent: {
    ...StyleSheet.absoluteFill,
  },
  pillPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759', // Green active indicator
  },
  pillTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  miniWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveBar: {
    width: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  expandedContent: {
    flex: 1,
  }
});

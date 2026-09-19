import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet, Platform, TextInputProps } from 'react-native';
import { LiquidGlassCard } from '../../../ui/LiquidGlassCard';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export interface CanvasInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const CanvasInput = forwardRef<TextInput, CanvasInputProps>(
  ({ value, onChangeText, ...rest }, ref) => {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(300)}
        style={{ flexGrow: 1 }}
      >
        <LiquidGlassCard
          blurIntensity="sm"
          shadowIntensity="sm"
          borderRadius={24}
          style={[styles.blankCanvasContainer, { flexGrow: 1, padding: 24 }]}
        >
          <View style={{ flexGrow: 1 }}>
            <View style={[styles.blankInputWrapper, { flexGrow: 1 }]}>
              <TextInput
                ref={ref}
                value={value}
                onChangeText={onChangeText}
                multiline
                scrollEnabled={false}
                autoCapitalize="sentences"
                autoCorrect={false}
                placeholder="Start writing freely..."
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={[
                  styles.blankTextInput,
                  { flexGrow: 1, minHeight: 800 },
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                {...rest}
              />
            </View>
          </View>
        </LiquidGlassCard>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  blankCanvasContainer: {
    marginTop: 16,
    minHeight: 480,
  },
  blankInputWrapper: {
    flexGrow: 1,
  },
  blankTextInput: {
    fontSize: 19,
    lineHeight: 32,
    color: '#F2F2F7',
    padding: 0,
    minHeight: 240,
    fontFamily: Platform.select({
      ios: 'System',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    textAlignVertical: 'top',
  },
});

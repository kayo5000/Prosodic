import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

interface LiquidGlassCardProps extends ViewProps {
  children?: React.ReactNode;
  blurIntensity?: 'sm' | 'md' | 'lg' | 'xl';
  shadowIntensity?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: number;
  glowIntensity?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const LiquidGlassCard = ({
  children,
  style,
  blurIntensity = 'xl',
  borderRadius = 32,
  glowIntensity = 'sm',
  shadowIntensity = 'md',
  ...props
}: LiquidGlassCardProps) => {
  return (
    <View
      style={[
        styles.container,
        { borderRadius },
        style,
      ]}
      {...props}
    >
      <View style={[StyleSheet.absoluteFill, styles.backdropLayer, { borderRadius }]} />
      <View style={[StyleSheet.absoluteFill, styles.edgeLayer, { borderRadius }]} />
      <View style={styles.contentLayer}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // High translucency
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  backdropLayer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Frosted inner
  },
  edgeLayer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)', // Inner highlight for 3D glass effect
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },
});

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Ambient studio background: the mesh-gradient art bleeds down from the top
 * of the screen and dissolves into the flat black canvas beneath it, so
 * every existing black/gold surface still reads as a surface sitting on
 * top rather than as part of the wallpaper.
 */
export function StudioBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={require('@/assets/images/studio/studio-backdrop.png')}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.scrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
});

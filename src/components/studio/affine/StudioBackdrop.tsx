import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Full-screen ambient backdrop — shows the user's chosen image with no
 * black overlay or background. Sits beneath all content as a pure visual.
 */
export function StudioBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={require('@/assets/images/studio/studio-backdrop.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

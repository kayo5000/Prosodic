import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Full-screen ambient backdrop — solid black for brutalist DAW layout.
 */
export function StudioBackdrop() {
  return <View style={styles.root} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
});

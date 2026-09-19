import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';

interface LoaderProps {
  size?: number;
  text?: string;
}

export const AiLoader: React.FC<LoaderProps> = ({ size = 180, text = 'Prosodic' }) => {
  const letters = text.split('');
  const rotation = new Animated.Value(0);
  const letterAnims = letters.map(() => new Animated.Value(0));

  useEffect(() => {
    // Circle Rotation Animation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();

    // Staggered Letter Animations
    const anims = letterAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2400,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.parallel(anims).start();
  }, []);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.loaderWrapper, { width: size, height: size }]}>
        <View style={styles.textContainer}>
          {letters.map((letter, index) => {
            const scale = letterAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.15],
            });
            const opacity = letterAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            });

            return (
              <Animated.Text
                key={index}
                style={[
                  styles.letter,
                  {
                    transform: [{ scale }],
                    opacity,
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.loaderCircle,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a', // Simplified fallback
  },
  loaderWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    zIndex: 10,
  },
  letter: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 2,
  },
  loaderCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: '#38bdf8',
    opacity: 0.3,
  },
});

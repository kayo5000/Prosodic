import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MiniSceneProps {
  sectionName: string;
}

export function MiniScene({ sectionName }: MiniSceneProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.mediaPill}>
        <Ionicons name="mic" size={14} color="#FF3B30" />
        <View style={styles.waveform}>
           <View style={[styles.bar, {height: 6}]} />
           <View style={[styles.bar, {height: 12}]} />
           <View style={[styles.bar, {height: 8}]} />
           <View style={[styles.bar, {height: 14}]} />
        </View>
        <Text style={styles.timeText}>0:12</Text>
      </Pressable>

      <Pressable style={styles.photoPill}>
        <Ionicons name="image" size={14} color="rgba(255,255,255,0.6)" />
        <Text style={styles.photoText}>Mood</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  mediaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 14,
    paddingHorizontal: 4,
  },
  bar: {
    width: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    fontVariant: ['tabular-nums'],
  },
  photoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  photoText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  }
});

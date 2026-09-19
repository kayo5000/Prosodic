import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface VisionBoardProps {
  songId: string;
}

export function VisionBoard({ songId }: VisionBoardProps) {
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>The Scene</Text>
        <Pressable style={styles.addButton}>
          <Ionicons name="add" size={20} color="#000000" />
        </Pressable>
      </View>

      <View style={styles.bentoGrid}>
        {/* Main Mood Image (Large) */}
        <Pressable style={[styles.bentoCard, styles.mainImageCard]}>
          <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.4)" />
          <Text style={styles.placeholderText}>Add Mood Board Photo</Text>
        </Pressable>

        <View style={styles.sideColumn}>
          {/* Audio Memo Pill */}
          <Pressable style={[styles.bentoCard, styles.audioMemoCard]}>
            <View style={styles.audioHeader}>
              <Ionicons name="mic-circle" size={28} color="#FF3B30" />
              <Text style={styles.audioTitle}>Beat Idea 1</Text>
            </View>
            {/* Fake Waveform */}
            <View style={styles.waveformRow}>
              {[1, 3, 5, 2, 6, 4, 2, 5, 3, 1].map((h, i) => (
                <View key={i} style={[styles.waveBar, { height: h * 4 }]} />
              ))}
            </View>
            <Text style={styles.audioTime}>0:45</Text>
          </Pressable>

          {/* Quick Concept Note */}
          <Pressable style={[styles.bentoCard, styles.noteCard]}>
            <Ionicons name="text" size={16} color="rgba(255,255,255,0.4)" style={styles.iconMargin} />
            <Text style={styles.noteText}>
              "Driving at 2am through the city, orange streetlights reflecting on the hood."
            </Text>
          </Pressable>
        </View>
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F2F2F7',
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  addButton: {
    backgroundColor: '#F2F2F7',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  sideColumn: {
    flex: 1,
    gap: 12,
  },
  bentoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mainImageCard: {
    flex: 1.2,
    aspectRatio: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  audioMemoCard: {
    justifyContent: 'space-between',
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  audioTitle: {
    color: '#F2F2F7',
    fontSize: 14,
    fontWeight: '700',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 30,
    marginBottom: 8,
  },
  waveBar: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  audioTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  noteCard: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  iconMargin: {
    marginBottom: 8,
  },
  noteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  }
});

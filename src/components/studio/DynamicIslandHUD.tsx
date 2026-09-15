import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';

interface DynamicIslandHUDProps {
  bpm: number;
  /** Null until the engine has analysed something. Never substituted for. */
  currentSps: number | null;
  /** Null until the engine has analysed something. Never substituted for. */
  dominantVowelFamily?: string | null;
  onAskOsborn?: (query: string) => void;
  onStartVoiceMemo?: () => void;
}

/**
 * Global Dynamic Island HUD (Cosmic Starlight & Osborn AI Consciousness).
 * Floats at the top of the workstation with tap/pull-to-expand liquid modal.
 */
export const DynamicIslandHUD: React.FC<DynamicIslandHUDProps> = ({
  bpm,
  currentSps,
  // No default. It used to be 'Cyan (IY)', and since the parent never passed
  // one, every song in the app reported that as its dominant rhyme scheme
  // under a header reading LIVE CRAFT FEEDBACK.
  dominantVowelFamily = null,
  onAskOsborn,
  onStartVoiceMemo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [dreamModeActive, setDreamModeActive] = useState(false);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onAskOsborn?.(inputText.trim());
    setInputText('');
  };

  return (
    <>
      {/* 1. Resting Pill at Top of Screen */}
      <TouchableOpacity
        style={styles.restingPill}
        onPress={() => setIsExpanded(true)}
        activeOpacity={0.85}
      >
        <View style={styles.pulseDot} />
        <Text style={styles.pillTitle}>Osborn AI</Text>
        <View style={styles.miniWaveContainer}>
          <View style={[styles.waveBar, { height: 8 }]} />
          <View style={[styles.waveBar, { height: 14 }]} />
          <View style={[styles.waveBar, { height: 10 }]} />
          <View style={[styles.waveBar, { height: 6 }]} />
        </View>
      </TouchableOpacity>

      {/* 2. Expanded Dynamic Island Modal HUD */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.hudCard}>
            {/* Header */}
            <View style={styles.hudHeader}>
              <View style={styles.identityRow}>
                <View style={styles.avatarCircle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <line x1="9" y1="1" x2="9" y2="4" />
                    <line x1="15" y1="1" x2="15" y2="4" />
                    <line x1="9" y1="20" x2="9" y2="23" />
                    <line x1="15" y1="20" x2="15" y2="23" />
                    <line x1="20" y1="9" x2="23" y2="9" />
                    <line x1="20" y1="14" x2="23" y2="14" />
                    <line x1="1" y1="9" x2="4" y2="9" />
                    <line x1="1" y1="14" x2="4" y2="14" />
                  </svg>
                </View>
                <View>
                  <Text style={styles.hudTitle}>Osborn AI Copilot</Text>
                  <Text style={styles.hudSubtitle}>
                    {/* "Pocket Tuned" was asserted here unconditionally. No
                        timing is measured anywhere in the app, so it claimed a
                        finding that does not exist. */}
                    {bpm} BPM{currentSps !== null ? ` • ${currentSps.toFixed(1)} SPS` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                {/* Dream Mode Button */}
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    dreamModeActive && styles.dreamActiveButton,
                  ]}
                  onPress={() => setDreamModeActive(!dreamModeActive)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Dream Mode"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dreamModeActive ? '#FFD60A' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  </svg>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setIsExpanded(false)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close Osborn Copilot"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Hero: Particle AI & Suggestions Stream */}
            <ScrollView
              style={styles.hudBody}
              contentContainerStyle={styles.hudBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {dreamModeActive ? (
                /* Dream Mode Prompt Card */
                <View style={styles.dreamCard}>
                  <Text style={styles.dreamTitle}>Creative Dream Stream</Text>
                  <Text style={styles.dreamBody}>
                    Dream stream will generate creative direction once AI mentor is connected.
                  </Text>
                </View>
              ) : (
                /* Standard Session Feedback */
                <View style={styles.suggestionCard}>
                  <Text style={styles.suggestionHeader}>LIVE CRAFT FEEDBACK</Text>
                  {dominantVowelFamily === null && currentSps === null ? (
                    <Text style={styles.suggestionText}>Write a few bars and this fills in.</Text>
                  ) : (
                    <>
                      {dominantVowelFamily !== null && (
                        <Text style={styles.suggestionText}>
                          Dominant Rhyme Scheme:{' '}
                          <Text style={styles.highlightText}>{dominantVowelFamily}</Text>
                        </Text>
                      )}
                      {currentSps !== null && (
                        <Text style={styles.suggestionText}>
                          Velocity Lock:{' '}
                          <Text style={styles.highlightText}>{currentSps.toFixed(1)} SPS</Text>
                        </Text>
                      )}
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Bottom Chat Bar with Mic */}
            <View style={styles.bottomChatBar}>
              <TouchableOpacity
                style={styles.micButton}
                onPress={onStartVoiceMemo}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Voice Memo"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder="Ask Osborn for rhymes, cadence, lines..."
                placeholderTextColor="#64748B"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Send"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  restingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 140,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    borderWidth: 1.2,
    borderColor: '#1E293B',
    paddingHorizontal: 10,
    alignSelf: 'center',
    position: 'absolute',
    top: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  pillTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  miniWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveBar: {
    width: 2.5,
    backgroundColor: '#A855F7',
    borderRadius: 1.25,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  hudCard: {
    width: '100%',
    maxWidth: 365,
    height: 520,
    borderRadius: 36,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 20,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  hudTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  hudSubtitle: {
    fontSize: 10.5,
    color: '#10B981',
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dreamActiveButton: {
    borderColor: '#C084FC',
    backgroundColor: '#1E1B4B',
  },
  actionIcon: {
    fontSize: 16,
  },
  closeIcon: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  hudBody: {
    flex: 1,
  },
  hudBodyContent: {
    paddingBottom: 10,
  },
  dreamCard: {
    backgroundColor: '#18182E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#A855F7',
    marginBottom: 12,
  },
  dreamTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E9D5FF',
    marginBottom: 6,
  },
  dreamBody: {
    fontSize: 12.5,
    color: '#F8FAFC',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dreamSub: {
    fontSize: 11,
    color: '#C084FC',
    fontWeight: '700',
  },
  suggestionCard: {
    backgroundColor: '#131D31',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  suggestionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  suggestionText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  highlightText: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  rhymePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  rhymePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  rhymePillText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  bottomChatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0B111E',
    borderWidth: 1.2,
    borderColor: '#334155',
    paddingHorizontal: 6,
    marginTop: 8,
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  micIcon: {
    fontSize: 16,
  },
  chatInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

import React, { useCallback, useState, useRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import type { SongContext } from '@/data/types';

interface SideColumnDrawerProps {
  visible: boolean;
  onClose: () => void;
  songs: SongContext[];
  activeSongId: string;
  onSelectSong: (songId: string) => void;
  onCreateNewSong: () => void;
  onDeleteSong: (songId: string) => void;
  onRenameSong: (songId: string, newTitle: string) => void;
}

const SvgChevronRight = ({ color = '#64748B', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SvgChevronDown = ({ color = '#64748B', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SvgLock = ({ color = '#64748B', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SvgDragHandle = ({ color = '#475569', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const DrawerItem = ({ title, onPress, indent = 0, rightElement, isActive = false }: any) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.drawerItem,
      { paddingLeft: Spacing.two + (indent * 12) },
      isActive && styles.drawerItemActive,
      pressed && styles.pressed
    ]}
  >
    <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>{title}</Text>
    {rightElement}
  </Pressable>
);

const Accordion = ({ title, isExpanded, onToggle, children, indent = 0 }: any) => (
  <View>
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.drawerItem,
        { paddingLeft: Spacing.two + (indent * 12) },
        pressed && styles.pressed
      ]}
    >
      <Text style={styles.drawerItemText}>{title}</Text>
      {isExpanded ? <SvgChevronDown /> : <SvgChevronRight />}
    </Pressable>
    {isExpanded && <View style={styles.accordionContent}>{children}</View>}
  </View>
);

export function SideColumnDrawer({
  visible,
  onClose,
  songs,
  activeSongId,
  onSelectSong,
  onCreateNewSong,
  onDeleteSong,
  onRenameSong,
}: SideColumnDrawerProps) {
  // State for Accordions
  const [expProjects, setExpProjects] = useState(false);
  const [expInspoFolders, setExpInspoFolders] = useState(false);
  const [expNewVisual, setExpNewVisual] = useState(false);
  const [expNewMemo, setExpNewMemo] = useState(false);
  const [expNewAudio, setExpNewAudio] = useState(false);
  const [expGallery, setExpGallery] = useState(false);
  const [expLexicon, setExpLexicon] = useState(false);
  const [expBestOf, setExpBestOf] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.poly(4)), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.in(Easing.poly(4)), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-400, 0] });
  const opacity = fadeAnim;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={styles.outsideTapArea} onPress={onClose} />
        
        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left']}>
            
            {/* Header */}
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>PRO</Text>
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.artistName}>Prosodic Writer</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>WORKSPACE</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              
              {/* MY SONGS */}
              <View style={styles.section}>
                <SectionTitle>MY SONGS</SectionTitle>
                <DrawerItem title="New (Free Write or Song)" onPress={onCreateNewSong} rightElement={<Text style={styles.accentText}>+</Text>} />
                <Text style={styles.subTitle}>Recent Drafts</Text>
                <View style={styles.listContainer}>
                  {songs.map(song => (
                    <DrawerItem 
                      key={song.id} 
                      title={song.metadata.title} 
                      isActive={song.id === activeSongId}
                      onPress={() => onSelectSong(song.id)} 
                    />
                  ))}
                </View>
              </View>

              {/* PROJECTS */}
              <View style={styles.section}>
                <SectionTitle>PROJECTS</SectionTitle>
                <Accordion title="Most Recent" isExpanded={expProjects} onToggle={() => setExpProjects(!expProjects)}>
                  <DrawerItem title="Album 1" indent={1} />
                  <DrawerItem title="EP Demos" indent={1} />
                </Accordion>
              </View>

              {/* PINNED */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <SectionTitle>PINNED 📌</SectionTitle>
                  <Text style={styles.helperText}>(Drag to Reorder)</Text>
                </View>
                <View style={styles.listContainer}>
                  <DrawerItem title="Favorite Hook Idea" rightElement={<SvgDragHandle/>} />
                  <DrawerItem title="Beat #4 Reference" rightElement={<SvgDragHandle/>} />
                </View>
              </View>

              {/* INSPO */}
              <View style={styles.section}>
                <SectionTitle>INSPO</SectionTitle>
                <Accordion title="Folders (Pin // Most Recent)" isExpanded={expInspoFolders} onToggle={() => setExpInspoFolders(!expInspoFolders)}>
                  <DrawerItem title="Moodboard" indent={1} />
                  <DrawerItem title="Flow References" indent={1} />
                </Accordion>
                <Accordion title="New Visual" isExpanded={expNewVisual} onToggle={() => setExpNewVisual(!expNewVisual)}>
                  <DrawerItem title="Recent Visuals..." indent={1} />
                </Accordion>
                <Accordion title="New Memo" isExpanded={expNewMemo} onToggle={() => setExpNewMemo(!expNewMemo)}>
                  <DrawerItem title="Recent Memos..." indent={1} />
                </Accordion>
                <Accordion title="New Audio" isExpanded={expNewAudio} onToggle={() => setExpNewAudio(!expNewAudio)}>
                  <DrawerItem title="Recent Audio..." indent={1} />
                </Accordion>
                <Accordion title="Gallery" isExpanded={expGallery} onToggle={() => setExpGallery(!expGallery)}>
                  <DrawerItem title="Recent Gallery..." indent={1} />
                </Accordion>
              </View>

              {/* CRAFT MASTERS */}
              <View style={styles.section}>
                <SectionTitle>CRAFT MASTERS</SectionTitle>
                <DrawerItem title="Fingerprint" />
                <DrawerItem title="Your Lexicon" />
                
                <View style={styles.statsCard}>
                  <Text style={styles.statLine}>Total Word Count: <Text style={styles.statValue}>1,245</Text></Text>
                  <Text style={styles.statLine}>Avg Words/Song: <Text style={styles.statValue}>412</Text></Text>
                  <Text style={styles.statLine}>Avg Syllables/Song: <Text style={styles.statValue}>680</Text></Text>
                </View>

                <Accordion title="Lexicon Details" isExpanded={expLexicon} onToggle={() => setExpLexicon(!expLexicon)} indent={1}>
                  <DrawerItem title="Every Word" indent={2} />
                  <DrawerItem title="Most Used / Crutch Words" indent={2} />
                  <Accordion title="Best of Your Lexicon" isExpanded={expBestOf} onToggle={() => setExpBestOf(!expBestOf)} indent={2}>
                    <DrawerItem title="Scenery (Visual, Auditory, Touch, Smell, Taste)" indent={3} />
                    <DrawerItem title="Uncommon" indent={3} />
                    <DrawerItem title="Emotional (Light // Dark)" indent={3} />
                    <DrawerItem title="Rhyme & Sounds // Crutch Rhyme" indent={3} />
                    <DrawerItem title="Alliteration Frequency" indent={3} />
                  </Accordion>
                </Accordion>

                <View style={{ height: 16 }} />
                <SectionTitle>ACTIONABLE FLAGS</SectionTitle>
                <DrawerItem title='"Crutch Words" (Filler that weakens lines)' />
                <DrawerItem title='Exclusive Context Words' />
                <DrawerItem title='Suggested Underused Synonyms' />

                <View style={{ height: 16 }} />
                <SectionTitle>CRAFT DEVELOPMENT</SectionTitle>
                <DrawerItem title="Prosodic Academy" rightElement={<SvgLock />} />
                <DrawerItem title="Tool Box" />
                <DrawerItem title="Freestyle Mode (AI Feedback)" />
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    flexDirection: 'row',
  },
  outsideTapArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: '80%',
  },
  drawerContainer: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: '#090D16',
    borderRightWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    shadowColor: '#000000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  profileMeta: {
    flex: 1,
  },
  artistName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#3B82F644',
  },
  proBadgeText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingRight: Spacing.two,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: Spacing.two,
    paddingLeft: Spacing.two,
  },
  subTitle: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    paddingLeft: Spacing.two,
  },
  helperText: {
    color: '#475569',
    fontSize: 9,
    fontStyle: 'italic',
  },
  listContainer: {
    gap: 2,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: Spacing.two,
    borderRadius: 8,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  drawerItemText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  drawerItemTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  accentText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '700',
  },
  accordionContent: {
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 8,
    padding: Spacing.two,
    marginVertical: Spacing.two,
    marginLeft: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.8)',
    gap: 4,
  },
  statLine: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statValue: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});

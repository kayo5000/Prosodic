import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Artist, BeatMovement, PaperSection, SectionType } from './types';

interface SectionTimelineBarProps {
  movements: BeatMovement[];
  sections: PaperSection[];
  activeSectionId: string;
  artists?: Artist[];
  onMergeBlocks?: (sourceId: string, targetId: string) => void;
  onCreateArtist?: (artist: Artist) => void;
  onAssignArtist?: (sectionId: string, artistId: string | null) => void;
  onSelectSection: (sectionId: string) => void;
  onOpenTexture: (sectionId: string) => void;
  onAddSection: (type: SectionType, movementId: string) => void;
  onAddBeatSwitch: () => void;
  onRenameSection?: (sectionId: string, newName: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onToggleFavoriteSection?: (sectionId: string) => void;
  onReorderSections?: (reorderedSections: PaperSection[]) => void;
}

export function SectionTimelineBar({
  movements,
  sections,
  activeSectionId,
  artists = [],
  onMergeBlocks,
  onCreateArtist,
  onAssignArtist,
  onSelectSection,
  onOpenTexture,
  onAddSection,
  onAddBeatSwitch,
}: SectionTimelineBarProps) {
  const lastTapRef = useRef<{ sectionId: string; timestamp: number }>({
    sectionId: '',
    timestamp: 0,
  });

  const [addMenuMovementId, setAddMenuMovementId] = useState<string | null>(null);
  const [mergingSourceId, setMergingSourceId] = useState<string | null>(null);
  const [settingsSectionId, setSettingsSectionId] = useState<string | null>(null);
  const [showArtistCreator, setShowArtistCreator] = useState(false);

  const handlePress = React.useCallback(
    (sectionId: string) => {
      if (mergingSourceId) {
        if (mergingSourceId !== sectionId) {
          onMergeBlocks?.(mergingSourceId, sectionId);
        }
        setMergingSourceId(null);
        return;
      }

      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const last = lastTapRef.current;

      if (last.sectionId === sectionId && now - last.timestamp < 350) {
        // Double Tap: Open Texture
        lastTapRef.current = { sectionId: '', timestamp: 0 };
        onOpenTexture(sectionId);
      } else {
        // Single Tap
        lastTapRef.current = { sectionId, timestamp: now };
        onSelectSection(sectionId);
      }
    },
    [onOpenTexture, onSelectSection, mergingSourceId, onMergeBlocks],
  );

  const handleLongPress = React.useCallback((sectionId: string) => {
    if (mergingSourceId) return; // Prevent menu while merging
    setSettingsSectionId(sectionId);
  }, [mergingSourceId]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {movements.map((movement, mIdx) => {
          const movementSections = sections.filter((s) => s.movementId === movement.id);

          return (
            <View key={movement.id} style={styles.movementGroup}>
              {/* Section Header Tag if multiple sections */}
              {(movements.length > 1 || mIdx > 0) && (
                <View style={styles.beatSwitchBadge}>
                  <Text selectable={false} suppressHighlighting pointerEvents="none" style={styles.beatSwitchText}>{movement.name}</Text>
                </View>
              )}

              {/* Block Pills */}
              {movementSections.map((sec) => {
                const isActive = sec.id === activeSectionId;
                const isMergingSource = sec.id === mergingSourceId;
                const isMergingTarget = mergingSourceId && !isMergingSource; // Hover state? We don't have hover, just wait for tap.
                const hasTexture = Boolean(sec.texture.mood || sec.texture.reflectionComment);
                const assignedArtist = artists.find((a) => a.id === sec.artistId);
                const customBg = assignedArtist?.color;

                const baseStyle = [
                  styles.sectionPill,
                  customBg && { backgroundColor: `${customBg}1A`, borderColor: customBg },
                  isActive && (customBg ? { backgroundColor: customBg } : styles.sectionPillActive),
                  isMergingSource && { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
                ];

                const textColor = isMergingSource
                  ? '#000000'
                  : isActive
                  ? '#000000'
                  : customBg
                  ? customBg
                  : 'rgba(255, 255, 255, 0.75)';

                return (
                  <Pressable
                    key={sec.id}
                    onPress={() => handlePress(sec.id)}
                    onLongPress={() => handleLongPress(sec.id)}
                    style={baseStyle}
                    accessibilityLabel={`${sec.name}. Single tap to jump, double tap for texture. Long press for settings.`}
                  >
                    <Text style={[styles.sectionPillText, { color: textColor }]}>
                      {sec.name}
                    </Text>
                    {hasTexture && <View style={[styles.textureDot, isActive ? { backgroundColor: '#000' } : (customBg ? { backgroundColor: customBg } : {})]} />}
                  </Pressable>
                );
              })}

              {/* + Block Button for this Section */}
              <Pressable
                onPress={() => setAddMenuMovementId(movement.id)}
                style={styles.addPillBtn}
                accessibilityLabel="Add block to this section"
              >
                <Text selectable={false} suppressHighlighting pointerEvents="none" style={styles.addPillText}>+ Block</Text>
              </Pressable>
            </View>
          );
        })}

        {/* Global + Section Button on Timeline */}
        <Pressable
          onPress={onAddBeatSwitch}
          style={styles.addSectionGlobalBtn}
          accessibilityLabel="Add new section"
        >
          <Text selectable={false} suppressHighlighting pointerEvents="none" style={styles.addSectionGlobalText}>+ Section</Text>
        </Pressable>
      </ScrollView>

      {/* Block Settings Popover */}
      {settingsSectionId && (
        <Modal transparent animationType="fade" visible={Boolean(settingsSectionId)}>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setSettingsSectionId(null)}
          >
            <View style={styles.menuPopover}>
              <Text style={styles.menuTitle} selectable={false} suppressHighlighting pointerEvents="none">
                Block Settings
              </Text>

              <Pressable
                onPress={() => {
                  setMergingSourceId(settingsSectionId);
                  setSettingsSectionId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">Merge with...</Text>
              </Pressable>

              <View style={styles.menuDivider} />
              <Text style={styles.menuTitle} selectable={false} suppressHighlighting pointerEvents="none">Assign Artist</Text>

              <Pressable
                onPress={() => {
                  onAssignArtist?.(settingsSectionId, null);
                  setSettingsSectionId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">No Artist (Default)</Text>
              </Pressable>

              {artists.map((artist) => (
                <Pressable
                  key={artist.id}
                  onPress={() => {
                    onAssignArtist?.(settingsSectionId, artist.id);
                    setSettingsSectionId(null);
                  }}
                  style={[styles.menuItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: artist.color }} />
                  <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">{artist.name}</Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => {
                  setShowArtistCreator(true);
                  // keep settings open or close? Let's close settings, open creator
                  setSettingsSectionId(null);
                }}
                style={[styles.menuItem, { marginTop: 4 }]}
              >
                <Text style={[styles.menuItemText, { color: '#0A84FF' }]} selectable={false} suppressHighlighting pointerEvents="none">+ New Artist</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* New Artist Creator Modal */}
      {showArtistCreator && (
        <Modal transparent animationType="fade" visible={showArtistCreator}>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setShowArtistCreator(false)}
          >
            <Pressable style={styles.menuPopover} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.menuTitle} selectable={false} suppressHighlighting pointerEvents="none">Create New Artist</Text>
              {/* Very simple list of color presets */}
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['#F87171', '#FB923C', '#FBBF24', '#A3E635', '#4ADE80', '#2DD4BF', '#38BDF8', '#818CF8', '#C084FC', '#F472B6'].map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => {
                      // Immediate create with a default name for now, they can rename later or just assume 'Artist X'
                      const newArtist = { id: Math.random().toString(), name: `Artist ${artists.length + 1}`, color };
                      onCreateArtist?.(newArtist);
                      setShowArtistCreator(false);
                    }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color }}
                  />
                ))}
              </View>
              <Text style={[styles.menuTitle, { textAlign: 'center' }]} selectable={false} suppressHighlighting pointerEvents="none">Tap a color to create</Text>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Add Block & Section Action Sheet Popover */}
      {addMenuMovementId && (
        <Modal transparent animationType="fade" visible={Boolean(addMenuMovementId)}>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setAddMenuMovementId(null)}
          >
            <View style={styles.menuPopover}>
              <Text style={styles.menuTitle} selectable={false} suppressHighlighting pointerEvents="none">Add Block</Text>

              <Pressable
                onPress={() => {
                  onAddSection('verse', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">Verse</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onAddSection('chorus', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">Chorus / Hook</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onAddSection('bridge', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">Bridge</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onAddSection('reprise', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText} selectable={false} suppressHighlighting pointerEvents="none">Reprise</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                onPress={() => {
                  onAddBeatSwitch();
                  setAddMenuMovementId(null);
                }}
                style={[styles.menuItem, styles.menuItemNewSection]}
              >
                <Text selectable={false} suppressHighlighting pointerEvents="none" style={styles.menuItemNewSectionText}>+ Section</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  movementGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  beatSwitchBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  beatSwitchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionPillActive: {
    backgroundColor: '#FFFFFF',
  },
  sectionPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  sectionPillTextActive: {
    color: '#000000',
  },
  textureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  addPillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopover: {
    width: 290,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  menuItemNewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  menuItemNewSectionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addSectionGlobalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginLeft: 4,
  },
  addSectionGlobalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

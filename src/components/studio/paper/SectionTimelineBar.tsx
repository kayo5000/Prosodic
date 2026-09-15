import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { BeatMovement, PaperSection, SectionType } from './types';

interface SectionTimelineBarProps {
  movements: BeatMovement[];
  sections: PaperSection[];
  activeSectionId: string;
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

  const handlePress = React.useCallback(
    (sectionId: string) => {
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const last = lastTapRef.current;

      if (last.sectionId === sectionId && now - last.timestamp < 350) {
        // Double Tap: Open Texture
        lastTapRef.current = { sectionId: '', timestamp: 0 };
        onOpenTexture(sectionId);
      } else {
        // Single Tap: Jump to Section
        lastTapRef.current = { sectionId, timestamp: now };
        onSelectSection(sectionId);
      }
    },
    [onOpenTexture, onSelectSection],
  );

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
                  <Text style={styles.beatSwitchText}>{movement.name}</Text>
                </View>
              )}

              {/* Block Pills */}
              {movementSections.map((sec) => {
                const isActive = sec.id === activeSectionId;
                const hasTexture = Boolean(sec.texture.mood || sec.texture.reflectionComment);

                return (
                  <Pressable
                    key={sec.id}
                    onPress={() => handlePress(sec.id)}
                    style={[styles.sectionPill, isActive && styles.sectionPillActive]}
                    accessibilityLabel={`${sec.name}. Single tap to jump, double tap for texture and mood.`}
                  >
                    <Text style={[styles.sectionPillText, isActive && styles.sectionPillTextActive]}>
                      {sec.name}
                    </Text>
                    {hasTexture && <View style={styles.textureDot} />}
                  </Pressable>
                );
              })}

              {/* + Block Button for this Section */}
              <Pressable
                onPress={() => setAddMenuMovementId(movement.id)}
                style={styles.addPillBtn}
                accessibilityLabel="Add block to this section"
              >
                <Text style={styles.addPillText}>+ Block</Text>
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
          <Text style={styles.addSectionGlobalText}>+ Section</Text>
        </Pressable>
      </ScrollView>

      {/* Add Block & Section Action Sheet Popover */}
      {addMenuMovementId && (
        <Modal transparent animationType="fade" visible={Boolean(addMenuMovementId)}>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setAddMenuMovementId(null)}
          >
            <View style={styles.menuPopover}>
              <Text style={styles.menuTitle}>Add Block</Text>

              <Pressable
                onPress={() => {
                  onAddSection('verse', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>Verse</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onAddSection('chorus', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>Chorus / Hook</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onAddSection('bridge', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>Bridge</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onAddSection('reprise', addMenuMovementId);
                  setAddMenuMovementId(null);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>Reprise</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                onPress={() => {
                  onAddBeatSwitch();
                  setAddMenuMovementId(null);
                }}
                style={[styles.menuItem, styles.menuItemNewSection]}
              >
                <Text style={styles.menuItemNewSectionText}>+ Section</Text>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
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
    backgroundColor: '#FFF8E7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  beatSwitchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionPillActive: {
    backgroundColor: '#1C1C1E',
  },
  sectionPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  sectionPillTextActive: {
    color: '#FFFFFF',
  },
  textureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
  },
  addPillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderStyle: 'dashed',
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopover: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
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
    color: '#1C1C1E',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  menuItemNewSection: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  menuItemNewSectionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5A50A',
  },
  addSectionGlobalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFBF0',
    borderWidth: 1,
    borderColor: '#E5A50A',
    marginLeft: 4,
  },
  addSectionGlobalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5A50A',
  },
});

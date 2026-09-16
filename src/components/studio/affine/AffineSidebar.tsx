import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PaperSection, SongMetadata } from '../paper/types';

interface AffineSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sections: PaperSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (type: string) => void;
  metadata: SongMetadata;
  onOpenSettings: () => void;
  onOpenWhiteboard: () => void;
  onOpenVoiceTakes?: () => void;
  onOpenLexicon?: () => void;
}

export const AffineSidebar: React.FC<AffineSidebarProps> = ({
  isOpen,
  onClose,
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  metadata,
  onOpenSettings,
  onOpenWhiteboard,
  onOpenVoiceTakes,
  onOpenLexicon,
}) => {
  if (!isOpen) return null;

  const content = (
    <View style={styles.sidebarContainer}>
      {/* 1. Workspace Header */}
      <View style={styles.workspaceHeader}>
        <View style={styles.workspaceBrandRow}>
          <View style={styles.workspaceLogoBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5A50A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </View>
          <View style={styles.workspaceTitleWrap}>
            <Text style={styles.workspaceName} numberOfLines={1}>Prosodic Studio</Text>
            <Text style={styles.workspaceSub} numberOfLines={1}>
              {metadata.title || 'Master Session'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.collapseToggleBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Collapse Sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
            <path d="M14 9l-3 3 3 3" />
          </svg>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* 2. Quick Access Navigation */}
        <View style={styles.sectionGroup}>
          <Text style={styles.groupLabel}>WORKSPACE</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => {
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.navIconSlot}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E5A50A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </View>
            <Text style={[styles.navRowText, styles.navRowTextActive]}>Cadence Paper</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => {
              onOpenWhiteboard();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.navIconSlot}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </View>
            <Text style={styles.navRowText}>Edgeless Whiteboard</Text>
          </TouchableOpacity>

          {onOpenVoiceTakes && (
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => {
                onOpenVoiceTakes();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.navIconSlot}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </View>
              <Text style={styles.navRowText}>Voice Takes Vault</Text>
            </TouchableOpacity>
          )}

          {onOpenLexicon && (
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => {
                onOpenLexicon();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.navIconSlot}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </View>
              <Text style={styles.navRowText}>Lexicon Armory</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Song Outline / Structure Tree */}
        <View style={styles.sectionGroup}>
          <View style={styles.groupHeaderRow}>
            <Text style={styles.groupLabel}>SONG STRUCTURE</Text>
            <TouchableOpacity
              onPress={() => onAddSection('verse')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E5A50A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </TouchableOpacity>
          </View>

          {sections.map((sec, idx) => {
            const isActive = sec.id === activeSectionId;
            const totalBars = sec.blocks.reduce((acc, b) => acc + b.bars.length, 0);

            return (
              <TouchableOpacity
                key={sec.id || idx}
                style={[styles.sectionTreeItem, isActive && styles.sectionTreeItemActive]}
                onPress={() => {
                  onSelectSection(sec.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTreeLeft}>
                  <View style={[styles.sectionDot, isActive && styles.sectionDotActive]} />
                  <Text
                    style={[styles.sectionTreeTitle, isActive && styles.sectionTreeTitleActive]}
                    numberOfLines={1}
                  >
                    {sec.name}
                  </Text>
                </View>

                <View style={styles.barCountBadge}>
                  <Text style={styles.barCountText}>{totalBars} BARS</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 4. Bottom Utility Bar */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity
          style={styles.footerActionBtn}
          onPress={() => {
            onOpenSettings();
            onClose();
          }}
          activeOpacity={0.7}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <Text style={styles.footerActionText}>Song Settings</Text>
        </TouchableOpacity>

        <View style={styles.bpmIndicatorPill}>
          <Text style={styles.bpmIndicatorText}>{metadata.defaultBpm || 120} BPM</Text>
        </View>
      </View>
    </View>
  );

  // On Mobile / Web overlay rendering
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        {content}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sidebarContainer: {
    width: 280,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#121214',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  workspaceBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  workspaceLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 165, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 165, 10, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceTitleWrap: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  workspaceSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
  collapseToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  sectionGroup: {
    marginBottom: 20,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  navIconSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  navRowTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  sectionTreeItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTreeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  sectionDotActive: {
    backgroundColor: '#E5A50A',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sectionTreeTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
  },
  sectionTreeTitleActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  barCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  barCountText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.4,
  },
  sidebarFooter: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  bpmIndicatorPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(229, 165, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 165, 10, 0.25)',
  },
  bpmIndicatorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E5A50A',
    letterSpacing: 0.4,
  },
});

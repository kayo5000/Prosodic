import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SlashCommandItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: (color: string) => React.ReactNode;
}

interface AffineSlashMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectCommand: (commandId: string) => void;
}

export const AffineSlashMenu: React.FC<AffineSlashMenuProps> = ({
  visible,
  onClose,
  onSelectCommand,
}) => {
  const [filterQuery, setFilterQuery] = useState<string>('');

  const commands: SlashCommandItem[] = [
    {
      id: 'verse',
      title: 'Verse Section',
      subtitle: 'Add 16-bar storytelling cadence block',
      badge: '16 BARS',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="17" y1="10" x2="3" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="17" y1="18" x2="3" y2="18" />
        </svg>
      ),
    },
    {
      id: 'chorus',
      title: 'Chorus Section',
      subtitle: 'Add 8-bar melodic hook & anthem block',
      badge: '8 BARS',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
    },
    {
      id: 'hook',
      title: 'Hook Section',
      subtitle: 'Add 4-bar punchy cadence motif',
      badge: '4 BARS',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      id: 'bridge',
      title: 'Bridge Section',
      subtitle: 'Add 8-bar harmonic departure block',
      badge: '8 BARS',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: 'record',
      title: 'Record Audio Take',
      subtitle: 'Capture scratch vocal or melody memo',
      badge: 'MIC',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      id: 'whiteboard',
      title: 'Edgeless Whiteboard',
      subtitle: 'Open mood board & reference songs canvas',
      badge: 'TEXTURE',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      id: 'settings',
      title: 'Song Settings',
      subtitle: 'Adjust BPM tempo, meter, and density',
      badge: 'CONFIG',
      icon: (color) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.menuCard}>
          {/* Header Search Input */}
          <View style={styles.searchHeader}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <TextInput
              style={styles.searchInput}
              placeholder="Type a slash command..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={filterQuery}
              onChangeText={setFilterQuery}
              autoFocus
            />
          </View>

          {/* Commands List */}
          <ScrollView style={styles.commandList} keyboardShouldPersistTaps="handled">
            <Text style={styles.groupHeading}>BLOCK COMMANDS</Text>
            {filtered.map((cmd) => (
              <TouchableOpacity
                key={cmd.id}
                style={styles.commandRow}
                onPress={() => {
                  onSelectCommand(cmd.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.commandIconBox}>
                  {cmd.icon('#FFFFFF')}
                </View>

                <View style={styles.commandInfo}>
                  <Text style={styles.commandTitle}>{cmd.title}</Text>
                  <Text style={styles.commandSubtitle} numberOfLines={1}>
                    {cmd.subtitle}
                  </Text>
                </View>

                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{cmd.badge}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No matching commands found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  menuCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: 460,
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#161618',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  commandList: {
    padding: 8,
  },
  groupHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 2,
  },
  commandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandInfo: {
    flex: 1,
  },
  commandTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commandSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E5A50A',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

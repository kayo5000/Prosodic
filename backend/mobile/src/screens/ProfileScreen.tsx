import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../state/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.flex}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.username || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={logout}
        >
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  avatar: {
    width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  username: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xl },
  button: {
    borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});

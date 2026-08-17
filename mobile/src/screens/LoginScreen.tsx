import { useState } from 'react';
import {
  Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../state/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Fill in all fields.');
      return;
    }
    if (mode === 'register' && !username.trim()) {
      setError('Username is required.');
      return;
    }
    setBusy(true);
    const { error: err } = mode === 'login'
      ? await login(email.trim(), password)
      : await register(email.trim(), username.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Prosodic</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back.' : 'Create an account.'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={mode === 'login' ? 'Email or username' : 'Email'}
          placeholderTextColor={colors.textFaint}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.textFaint}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textFaint}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={submit}
          disabled={busy}
        >
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>}
        </Pressable>

        <Pressable
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          hitSlop={8}
        >
          <Text style={styles.switchMode}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 15, color: colors.textMuted, textAlign: 'center',
    marginTop: spacing.xs, marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    color: colors.text, padding: spacing.md, backgroundColor: colors.surface,
    marginBottom: spacing.md, fontSize: 15,
  },
  error: {
    color: colors.danger, fontSize: 13, marginBottom: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.1)', padding: spacing.sm, borderRadius: radius.sm,
  },
  button: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm, minHeight: 48,
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  switchMode: {
    color: colors.accent, fontSize: 13, textAlign: 'center', marginTop: spacing.lg,
  },
});

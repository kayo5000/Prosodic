import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { veilChat } from '../api/prosodicApi';
import { colors, spacing, radius } from '../theme/theme';

const STARTER_PROMPTS = [
  "Find every internal rhyme hiding in these bars.",
  "My cadence feels stiff. What's breaking the natural flow?",
  "I want denser rhymes without it sounding forced. Where's room to add?",
];

let nextId = 1;
const makeId = () => `m${nextId++}`;

function Bubble({ role, content, pending }) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {pending
          ? <ActivityIndicator size="small" color={colors.textMuted} />
          : <Text style={styles.bubbleText}>{content}</Text>}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState([]); // { id, role, content }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, []);

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput('');

    const userMsg = { id: makeId(), role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setSending(true);
    scrollToEnd();

    // VEIL is stateless per-request — the full turn history is resent
    // every time (see api.py /veil/chat: no server-side thread/session).
    const apiMessages = history.map(({ role, content }) => ({ role, content }));
    const { data, error: err } = await veilChat(apiMessages);
    setSending(false);

    if (err) {
      // Backend distinguishes rate-limit (429) and circuit-breaker-open
      // (503) with their own clean error strings — surfaced as-is rather
      // than a generic "something went wrong" so the user knows whether
      // to wait a few seconds or come back later.
      setError(err);
      return;
    }
    setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: data.reply }]);
    scrollToEnd();
  };

  const startNewChat = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VEIL</Text>
        {messages.length > 0 && (
          <Pressable onPress={startNewChat} hitSlop={8}>
            <Text style={styles.newChat}>New chat</Text>
          </Pressable>
        )}
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ask about your bars</Text>
          {STARTER_PROMPTS.map((p) => (
            <Pressable key={p} style={styles.promptChip} onPress={() => send(p)}>
              <Text style={styles.promptChipText}>{p}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble role={item.role} content={item.content} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={sending ? <Bubble role="assistant" pending /> : null}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask VEIL something..."
          placeholderTextColor={colors.textFaint}
          multiline
          onSubmitEditing={() => send(input)}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (pressed || sending) && styles.sendButtonPressed,
            !input.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => send(input)}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  newChat: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  emptyTitle: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.md },
  promptChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface,
  },
  promptChipText: { color: colors.text, fontSize: 14 },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, padding: spacing.md },
  bubbleUser: { backgroundColor: colors.accent, borderBottomRightRadius: radius.sm },
  bubbleAssistant: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.sm },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  error: {
    color: colors.danger, fontSize: 12, marginHorizontal: spacing.lg,
    marginBottom: spacing.sm, backgroundColor: 'rgba(239,68,68,0.1)',
    padding: spacing.sm, borderRadius: radius.sm,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, maxHeight: 100, fontSize: 15,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonPressed: { opacity: 0.7 },
  sendButtonDisabled: { opacity: 0.35 },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { analyze, suggest } from '../../services/api/prosodicApi';
import { analyzeVerseRhymes, type VerseRhymeToken } from '../../services/rhymeDetectionEngine';
import { colors, colorForFamily, spacing, radius } from '../../theme/theme';
import type { AnalyzeResponse, RhymeMapEntry, Suggestion } from '../../types/api';

const PLACEHOLDER_VERSE =
  "I never ran from a fight but I been on the run\n" +
  "Chasing something that I thought was gonna come undone";

interface GroupedLine {
  lineIndex: number;
  words: RhymeMapEntry[];
}

/**
 * rhyme_map has one entry PER SYLLABLE (see feedback_engine.py assemble_feedback)
 * — multiple entries can share the same word. Collapse to one chip per word,
 * picking the color_id from whichever syllable carries a real rhyme-family
 * assignment (non-zero) so the whole word reflects its rhyme family.
 */
function groupByLine(rhymeMap: RhymeMapEntry[] | undefined): GroupedLine[] {
  const lines = new Map<number, Map<string, RhymeMapEntry>>();
  for (const entry of rhymeMap || []) {
    const key = `${entry.line_index}:${entry.word_index}`;
    if (!lines.has(entry.line_index)) lines.set(entry.line_index, new Map());
    const wordsInLine = lines.get(entry.line_index)!;
    const existing = wordsInLine.get(key);
    if (!existing || (existing.color_id === 0 && entry.color_id !== 0)) {
      wordsInLine.set(key, entry);
    }
  }
  return [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lineIndex, wordsMap]) => ({
      lineIndex,
      words: [...wordsMap.values()].sort((a, b) => a.word_index - b.word_index),
    }));
}

interface AnalyzeScreenProps {
  onClose?: () => void;
}

export function AnalyzeScreen({ onClose }: AnalyzeScreenProps) {
  const [bpm, setBpm] = useState('120');
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [localFallbackTokens, setLocalFallbackTokens] = useState<VerseRhymeToken[][] | null>(null);

  const verseInputRef = useRef<TextInput>(null);

  const verseLines = useMemo(
    () => verseText.split('\n').filter((l) => l.trim().length > 0),
    [verseText]
  );

  const groupedLines = useMemo(
    () => (result ? groupByLine(result.rhyme_map) : []),
    [result]
  );

  const runAnalyze = async () => {
    setError(null);
    setSuggestions(null);
    setLocalFallbackTokens(null);

    if (verseLines.length === 0) {
      setError('Write at least one line first.');
      return;
    }
    const bpmNum = parseInt(bpm, 10);
    if (!bpmNum || bpmNum <= 0) {
      setError('Enter a valid BPM.');
      return;
    }

    setLoading(true);
    const { data, error: err } = await analyze(verseLines, bpmNum);
    setLoading(false);

    if (err || !data) {
      // Offline / Local fallback using the TypeScript Rhyme Detection Engine
      try {
        const localAnalysis = analyzeVerseRhymes(verseLines);
        setLocalFallbackTokens(localAnalysis.lineTokens);
      } catch (localErr: any) {
        setError(err || localErr.message || 'Analysis error');
      }
      return;
    }

    setResult(data);
  };

  const runSuggest = async () => {
    if (verseLines.length === 0) return;
    setSuggestLoading(true);
    setError(null);
    const bpmNum = parseInt(bpm, 10) || undefined;
    const { data, error: err } = await suggest(verseLines, bpmNum, 'manual');
    setSuggestLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSuggestions(data?.suggestions || []);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Prosodic</Text>
          {onClose && (
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.subtitle}>Write bars. Get real analysis.</Text>

        <View style={styles.row}>
          <Text style={styles.label}>BPM</Text>
          <TextInput
            style={styles.bpmInput}
            value={bpm}
            onChangeText={setBpm}
            keyboardType="number-pad"
            placeholder="120"
            placeholderTextColor={colors.textFaint}
          />
        </View>

        <Text style={styles.label}>Verse (one line per line)</Text>
        <TextInput
          ref={verseInputRef}
          style={styles.verseInput}
          value={verseText}
          onChangeText={setVerseText}
          multiline
          placeholder={PLACEHOLDER_VERSE}
          placeholderTextColor={colors.textFaint}
          textAlignVertical="top"
        />

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={runAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Analyze</Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* API Rhyme Map Output */}
        {result && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rhyme map</Text>
            {groupedLines.map(({ lineIndex, words }) => (
              <View key={lineIndex} style={styles.lineRow}>
                {words.map((w) => (
                  <Text
                    key={`${lineIndex}:${w.word_index}`}
                    style={[
                      styles.word,
                      { color: colorForFamily(w.color_id) },
                      w.on_pocket && styles.wordOnPocket,
                    ]}
                  >
                    {w.word}{' '}
                  </Text>
                ))}
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [styles.buttonSecondary, pressed && styles.buttonPressed]}
              onPress={runSuggest}
              disabled={suggestLoading}
            >
              {suggestLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.buttonSecondaryText}>Get suggestions</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Local Offline Rhyme Map Fallback Output */}
        {!result && localFallbackTokens && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rhyme map (Offline Engine)</Text>
            {localFallbackTokens.map((tokens, lineIndex) => (
              <View key={lineIndex} style={styles.lineRow}>
                {tokens.map((tok, tokIndex) => (
                  <Text
                    key={tokIndex}
                    style={[
                      styles.word,
                      { color: tok.isWord && tok.colorId > 0 ? colorForFamily(tok.colorId) : '#FFFFFF' },
                    ]}
                  >
                    {tok.text}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {suggestions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Suggestions ({suggestions.length})
            </Text>
            {suggestions.length === 0 && (
              <Text style={styles.muted}>No suggestions came back for this verse.</Text>
            )}
            {suggestions.map((s, i) => (
              <View key={`${s.word}-${i}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardWord}>{s.word}</Text>
                  <Text style={styles.cardScore}>{s.rhyme_score}%</Text>
                </View>
                <Text style={styles.cardMeta}>
                  {s.syllable_count} syllable{s.syllable_count === 1 ? '' : 's'}
                  {s.concreteness != null ? `  ·  concreteness ${s.concreteness.toFixed(1)}` : ''}
                  {s.used_before ? '  ·  you\'ve used this before' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, maxWidth: 680, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  closeBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  bpmInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    width: 90, backgroundColor: colors.surface,
  },
  verseInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    color: colors.text, padding: spacing.md, minHeight: 120,
    backgroundColor: colors.surface, fontSize: 15, lineHeight: 22,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondary: {
    borderWidth: 1, borderColor: colors.accentMuted, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center',
    minHeight: 44, marginTop: spacing.md,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonSecondaryText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  error: {
    color: colors.danger, marginTop: spacing.md, fontSize: 13,
    backgroundColor: 'rgba(239,68,68,0.1)', padding: spacing.sm, borderRadius: radius.sm,
  },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md,
  },
  lineRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  word: { fontSize: 16, fontWeight: '600' },
  wordOnPocket: { textDecorationLine: 'underline' },
  muted: { color: colors.textFaint, fontSize: 13 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardWord: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardScore: { fontSize: 14, fontWeight: '700', color: colors.accent },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});

export default AnalyzeScreen;

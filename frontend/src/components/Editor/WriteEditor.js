import { useRef, useState, useEffect, useMemo } from 'react';
import { useApp } from '../../state/AppContext';
import { analyze, suggest } from '../../api/prosodicApi';
import styles from './WriteEditor.module.css';

/**
 * Build a word→colorId lookup from the rhyme_map.
 * Only includes words whose color_id appears 2+ times (has a rhyme partner).
 * Strips all non-alpha from word for robust matching with normalized API words.
 */
function buildColorMap(rhymeMap) {
  if (!rhymeMap || !rhymeMap.length) return {};

  // Count occurrences per color_id — only highlight if there's a partner
  const colorCounts = {};
  for (const entry of rhymeMap) {
    colorCounts[entry.color_id] = (colorCounts[entry.color_id] || 0) + 1;
  }

  const map = {};
  const wordCounts = {};
  for (const entry of rhymeMap) {
    if (colorCounts[entry.color_id] < 2) continue;
    // Strip all non-alpha (handles apostrophes, punctuation, contractions)
    const word = entry.word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) continue;
    const key = `${entry.line_index}:${word}`;
    const occ = wordCounts[key] || 0;
    map[`${key}:${occ}`] = entry.color_id;
    wordCounts[key] = occ + 1;
  }
  return map;
}

function renderLine(lineText, lineIndex, colorMap, getColor, isActive) {
  // Split into word tokens and whitespace tokens
  const tokens = lineText.split(/(\s+)/);
  const wordCounts = {};

  const spans = tokens.map((token, i) => {
    if (/^\s+$/.test(token) || token === '') return <span key={i}>{token}</span>;

    // Strip all non-alpha for matching (mirrors buildColorMap normalization)
    const clean = token.toLowerCase().replace(/[^a-z]/g, '');
    const countKey = `${lineIndex}:${clean}`;
    const occ = wordCounts[countKey] || 0;
    wordCounts[countKey] = occ + 1;

    const colorId = clean ? colorMap[`${lineIndex}:${clean}:${occ}`] : null;
    if (colorId) {
      const { bg, fg } = getColor(colorId);
      return (
        <span
          key={i}
          className={styles.rhymeWord}
          style={{
            backgroundColor: bg,
            color: fg,
            borderBottom: `2px solid ${bg}`,
          }}
        >
          {token}
        </span>
      );
    }
    return <span key={i}>{token}</span>;
  });

  return (
    <div key={lineIndex} className={`${styles.line} ${isActive ? styles.activeLine : ''}`}>
      {spans.length ? spans : '\u00A0'}
    </div>
  );
}

export default function WriteEditor() {
  const { activeSection, dispatch, getColor } = useApp();
  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  // Always-current refs to avoid stale closures in async callbacks
  const bpmRef = useRef(activeSection.bpm);
  const suggestModeRef = useRef(activeSection.suggestMode);

  const [rawText, setRawText] = useState(() => activeSection.lines.join('\n'));
  const [activeLine, setActiveLine] = useState(0);

  // Keep refs current
  useEffect(() => { bpmRef.current = activeSection.bpm; }, [activeSection.bpm]);
  useEffect(() => { suggestModeRef.current = activeSection.suggestMode; }, [activeSection.suggestMode]);

  // Sync text when switching sections
  useEffect(() => {
    setRawText(activeSection.lines.join('\n'));
  }, [activeSection.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = rawText.split('\n');

  const colorMap = useMemo(
    () => buildColorMap(activeSection.analysis?.rhyme_map),
    [activeSection.analysis]
  );

  const runAnalyze = async (textLines) => {
    const bpm = bpmRef.current;
    if (!bpm) return;
    const nonEmpty = textLines.filter(l => l.trim());
    if (!nonEmpty.length) return;

    dispatch({ type: 'ANALYZE_START' });

    const { data, error } = await analyze(textLines, bpm);
    if (data) {
      dispatch({ type: 'ANALYZE_SUCCESS', payload: data });
      if (suggestModeRef.current === 'auto') {
        dispatch({ type: 'SUGGEST_START' });
        const { data: sData } = await suggest(textLines, bpm, 'auto');
        if (sData) dispatch({ type: 'SUGGEST_SUCCESS', payload: sData.suggestions });
        else dispatch({ type: 'SUGGEST_FAIL' });
      }
    } else {
      dispatch({ type: 'ANALYZE_FAIL' });
      if (error) dispatch({ type: 'SET_GLOBAL_ERROR', payload: error });
    }
  };

  const scheduleAnalyze = (textLines, delayMs) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runAnalyze(textLines), delayMs);
  };

  const handleChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    const ls = text.split('\n');
    dispatch({ type: 'SET_SECTION_LINES', payload: ls });
    scheduleAnalyze(ls, 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Fire analysis faster on Enter — use the lines BEFORE the newline is inserted
      const currentLines = rawText.split('\n');
      scheduleAnalyze(currentLines, 100);
    }
  };

  const updateActiveLine = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = ta.value.substring(0, ta.selectionStart);
    setActiveLine(before.split('\n').length - 1);
  };

  return (
    <div className={styles.container}>
      {/* Line numbers */}
      <div className={styles.lineNumbers}>
        {lines.map((_, i) => (
          <div key={i} className={`${styles.lineNum} ${i === activeLine ? styles.active : ''}`}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Grid overlay editor */}
      <div className={styles.editorWrap}>
        {!rawText && (
          <div className={styles.placeholder}>Start writing your verse…</div>
        )}
        <div className={styles.mirror} aria-hidden>
          {lines.map((line, i) =>
            renderLine(line, i, colorMap, getColor, i === activeLine)
          )}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={rawText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveLine}
          onClick={updateActiveLine}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}

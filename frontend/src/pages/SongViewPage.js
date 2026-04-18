import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Sparkles, RotateCcw, ChevronRight, ChevronLeft, Pencil, X, Mic2, Users } from 'lucide-react';
import { AppProvider, useApp } from '../state/AppContext';
import useColorPalette from '../hooks/useColorPalette';
import useCorrections, { applyCorrections } from '../hooks/useCorrections';
import useStressMarks from '../hooks/useStressMarks';
import { analyze, suggest, getMoreSuggestions, suggestFamily, autofill as autofillApi } from '../api/prosodicApi';
import GlassFilter from '../components/ui/GlassFilter';
import MetalButton from '../components/ui/MetalButton';
import DottedSurface from '../components/ui/DottedSurface';
import MetronomeBar from '../components/ui/MetronomeBar';
import {
  MIRROR_STYLE,
  TEXTAREA_STYLE,
  LINE_HEIGHT_PX,
  FONT_FAMILY,
  FONT_SIZE_PX,
  LINE_HEIGHT,
  TEXT_PADDING,
} from '../constants/textLayout';

// ─── Rhyme map helpers (same logic as WriteEditor) ────────────────────────────

// Normalize rhyme_map color_ids to a compact 1-N sequence.
// The backend can produce non-contiguous ids (e.g. 1, 3, 177) when groups are
// merged or discarded. Used by both LyricsEditor (via useMemo) and FullSongView.
function normalizeColorIds(raw) {
  if (!raw?.length) return [];
  const rawIds = [...new Set(raw.map(e => e.color_id).filter(Boolean))].sort((a, b) => a - b);
  const remap = {};
  rawIds.forEach((id, idx) => { remap[id] = idx + 1; });
  return raw.map(e => e.color_id ? { ...e, color_id: remap[e.color_id] } : e);
}

// Build nested lookup: colorMap[lineIdx][wordIdx] = [{char_start, char_end, color_id}, ...]
// O(1) per-word access during render, no scanning.
function buildColorMap(rhymeMap) {
  if (!rhymeMap?.length) return {};
  // count how many syllables per color family — only highlight if 2+ syllables share a family
  const counts = {};
  for (const e of rhymeMap) {
    if (e.color_id) counts[e.color_id] = (counts[e.color_id] || 0) + 1;
  }
  const map = {};
  for (const e of rhymeMap) {
    if (!e.color_id || counts[e.color_id] < 2) continue;
    const li = e.line_index;
    const wi = e.word_index ?? -1;
    if (wi < 0) continue;
    if (!map[li]) map[li] = {};
    if (!map[li][wi]) map[li][wi] = [];
    map[li][wi].push({
      char_start: e.char_start ?? 0,
      char_end:   e.char_end   ?? e.word?.length ?? 0,
      color_id:   e.color_id,
    });
  }
  return map;
}

// onWordClick(e, lineIndex, wordIndex, currentColorId | null)
// getSyllCount(wordIndex) => number | null   — for 'words' syllable mode
// stressMap: { [wi]: 'yellow'|'blue' }
// onStressClick(e, lineIndex, wordIndex)
function renderLine(lineText, lineIndex, colorMap, getColor, onWordClick, getSyllCount, stressMap, onStressClick) {
  const lineHighlights = colorMap[lineIndex] || {};
  const tokens = lineText.split(/(\s+)/);
  let wordIndex = 0;

  return tokens.map((token, i) => {
    if (/^\s+$/.test(token) || token === '') return <span key={i}>{token}</span>;

    const wi = wordIndex++;
    const syllables = lineHighlights[wi];
    const stressColor = stressMap?.[wi];
    const stressStyle = stressColor
      ? {
          fontWeight: 800,
          color: stressColor === 'yellow' ? '#F5C518' : stressColor === 'green' ? '#4ADE80' : '#38BDF8',
          textShadow: stressColor === 'yellow' ? '0 0 8px rgba(245,197,24,0.4)' : stressColor === 'green' ? '0 0 8px rgba(74,222,128,0.4)' : '0 0 8px rgba(56,189,248,0.4)',
        }
      : {};

    if (!syllables?.length) {
      const sc = getSyllCount ? getSyllCount(wi) : null;
      const badge = sc > 1 ? <sup style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginLeft: 1, verticalAlign: 'super', fontFamily: 'DM Sans, sans-serif', userSelect: 'none' }}>{sc}</sup> : null;
      if (onStressClick) {
        return (
          <span key={i} data-li={lineIndex} data-wi={wi}
            onClick={e => onStressClick(e, lineIndex, wi)}
            style={{ cursor: 'pointer', borderRadius: 3, ...stressStyle }}
          >{token}{badge}</span>
        );
      }
      if (onWordClick) {
        return (
          <span key={i} data-li={lineIndex} data-wi={wi}
            onClick={e => onWordClick(e, lineIndex, wi, null)}
            style={{ cursor: 'pointer', borderRadius: 3, ...stressStyle }} className="correct-target"
          >{token}{badge}</span>
        );
      }
      return <span key={i} style={stressStyle}>{token}{badge}</span>;
    }

    // clean = letters + apostrophes only, preserving position relative to token
    const leadOffset = token.search(/[a-zA-Z']/);
    const lastLetterIdx = token.split('').reduce((acc, ch, idx) => /[a-zA-Z']/.test(ch) ? idx : acc, -1);
    const trailOffset = lastLetterIdx + 1;
    const clean = token.slice(leadOffset, trailOffset);

    const sorted = [...syllables].sort((a, b) => a.char_start - b.char_start);

    // Merge consecutive syllables that share the same color_id into one span
    const merged = [];
    let mi = 0;
    while (mi < sorted.length) {
      let mj = mi + 1;
      while (mj < sorted.length && sorted[mj].color_id === sorted[mi].color_id) mj++;
      merged.push({ char_start: sorted[mi].char_start, char_end: sorted[mj - 1].char_end, color_id: sorted[mi].color_id });
      mi = mj;
    }

    const parts = [];
    if (leadOffset > 0) parts.push(<span key="lead">{token.slice(0, leadOffset)}</span>);

    let cursor = 0;
    for (let j = 0; j < merged.length; j++) {
      const { char_start, char_end, color_id } = merged[j];
      const s = Math.max(0, Math.min(char_start, clean.length));
      const e2 = Math.max(s, Math.min(char_end, clean.length));
      if (s > cursor) parts.push(<span key={`b${j}`}>{clean.slice(cursor, s)}</span>);
      const { bg, fg } = getColor(color_id);
      parts.push(
        <span key={`h${j}`} style={{ backgroundColor: bg, color: fg, borderRadius: 1, padding: '0 2px', margin: '0 -2px', verticalAlign: 'baseline' }}>
          {clean.slice(s, e2)}
        </span>
      );
      cursor = e2;
    }
    if (cursor < clean.length) parts.push(<span key="tail">{clean.slice(cursor)}</span>);
    if (trailOffset < token.length) parts.push(<span key="trail">{token.slice(trailOffset)}</span>);

    const sc = getSyllCount ? getSyllCount(wi) : null;
    const countBadge = sc > 1 ? (
      <sup key="sc" style={{ fontSize: 8, color: 'rgba(56,189,248,0.65)', marginLeft: 1, verticalAlign: 'super', fontFamily: 'DM Sans, sans-serif', userSelect: 'none' }}>{sc}</sup>
    ) : null;

    const dominantColor = sorted[0].color_id;
    if (onStressClick) {
      return (
        <span key={i} data-li={lineIndex} data-wi={wi}
          onClick={e => onStressClick(e, lineIndex, wi)}
          style={{ cursor: 'pointer', ...stressStyle }}
        >{parts}{countBadge}</span>
      );
    }
    if (onWordClick) {
      return (
        <span key={i} data-li={lineIndex} data-wi={wi}
          onClick={e => onWordClick(e, lineIndex, wi, dominantColor)}
          style={{ cursor: 'pointer', ...stressStyle }} className="correct-target"
        >{parts}{countBadge}</span>
      );
    }
    return <span key={i} style={stressStyle}>{parts}{countBadge}</span>;
  });
}

// ─── Glass card wrapper ────────────────────────────────────────────────────────

function GlassCard({ children, style, className, hasContent = true }) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 16,
        border: hasContent ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.18)',
        transition: 'border 500ms ease',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Glass fill — framer-motion animates opacity so it works inside any stacking context */}
      <motion.div
        animate={{ opacity: hasContent ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,15,20,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Content sits on top — flex-column so inner layouts (flex:1 children) work */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Section tab strip ────────────────────────────────────────────────────────

const SECTION_TYPES = [
  'Verse 1', 'Verse 2', 'Verse 3',
  'Hook', 'Pre-Hook', 'Bridge', 'Outro', 'Intro', 'Interlude',
];

const DROPDOWN_STYLES = {
  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
  background: 'rgba(14,14,14,0.97)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 12,
  backdropFilter: 'blur(60px)',
  padding: 8,
  minWidth: 160,
  boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
};

function TypeGrid({ onSelect, activeName, inputValue, onInputChange, onInputKeyDown, inputRef }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
        {SECTION_TYPES.map(t => {
          const sel = activeName === t;
          return (
            <button
              key={t}
              onClick={() => onSelect(t)}
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                padding: '5px 8px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                background: sel ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
                border: sel ? '1px solid rgba(245,197,24,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: sel ? '#F5C518' : '#FFFFFF', transition: 'all 100ms',
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8 }}>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Custom name…"
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
            padding: '5px 10px', fontFamily: 'DM Sans, sans-serif', fontSize: 12,
            color: '#FFFFFF', caretColor: '#F5C518', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
    </>
  );
}

// ─── Shared confirm dialog ────────────────────────────────────────────────────
function ConfirmDialog({ message, subtext, yesLabel = 'Yes', yesDanger = false, onYes, onNo }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onMouseDown={e => { if (e.target === e.currentTarget) onNo(); }}>
      <div style={{
        background: 'rgba(14,14,18,0.98)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14, padding: '22px 26px',
        maxWidth: 360, width: '90%',
        boxShadow: '0 24px 70px rgba(0,0,0,0.85)',
      }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#FFFFFF', lineHeight: 1.55, margin: subtext ? '0 0 6px' : '0 0 20px' }}>
          {message}
        </p>
        {subtext && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: '0 0 20px' }}>
            {subtext}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onNo} style={{
            padding: '7px 18px', borderRadius: 7, cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
          }}>Cancel</button>
          <button onClick={onYes} style={{
            padding: '7px 18px', borderRadius: 7, cursor: 'pointer',
            background: yesDanger ? 'rgba(239,68,68,0.15)' : 'rgba(245,197,24,0.15)',
            border: yesDanger ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,197,24,0.4)',
            color: yesDanger ? '#EF4444' : '#F5C518',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
          }}>{yesLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Full song view modal ─────────────────────────────────────────────────────
function FullSongView({ onClose }) {
  const { state, getColor } = useApp();

  const buildSectionColorMap = (sec) => buildColorMap(normalizeColorIds(sec.analysis?.rhyme_map));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(3,3,5,0.92)', backdropFilter: 'blur(10px)',
      overflowY: 'auto', padding: '60px 40px 80px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.06em', margin: 0 }}>
            Full Song
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16,
          }}>✕</button>
        </div>
        {state.sections.map((sec) => {
          const colorMap = buildSectionColorMap(sec);
          const hasHighlights = Object.keys(colorMap).length > 0;
          const labelColor = sec.sectionColor ? getColor(sec.sectionColor).bg : 'rgba(255,255,255,0.28)';
          return (
            <div key={sec.id} style={{ marginBottom: 44 }}>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700,
                color: labelColor, letterSpacing: '0.12em', textTransform: 'uppercase',
                margin: '0 0 12px', paddingBottom: 8,
                borderBottom: `1px solid ${sec.sectionColor ? getColor(sec.sectionColor).bg + '33' : 'rgba(255,255,255,0.07)'}`,
              }}>
                {sec.name || 'Untitled'}
              </p>
              <div style={{
                fontFamily: FONT_FAMILY, fontSize: FONT_SIZE_PX, lineHeight: LINE_HEIGHT,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#FFFFFF',
              }}>
                {sec.lines.map((line, i) => (
                  <div key={i} style={{ minHeight: LINE_HEIGHT_PX }}>
                    {line.trim()
                      ? (hasHighlights
                          ? renderLine(line, i, colorMap, getColor, null, null, {}, null)
                          : line)
                      : '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shared 44+white swatch grid used by section and artist color pickers.
// slot=0 → white; slot=1..44 → palette. currentColor=0 means white, null=none picked yet.
function ColorSwatchGrid({ currentColor, getColor, onPick, label = 'Color' }) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginTop: 4 }}>
      {label && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* White slot */}
        <button
          onClick={() => onPick(0)}
          title="White"
          style={{
            width: 18, height: 18, borderRadius: 4, cursor: 'pointer',
            background: '#FFFFFF',
            border: currentColor === 0 ? '2px solid #F5C518' : '1px solid rgba(255,255,255,0.3)',
            flexShrink: 0,
          }}
        />
        {Array.from({ length: 44 }, (_, i) => i + 1).map(slot => {
          const { bg } = getColor(slot);
          const isActive = currentColor === slot;
          return (
            <button
              key={slot}
              onClick={() => onPick(slot)}
              title={`Color ${slot}`}
              style={{
                width: 18, height: 18, borderRadius: 4, cursor: 'pointer',
                background: bg,
                border: isActive ? '2px solid #FFFFFF' : '1px solid rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionColorPicker({ currentColor, getColor, onPick }) {
  return <ColorSwatchGrid currentColor={currentColor} getColor={getColor} onPick={onPick} label="Section Color" />;
}

function SectionStrip() {
  const { state, dispatch, getColor } = useApp();
  const [openMenuId, setOpenMenuId] = useState(null);   // rename menu for existing tabs
  const [addMenuOpen, setAddMenuOpen] = useState(false); // type picker for +
  const [customName, setCustomName] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const menuRef = useRef(null);
  const addMenuRef = useRef(null);
  const customInputRef = useRef(null);
  const [fullSongOpen, setFullSongOpen] = useState(false);
  const draggedIdRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Close any open menu on outside click
  useEffect(() => {
    const anyOpen = openMenuId || addMenuOpen;
    if (!anyOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId, addMenuOpen]);

  const addSection = (name) => {
    dispatch({ type: 'ADD_SECTION', payload: { name, bpm: state.sections.at(-1)?.bpm || 90 } });
    setAddMenuOpen(false);
    setCustomName('');
  };

  const openMenu = (sec, e) => {
    e.stopPropagation();
    if (sec.id !== state.activeSectionId) dispatch({ type: 'SET_ACTIVE_SECTION', payload: sec.id });
    setCustomName(sec.name);
    setOpenMenuId(prev => prev === sec.id ? null : sec.id);
  };

  const applyName = (id, name) => {
    if (name.trim()) dispatch({ type: 'RENAME_SECTION', payload: { id, name: name.trim() } });
    setOpenMenuId(null);
  };

  const deleteSection = (id, e) => {
    e.stopPropagation();
    if (state.sections.length <= 1) return;
    dispatch({ type: 'DELETE_SECTION', payload: id });
    setOpenMenuId(null);
  };

  return (
    <>
    {fullSongOpen && <FullSongView onClose={() => setFullSongOpen(false)} />}
    <div className="flex items-center gap-2 flex-wrap">
      {state.sections.map((sec) => {
        const active = sec.id === state.activeSectionId;
        const menuOpen = openMenuId === sec.id;
        const hovered = hoveredId === sec.id;
        const isDragOver = dragOverId === sec.id;

        return (
          <div key={sec.id} style={{ position: 'relative' }}
            draggable
            onDragStart={() => { draggedIdRef.current = sec.id; }}
            onDragOver={e => { e.preventDefault(); setDragOverId(sec.id); }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => {
              e.preventDefault();
              if (draggedIdRef.current && draggedIdRef.current !== sec.id) {
                dispatch({ type: 'REORDER_SECTIONS', payload: { fromId: draggedIdRef.current, toId: sec.id } });
              }
              draggedIdRef.current = null;
              setDragOverId(null);
            }}
            onDragEnd={() => { draggedIdRef.current = null; setDragOverId(null); }}
          >
            <button
              onClick={() => {
                if (!active) dispatch({ type: 'SET_ACTIVE_SECTION', payload: sec.id });
                else openMenu(sec, { stopPropagation: () => {} });
              }}
              onMouseEnter={() => setHoveredId(sec.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-150"
              style={{
                background: isDragOver ? 'rgba(245,197,24,0.08)' : active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: isDragOver
                  ? '1px solid rgba(245,197,24,0.5)'
                  : menuOpen
                  ? '1px solid rgba(245,197,24,0.35)'
                  : sec.sectionColor
                  ? `1px solid ${getColor(sec.sectionColor).bg}66`
                  : active ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
                color: sec.sectionColor ? getColor(sec.sectionColor).bg : active ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: 'grab',
                transition: 'all 120ms',
              }}
            >
              {sec.name || 'Untitled'}
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.06)', fontSize: 11, color: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}
              >
                <Zap size={9} />
                {sec.bpm}
              </span>
              {/* Delete × — visible on hover if multiple sections */}
              {state.sections.length > 1 && (hovered || active) && (
                <span
                  onClick={(e) => deleteSection(sec.id, e)}
                  style={{
                    fontSize: 14, lineHeight: 1, color: '#FFFFFF', marginLeft: -2,
                    transition: 'color 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#FFFFFF'}
                  title="Delete section"
                >
                  ×
                </span>
              )}
            </button>

            {/* Type picker dropdown */}
            {menuOpen && (
              <div ref={menuRef} style={{ ...DROPDOWN_STYLES, minWidth: 200 }}>
                <TypeGrid
                  activeName={sec.name}
                  onSelect={t => applyName(sec.id, t)}
                  inputValue={customName}
                  onInputChange={setCustomName}
                  onInputKeyDown={e => {
                    if (e.key === 'Enter') applyName(sec.id, customName);
                    if (e.key === 'Escape') setOpenMenuId(null);
                  }}
                />
                <SectionColorPicker
                  sectionId={sec.id}
                  currentColor={sec.sectionColor ?? null}
                  getColor={getColor}
                  onPick={color => dispatch({ type: 'SET_SECTION_COLOR', payload: { id: sec.id, color } })}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Add section — opens type picker */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setAddMenuOpen(m => !m); setCustomName(''); }}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150"
          style={{
            background: addMenuOpen ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
            border: addMenuOpen ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.07)',
            color: addMenuOpen ? '#F5C518' : '#FFFFFF',
          }}
          onMouseEnter={e => { if (!addMenuOpen) { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.25)'; } }}
          onMouseLeave={e => { if (!addMenuOpen) { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; } }}
        >
          <Plus size={13} />
        </button>

        {addMenuOpen && (
          <div ref={addMenuRef} style={DROPDOWN_STYLES}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Choose type
            </p>
            <TypeGrid
              activeName={null}
              onSelect={t => addSection(t)}
              inputValue={customName}
              onInputChange={setCustomName}
              onInputKeyDown={e => {
                if (e.key === 'Enter' && customName.trim()) addSection(customName);
                if (e.key === 'Escape') setAddMenuOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Full song view button */}
      <button
        onClick={() => setFullSongOpen(true)}
        title="View full song in order"
        style={{
          padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
          transition: 'all 120ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
      >
        Full Song
      </button>
    </div>
    </>
  );
}

// ─── Lyrics Editor ────────────────────────────────────────────────────────────

// ─── Correction popover ────────────────────────────────────────────────────────

/**
 * CorrectionPopover
 *
 * syllables — array of {char_start, char_end, color_id, text} for this word
 *             derived from rhymeMap + the raw word string.
 *             If length > 1 the user can select individual syllables or "All".
 *
 * selectedSyllIdx — index into syllables array that is currently active,
 *                   or null = "All syllables" (whole-word scope).
 *
 * onRemove(char_start | null)    — remove color for syllable or whole word
 * onAdd(color_id, char_start | null, char_end | null)
 * onRestore(char_start | null)   — clear manual correction
 */
// colorSwatch — shared swatch button. cid=0 renders a "no color" slot.
function ColorSwatch({ cid, isCurrent, getColor, onClick, scorePct }) {
  if (cid === 0) {
    return (
      <button onClick={onClick} title="No color — force uncolored"
        style={{
          width: 26, height: 26, borderRadius: 5,
          background: 'rgba(255,255,255,0.04)',
          border: isCurrent ? '2px solid #EF4444' : '1px dashed rgba(255,255,255,0.2)',
          cursor: 'pointer', fontSize: 11, color: isCurrent ? '#EF4444' : '#4A4A4A',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >⊘</button>
    );
  }
  const { bg, fg } = getColor(cid);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={onClick}
        title={scorePct != null ? `Family ${cid} — ${scorePct}% match` : `Family ${cid}`}
        style={{
          width: 26, height: 26, borderRadius: 5,
          background: bg, color: fg,
          border: isCurrent ? `2px solid ${fg}` : '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >{cid}</button>
      {scorePct != null && (
        <div style={{
          position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, fontWeight: 700, color: fg, whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif', pointerEvents: 'none',
        }}>{scorePct}%</div>
      )}
    </div>
  );
}

const TOTAL_PALETTE = 54; // total color slots available

// Collapsible section used inside the popover for Used / New family grids
function FamilySection({ label, ids, resolvedColorId, getColor, onAdd, activeCharStart, activeCharEnd, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!ids.length) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, width: '100%',
          background: 'none', border: 'none', padding: '0 0 5px',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
          color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1,
        }}>{label} ({ids.length})</span>
        <span style={{ fontSize: 9, color: '#4A4A4A' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {ids.map(cid => (
            <ColorSwatch key={cid} cid={cid} isCurrent={cid === resolvedColorId}
              getColor={getColor} onClick={() => onAdd(cid, activeCharStart, activeCharEnd)} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CorrectionPopover
 *
 * colorFamilies — color_ids currently in use by the verse (from colorMap)
 * familySamples — {color_id: [word, ...]} sample words per family for phonetic scoring
 * word          — the raw word string (used for suggestion lookup)
 * All 44 palette slots are always shown, split into Suggested / Used / New sections.
 */
function CorrectionPopover({ x, y, syllables, word, colorFamilies, familySamples, getColor, onRemove, onAdd, onRestore, onClose }) {
  const ref = useRef(null);
  const [selIdx, setSelIdx] = useState(null); // null = whole word
  const [suggestions, setSuggestions] = useState(null); // null=loading, []=none, [{color_id,score}]=results
  const fetchRef = useRef(0);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Fetch phonetic suggestions whenever the popover opens or the active syllable changes
  useEffect(() => {
    // Use syllable text when a specific syllable is selected, otherwise the full word
    const lookup = selIdx != null ? (syllables[selIdx]?.text || word) : word;
    if (!lookup || !colorFamilies.length) { setSuggestions([]); return; }
    setSuggestions(null); // loading
    const id = ++fetchRef.current;
    const families = colorFamilies.map(cid => ({
      color_id: cid,
      sample_words: (familySamples?.[cid] || []).slice(0, 8),
    }));
    suggestFamily(lookup, families).then(({ data }) => {
      if (fetchRef.current !== id) return; // stale
      setSuggestions(data?.suggestions || []);
    }).catch(() => { if (fetchRef.current === id) setSuggestions([]); });
  }, [word, selIdx, syllables, colorFamilies, familySamples]); // eslint-disable-line

  const multiSyllable = syllables.length > 1;

  // True when every syllable belongs to the same non-null family
  const allSameColor = multiSyllable &&
    syllables[0]?.color_id != null &&
    syllables.every(s => s.color_id === syllables[0].color_id);

  const activeCharStart = selIdx != null ? syllables[selIdx]?.char_start ?? null : null;
  const activeCharEnd   = selIdx != null ? syllables[selIdx]?.char_end   ?? null : null;
  const wholeWordColorId = syllables.find(s => s.color_id)?.color_id ?? null;
  const resolvedColorId  = selIdx != null ? (syllables[selIdx]?.color_id ?? null) : wholeWordColorId;
  const hasColor = resolvedColorId != null;

  // Split all 44 slots into used (in verse) vs unused
  const usedSet = new Set(colorFamilies);
  const usedIds   = Array.from({ length: TOTAL_PALETTE }, (_, i) => i + 1).filter(id => usedSet.has(id));
  const unusedIds = Array.from({ length: TOTAL_PALETTE }, (_, i) => i + 1).filter(id => !usedSet.has(id));

  // Clamp popover inside viewport — enough room for scrollable content
  const popH = Math.min(window.innerHeight - 40, 520);
  const top  = Math.min(y + 8, window.innerHeight - popH - 8);
  const left = Math.min(x, window.innerWidth - 258);

  const divider = <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0' }} />;

  const btnStyle = (bg, fg) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    width: '100%', padding: '5px 8px', borderRadius: 6,
    background: bg, border: '1px solid rgba(255,255,255,0.07)',
    color: fg, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
    marginBottom: 3,
  });

  return (
    <div ref={ref} style={{
      position: 'fixed', top, left,
      zIndex: 9999,
      background: 'rgba(14,14,14,0.97)',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: 10,
      backdropFilter: 'blur(40px)',
      width: 248,
      maxHeight: popH,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
    }}>

      {/* ── Fixed top: scope + actions ── */}
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>

        {/* Syllable scope */}
        {multiSyllable && (
          <>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>Scope</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {(() => {
                // "All" pill — colored when every syllable shares the same family
                const allIsActive = selIdx === null;
                const allBg = allSameColor ? getColor(syllables[0].color_id).bg : null;
                const allFg = allSameColor ? getColor(syllables[0].color_id).fg : null;
                return (
                  <button onClick={() => setSelIdx(null)} style={{
                    padding: '3px 8px', borderRadius: 5,
                    background: allSameColor
                      ? allBg
                      : allIsActive ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
                    border: allSameColor
                      ? allIsActive ? `2px solid ${allFg}` : `1px solid ${allFg}88`
                      : allIsActive ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: allSameColor ? allFg : allIsActive ? '#F5C518' : '#9B9B9B',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>All</button>
                );
              })()}
              {syllables.map((s, idx) => {
                const isActive = selIdx === idx;
                // When all syllables are the same color, show individual pills as neutral
                // so "All" is clearly the representative state
                const showColor = !allSameColor && s.color_id != null;
                const { bg, fg } = showColor ? getColor(s.color_id) : { bg: 'rgba(255,255,255,0.05)', fg: '#9B9B9B' };
                return (
                  <button key={idx} onClick={() => setSelIdx(idx)} title={s.color_id != null ? `Color ${s.color_id}` : 'Uncolored'}
                    style={{
                      padding: '3px 8px', borderRadius: 5,
                      background: isActive ? (showColor ? bg : 'rgba(255,255,255,0.12)') : (showColor ? bg : 'rgba(255,255,255,0.05)'),
                      border: isActive ? `2px solid ${showColor ? fg : 'rgba(255,255,255,0.5)'}` : `1px solid ${showColor ? fg + '88' : 'rgba(255,255,255,0.1)'}`,
                      color: isActive ? (showColor ? fg : '#FFFFFF') : (showColor ? fg : '#9B9B9B'),
                      fontFamily: 'DM Mono, DM Sans, monospace', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', letterSpacing: '0.02em',
                    }}
                  >{s.text || `syl${idx + 1}`}</button>
                );
              })}
            </div>
            {divider}
          </>
        )}

        {/* Current color + actions */}
        {hasColor && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: getColor(resolvedColorId).bg, flexShrink: 0 }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#AAAAAA', flex: 1 }}>Family {resolvedColorId}</span>
            </div>
            <button style={btnStyle('rgba(239,68,68,0.12)', '#EF4444')} onClick={() => onRemove(activeCharStart)}>
              <X size={11} /> Remove from family
            </button>
            <button style={btnStyle('rgba(255,255,255,0.05)', '#6B6B6B')} onClick={() => onRestore(activeCharStart)}>
              Restore engine default
            </button>
          </>
        )}
        {!hasColor && (
          <button style={btnStyle('rgba(255,255,255,0.05)', '#6B6B6B')} onClick={() => onRestore(activeCharStart)}>
            Restore engine default
          </button>
        )}

        {/* ── Suggestion strip — always visible, never scrolled away ── */}
        <div style={{ marginTop: 10, padding: '8px 0 6px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#F5C518', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            Suggested match
          </div>
          {suggestions === null && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.4)', borderTopColor: '#F5C518', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6B6B6B' }}>Scoring…</span>
            </div>
          )}
          {suggestions?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingBottom: 4 }}>
              {suggestions.map(({ color_id, score }) => (
                <ColorSwatch
                  key={color_id}
                  cid={color_id}
                  isCurrent={color_id === resolvedColorId}
                  getColor={getColor}
                  scorePct={Math.round(score * 100)}
                  onClick={() => onAdd(color_id, activeCharStart, activeCharEnd)}
                />
              ))}
            </div>
          )}
          {suggestions?.length === 0 && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555', fontStyle: 'italic' }}>
              No phonetic match — pick from palette below
            </span>
          )}
        </div>
        {divider}
      </div>

      {/* ── Scrollable color sections ── */}
      <div style={{ overflowY: 'auto', padding: '0 12px 12px', flex: 1 }}>

        {/* No color */}
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>
          No color
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <ColorSwatch cid={0} isCurrent={resolvedColorId === 0} getColor={getColor}
            onClick={() => onAdd(0, activeCharStart, activeCharEnd)} />
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0 0 8px' }} />

        <FamilySection
          label={hasColor ? 'Move to used family' : 'Used families'}
          ids={usedIds}
          resolvedColorId={resolvedColorId}
          getColor={getColor}
          onAdd={onAdd}
          activeCharStart={activeCharStart}
          activeCharEnd={activeCharEnd}
          defaultOpen={true}
        />
        <FamilySection
          label="New family"
          ids={unusedIds}
          resolvedColorId={resolvedColorId}
          getColor={getColor}
          onAdd={onAdd}
          activeCharStart={activeCharStart}
          activeCharEnd={activeCharEnd}
          defaultOpen={usedIds.length === 0}
        />
      </div>
    </div>
  );
}

// ─── Stress popover ───────────────────────────────────────────────────────────

// syllables: [{text, stressColor}] — optional, enables syllable scope selection
// When syllables.length > 1, user can pick scope before setting stress.
// The onSelect/onClear still operate at the word level (stress is per-word in storage),
// but the scope selector makes the intent clear per-syllable for multi-syllable words.
function StressPopover({ x, y, word, current, syllables, onSelect, onClear, onClose }) {
  const [selIdx, setSelIdx] = useState(null); // null = whole word
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-stress-popover]')) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 220);
  const top  = Math.max(8, y - 70);
  const multiSyll = syllables && syllables.length > 1;

  return (
    <div
      data-stress-popover
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        background: 'rgba(12,12,16,0.97)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 10, backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 190,
      }}
    >
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
        Flow stress — <span style={{ color: '#9B9B9B', fontWeight: 400, textTransform: 'none' }}>{word}</span>
      </div>

      {/* Syllable scope selector */}
      {multiSyll && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setSelIdx(null)} style={{
            padding: '2px 7px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600, background: selIdx === null ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
            border: selIdx === null ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: selIdx === null ? '#F5C518' : '#9B9B9B',
          }}>All</button>
          {syllables.map((s, idx) => (
            <button key={idx} onClick={() => setSelIdx(idx)} style={{
              padding: '2px 7px', borderRadius: 5, cursor: 'pointer', fontSize: 11,
              fontFamily: 'DM Mono, DM Sans, monospace', fontWeight: 600,
              background: selIdx === idx ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
              border: selIdx === idx ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: selIdx === idx ? '#38BDF8' : '#9B9B9B',
            }}>{s.text || `syl${idx + 1}`}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={() => onSelect('yellow')} style={{
          flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer',
          background: current === 'yellow' ? 'rgba(245,197,24,0.2)' : 'rgba(245,197,24,0.07)',
          border: current === 'yellow' ? '1px solid #F5C518' : '1px solid rgba(245,197,24,0.3)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 800,
          color: '#F5C518', transition: 'all 100ms',
        }}>🟡 Pocket</button>
        <button onClick={() => onSelect('blue')} style={{
          flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer',
          background: current === 'blue' ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.07)',
          border: current === 'blue' ? '1px solid #38BDF8' : '1px solid rgba(56,189,248,0.3)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 800,
          color: '#38BDF8', transition: 'all 100ms',
        }}>🔵 Stress</button>
      </div>

      {current && (
        <button onClick={onClear} style={{
          padding: '5px 0', borderRadius: 7, cursor: 'pointer',
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#EF4444', transition: 'all 100ms',
        }}>Clear stress</button>
      )}
    </div>
  );
}

// ─── Flow chart ───────────────────────────────────────────────────────────────

const FLOW_STEPS = 16;
const FLOW_BEATS = new Set([0, 4, 8, 12]);

function getFlowLabel(n) {
  if (n === 0)  return { label: '—',         color: '#3A3A3A' };
  if (n <= 4)   return { label: 'Sparse',    color: '#9B9B9B' };
  if (n <= 6)   return { label: 'Laid Back', color: '#38BDF8' };
  if (n <= 10)  return { label: 'On Flow',   color: '#4ADE80' };
  if (n <= 12)  return { label: 'Dense',     color: '#F5C518' };
  if (n <= 14)  return { label: 'Fast',      color: '#F97316' };
  return               { label: 'Rapid',     color: '#EF4444' };
}

function estimateSyllablesSV(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let count = w.match(/[aeiou]+/g)?.length || 0;
  if (w.endsWith('e') && count > 1) count--;
  return Math.max(1, count);
}

function FlowChart({ lines, phraseIdx, onPrev, onNext, syllMap, beatListenerRef }) {
  const phrase    = lines[phraseIdx] || '';
  const syllCount = syllMap[phraseIdx] || 0;
  const { label, color } = getFlowLabel(syllCount);
  const [activeStep, setActiveStep] = useState(null);

  // Subscribe to metronome beats — map beat index to 16-step grid position
  useEffect(() => {
    if (!beatListenerRef) return;
    beatListenerRef.current = (beatIdx, pc) => {
      const step = Math.round(beatIdx * FLOW_STEPS / pc) % FLOW_STEPS;
      setActiveStep(step);
    };
    return () => { beatListenerRef.current = null; };
  }, [beatListenerRef]);

  // Fade active step after a short window
  useEffect(() => {
    if (activeStep === null) return;
    const t = setTimeout(() => setActiveStep(null), 180);
    return () => clearTimeout(t);
  }, [activeStep]);

  const occupied = new Set();
  for (let i = 0; i < syllCount; i++) {
    occupied.add(Math.min(FLOW_STEPS - 1,
      syllCount === 1 ? 0 : Math.round(i * (FLOW_STEPS - 1) / (syllCount - 1))
    ));
  }

  const navBtn = (disabled, onClick, icon) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      color: disabled ? '#2A2A2A' : '#9B9B9B', cursor: disabled ? 'default' : 'pointer',
    }}>{icon}</button>
  );

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) onNext();
    else onPrev();
  };

  return (
    <div
      onWheel={handleWheel}
      style={{ padding: '12px 18px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}
    >
      {/* Phrase selector + flow label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {navBtn(phraseIdx <= 0, onPrev, <ChevronLeft size={12} />)}
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
          Bar {phraseIdx + 1}
        </span>
        {navBtn(phraseIdx >= lines.length - 1, onNext, <ChevronRight size={12} />)}
        <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {phrase || <em style={{ opacity: 0.3 }}>empty</em>}
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{syllCount} syll</span>
        <span style={{
          fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 700, color,
          background: `${color}18`, border: `1px solid ${color}35`,
          padding: '2px 8px', borderRadius: 5, flexShrink: 0,
          transition: 'color 200ms, background 200ms, border-color 200ms',
        }}>{label}</span>
      </div>

      {/* Beat row — 4 rectangles, first is green, rest gold */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 5 }}>
        {[0, 4, 8, 12].map((step, i) => {
          const active = activeStep === step;
          const isOne  = i === 0;
          const base   = isOne ? '#4ADE80' : '#F5C518';
          return (
            <div key={i} style={{
              height: active ? 18 : 14, borderRadius: 4,
              background: active ? base : isOne ? 'rgba(74,222,128,0.18)' : 'rgba(245,197,24,0.18)',
              border: `1px solid ${active ? base : isOne ? 'rgba(74,222,128,0.45)' : 'rgba(245,197,24,0.45)'}`,
              boxShadow: active ? `0 0 14px ${base}bb` : `0 0 8px ${base}22`,
              transition: active ? 'all 50ms ease' : 'all 180ms ease',
              alignSelf: 'center',
            }} />
          );
        })}
      </div>

      {/* 16th note grid — circles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3, marginBottom: 5 }}>
        {Array.from({ length: FLOW_STEPS }, (_, i) => {
          const hit    = occupied.has(i);
          const beat   = FLOW_BEATS.has(i);
          const isOne  = i === 0;
          const active = activeStep === i;
          const beatColor = isOne ? '#4ADE80' : '#F5C518';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 14 }}>
              <div style={{
                width:  active ? 13 : hit ? 11 : 7,
                height: active ? 13 : hit ? 11 : 7,
                borderRadius: '50%',
                background: active
                  ? (beat ? beatColor : '#22D3EE')
                  : hit ? (beat ? `${beatColor}ee` : 'rgba(34,211,238,0.85)')
                       : (beat ? `${beatColor}1a` : 'rgba(34,211,238,0.1)'),
                border: `1px solid ${active
                  ? (beat ? beatColor : '#22D3EE')
                  : hit ? (beat ? beatColor : '#22D3EE')
                       : (beat ? `${beatColor}44` : 'rgba(34,211,238,0.2)')}`,
                boxShadow: active
                  ? `0 0 12px ${beat ? beatColor : '#22D3EE'}`
                  : hit ? `0 0 6px ${beat ? beatColor + '88' : '#22D3EE88'}` : 'none',
                transition: active ? 'all 50ms ease' : 'all 180ms ease',
              }} />
            </div>
          );
        })}
      </div>

      {/* Syllable block row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3, alignItems: 'flex-end', height: 26 }}>
        {Array.from({ length: FLOW_STEPS }, (_, i) => {
          const hit    = occupied.has(i);
          const beat   = FLOW_BEATS.has(i);
          const active = activeStep === i;
          return (
            <div key={i} style={{
              alignSelf: 'flex-end',
              height: active ? (beat ? 26 : 20) : hit ? (beat ? 22 : 15) : 4,
              borderRadius: 3,
              background: active
                ? (beat ? '#F5C518' : '#38BDF8')
                : hit ? (beat ? 'rgba(245,197,24,0.7)' : 'rgba(56,189,248,0.65)')
                      : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active
                ? (beat ? '#F5C518' : '#38BDF8')
                : hit ? (beat ? 'rgba(245,197,24,0.8)' : 'rgba(56,189,248,0.5)')
                      : 'rgba(255,255,255,0.05)'}`,
              boxShadow: active
                ? `0 0 10px ${beat ? '#F5C518aa' : '#38BDF8aa'}`
                : hit ? `0 0 5px ${beat ? '#F5C51844' : '#38BDF844'}` : 'none',
              transition: active ? 'all 50ms ease' : 'all 180ms ease',
            }} />
          );
        })}
      </div>
    </div>
  );
}

function LyricsEditor({ beatListenerRef }) {
  const { activeSection, dispatch, getColor, resetPalette } = useApp();
  const taRef = useRef(null);
  const timerRef = useRef(null);
  const bpmRef = useRef(activeSection.bpm);
  const [rawText, setRawText] = useState(() => activeSection.lines.join('\n'));
  const [activeLine, setActiveLine] = useState(0);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [correctMode, setCorrectMode] = useState(false);
  const [popover, setPopover] = useState(null); // {x, y, li, wi, word, syllables}
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef(null);
  // new toggles
  const [mapVisible, setMapVisible] = useState(true);
  const [autofillAssignments, setAutofillAssignments] = useState([]); // in-memory, reset on re-analyze
  const [autofilling, setAutofilling] = useState(false);
  const [syllMode, setSyllMode] = useState('off'); // 'off' | 'words' | 'bars'
  const [barMode, setBarMode] = useState(false);
  const [barSize, setBarSize] = useState(4); // lines per bar (1–16)
  const [barDropdownOpen, setBarDropdownOpen] = useState(false);
  const barDropdownRef = useRef(null);
  const [barBoundaries, setBarBoundaries] = useState(new Set()); // custom bar-end line indices
  const [flowMode, setFlowMode] = useState(false);
  const [flowPhraseIdx, setFlowPhraseIdx] = useState(0);
  const [stressMode, setStressMode] = useState(false);
  const [stressPopover, setStressPopover] = useState(null); // {x, y, li, wi, word}
  const { marks: stressMarks, setMark: setStressMark, clearMark: clearStressMark, clearAll: clearAllStress } = useStressMarks(activeSection.id);

  // ── Adlib mode ──────────────────────────────────────────────────────────────
  const [adlibMode, setAdlibMode] = useState(false);
  const [adlibLines, setAdlibLines] = useState(() => new Set()); // line indices marked as adlib
  // slot 33 = Mint Neon (#00E6A8) — visually distinct from rhyme palette, shuffles with resetPalette
  const [adlibColorSlot, setAdlibColorSlot] = useState(33);
  const adlibLinesRef = useRef(adlibLines);
  useEffect(() => { adlibLinesRef.current = adlibLines; }, [adlibLines]);

  // ── Collab mode ─────────────────────────────────────────────────────────────
  const [collabMode, setCollabMode] = useState(false);
  // Artists: colorId=null means Artist 1 (renders in white, default). colorId>=1 = palette slot.
  const [artists, setArtists] = useState([{ id: '1', name: 'Artist 1', colorId: null, adlibColorId: 29 }]);
  const [activeArtistId, setActiveArtistId] = useState('1');
  const [lineOwners, setLineOwners] = useState({}); // lineIdx → artistId; absent key = Artist 1
  // Collab artist management
  const [artistConfirm, setArtistConfirm] = useState(null); // { message, subtext, yesLabel, yesDanger, onYes }
  const [renamingArtistId, setRenamingArtistId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const draggedArtistRef = useRef(null);
  const [dragOverArtistId, setDragOverArtistId] = useState(null);
  const [artistColorPickerId, setArtistColorPickerId] = useState(null); // artistId with open color picker

  const { corrections, removeColor: removeCorrection, addColor: addCorrection, clearWord, clear: clearAllCorrections } = useCorrections(activeSection.id);

  useEffect(() => {
    if (!confirmClear) return;
    confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(confirmTimerRef.current);
  }, [confirmClear]);

  useEffect(() => {
    if (!barDropdownOpen) return;
    const handler = (e) => {
      if (barDropdownRef.current && !barDropdownRef.current.contains(e.target))
        setBarDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [barDropdownOpen]);

  const hasContent = rawText.trim().length > 0;

  useEffect(() => { bpmRef.current = activeSection.bpm; }, [activeSection.bpm]);
  useEffect(() => { setRawText(activeSection.lines.join('\n')); }, [activeSection.id]); // eslint-disable-line
  useEffect(() => { setCorrectMode(false); setPopover(null); setAutofillAssignments([]); setStressMode(false); setStressPopover(null); }, [activeSection.id]); // eslint-disable-line
  // Auto-analyze when a section has content but no analysis yet (e.g. restored from session)
  useEffect(() => {
    const ls = activeSection.lines.filter(l => l.trim());
    if (ls.length && !activeSection.analysis) runAnalyze(activeSection.lines);
  }, [activeSection.id]); // eslint-disable-line

  const lines = rawText.split('\n');

  const normalizedRhymeMap = useMemo(
    () => normalizeColorIds(activeSection.analysis?.rhyme_map),
    [activeSection.analysis]
  );

  const baseColorMap = useMemo(
    () => buildColorMap(normalizedRhymeMap),
    [normalizedRhymeMap]
  );

  // Pre-map stress from analysis: on_pocket → yellow (on beat), is_stressed → blue (off beat)
  // Manual stressMarks override this via merge in renderLine
  const derivedStressMap = useMemo(() => {
    const result = {};
    for (const e of normalizedRhymeMap) {
      if (!e.is_stressed && !e.on_pocket) continue;
      const key = `${e.line_index}_${e.word_index}`;
      if (e.on_pocket) result[key] = 'yellow';
      else if (!result[key]) result[key] = 'blue';
    }
    return result;
  }, [normalizedRhymeMap]);

  // Layer order: engine → autofill → manual corrections
  const autofillColorMap = useMemo(
    () => applyCorrections(baseColorMap, { removes: [], adds: autofillAssignments }),
    [baseColorMap, autofillAssignments]
  );

  const colorMap = useMemo(
    () => mapVisible ? applyCorrections(autofillColorMap, corrections) : {},
    [mapVisible, autofillColorMap, corrections]
  );

  // {color_id: [word, ...]} — sample words per family for popover suggestions
  const familySamples = useMemo(() => {
    const map = {};
    for (const e of normalizedRhymeMap) {
      if (!e.color_id) continue;
      if (!map[e.color_id]) map[e.color_id] = [];
      const w = e.word?.toLowerCase();
      if (w && !map[e.color_id].includes(w)) map[e.color_id].push(w);
    }
    return map;
  }, [normalizedRhymeMap]);

  // Syllable counts per (line, word) and per line
  const syllCounts = useMemo(() => {
    const m = {};
    for (const e of normalizedRhymeMap) {
      const k = `${e.line_index}_${e.word_index}`;
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [normalizedRhymeMap]);

  const lineSyllCounts = useMemo(() => {
    const m = {};
    for (const k in syllCounts) {
      const li = parseInt(k.split('_')[0]);
      m[li] = (m[li] || 0) + syllCounts[k];
    }
    return m;
  }, [syllCounts]);

  // Syllable counts for flow chart — falls back to estimator when API data absent
  const flowSyllCounts = useMemo(() => {
    if (Object.keys(syllCounts).length > 0) return lineSyllCounts;
    const m = {};
    lines.forEach((line, li) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      m[li] = words.reduce((sum, w) => sum + estimateSyllablesSV(w), 0);
    });
    return m;
  }, [lines, syllCounts, lineSyllCounts]);

  // Blank-line group detection — used for bar count + dividers when pasting formatted lyrics
  const blankGroupEnds = useMemo(() => {
    const s = new Set();
    lines.forEach((l, i) => {
      if (l.trim() && (!lines[i + 1] || !lines[i + 1].trim())) s.add(i);
    });
    return s;
  }, [lines]);

  const blankGroupCount = useMemo(() =>
    lines.reduce((acc, l, i) => l.trim() && (i === 0 || !lines[i - 1].trim()) ? acc + 1 : acc, 0),
  [lines]);

  const nonEmptyCount = useMemo(() => lines.filter(l => l.trim()).length, [lines]);

  const useBlankGroups = barBoundaries.size === 0 && blankGroupCount > 1 && blankGroupCount < nonEmptyCount;

  // Autofill: score every word (including function words) against existing families
  const runAutofill = useCallback(async (textLines) => {
    const families = Object.entries(familySamples).map(([cid, words]) => ({
      color_id: parseInt(cid), sample_words: words,
    }));
    if (!families.length) return;
    setAutofilling(true);
    const { data } = await autofillApi(textLines, families, 0.60);
    setAutofilling(false);
    if (!data?.assignments) return;
    // Apply to every word that got a confident match — no exclusions
    const newAssigns = data.assignments.map(a => ({
      li: a.line_index, wi: a.word_index, color_id: a.color_id,
    }));
    setAutofillAssignments(newAssigns);
  }, [familySamples]);

  const runAnalyze = useCallback(async (textLines) => {
    const bpm = bpmRef.current;
    if (!bpm || !textLines.filter(l => l.trim()).length) return;
    setLoading(true);
    setAutofillAssignments([]); // reset autofill on new analysis
    dispatch({ type: 'ANALYZE_START' });
    const { data, error } = await analyze(textLines, bpm);
    setLoading(false);
    if (data) {
      dispatch({ type: 'ANALYZE_SUCCESS', payload: data });
      if (activeSection.suggestMode === 'auto') {
        dispatch({ type: 'SUGGEST_START' });
        const { data: sd } = await suggest(textLines, bpm, 'auto');
        if (sd) dispatch({ type: 'SUGGEST_SUCCESS', payload: sd.suggestions });
        else dispatch({ type: 'SUGGEST_FAIL' });
      }
    } else {
      dispatch({ type: 'ANALYZE_FAIL' });
      if (error) dispatch({ type: 'SET_GLOBAL_ERROR', payload: error });
    }
  }, [activeSection.suggestMode, dispatch, runAutofill]);

  // Strip adlib lines before sending to the analysis engine (replaced with '' to preserve line indices)
  const toAnalysisLines = (ls) => adlibLinesRef.current.size > 0
    ? ls.map((l, i) => adlibLinesRef.current.has(i) ? '' : l)
    : ls;

  const schedule = (ls, delay) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runAnalyze(toAnalysisLines(ls)), delay);
  };

  const targetWordRef = useRef(null);

  // Extract the last completed word (word just before cursor, after a space/newline/punctuation)
  const extractLastWord = (text, pos) => {
    const before = text.substring(0, pos);
    const match = before.match(/([a-zA-Z']{2,})(?:\s|$)/);
    if (!match) return null;
    // Walk back to find the last word-end boundary
    const reversed = before.split('').reverse().join('');
    const wMatch = reversed.match(/^[\s\W]*([a-zA-Z']{2,})/);
    return wMatch ? wMatch[1].split('').reverse().join('').toLowerCase() : null;
  };

  const handleChange = (e) => {
    const text = e.target.value;
    const pos  = e.target.selectionStart ?? text.length;

    // Collab safety-net: revert if any other-artist line changed
    // (onKeyDown covers most cases; this catches IME, voice input, etc.)
    if (collabMode) {
      const newLines = text.split('\n');
      const oldLines = rawText.split('\n');
      if (newLines.length === oldLines.length) {
        for (let i = 0; i < newLines.length; i++) {
          const owner = lineOwners[i];
          if (owner && owner !== activeArtistId && newLines[i] !== oldLines[i]) {
            e.target.value = rawText; // suppress flicker before React re-render
            return;
          }
        }
      }
    }

    setRawText(text);
    const ls = text.split('\n');
    dispatch({ type: 'SET_SECTION_LINES', payload: ls });
    schedule(ls, 180);

    // Detect last completed word (just typed a space or newline after a word)
    const lastChar = text[pos - 1];
    if (lastChar === ' ' || lastChar === '\n') {
      const word = extractLastWord(text, pos);
      if (word && word !== targetWordRef.current) {
        targetWordRef.current = word;
        dispatch({ type: 'SET_TARGET_WORD', payload: word });
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') schedule(rawText.split('\n'), 100);

    // ── Collab artist isolation ──────────────────────────────────────────────
    // Block any keypress that would modify a line owned by another artist.
    if (collabMode) {
      const isModifying =
        (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        e.key === 'Backspace' || e.key === 'Delete' ||
        e.key === 'Enter'     || e.key === 'Tab';
      if (!isModifying) return;

      const ta = e.target;
      const { selectionStart: s, selectionEnd: sel, value: v } = ta;
      const lineAt = pos => v.substring(0, pos).split('\n').length - 1;
      const startLine = lineAt(s);
      const endLine   = lineAt(sel);

      const isProtected = i => {
        const owner = lineOwners[i];
        return owner && owner !== activeArtistId;
      };

      // Check all lines the selection spans
      for (let i = startLine; i <= endLine; i++) {
        if (isProtected(i)) { e.preventDefault(); return; }
      }

      // Backspace with no selection at the start of a line merges with the line above
      if (e.key === 'Backspace' && s === sel) {
        const col = s - v.lastIndexOf('\n', s - 1) - 1; // chars before cursor on current line
        if (col === 0 && isProtected(startLine - 1)) { e.preventDefault(); return; }
        if (col === 0 && isProtected(startLine))     { e.preventDefault(); return; }
      }

      // Delete with no selection at the end of a line merges with the line below
      if (e.key === 'Delete' && s === sel) {
        const nextNL = v.indexOf('\n', s);
        if (nextNL === s || nextNL < 0 && s === v.length) {
          if (isProtected(startLine + 1)) { e.preventDefault(); return; }
        }
      }
    }
  };

  const updateActiveLine = () => {
    const ta = taRef.current;
    if (!ta) return;
    setActiveLine(ta.value.substring(0, ta.selectionStart).split('\n').length - 1);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
      borderRadius: 16,
      border: focused
        ? '1px solid rgba(255,255,255,0.9)'
        : hasContent ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.18)',
      transition: 'border 400ms ease',
    }}>
      {/* Glass fill — framer-motion animates opacity so it works inside any stacking context */}
      <motion.div
        animate={{ opacity: hasContent ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,15,20,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: 16,
        }}
      />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Editor header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        {/* Left: label + Adlib + Collab toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Lyrics
          </span>
          {/* Adlib toggle */}
          <button
            onClick={() => setAdlibMode(m => !m)}
            title={adlibMode ? 'Exit adlib mode' : 'Adlib mode — mark lines as adlib (excluded from analysis)'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 5,
              background: adlibMode ? `${getColor(adlibColorSlot).bg}22` : 'rgba(255,255,255,0.04)',
              border: adlibMode ? `1px solid ${getColor(adlibColorSlot).bg}66` : '1px solid rgba(255,255,255,0.08)',
              color: adlibMode ? getColor(adlibColorSlot).bg : 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
              transition: 'all 150ms',
            }}
          >
            <Mic2 size={9} />
            Adlib
          </button>
          {/* Collab toggle */}
          <button
            onClick={() => setCollabMode(m => !m)}
            title={collabMode ? 'Exit collab mode' : 'Collab mode — multiple artists on one track'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 5,
              background: collabMode ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)',
              border: collabMode ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: collabMode ? '#38BDF8' : 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
              transition: 'all 150ms',
            }}
          >
            <Users size={9} />
            Collab
            {collabMode && (() => {
              const a = artists.find(a => a.id === activeArtistId);
              return a ? <span style={{ opacity: 0.7, fontWeight: 400 }}>· {a.name}</span> : null;
            })()}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#F5C518' }}
            >
              <Sparkles size={11} />
              Analyzing…
            </motion.div>
          )}
          {/* Lines / Bars merged control */}
          {lines.length > 0 && (() => {
            // barCount: custom boundaries take priority, else divide total lines by barSize
            const barCount = barBoundaries.size > 0
              ? barBoundaries.size + 1
              : Math.ceil(lines.length / barSize);
            return (
              <div ref={barDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={() => setBarMode(m => !m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: barDropdownOpen ? '6px 0 0 6px' : 6,
                    background: barMode ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.05)',
                    border: barMode ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.1)',
                    borderRight: barDropdownOpen ? 'none' : undefined,
                    color: barMode ? '#F5C518' : '#FFFFFF',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                >
                  {barMode ? `${barCount} bars` : `${lines.length} lines`}
                </button>
                <button
                  onClick={() => setBarDropdownOpen(o => !o)}
                  title="Set bar size (lines per bar)"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '3px 5px', borderRadius: barDropdownOpen ? '0 6px 6px 0' : '0 6px 6px 0',
                    background: barDropdownOpen ? 'rgba(245,197,24,0.2)' : barMode ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
                    border: barMode ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.1)',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    color: barMode ? '#F5C518' : '#5A5A5A',
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                >
                  <ChevronRight size={9} style={{ transform: barDropdownOpen ? 'rotate(270deg)' : 'rotate(90deg)', transition: 'transform 150ms' }} />
                </button>
                {barDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 500,
                    background: 'rgba(14,14,14,0.97)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: 10, backdropFilter: 'blur(40px)',
                    padding: 8, minWidth: 120,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                  }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Lines per bar
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                      {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => {
                          setBarSize(n);
                          setBarBoundaries(new Set()); // structured selection — clear custom
                          setBarDropdownOpen(false);
                          if (!barMode) setBarMode(true);
                        }}
                          style={{
                            padding: '4px 0', borderRadius: 5, textAlign: 'center',
                            background: barSize === n && barBoundaries.size === 0 ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
                            border: barSize === n && barBoundaries.size === 0 ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            color: barSize === n && barBoundaries.size === 0 ? '#F5C518' : '#9B9B9B',
                            fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >{n}</button>
                      ))}
                    </div>
                    {barBoundaries.size > 0 && (
                      <>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0 6px' }} />
                        <button
                          onClick={() => { setBarBoundaries(new Set()); setBarDropdownOpen(false); }}
                          style={{
                            width: '100%', padding: '5px 0', borderRadius: 6, textAlign: 'center',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#EF4444', cursor: 'pointer',
                            fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                          }}
                        >Clear custom bars</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Correct mode toggle — greyed + disabled in syllable mode, hidden in flow mode */}
          {activeSection.analysis && !flowMode && (
            <button
              onClick={() => { if (syllMode !== 'off') return; setCorrectMode(m => !m); setPopover(null); }}
              title={syllMode !== 'off' ? 'Exit syllable mode to use corrections' : correctMode ? 'Exit correction mode' : 'Click words to adjust rhyme colors'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                background: correctMode ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
                border: correctMode ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: correctMode ? '#F5C518' : syllMode !== 'off' ? '#3A3A3A' : '#9B9B9B',
                cursor: syllMode !== 'off' ? 'not-allowed' : 'pointer',
                opacity: syllMode !== 'off' ? 0.4 : 1,
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms',
              }}
            >
              <Pencil size={10} />
              {correctMode ? 'Done' : 'Correct'}
            </button>
          )}
          {/* Flow annotation button — pencil activates word marking in flow mode */}
          {flowMode && (
            <button
              onClick={() => { setStressMode(m => !m); setStressPopover(null); setCorrectMode(false); }}
              title={stressMode ? 'Exit annotation mode' : 'Click words to annotate flow'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                background: stressMode ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                border: stressMode ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: stressMode ? '#4ADE80' : '#9B9B9B', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms',
              }}
            >
              <Pencil size={10} />
              {stressMode ? 'Done' : 'Correct'}
            </button>
          )}
          {/* Clear corrections — 2-step confirm */}
          {(corrections.removes.length > 0 || corrections.adds.length > 0) && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              title="Clear all manual corrections"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
              }}
            >
              <X size={10} />
              {corrections.removes.length + corrections.adds.length}
            </button>
          )}
          {confirmClear && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#EF4444' }}>
                Remove {corrections.removes.length + corrections.adds.length} correction{corrections.removes.length + corrections.adds.length !== 1 ? 's' : ''}?
              </span>
              <button
                onClick={() => { clearAllCorrections(); setConfirmClear(false); }}
                style={{
                  padding: '2px 7px', borderRadius: 5,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                  color: '#EF4444', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                }}
              >Yes</button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{
                  padding: '2px 6px', borderRadius: 5,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#6B6B6B', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 10,
                }}
              >No</button>
            </div>
          )}
          {/* Map toggle — mutually exclusive with Flow */}
          <button
            onClick={() => {
              if (flowMode) {
                // Switching from Flow → Map
                setFlowMode(false);
                setStressMode(false);
                setStressPopover(null);
                setMapVisible(true);
              } else {
                // Toggle Map on/off while Flow is already off
                setMapVisible(v => !v);
              }
            }}
            title={mapVisible && !flowMode ? 'Hide rhyme map' : 'Show rhyme map'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6,
              background: mapVisible && !flowMode ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
              border: mapVisible && !flowMode ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.1)',
              color: mapVisible && !flowMode ? '#4ADE80' : '#4A4A4A', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
              transition: 'all 120ms',
            }}
          >Map</button>
          {/* Flow toggle — mutually exclusive with Map */}
          <button
            onClick={() => {
              if (flowMode) {
                // Flow is on → turn it off, restore rhyme map
                setFlowMode(false);
                setStressMode(false);
                setStressPopover(null);
                setMapVisible(true);
              } else {
                // Switching from Map (or off) → Flow
                setFlowMode(true);
                setMapVisible(false);
                setCorrectMode(false);
                setPopover(null);
                const last = lines.reduce((acc, l, i) => (l.trim() ? i : acc), 0);
                setFlowPhraseIdx(last);
              }
            }}
            title={flowMode ? 'Exit flow map' : 'Show flow map'}
            style={{
              padding: '3px 8px', borderRadius: 6,
              background: flowMode ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.05)',
              border: flowMode ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: flowMode ? '#F5C518' : '#9B9B9B', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
              transition: 'all 120ms',
            }}
          >Flow</button>
          {/* Syllable count mode toggle */}
          {activeSection.analysis && (
            <button
              onClick={() => setSyllMode(m => m === 'off' ? 'words' : m === 'words' ? 'bars' : 'off')}
              title={`Syllable count: ${syllMode} — click to cycle`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                background: syllMode !== 'off' ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.05)',
                border: syllMode !== 'off' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: syllMode !== 'off' ? '#38BDF8' : '#4A4A4A', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms',
              }}
            >Syll{syllMode !== 'off' ? `: ${syllMode}` : ''}</button>
          )}
          {/* Colors regenerate — far right; also shuffles adlib color */}
          <button
            onClick={() => {
              resetPalette();
              // Rotate adlib slot so its color shifts too
              setAdlibColorSlot(s => (s % 44) + 1);
            }}
            title="Regenerate colors — shuffles rhyme palette and adlib color"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6, marginLeft: 'auto',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#9B9B9B', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
              transition: 'color 120ms, border-color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9B9B9B'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <RotateCcw size={10} />
            Colors
          </button>
        </div>
      </div>

      {/* Correction mode hint bar */}
      {correctMode && (
        <div style={{
          padding: '5px 16px', borderBottom: '1px solid rgba(245,197,24,0.15)',
          background: 'rgba(245,197,24,0.05)', flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#F5C518',
        }}>
          Click any word to assign or remove its rhyme color
        </div>
      )}
      {/* Adlib mode hint bar */}
      {adlibMode && (
        <div style={{
          padding: '5px 16px', borderBottom: `1px solid ${getColor(adlibColorSlot).bg}33`,
          background: `${getColor(adlibColorSlot).bg}0d`, flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: getColor(adlibColorSlot).bg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Click a line number to mark/unmark it as adlib — adlibs are excluded from analysis</span>
          <button onClick={() => setAdlibMode(false)} style={{ background: 'none', border: 'none', color: getColor(adlibColorSlot).bg, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, padding: 0 }}>Done</button>
        </div>
      )}
      {/* Collab mode artist bar */}
      {artistConfirm && (
        <ConfirmDialog
          message={artistConfirm.message}
          subtext={artistConfirm.subtext}
          yesLabel={artistConfirm.yesLabel}
          yesDanger={artistConfirm.yesDanger}
          onYes={() => { artistConfirm.onYes(); setArtistConfirm(null); }}
          onNo={() => setArtistConfirm(null)}
        />
      )}
      {collabMode && (
        <div style={{
          padding: '6px 16px', borderBottom: '1px solid rgba(56,189,248,0.15)',
          background: 'rgba(56,189,248,0.05)', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          {artists.map((artist) => {
            const isActive = artist.id === activeArtistId;
            const lyricColor = artist.colorId ? getColor(artist.colorId).bg : '#FFFFFF';
            const isDragOver = dragOverArtistId === artist.id;
            const isRenaming = renamingArtistId === artist.id;
            return (
              <div key={artist.id}
                draggable
                onDragStart={() => { draggedArtistRef.current = artist.id; }}
                onDragOver={e => { e.preventDefault(); setDragOverArtistId(artist.id); }}
                onDragLeave={() => setDragOverArtistId(null)}
                onDrop={e => {
                  e.preventDefault();
                  if (draggedArtistRef.current && draggedArtistRef.current !== artist.id) {
                    setArtists(prev => {
                      const from = prev.findIndex(a => a.id === draggedArtistRef.current);
                      const to = prev.findIndex(a => a.id === artist.id);
                      if (from < 0 || to < 0) return prev;
                      const next = [...prev];
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return next;
                    });
                  }
                  draggedArtistRef.current = null;
                  setDragOverArtistId(null);
                }}
                onDragEnd={() => { draggedArtistRef.current = null; setDragOverArtistId(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  borderRadius: 5, cursor: 'grab',
                  background: isActive ? `${lyricColor}18` : isDragOver ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: isDragOver ? `1px solid ${lyricColor}88` : isActive ? `1px solid ${lyricColor}66` : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 120ms',
                }}
              >
                {/* Color dot + name — dot click = open color picker, name click = select artist, double-click = rename */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px 3px 6px', position: 'relative' }}>
                  {/* Color dot — opens picker */}
                  <button
                    onClick={e => { e.stopPropagation(); setArtistColorPickerId(p => p === artist.id ? null : artist.id); }}
                    title="Change artist color"
                    style={{
                      width: 10, height: 10, borderRadius: '50%', background: lyricColor, flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0,
                    }}
                  />
                  {/* Artist color picker dropdown */}
                  {artistColorPickerId === artist.id && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 500,
                      background: 'rgba(14,14,18,0.98)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, padding: '8px 10px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.8)', width: 196,
                    }}>
                      <ColorSwatchGrid
                        currentColor={artist.colorId ?? 0}
                        getColor={getColor}
                        onPick={slot => {
                          setArtists(prev => prev.map(a => a.id === artist.id ? { ...a, colorId: slot === 0 ? 0 : slot } : a));
                          setArtistColorPickerId(null);
                        }}
                        label="Artist Color"
                      />
                    </div>
                  )}
                <button
                  onClick={() => setActiveArtistId(artist.id)}
                  onDoubleClick={() => { setRenamingArtistId(artist.id); setRenameInput(artist.name); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: isActive ? lyricColor : 'rgba(255,255,255,0.4)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameInput}
                      onChange={e => setRenameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newName = renameInput.trim();
                          if (newName && newName !== artist.name) {
                            setArtistConfirm({
                              message: `Rename "${artist.name}" to "${newName}"?`,
                              yesLabel: 'Rename',
                              onYes: () => {
                                setArtists(prev => prev.map(a => a.id === artist.id ? { ...a, name: newName } : a));
                                setRenamingArtistId(null);
                              },
                            });
                          } else {
                            setRenamingArtistId(null);
                          }
                        }
                        if (e.key === 'Escape') setRenamingArtistId(null);
                      }}
                      onBlur={() => {
                        const newName = renameInput.trim();
                        if (newName && newName !== artist.name) {
                          setArtistConfirm({
                            message: `Rename "${artist.name}" to "${newName}"?`,
                            yesLabel: 'Rename',
                            onYes: () => {
                              setArtists(prev => prev.map(a => a.id === artist.id ? { ...a, name: newName } : a));
                              setRenamingArtistId(null);
                            },
                          });
                        } else {
                          setRenamingArtistId(null);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 4, padding: '1px 6px', color: '#FFFFFF',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 11, width: 80, outline: 'none',
                      }}
                    />
                  ) : (
                    <span title="Double-click to rename">{artist.name}</span>
                  )}
                </button>
                </div>{/* end color-dot + name wrapper */}
                {/* Delete × — only if 2+ artists */}
                {artists.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setArtistConfirm({
                        message: `Delete "${artist.name}"?`,
                        subtext: 'This will remove all lyrics attributed to this artist.',
                        yesLabel: 'Delete',
                        yesDanger: true,
                        onYes: () => {
                          // Remove artist and their line ownership
                          setArtists(prev => prev.filter(a => a.id !== artist.id));
                          setLineOwners(prev => {
                            const next = { ...prev };
                            Object.keys(next).forEach(k => { if (next[k] === artist.id) delete next[k]; });
                            return next;
                          });
                          if (activeArtistId === artist.id) {
                            const remaining = artists.filter(a => a.id !== artist.id);
                            setActiveArtistId(remaining[0]?.id || '1');
                          }
                        },
                      });
                    }}
                    style={{
                      width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.25)', fontSize: 13, lineHeight: 1,
                      marginRight: 4, borderRadius: 3, flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                    title={`Delete ${artist.name}`}
                  >×</button>
                )}
              </div>
            );
          })}
          {/* Add artist button */}
          <button
            onClick={() => {
              const nextId = String(Date.now());
              const nextNum = artists.length + 1;
              const nextColorId = (artists.length % 44) + 1;
              const nextAdlibColorId = ((artists.length + 10) % 44) + 1;
              const newArtist = { id: nextId, name: `Artist ${nextNum}`, colorId: nextColorId, adlibColorId: nextAdlibColorId };
              setArtists(prev => [...prev, newArtist]);
              setActiveArtistId(nextId);
            }}
            title="Add another artist"
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.04),rgba(255,255,255,0.04)), linear-gradient(135deg,#FF4F5E,#F5C518,#4ADE80,#38BDF8,#9B59B6)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              border: '1px solid transparent',
            }}
          >
            <span style={{ background: 'linear-gradient(135deg,#FF4F5E,#F5C518,#4ADE80,#38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Artist</span>
          </button>
          <button onClick={() => setCollabMode(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(56,189,248,0.6)', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, padding: 0 }}>Done</button>
        </div>
      )}

      {/* Mirror + textarea grid */}
      <div style={{ flex: 1, display: 'flex', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Line numbers — same scroll parent, grows with content */}
        <div style={{ width: 40, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', padding: '16px 0', alignSelf: 'flex-start', minHeight: '100%' }}>
          {lines.map((_, i) => {
            const isBarEnd = barMode && (
              barBoundaries.size > 0 ? barBoundaries.has(i) :
              useBlankGroups ? blankGroupEnds.has(i) :
              (i + 1) % barSize === 0
            );
            const isCustomBoundary = barBoundaries.has(i);
            return (
              <div key={i}
                onClick={() => {
                  if (flowMode) {
                    setFlowPhraseIdx(i);
                  } else if (adlibMode) {
                    setAdlibLines(prev => {
                      const n = new Set(prev);
                      n.has(i) ? n.delete(i) : n.add(i);
                      return n;
                    });
                  } else if (collabMode) {
                    setLineOwners(prev => ({ ...prev, [i]: activeArtistId }));
                  } else if (barMode) {
                    setBarBoundaries(prev => {
                      const n = new Set(prev);
                      n.has(i) ? n.delete(i) : n.add(i);
                      return n;
                    });
                  }
                }}
                style={{
                  height: LINE_HEIGHT_PX,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 10,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                  color: flowMode && i === flowPhraseIdx ? '#38BDF8'
                       : adlibMode && adlibLines.has(i) ? getColor(adlibColorSlot).bg
                       : collabMode && lineOwners[i] ? (() => { const a = artists.find(a => a.id === lineOwners[i]); return a?.colorId ? getColor(a.colorId).bg : '#9B9B9B'; })()
                       : isCustomBoundary ? '#F5C518'
                       : i === activeLine ? '#F5C518'
                       : isBarEnd ? 'rgba(245,197,24,0.4)'
                       : '#2E2E2E',
                  transition: 'color 150ms',
                  userSelect: 'none',
                  cursor: (flowMode || adlibMode || collabMode || barMode) ? 'pointer' : 'default',
                }}>
                {i + 1}
              </div>
            );
          })}
        </div>

        {/* Editor area — mirror sets height, textarea overlays it absolutely */}
        <div style={{ flex: 1, position: 'relative', alignSelf: 'flex-start', minWidth: 0 }}>
          {!rawText && (
            <div style={{
              position: 'absolute', top: 0, left: 0,
              padding: TEXT_PADDING,
              fontFamily: FONT_FAMILY, fontSize: FONT_SIZE_PX, lineHeight: LINE_HEIGHT,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', wordWrap: 'break-word',
              color: '#2E2E2E', pointerEvents: 'none', userSelect: 'none',
              zIndex: 0,
            }}>
              Start writing your verse…
            </div>
          )}
          {/* Mirror — sets the natural height of the container, renders highlights */}
          <div style={{
            padding: TEXT_PADDING,
            fontFamily: FONT_FAMILY, fontSize: FONT_SIZE_PX, lineHeight: LINE_HEIGHT,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', wordWrap: 'break-word',
            letterSpacing: 'normal',
            color: '#FFFFFF',
            pointerEvents: (correctMode || stressMode) ? 'auto' : 'none',
            cursor: (correctMode || stressMode) ? 'default' : undefined,
            zIndex: (correctMode || stressMode) ? 3 : 1,
            position: 'relative',
          }}>
            {lines.map((line, i) => {
              const getSyllCount = syllMode === 'words'
                ? (wi) => syllCounts[`${i}_${wi}`] || null
                : null;
              const lineSyllTotal = lineSyllCounts[i];
              const isBarBoundary = barMode && (
                barBoundaries.size > 0 ? barBoundaries.has(i) :
                useBlankGroups ? blankGroupEnds.has(i) :
                (i + 1) % barSize === 0
              );
              const isAdlibLine = adlibLines.has(i);
              const lineOwnerId = lineOwners[i];
              const lineOwnerArtist = lineOwnerId ? artists.find(a => a.id === lineOwnerId) : null;
              const lineOwnerColor = lineOwnerArtist?.colorId ? getColor(lineOwnerArtist.colorId).bg : null;
              return (
                <div key={i}>
                  <div style={{
                    minHeight: LINE_HEIGHT_PX,
                    background: isAdlibLine
                      ? `${getColor(adlibColorSlot).bg}18`
                      : lineOwnerColor
                      ? `${lineOwnerColor}14`
                      : i === activeLine && !correctMode ? 'rgba(245,197,24,0.03)' : 'transparent',
                    boxShadow: isAdlibLine ? `inset 3px 0 0 ${getColor(adlibColorSlot).bg}66`
                      : lineOwnerColor ? `inset 3px 0 0 ${lineOwnerColor}55` : 'none',
                    borderRadius: 3, transition: 'background 100ms',
                    opacity: isAdlibLine ? 0.7 : 1,
                    fontStyle: isAdlibLine ? 'italic' : 'normal',
                  }}>
                    {renderLine(line, i, isAdlibLine ? {} : (flowMode ? {} : colorMap), getColor, (!stressMode && !flowMode && correctMode && !isAdlibLine) ? (e, li, wi, colorId) => {
                      e.stopPropagation();
                      const wordTokens = line.split(/(\s+)/).filter(t => !/^\s+$/.test(t) && t !== '');
                      const rawWord = wordTokens[wi] || '';
                      const leadOffset = rawWord.search(/[a-zA-Z']/);
                      const lastLetterIdx = rawWord.split('').reduce((acc, ch, idx) => /[a-zA-Z']/.test(ch) ? idx : acc, -1);
                      const word = leadOffset >= 0 ? rawWord.slice(leadOffset, lastLetterIdx + 1) : rawWord;

                      const wordSylls = normalizedRhymeMap
                        .filter(r => r.line_index === li && r.word_index === wi)
                        .sort((a, b) => (a.char_start ?? 0) - (b.char_start ?? 0));

                      // Total syllables from syll-count analysis — guarantees multi-tab scope
                      const totalSyllCount = syllCounts[`${li}_${wi}`] || wordSylls.length || 1;

                      let syllables;
                      if (wordSylls.length >= totalSyllCount && wordSylls.length > 0) {
                        // Exact syllable boundaries from analysis
                        syllables = wordSylls.map(r => ({
                          char_start: r.char_start ?? 0,
                          char_end:   r.char_end   ?? word.length,
                          color_id:   colorMap[li]?.[wi]?.find(e =>
                            e.char_start === (r.char_start ?? 0))?.color_id ?? null,
                          text: word.slice(r.char_start ?? 0, r.char_end ?? word.length) || word,
                        }));
                      } else if (totalSyllCount > 1) {
                        // Split word proportionally into N syllable slots
                        const step = Math.ceil(word.length / totalSyllCount);
                        syllables = Array.from({ length: totalSyllCount }, (_, idx) => {
                          const cs = idx * step;
                          const ce = Math.min((idx + 1) * step, word.length);
                          // Match an existing rhymeMap entry to this range if possible
                          const rm = wordSylls.find(r =>
                            (r.char_start ?? 0) >= cs - 1 && (r.char_start ?? 0) < ce + 1
                          );
                          const rmColor = rm
                            ? colorMap[li]?.[wi]?.find(e => e.char_start === (rm.char_start ?? 0))?.color_id ?? null
                            : null;
                          return {
                            char_start: cs,
                            char_end: ce,
                            color_id: rmColor ?? (wordSylls.length === 0 && idx === 0 ? colorId : null),
                            text: word.slice(cs, ce) || word,
                          };
                        });
                      } else {
                        syllables = [{ char_start: null, char_end: null, color_id: colorId, text: word }];
                      }

                      setPopover({ x: e.clientX, y: e.clientY, li, wi, word, syllables });
                      // Do not dispatch SET_TARGET_WORD here — correction clicks
                      // should not hijack the suggestions panel or trigger a fetch.
                    } : null, getSyllCount,
                    // Stress map only active in flow mode — keeps rhyme map and flow map visually separate
                    flowMode ? Object.fromEntries(
                      Object.entries({ ...derivedStressMap, ...stressMarks })
                        .filter(([k]) => k.startsWith(`${i}_`))
                        .map(([k, v]) => [parseInt(k.split('_')[1], 10), v])
                    ) : {},
                    // Stress click: only active when flowMode + stressMode — lets user override per-word
                    (flowMode && stressMode) ? (e, li, wi) => {
                      const wordTokens = line.split(/(\s+)/).filter(t => !/^\s+$/.test(t) && t !== '');
                      const rawWord = wordTokens[wi] || '';
                      // Build syllable list so popover can offer syllable-level scope
                      const wordSylls = normalizedRhymeMap
                        .filter(r => r.line_index === li && r.word_index === wi)
                        .sort((a, b) => (a.char_start ?? 0) - (b.char_start ?? 0));
                      const totalSyllCount = syllCounts[`${li}_${wi}`] || wordSylls.length || 1;
                      const leadOffset = rawWord.search(/[a-zA-Z']/);
                      const lastLetterIdx = rawWord.split('').reduce((acc, ch, idx) => /[a-zA-Z']/.test(ch) ? idx : acc, -1);
                      const cleanWord = leadOffset >= 0 ? rawWord.slice(leadOffset, lastLetterIdx + 1) : rawWord;
                      let syllables;
                      if (wordSylls.length >= totalSyllCount && wordSylls.length > 0) {
                        syllables = wordSylls.map(r => ({
                          char_start: r.char_start ?? 0, char_end: r.char_end ?? cleanWord.length,
                          text: cleanWord.slice(r.char_start ?? 0, r.char_end ?? cleanWord.length) || cleanWord,
                          stressColor: stressMarks[`${li}_${wi}`] || derivedStressMap[`${li}_${wi}`] || null,
                        }));
                      } else if (totalSyllCount > 1) {
                        const step = Math.ceil(cleanWord.length / totalSyllCount);
                        syllables = Array.from({ length: totalSyllCount }, (_, idx) => ({
                          char_start: idx * step,
                          char_end: Math.min((idx + 1) * step, cleanWord.length),
                          text: cleanWord.slice(idx * step, Math.min((idx + 1) * step, cleanWord.length)) || cleanWord,
                          stressColor: stressMarks[`${li}_${wi}`] || derivedStressMap[`${li}_${wi}`] || null,
                        }));
                      } else {
                        syllables = [{ char_start: null, char_end: null, text: cleanWord,
                          stressColor: stressMarks[`${li}_${wi}`] || derivedStressMap[`${li}_${wi}`] || null }];
                      }
                      setStressPopover({ x: e.clientX, y: e.clientY, li, wi, word: cleanWord, syllables });
                    } : null
                    )}
                    {syllMode === 'bars' && lineSyllTotal > 0 && (
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: 10,
                        color: 'rgba(56,189,248,0.5)',
                        userSelect: 'none', marginLeft: 6,
                      }}>{lineSyllTotal}</span>
                    )}
                    {'\u200B'}
                  </div>
                  {isBarBoundary && (
                    <div style={{ height: 1, background: 'rgba(245,197,24,0.3)', margin: '2px -20px' }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Textarea — absolutely overlays the mirror exactly */}
          <textarea
            ref={taRef}
            value={rawText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveLine}
            onClick={updateActiveLine}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={e => {
              if (!collabMode) return;
              // Block paste into a protected line
              const ta = e.target;
              const { selectionStart: s, selectionEnd: end, value: v } = ta;
              const lineAt = pos => v.substring(0, pos).split('\n').length - 1;
              for (let i = lineAt(s); i <= lineAt(end); i++) {
                const owner = lineOwners[i];
                if (owner && owner !== activeArtistId) { e.preventDefault(); return; }
              }
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            style={{
              position: 'absolute', inset: 0,
              padding: TEXT_PADDING,
              fontFamily: FONT_FAMILY, fontSize: FONT_SIZE_PX, lineHeight: LINE_HEIGHT,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', wordWrap: 'break-word',
              letterSpacing: 'normal',
              color: 'transparent', caretColor: '#F5C518',
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', overflow: 'hidden', zIndex: 2,
              width: '100%', height: '100%', boxSizing: 'border-box',
              pointerEvents: (correctMode || stressMode) ? 'none' : 'auto',
            }}
          />
        </div>
      </div>

      {/* Flow chart panel */}
      <AnimatePresence>
        {flowMode && (
          <motion.div
            key="flowchart"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <FlowChart
              lines={lines}
              phraseIdx={flowPhraseIdx}
              syllMap={flowSyllCounts}
              beatListenerRef={beatListenerRef}
              onPrev={() => {
                let i = flowPhraseIdx - 1;
                while (i >= 0 && !lines[i]?.trim()) i--;
                if (i >= 0) setFlowPhraseIdx(i);
              }}
              onNext={() => {
                let i = flowPhraseIdx + 1;
                while (i < lines.length && !lines[i]?.trim()) i++;
                if (i < lines.length) setFlowPhraseIdx(i);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correction popover */}
      {popover && (() => {
        const { x, y, li, wi, word, syllables } = popover;
        // Gather existing color families for the picker
        const existingFamilies = [...new Set(
          Object.values(colorMap).flatMap(row => Object.values(row).flatMap(s => s.map(e => e.color_id)))
        )].sort((a, b) => a - b);
        return (
          <CorrectionPopover
            x={x} y={y}
            syllables={syllables}
            word={popover.word}
            colorFamilies={existingFamilies}
            familySamples={familySamples}
            getColor={getColor}
            onRemove={(charStart) => {
              const dominant = syllables.find(s => s.color_id)?.color_id || 0;
              removeCorrection(li, wi, word, dominant, charStart);
              setPopover(null);
            }}
            onAdd={(cid, charStart, charEnd) => {
              addCorrection(li, wi, cid, word, charStart, charEnd);
              setPopover(null);
            }}
            onRestore={(charStart) => {
              const hasCorrection = charStart != null
                ? corrections.removes.some(r => r.li === li && r.wi === wi && r.char_start === charStart) ||
                  corrections.adds.some(a => a.li === li && a.wi === wi && a.char_start === charStart)
                : corrections.removes.some(r => r.li === li && r.wi === wi && r.char_start == null) ||
                  corrections.adds.some(a => a.li === li && a.wi === wi && a.char_start == null);
              if (hasCorrection) { clearWord(li, wi, charStart); setPopover(null); }
            }}
            onClose={() => setPopover(null)}
          />
        );
      })()}
      {/* Stress popover */}
      {stressPopover && (
        <StressPopover
          x={stressPopover.x}
          y={stressPopover.y}
          word={stressPopover.word}
          syllables={stressPopover.syllables || null}
          current={stressMarks[`${stressPopover.li}_${stressPopover.wi}`] || null}
          onSelect={(color) => {
            setStressMark(stressPopover.li, stressPopover.wi, color);
            setStressPopover(null);
          }}
          onClear={() => {
            clearStressMark(stressPopover.li, stressPopover.wi);
            setStressPopover(null);
          }}
          onClose={() => setStressPopover(null)}
        />
      )}
      </div>{/* end inner content wrapper */}
    </div>
  );
}

// ─── Craft scoring system ─────────────────────────────────────────────────────
//
// Philosophy: This chart reflects control and stylistic behavior, not artistic worth.
// A high score signals more evidence of intentionality, consistency, or layering.
// A lower score signals looser, simpler, or more raw writing in that dimension.
// Neither end of any axis is superior — they represent different craft positions.
//
// Spectrum language:  Loose ↔ Controlled  |  Raw ↔ Refined
//                     Freeform ↔ Intentional  |  Emergent ↔ Mastered

// ── Axis definitions ──────────────────────────────────────────────────────────
const CRAFT_AXES = [
  {
    key: 'cadenceControl', label: 'Cadence', fullLabel: 'Cadence Control',
    color: '#F5C518',
    tooltip: 'Measures how consistently your rhythm pattern reinforces itself across lines.',
    spectrumLow: 'Freeform', spectrumHigh: 'Locked',
  },
  {
    key: 'rhymeComplexity', label: 'Rhyme', fullLabel: 'Rhyme Complexity',
    color: '#C084FC',
    tooltip: 'Reflects how layered and varied your rhyme behavior is across the section.',
    spectrumLow: 'Simple', spectrumHigh: 'Intricate',
  },
  {
    key: 'flowVariation', label: 'Variation', fullLabel: 'Flow Variation',
    color: '#38BDF8',
    tooltip: 'Captures how much the flow moves between different rhythmic feels without becoming chaotic.',
    spectrumLow: 'Steady', spectrumHigh: 'Dynamic',
  },
  {
    key: 'pocketControl', label: 'Pocket', fullLabel: 'Pocket Control',
    color: '#4ADE80',
    tooltip: 'Shows how intentionally your accented syllables sit against the beat grid — on or off the beat.',
    spectrumLow: 'Floating', spectrumHigh: 'Pocketed',
  },
  {
    key: 'spaceUsage', label: 'Space', fullLabel: 'Space Usage',
    color: '#FB923C',
    tooltip: 'Reflects how deliberately the writing uses density contrast and breathing room.',
    spectrumLow: 'Dense', spectrumHigh: 'Spacious',
  },
];

// ── Scoring weights — all tunable ─────────────────────────────────────────────
const CADENCE_W   = { syllCV: 0.65, stressRepeat: 0.35 };
const RHYME_W     = { internal: 0.25, multi: 0.30, families: 0.20, coverage: 0.25 };
const VARIATION_W = { interGroup: 0.45, patterns: 0.35, coherence: 0.20 };
const POCKET_W    = { onBeat: 0.60, consistency: 0.40 };
const SPACE_W     = { sparsity: 0.40, contrast: 0.40, pattern: 0.20 };

function radarPoint(cx, cy, r, angleRad) {
  return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
}

// Pre-compute all radar chart geometry from a scores object.
// axisOffset = how far beyond maxR the axis labels are placed.
function computeRadarGeometry(scores, cx, cy, maxR, axisOffset) {
  const n = CRAFT_AXES.length;
  const angles    = CRAFT_AXES.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);
  const values    = scores ? CRAFT_AXES.map(({ key }) => (scores[key] ?? 0) / 100) : CRAFT_AXES.map(() => 0);
  const dataPoints = angles.map((a, i) => radarPoint(cx, cy, values[i] * maxR, a));
  const dataPath   = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
  const axisEnds   = angles.map(a => radarPoint(cx, cy, maxR + axisOffset, a));
  return { angles, values, dataPoints, dataPath, axisEnds };
}

// ── Core scoring function ──────────────────────────────────────────────────────
function computeCraftScores(analysis) {
  // Philosophy: This chart reflects control and stylistic behavior, not artistic worth.
  const density       = analysis?.density_summary      || {};
  const rhymeMap      = analysis?.rhyme_map             || [];
  const totalFamilies = analysis?.total_color_families  || 0;
  if (!rhymeMap.length) return null;

  // Each rhyme_map entry represents one syllable — build per-line syllable counts
  const lineSyllMap = {};
  for (const r of rhymeMap) {
    if (r.line_index == null) continue;
    lineSyllMap[r.line_index] = (lineSyllMap[r.line_index] || 0) + 1;
  }
  const lineIdxs   = Object.keys(lineSyllMap).map(Number).sort((a, b) => a - b);
  const syllCounts = lineIdxs.map(i => lineSyllMap[i]);
  const n          = syllCounts.length;
  if (n === 0) return null;

  const mean  = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
  function cv(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    if (m === 0) return 0;
    const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
    return Math.sqrt(variance) / m;
  }

  // ── 1. Cadence Control ────────────────────────────────────────────────────────
  // Low syllable-count variance = consistent cadence = higher score
  const syllCVScore = clamp((1 - cv(syllCounts) * 1.5) * 100);

  // Stressed syllable position repeatability across adjacent lines
  const stressByLine = {};
  for (const r of rhymeMap) {
    if (r.line_index == null || !r.is_stressed) continue;
    if (!stressByLine[r.line_index]) stressByLine[r.line_index] = [];
    stressByLine[r.line_index].push(r.word_index ?? 0);
  }
  let stressRepeat = 50;
  const fingerprints = lineIdxs.map(i => stressByLine[i] || []).filter(fp => fp.length);
  if (fingerprints.length >= 2) {
    let score = 0, pairs = 0;
    for (let i = 0; i < fingerprints.length - 1; i++) {
      const a = fingerprints[i], b = fingerprints[i + 1];
      const setA   = new Set(a);
      const overlap = b.filter(p => setA.has(p)).length;
      score += Math.max(a.length, b.length) > 0 ? overlap / Math.max(a.length, b.length) : 0;
      pairs++;
    }
    stressRepeat = pairs > 0 ? (score / pairs) * 100 : 50;
  }
  const cadenceControl = Math.round(clamp(CADENCE_W.syllCV * syllCVScore + CADENCE_W.stressRepeat * stressRepeat));

  // ── 2. Rhyme Complexity ────────────────────────────────────────────────────────
  const familiesScore = clamp((totalFamilies / 8) * 100);
  const linesWithRhyme = new Set(rhymeMap.filter(r => r.color_id).map(r => r.line_index)).size;
  const coverage      = n > 0 ? (linesWithRhyme / n) * 100 : 0;
  const rhymeComplexity = Math.round(clamp(
    RHYME_W.internal * clamp(density.internal || 0) +
    RHYME_W.multi    * clamp(density.multisyllabic || 0) +
    RHYME_W.families * familiesScore +
    RHYME_W.coverage * coverage
  ));

  // ── 3. Flow Variation ─────────────────────────────────────────────────────────
  // Reward controlled movement between feels — penalize pure chaos
  const buckets      = syllCounts.map(c => c <= 4 ? 0 : c <= 8 ? 1 : c <= 12 ? 2 : 3);
  const patternScore = clamp((new Set(buckets).size / 3) * 100);
  let interGroupScore = 40;
  if (n >= 4) {
    const half = Math.floor(n / 2);
    const m1 = mean(syllCounts.slice(0, half));
    const m2 = mean(syllCounts.slice(half));
    interGroupScore = clamp((Math.abs(m1 - m2) / Math.max(m1, m2, 1)) * 160);
  }
  const coherencePenalty = clamp((cv(syllCounts) - 0.25) * 120, 0, 40);
  const flowVariation = Math.round(clamp(
    VARIATION_W.interGroup * interGroupScore +
    VARIATION_W.patterns   * patternScore -
    VARIATION_W.coherence  * coherencePenalty
  ));

  // ── 4. Pocket Control ─────────────────────────────────────────────────────────
  const stressed   = rhymeMap.filter(r => r.is_stressed);
  const onBeatRate = stressed.length > 0 ? (stressed.filter(r => r.on_pocket).length / stressed.length) * 100 : 50;
  const allStressNorm = [];
  for (const li of lineIdxs) {
    const lineLen = lineSyllMap[li] || 1;
    for (const p of (stressByLine[li] || [])) allStressNorm.push(p / lineLen);
  }
  const pocketConsistency = clamp((1 - cv(allStressNorm) * 1.4) * 100);
  const pocketControl = Math.round(clamp(POCKET_W.onBeat * onBeatRate + POCKET_W.consistency * pocketConsistency));

  // ── 5. Space Usage ────────────────────────────────────────────────────────────
  const MAX_SYLLS = 14;
  const sparsity  = clamp(syllCounts.reduce((s, c) => s + Math.max(0, 1 - c / MAX_SYLLS), 0) / n * 100);
  const maxC = Math.max(...syllCounts, 1), minC = Math.min(...syllCounts);
  const contrast  = clamp(((maxC - minC) / maxC) * 120);
  let spacingPattern = 40;
  if (n >= 3) {
    const m = mean(syllCounts);
    let alt = 0;
    for (let i = 0; i < n - 1; i++) if ((syllCounts[i] > m) !== (syllCounts[i + 1] > m)) alt++;
    spacingPattern = clamp((alt / (n - 1)) * 120);
  }
  const spaceUsage = Math.round(clamp(
    SPACE_W.sparsity * sparsity + SPACE_W.contrast * contrast + SPACE_W.pattern * spacingPattern
  ));

  return {
    cadenceControl, rhymeComplexity, flowVariation, pocketControl, spaceUsage,
    // Hidden intentionality scaffold — foundation for future mastery/reinforcement layer
    _reinforcement: {
      cadenceCV: cv(syllCounts), stressRepeat, rhymeCoverage: coverage,
      pocketConsistency, spacingPattern, syllCountsPerLine: syllCounts, lineCount: n,
    },
  };
}

// ── Profile labels ─────────────────────────────────────────────────────────────
// Labels describe craft identity, not quality. First matching condition wins.
const CRAFT_PROFILES = [
  {
    label: 'Pocket Jumper', color: '#F5C518',
    match: s => s.pocketControl > 50 && s.flowVariation > 50 && s._reinforcement.pocketConsistency < 65,
    explain: s =>
      `Your emphasized syllables tend to move between timing zones rather than settling into one repeated placement. ` +
      `That gives your writing a jumping-pocket feel — accents shift within the beat grid but do so with enough recurrence that it reads as intentional. ` +
      `Pocket Control at ${s.pocketControl} shows timing awareness is present, and Flow Variation at ${s.flowVariation} confirms the movement is real, not random.`,
  },
  {
    label: 'Cadence Driver', color: '#4ADE80',
    match: s => s.cadenceControl >= 68,
    explain: s =>
      `Your writing establishes a strong, repeatable accent pattern and holds it across lines. ` +
      `Cadence Control at ${s.cadenceControl} shows your syllable structure consistently reinforces itself from bar to bar. ` +
      `That kind of rhythmic lock creates forward momentum — the listener can feel the next line before it lands.`,
  },
  {
    label: 'Structure Weaver', color: '#C084FC',
    match: s => s.rhymeComplexity >= 62,
    explain: s =>
      `Your writing stacks multiple rhyme types simultaneously — internal, multisyllabic, and end-rhyme layering coexist in the same section. ` +
      `Rhyme Complexity at ${s.rhymeComplexity} reflects architecture built beneath the surface. ` +
      `Each line is doing more than one sonic job at a time.`,
  },
  {
    label: 'Space Sculptor', color: '#FB923C',
    match: s => s.spaceUsage >= 60,
    explain: s =>
      `Your writing shows deliberate use of breathing room. ` +
      `Space Usage at ${s.spaceUsage} reflects that the section creates intentional contrast between dense and open moments. ` +
      `The pauses and silence are doing work — negative space is part of the delivery, not just absence.`,
  },
  {
    label: 'Rhyme Layerer', color: '#38BDF8',
    match: s => s.rhymeComplexity >= 45,
    explain: s =>
      `Your writing builds rhyme complexity through layering — internal patterns, multisyllabic matching, and spread rhyme families working together. ` +
      `Rhyme Complexity at ${s.rhymeComplexity} shows this isn't just end-of-line rhyming. ` +
      `The sonic texture is active throughout each bar.`,
  },
  {
    label: 'Free Rider', color: '#9B9B9B',
    match: () => true,
    explain: s =>
      `Your current section moves freely across rhythmic positions without locking into one repeating shape. ` +
      `That can reflect an exploratory writing mode, or a deliberate choice to keep movement loose and organic. ` +
      `The writing is still doing sonic work — it's operating from a more open, freeform position.`,
  },
];

function getProfile(scores) {
  if (!scores) return null;
  return CRAFT_PROFILES.find(p => p.match(scores)) || CRAFT_PROFILES[CRAFT_PROFILES.length - 1];
}

// ── Cadence shape system ───────────────────────────────────────────────────────
const CADENCE_STEPS = 16;
const CADENCE_BEAT_POSITIONS = new Set([0, 4, 8, 12]);

function getOccupiedSteps(syllCount) {
  if (syllCount <= 0) return new Set();
  const occupied = new Set();
  for (let i = 0; i < syllCount; i++) {
    occupied.add(syllCount === 1 ? 0 : Math.min(CADENCE_STEPS - 1, Math.round(i * (CADENCE_STEPS - 1) / (syllCount - 1))));
  }
  return occupied;
}

// Archetypal cadence shapes — used for detection and suggestion
const CADENCE_ARCHETYPES = [
  { id: 'steady',  label: 'Steady Drive',  sylls: 8,  offset: 0, desc: 'Even, on-beat spacing across the bar.' },
  { id: 'sparse',  label: 'Open Pocket',   sylls: 4,  offset: 0, desc: 'Spacious, anchored movement with room to breathe.' },
  { id: 'late',    label: 'Late Entry',    sylls: 6,  offset: 3, desc: 'Starts after the first beat, creating forward lean.' },
  { id: 'packed',  label: 'Packed Bar',    sylls: 12, offset: 0, desc: 'Dense delivery that fills the subdivisions.' },
  { id: 'pushed',  label: 'Pushed Pocket', sylls: 7,  offset: 1, desc: 'Displaced just ahead of the beat for tension.' },
  { id: 'double',  label: 'Double Time',   sylls: 14, offset: 0, desc: 'Rapid-fire subdivision filling.' },
];

function archetypeSteps(archetype) {
  const { sylls, offset } = archetype;
  const occupied = new Set();
  for (let i = 0; i < sylls; i++) {
    occupied.add(Math.min(CADENCE_STEPS - 1, offset + Math.round(i * (CADENCE_STEPS - 1 - offset) / Math.max(1, sylls - 1))));
  }
  return occupied;
}

function detectTopCadenceShapes(scores) {
  const syllCounts = scores._reinforcement?.syllCountsPerLine || [];
  if (!syllCounts.length) return CADENCE_ARCHETYPES.slice(0, 3);
  const freq = {};
  for (const c of syllCounts) {
    const id = c <= 4 ? 'sparse' : c <= 7 ? 'pushed' : c <= 9 ? 'steady' : c <= 12 ? 'packed' : 'double';
    freq[id] = (freq[id] || 0) + 1;
  }
  return [...CADENCE_ARCHETYPES].sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0)).slice(0, 3);
}

function getComplementaryArchetype(topShapes) {
  const topIds   = new Set(topShapes.map(s => s.id));
  const dominant = topShapes[0];
  const map      = { packed: 'sparse', double: 'sparse', steady: 'late', sparse: 'steady', pushed: 'sparse', late: 'pushed' };
  const preferred = map[dominant?.id] || 'late';
  return CADENCE_ARCHETYPES.find(a => a.id === preferred && !topIds.has(a.id)) ||
         CADENCE_ARCHETYPES.find(a => !topIds.has(a.id)) || CADENCE_ARCHETYPES[3];
}

function complementExplanation(dominant, complement) {
  const texts = {
    'packed+sparse':  'Your current phrase leans dense. An open-pocket cadence creates contrast — the space itself becomes part of the hit.',
    'double+sparse':  'Double-time delivery is powerful, but one open bar creates a reset that makes the density land harder when it returns.',
    'steady+late':    'Your steady drive sets a reliable rhythm. A late-entry variant delays the opener, building anticipation before the pattern resumes.',
    'sparse+steady':  'Your open pocket leaves room. Anchoring one phrase on the downbeat creates a rhythmic reference point the other lines can play against.',
    'pushed+sparse':  'You already displace naturally. A fully open bar — just a few hits — lets that pocket tension breathe and land harder.',
    'late+pushed':    'Your late entries create lean. A pushed variant starts even earlier, compressing the arrival and adding urgency before resolution.',
  };
  return texts[`${dominant?.id}+${complement?.id}`] ||
    'This pattern contrasts your current approach — not as a replacement, but as a companion phrase that changes the feel before returning to your natural movement.';
}

// ── Mini 16-step rhythm grid ───────────────────────────────────────────────────
function MiniRhythmGrid({ occupied, compact = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CADENCE_STEPS}, 1fr)`, gap: 2, alignItems: 'flex-end' }}>
      {Array.from({ length: CADENCE_STEPS }, (_, i) => {
        const hit  = occupied.has(i);
        const beat = CADENCE_BEAT_POSITIONS.has(i);
        const isOne = i === 0;
        const beatColor = isOne ? '#4ADE80' : '#F5C518';
        return (
          <div key={i} style={{
            height: hit ? (compact ? 14 : 20) : (compact ? 4 : 5),
            borderRadius: 2,
            background: hit
              ? (beat ? `${beatColor}cc` : 'rgba(56,189,248,0.75)')
              : (beat ? `${beatColor}18` : 'rgba(255,255,255,0.06)'),
            border: `1px solid ${hit ? (beat ? `${beatColor}88` : 'rgba(56,189,248,0.4)') : 'rgba(255,255,255,0.05)'}`,
          }} />
        );
      })}
    </div>
  );
}

// ── Cadence detail panel (slide 2) ────────────────────────────────────────────
function CadenceDetailPanel({ scores, onBack }) {
  const topShapes   = detectTopCadenceShapes(scores);
  const complement  = getComplementaryArchetype(topShapes);
  const compExplain = complementExplanation(topShapes[0], complement);
  const shapeLabels = ['Primary Cadence', 'Supporting Pattern', 'Accent Variation'];

  return (
    <div style={{ padding: '10px 16px 16px', overflowY: 'auto' }}>
      {/* Back nav */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
        cursor: 'pointer', color: 'rgba(255,255,255,0.3)', marginBottom: 12, padding: 0,
        fontFamily: 'DM Sans, sans-serif', fontSize: 11,
      }}>
        <ChevronLeft size={12} /> Craft overview
      </button>

      {/* Phrase overview — one row per line */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
          Phrase Overview
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {(scores._reinforcement?.syllCountsPerLine || []).map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 5, alignItems: 'flex-end' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.18)', textAlign: 'right' }}>{i + 1}</span>
              <MiniRhythmGrid occupied={getOccupiedSteps(c)} compact />
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '10px 0' }} />

      {/* Top 3 cadence shapes */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          Detected Cadence Shapes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topShapes.map((shape, idx) => (
            <div key={shape.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{shapeLabels[idx]}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: idx === 0 ? '#F5C518' : 'rgba(255,255,255,0.45)' }}>{shape.label}</span>
              </div>
              <MiniRhythmGrid occupied={archetypeSteps(shape)} />
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>{shape.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '10px 0' }} />

      {/* Complementary cadence suggestion */}
      <div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
          Cadence to consider
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#38BDF8' }}>{complement.label}</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(56,189,248,0.45)', fontStyle: 'italic', letterSpacing: '0.05em' }}>potential complement</span>
        </div>
        <MiniRhythmGrid occupied={archetypeSteps(complement)} />
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{compExplain}</p>
        </div>
      </div>
    </div>
  );
}

// ── Full-screen Craft breakdown modal ────────────────────────────────────────
function CraftFullModal({ scores, profile, onClose }) {
  const size = 300;
  const cx = size / 2, cy = size / 2;
  const maxR = 110;
  const { angles, values, dataPoints, dataPath, axisEnds } = computeRadarGeometry(scores, cx, cy, maxR, 26);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(3,3,5,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'rgba(14,14,18,0.98)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18, width: '90%', maxWidth: 760, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 0' }}>
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Craft Analysis</p>
            {profile && <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: profile.color, margin: 0 }}>{profile.label}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '20px 24px 24px' }}>
          {/* Left: enlarged radar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <svg width={size} height={size} style={{ overflow: 'visible' }}>
              {[0.25, 0.5, 0.75, 1.0].map((lvl, i) => (
                <circle key={i} cx={cx} cy={cy} r={maxR * lvl} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="3 4" />
              ))}
              {angles.map((a, i) => {
                const [x, y] = radarPoint(cx, cy, maxR, a);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
              })}
              <path d={dataPath} fill="rgba(245,197,24,0.06)" stroke="none" />
              {CRAFT_AXES.map(({ key, color }, i) => {
                const [x, y] = dataPoints[i];
                if (values[i] === 0) return null;
                return (
                  <g key={key}>
                    <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
                    <circle cx={x} cy={y} r={4} fill={color} opacity={0.9} />
                  </g>
                );
              })}
              <path d={dataPath} fill="none" stroke="rgba(245,197,24,0.5)" strokeWidth={2} strokeLinejoin="round" />
              {CRAFT_AXES.map(({ key, label, color, tooltip }, i) => {
                const [lx, ly] = axisEnds[i];
                const pct = Math.round(values[i] * 100);
                return (
                  <text key={key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" title={tooltip}
                    style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fill: pct > 0 ? color : '#2e2e2e', fontWeight: 700 }}>
                    {label}{pct > 0 ? ` ${pct}` : ''}
                  </text>
                );
              })}
            </svg>

            {/* Axis score bars */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CRAFT_AXES.map(({ key, fullLabel, color, spectrumLow, spectrumHigh, tooltip }) => {
                const val = scores[key] ?? 0;
                return (
                  <div key={key} title={tooltip}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{fullLabel}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, color }}>{val}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{spectrumLow}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{spectrumHigh}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: profile explanation + axis descriptions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {profile && (
              <div style={{ padding: '14px 16px', borderRadius: 10, background: `${profile.color}0d`, border: `1px solid ${profile.color}28` }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700, color: profile.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {profile.label}
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
                  {profile.explain(scores)}
                </p>
              </div>
            )}

            {/* Axis deep-dives */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>What each axis measures</p>
              {CRAFT_AXES.map(({ key, fullLabel, color, tooltip, spectrumLow, spectrumHigh }) => {
                const val = scores[key] ?? 0;
                return (
                  <div key={key} style={{ padding: '10px 12px', borderRadius: 8, background: `${color}08`, border: `1px solid ${color}18` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, color }}>{fullLabel}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{val >= 50 ? spectrumHigh : spectrumLow}</span>
                    </div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: 0 }}>{tooltip}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Craft card — 3 slides ─────────────────────────────────────────────────────
function CraftCard() {
  const { activeSection } = useApp();
  const scores  = computeCraftScores(activeSection.analysis);
  const profile = getProfile(scores);
  const [slide, setSlide] = useState(0); // 0=radar, 1=explanation, 2=cadence
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setSlide(0); }, [activeSection.id]); // eslint-disable-line

  const size   = 220;
  const cx = size / 2, cy = size / 2;
  const maxR   = 76;
  const { angles, values, dataPoints, dataPath, axisEnds } = computeRadarGeometry(scores, cx, cy, maxR, 18);
  const hasData = values.some(v => v > 0);

  return (
    <>
    {expanded && scores && <CraftFullModal scores={scores} profile={profile} onClose={() => setExpanded(false)} />}
    <GlassCard hasContent={hasData} style={{ flexShrink: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Craft
          </p>
          {hasData && (
            <button onClick={() => setExpanded(true)} title="Full breakdown"
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 5, padding: '1px 6px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.3)',
                transition: 'all 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >expand</button>
          )}
        </div>
        {profile && scores && (
          <button onClick={() => setSlide(s => s === 0 ? 1 : 0)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: profile.color }}>
              {profile.label}
            </span>
            <ChevronRight size={12} style={{
              color: profile.color, opacity: 0.7,
              transform: slide > 0 ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 200ms',
            }} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Slide 0: Radar chart ── */}
        {slide === 0 && (
          <motion.div key="radar"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center" style={{ padding: '2px 18px 12px' }}>
              <svg width={size} height={size} style={{ overflow: 'visible' }}>
                <defs>
                  {CRAFT_AXES.map(({ key, color }) => (
                    <filter key={key} id={`cglow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  ))}
                </defs>

                {[0.25, 0.5, 0.75, 1.0].map((lvl, i) => (
                  <circle key={i} cx={cx} cy={cy} r={maxR * lvl}
                    fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="3 4" />
                ))}
                {angles.map((a, i) => {
                  const [x, y] = radarPoint(cx, cy, maxR, a);
                  return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
                })}

                {hasData && (
                  <motion.path d={dataPath} fill="rgba(245,197,24,0.04)" stroke="none"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
                )}

                {CRAFT_AXES.map(({ key, color }, i) => {
                  const [x, y] = dataPoints[i];
                  if (values[i] === 0) return null;
                  return (
                    <g key={key} filter={`url(#cglow-${key})`}>
                      <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.3} />
                      <circle cx={x} cy={y} r={3} fill={color} opacity={0.9} />
                    </g>
                  );
                })}

                {hasData && (
                  <motion.path d={dataPath} fill="none"
                    stroke="rgba(245,197,24,0.4)" strokeWidth={1.5} strokeLinejoin="round"
                    filter="url(#cglow-cadenceControl)"
                    initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} />
                )}

                {CRAFT_AXES.map(({ key, label, color, tooltip }, i) => {
                  const [lx, ly] = axisEnds[i];
                  const pct = Math.round(values[i] * 100);
                  return (
                    <text key={key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                      title={tooltip}
                      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9.5, fill: pct > 0 ? color : '#2e2e2e', fontWeight: 600, cursor: 'help' }}>
                      {label}{pct > 0 ? ` ${pct}` : ''}
                    </text>
                  );
                })}
              </svg>

              {/* Spectrum labels */}
              {hasData && scores && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', justifyContent: 'center', marginTop: -4 }}>
                  {CRAFT_AXES.map(({ key, color, spectrumLow, spectrumHigh }) => {
                    const val  = scores[key] ?? 0;
                    const side = val >= 50 ? spectrumHigh : spectrumLow;
                    return (
                      <span key={key} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: `${color}70` }}>
                        <span style={{ color }}>{side}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Slide 1: Profile explanation + axis bars ── */}
        {slide === 1 && profile && scores && (
          <motion.div key="explain"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: '10px 16px 14px' }}
          >
            {/* Axis score bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              {CRAFT_AXES.map(({ key, fullLabel, color, spectrumLow, spectrumHigh, tooltip }) => {
                const val = scores[key] ?? 0;
                return (
                  <div key={key} title={tooltip}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{fullLabel}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color }}>{val}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${val}%` }}
                        transition={{ duration: 0.5, delay: 0.04, ease: [0.4, 0, 0.2, 1] }}
                        style={{ height: '100%', background: color, borderRadius: 2 }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.16)' }}>{spectrumLow}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.16)' }}>{spectrumHigh}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Profile explanation */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: `${profile.color}0d`, border: `1px solid ${profile.color}22`, marginBottom: 10 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700, color: profile.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>
                {profile.label}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>
                {profile.explain(scores)}
              </p>
            </div>

            {/* Navigate to cadence detail */}
            <button onClick={() => setSlide(2)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, transition: 'all 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            >
              View cadence shapes <ChevronRight size={12} />
            </button>
          </motion.div>
        )}

        {/* ── Slide 2: Cadence detail ── */}
        {slide === 2 && scores && (
          <motion.div key="cadence"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CadenceDetailPanel scores={scores} onBack={() => setSlide(1)} />
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
    </>
  );
}

// ─── Flow badge ────────────────────────────────────────────────────────────────

const FLOW_COLORS = {
  'On-Grid':       '#4ADE80',
  'Syncopated':    '#FB923C',
  'Floating':      '#60A5FA',
  'Pocket Jumper': '#F5C518',
};

function FlowCard() {
  const { activeSection } = useApp();
  const flow = activeSection.analysis?.flow_signature;
  const color = FLOW_COLORS[flow] || '#FFFFFF';
  // Toggle between two label modes: 'pocket' (flow signature) and 'veil' (song analysis)
  const [labelMode, setLabelMode] = useState('pocket');

  return (
    <GlassCard hasContent={!!flow} style={{ padding: '14px 18px', flexShrink: 0 }}>
      {/* Header — click to toggle label mode */}
      <button
        onClick={() => setLabelMode(m => m === 'pocket' ? 'veil' : 'pocket')}
        title="Toggle flow label"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: 8,
        }}
      >
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          {labelMode === 'pocket' ? 'Flow' : 'Veil'}
        </p>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
          {labelMode === 'pocket' ? '→ veil' : '→ flow'}
        </span>
      </button>

      {labelMode === 'pocket' ? (
        <>
          <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: flow ? '#FFFFFF' : '#2E2E2E' }}>
              {flow ? `${flow}` : '— — —'}
            </span>
          </div>
          {flow && (
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F5C518' }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>On-pocket</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#38BDF8' }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Stressed</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>
            Analyze the flow of the song — or the artist's flow. The veil strips the words away and reads only rhythm, stress, and pocket placement.
          </p>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Motif Bank Panel ─────────────────────────────────────────────────────────

function MotifBankPanel() {
  const { activeSection, dispatch } = useApp();
  const bank = activeSection.motifBank || {};
  const [open, setOpen] = useState(false);
  const [newCluster, setNewCluster] = useState('');
  const [wordInputs, setWordInputs] = useState({}); // clusterName → draft string

  const setBank = (updated) => dispatch({ type: 'SET_MOTIF_BANK', payload: updated });

  const addCluster = () => {
    const name = newCluster.trim().toLowerCase();
    if (!name || bank[name]) return;
    setBank({ ...bank, [name]: [] });
    setNewCluster('');
  };

  const removeCluster = (name) => {
    const b = { ...bank };
    delete b[name];
    setBank(b);
  };

  const addWord = (clusterName) => {
    const draft = (wordInputs[clusterName] || '').trim().toLowerCase();
    if (!draft) return;
    const words = draft.split(/[\s,]+/).map(w => w.replace(/[^a-z']/g, '')).filter(Boolean);
    const existing = bank[clusterName] || [];
    const merged = [...new Set([...existing, ...words])];
    setBank({ ...bank, [clusterName]: merged });
    setWordInputs(prev => ({ ...prev, [clusterName]: '' }));
  };

  const removeWord = (clusterName, word) => {
    const updated = (bank[clusterName] || []).filter(w => w !== word);
    setBank({ ...bank, [clusterName]: updated });
  };

  const clusterNames = Object.keys(bank);
  const totalWords = Object.values(bank).reduce((a, ws) => a + ws.length, 0);

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '8px 14px', background: 'none', border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
          color: clusterNames.length ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.25)',
          letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Motif Bank {totalWords > 0 ? `· ${totalWords} words` : ''}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)',
            lineHeight: 1.5, marginBottom: 10 }}>
            Group words by theme. Any rhyme candidate in your bank gets boosted — even if the thesaurus doesn't connect them.
          </p>

          {/* Existing clusters */}
          {clusterNames.map(name => (
            <div key={name} style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}>
              {/* Cluster header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700,
                  color: '#4ADE80', textTransform: 'lowercase' }}>{name}</span>
                <button onClick={() => removeCluster(name)} style={{ background: 'none', border: 'none',
                  cursor: 'pointer', color: 'rgba(239,68,68,0.4)', fontSize: 11, padding: 0,
                  lineHeight: 1 }}>✕</button>
              </div>
              {/* Words */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {(bank[name] || []).map(word => (
                  <span key={word} style={{ display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 7px', borderRadius: 5, background: 'rgba(74,222,128,0.08)',
                    border: '1px solid rgba(74,222,128,0.2)', fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11, color: '#4ADE80' }}>
                    {word}
                    <button onClick={() => removeWord(name, word)} style={{ background: 'none',
                      border: 'none', cursor: 'pointer', color: 'rgba(74,222,128,0.4)',
                      fontSize: 10, padding: 0, lineHeight: 1, marginLeft: 1 }}>✕</button>
                  </span>
                ))}
                {bank[name]?.length === 0 && (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                    color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>no words yet</span>
                )}
              </div>
              {/* Add word input */}
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={wordInputs[name] || ''}
                  onChange={e => setWordInputs(prev => ({ ...prev, [name]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addWord(name); }}
                  placeholder="add words, comma-separated…"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 5, padding: '3px 8px', color: '#FFFFFF', outline: 'none',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}
                />
                <button onClick={() => addWord(name)}
                  style={{ padding: '3px 10px', borderRadius: 5, background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.25)', color: '#4ADE80', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600 }}>
                  Add
                </button>
              </div>
            </div>
          ))}

          {/* New cluster input */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <input
              value={newCluster}
              onChange={e => setNewCluster(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCluster(); }}
              placeholder="new cluster name (e.g. ocean)…"
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5, padding: '4px 8px', color: '#FFFFFF', outline: 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}
            />
            <button onClick={addCluster}
              style={{ padding: '4px 10px', borderRadius: 5, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600 }}>
              + Cluster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Suggestions panel ────────────────────────────────────────────────────────

function SuggestionsCard() {
  const { state, dispatch, activeSection } = useApp();
  const suggestions  = activeSection.suggestions || [];
  const targetWord   = activeSection.targetWord || null;
  const loading      = state.suggestLoading;
  const moreLoading  = state.suggestMoreLoading;
  const [motifOn, setMotifOn] = useState(false);
  const prevTargetRef = useRef(null);

  // All sections' lines combined for motif context
  const allSongLines = useMemo(
    () => state.sections.flatMap(s => s.lines),
    [state.sections]
  );

  const motifBank = activeSection.motifBank || {};
  const hasBank   = Object.values(motifBank).some(ws => ws.length > 0);

  const runSuggest = (word, useMotif) => {
    if (!word || !activeSection.lines.filter(l => l.trim()).length) return;
    dispatch({ type: 'SUGGEST_START' });
    const contextLines = useMotif ? allSongLines : undefined;
    const bank = (useMotif || hasBank) ? motifBank : undefined;
    suggest(activeSection.lines, activeSection.bpm, 'auto', word, contextLines, bank)
      .then(({ data, error }) => {
        if (data) dispatch({ type: 'SUGGEST_SUCCESS', payload: data.suggestions });
        else { dispatch({ type: 'SUGGEST_FAIL' }); if (error) dispatch({ type: 'SET_GLOBAL_ERROR', payload: error }); }
      });
  };

  // Auto-fetch when targetWord changes
  useEffect(() => {
    if (!targetWord || targetWord === prevTargetRef.current) return;
    prevTargetRef.current = targetWord;
    runSuggest(targetWord, motifOn);
  }, [targetWord]); // eslint-disable-line

  // When motif toggled, re-fetch with current word
  useEffect(() => {
    if (!targetWord) return;
    runSuggest(targetWord, motifOn);
  }, [motifOn]); // eslint-disable-line

  const handleMore = async () => {
    dispatch({ type: 'SUGGEST_MORE_START' });
    const { data } = await getMoreSuggestions();
    if (data) dispatch({ type: 'SUGGEST_MORE_SUCCESS', payload: data.suggestions });
    else dispatch({ type: 'SUGGEST_MORE_FAIL' });
  };

  // Motif scoring: rank by thesaurus_score desc to find "on-theme" top entries
  const motifRanked = useMemo(() => {
    if (!motifOn || !suggestions.length) return suggestions;
    const sorted = [...suggestions].sort((a, b) => (b.thesaurus_score ?? 0) - (a.thesaurus_score ?? 0));
    const topIds = new Set(sorted.slice(0, 5).map(s => s.word));
    return suggestions.map(s => ({ ...s, _motifTop: topIds.has(s.word) }));
  }, [suggestions, motifOn]);

  return (
    <GlassCard hasContent={suggestions.length > 0} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, minHeight: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Rhymes for
          </span>
          {targetWord ? (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#F5C518', letterSpacing: '0.03em' }}>
              {targetWord}
              {loading && <span style={{ fontSize: 10, color: 'rgba(245,197,24,0.5)', marginLeft: 5, fontWeight: 400 }}>…</span>}
            </span>
          ) : (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
              type a word or click one
            </span>
          )}
        </div>
        {/* Motif toggle */}
        <button
          onClick={() => setMotifOn(m => !m)}
          title={motifOn ? 'Motif mode ON — top matches are on-theme with full song' : 'Turn on motif mode'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
            background: motifOn ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
            border: motifOn ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.1)',
            color: motifOn ? '#4ADE80' : 'rgba(255,255,255,0.35)',
            fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
            transition: 'all 150ms',
          }}
        >
          <span style={{ fontSize: 9, lineHeight: 1 }}>◆</span>
          Motif
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
        {loading ? (
          <div className="flex flex-col gap-2 pt-2">
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : motifRanked.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <Sparkles size={18} color="#2E2E2E" />
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.5 }}>
              {targetWord ? `Finish typing a word\nor click one in the editor` : `Type lyrics, then\nfinish a word to see rhymes`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 pt-1">
            {motifRanked.map((s, i) => (
              <SuggestionRow key={`${s.word}-${i}`} suggestion={s} index={i} motifOn={motifOn} />
            ))}
            {!moreLoading && motifRanked.length > 0 && motifRanked.length < 20 && (
              <button
                onClick={handleMore}
                className="flex items-center justify-center gap-1 w-full py-2 rounded-xl mt-1"
                style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
              >
                More <ChevronRight size={12} />
              </button>
            )}
            {moreLoading && (
              <div className="flex flex-col gap-1">
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <MotifBankPanel />
    </GlassCard>
  );
}

function SuggestionRow({ suggestion, index, motifOn }) {
  const [hovered, setHovered] = useState(false);
  const s        = suggestion;
  const isMotif  = motifOn && s._motifTop;
  const rhyme    = s.rhyme_score     ?? null;
  const thes     = s.thesaurus_score ?? null;
  const comp     = s.composite_score ?? null;

  const borderColor = isMotif ? 'rgba(74,222,128,0.35)' : hovered ? 'rgba(245,197,24,0.12)' : 'transparent';
  const bg          = isMotif ? 'rgba(74,222,128,0.05)'  : hovered ? 'rgba(255,255,255,0.04)' : 'transparent';
  const wordColor   = isMotif ? '#4ADE80' : hovered ? '#F5C518' : '#EDEDEC';

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        padding: '7px 10px', borderRadius: 10, cursor: 'default',
        background: bg, border: `1px solid ${borderColor}`,
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      {/* Top row: word + motif badge + composite score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700,
          color: wordColor, transition: 'color 120ms', flex: 1 }}>
          {s.word}
          {s.syllable_count != null && (
            <span style={{ fontWeight: 400, fontSize: 10, color: isMotif ? 'rgba(74,222,128,0.6)' : '#9B9B9B', marginLeft: 5 }}>
              {s.syllable_count}syl
            </span>
          )}
        </span>
        {isMotif && (
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700,
            color: '#4ADE80', letterSpacing: '0.07em', textTransform: 'uppercase',
            background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)',
            borderRadius: 4, padding: '1px 5px', flexShrink: 0,
          }}>on theme</span>
        )}
        {comp != null && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
            color: isMotif ? '#4ADE80' : hovered ? '#F5C518' : '#9B9B9B', flexShrink: 0, transition: 'color 120ms' }}>
            {comp}
          </span>
        )}
      </div>

      {/* Score bars */}
      {(rhyme != null || thes != null) && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {rhyme != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: '#9B9B9B' }}>rhyme</span>
              <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${rhyme}%`, background: rhyme === 100 ? '#4ADE80' : rhyme >= 88 ? '#F5C518' : '#9B9B9B', borderRadius: 2 }} />
              </div>
            </div>
          )}
          {thes != null && thes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: '#9B9B9B' }}>theme</span>
              <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${thes}%`, background: isMotif ? '#4ADE80' : '#818CF8', borderRadius: 2 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      {s.reason && (
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: isMotif ? 'rgba(74,222,128,0.6)' : '#9B9B9B', lineHeight: 1.4 }}>
          {s.reason}
        </span>
      )}
    </motion.div>
  );
}

// ─── BPM bar (wraps shared MetronomeBar, wires to section BPM) ───────────────

function BpmBar({ beatListenerRef }) {
  const { activeSection, dispatch } = useApp();
  const handleBeat = useCallback((beatIdx, pc) => {
    beatListenerRef.current?.(beatIdx, pc);
  }, [beatListenerRef]);
  return (
    <MetronomeBar
      bpm={activeSection.bpm}
      onBpmChange={v => dispatch({ type: 'SET_BPM', payload: v })}
      onBeat={handleBeat}
    />
  );
}

// ─── Save (export) modal ──────────────────────────────────────────────────────

function SaveModal({ onClose }) {
  const { state, getColor } = useApp();
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Build the same normalizedRhymeMap + colorMap for each section
  const buildSectionColorMap = (sec) => {
    const raw = sec.analysis?.rhyme_map;
    if (!raw?.length) return {};
    const rawIds = [...new Set(raw.map(e => e.color_id).filter(Boolean))].sort((a, b) => a - b);
    const remap = {};
    rawIds.forEach((id, idx) => { remap[id] = idx + 1; });
    return buildColorMap(raw.map(e => e.color_id ? { ...e, color_id: remap[e.color_id] } : e));
  };

  const capture = async (format) => {
    setExporting(true);
    try {
      const el = exportRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#030305',
        logging: false,
      });

      if (format === 'jpeg') {
        const link = document.createElement('a');
        link.download = 'prosodic-lyrics.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
      } else {
        // PDF — one long page matching the canvas aspect ratio
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pxW = canvas.width;
        const pxH = canvas.height;
        const pdfW = 210; // A4 width in mm
        const pdfH = (pxH / pxW) * pdfW;
        const pdf = new jsPDF({ orientation: pdfH > pdfW ? 'portrait' : 'landscape', unit: 'mm', format: [pdfW, pdfH] });
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
        pdf.save('prosodic-lyrics.pdf');
      }
    } finally {
      setExporting(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      {/* Buttons */}
      <div style={{
        background: 'rgba(14,14,18,0.98)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14, padding: '22px 28px',
        display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260,
        boxShadow: '0 24px 70px rgba(0,0,0,0.85)',
      }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
          Save Full Song
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Exports all sections in order with rhyme highlights and Prosodic branding.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => capture('jpeg')} disabled={exporting} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, cursor: exporting ? 'wait' : 'pointer',
            background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.4)',
            color: '#F5C518', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
          }}>
            {exporting ? 'Saving…' : 'JPEG'}
          </button>
          <button onClick={() => capture('pdf')} disabled={exporting} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, cursor: exporting ? 'wait' : 'pointer',
            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.35)',
            color: '#38BDF8', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
          }}>
            {exporting ? 'Saving…' : 'PDF'}
          </button>
          <button onClick={onClose} style={{
            padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
          }}>Cancel</button>
        </div>
      </div>

      {/* Hidden export surface — rendered off-screen then captured */}
      <div ref={exportRef} style={{
        position: 'fixed', top: '100vh', left: 0,
        width: 800, background: '#030305',
        padding: '48px 56px 80px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {state.sections.map((sec) => {
          const colorMap = buildSectionColorMap(sec);
          const hasHL = Object.keys(colorMap).length > 0;
          const labelColor = sec.sectionColor ? getColor(sec.sectionColor).bg : 'rgba(255,255,255,0.3)';
          return (
            <div key={sec.id} style={{ marginBottom: 48 }}>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
                color: labelColor, letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 14, paddingBottom: 8,
                borderBottom: `1px solid ${sec.sectionColor ? getColor(sec.sectionColor).bg + '44' : 'rgba(255,255,255,0.08)'}`,
              }}>{sec.name || 'Untitled'}</div>
              <div style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZE_PX, lineHeight: LINE_HEIGHT, color: '#FFFFFF', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {sec.lines.map((line, i) => (
                  <div key={i} style={{ minHeight: LINE_HEIGHT_PX }}>
                    {line.trim()
                      ? (hasHL ? renderLine(line, i, colorMap, getColor, null, null, {}, null) : line)
                      : '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {/* Prosodic logo watermark */}
        <div style={{
          marginTop: 64, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
            color: '#FFFFFF', letterSpacing: '0.08em',
          }}>PROSODIC</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Sans, sans-serif' }}>
            Lyric analysis powered by Prosodic
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

// Panel IDs — order drives which card renders first in the right column
const ALL_PANELS = ['flow', 'craft', 'suggestions'];
const PANEL_LABELS = { flow: 'Flow', craft: 'Craft', suggestions: 'Rhymes' };

function loadPanelOrder() {
  try {
    const saved = localStorage.getItem('prosodic_panel_order');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === ALL_PANELS.length) return parsed;
    }
  } catch (_) {}
  return ALL_PANELS;
}

function RightPanel({ panelOrder, setPanelOrder, beatListenerRef }) {
  const draggedRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prosodic_panels_hidden') || '[]'); } catch (_) { return []; }
  });

  const savePanelOrder = (order) => {
    setPanelOrder(order);
    localStorage.setItem('prosodic_panel_order', JSON.stringify(order));
  };

  const toggleHidden = (id) => {
    const next = hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id];
    setHidden(next);
    localStorage.setItem('prosodic_panels_hidden', JSON.stringify(next));
  };

  const renderPanel = (id) => {
    if (id === 'flow') return <FlowCard key="flow" />;
    if (id === 'craft') return <CraftCard key="craft" />;
    if (id === 'suggestions') return <SuggestionsCard key="suggestions" />;
    return null;
  };

  return (
    <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Manage toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, flexShrink: 0 }}>
        <button
          onClick={() => setManageOpen(o => !o)}
          title="Manage panels"
          style={{
            background: manageOpen ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.03)',
            border: manageOpen ? '1px solid rgba(245,197,24,0.3)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: 10,
            color: manageOpen ? '#F5C518' : 'rgba(255,255,255,0.25)',
            transition: 'all 120ms',
          }}
        >⠿ Panels</button>
      </div>

      {/* Manage bar — show/hide toggles */}
      {manageOpen && (
        <div style={{
          display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 8px 8px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8, marginBottom: 6, flexShrink: 0,
        }}>
          {panelOrder.map(id => (
            <button key={id} onClick={() => toggleHidden(id)} style={{
              padding: '3px 9px', borderRadius: 5, cursor: 'pointer',
              background: hidden.includes(id) ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)',
              border: hidden.includes(id) ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(74,222,128,0.25)',
              color: hidden.includes(id) ? '#EF4444' : '#4ADE80',
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
            }}>
              {hidden.includes(id) ? '+ ' : '✓ '}{PANEL_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {/* Draggable panel list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
        {panelOrder.filter(id => !hidden.includes(id)).map((id) => {
          const isDragOver = dragOverId === id;
          return (
            <div key={id}
              draggable
              onDragStart={() => { draggedRef.current = id; }}
              onDragOver={e => { e.preventDefault(); setDragOverId(id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={e => {
                e.preventDefault();
                const from = draggedRef.current;
                if (from && from !== id) {
                  const next = [...panelOrder];
                  const fi = next.indexOf(from), ti = next.indexOf(id);
                  if (fi >= 0 && ti >= 0) { next.splice(fi, 1); next.splice(ti, 0, from); }
                  savePanelOrder(next);
                }
                draggedRef.current = null;
                setDragOverId(null);
              }}
              onDragEnd={() => { draggedRef.current = null; setDragOverId(null); }}
              style={{
                outline: isDragOver ? '1px dashed rgba(245,197,24,0.4)' : 'none',
                borderRadius: 16,
                transition: 'outline 100ms',
                cursor: 'grab',
                flexShrink: 0,
              }}
            >
              {renderPanel(id)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SongViewLayout() {
  const { activeSection, dispatch, getColor } = useApp();
  // Shared ref: MetronomeBar fires into it, FlowChart subscribes
  const beatListenerRef = useRef(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [panelOrder, setPanelOrder] = useState(loadPanelOrder);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '80px 20px 16px', gap: 12, position: 'relative', zIndex: 4 }}>
      {saveOpen && <SaveModal onClose={() => setSaveOpen(false)} />}
      {/* Solid cover — blocks the global wave background completely */}
      <div style={{ position: 'fixed', inset: 0, background: '#030305', zIndex: 1, pointerEvents: 'none' }} />
      {/* DottedSurface — page-specific atmosphere above the cover */}
      <DottedSurface style={{ zIndex: 2 }} />
      {/* Dim overlay — very light so dots breathe in empty space */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,5,0.28)', pointerEvents: 'none', zIndex: 3 }} />
      <GlassFilter />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between flex-wrap gap-3"
        style={{ flexShrink: 0, position: 'relative', zIndex: 20 }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '0.06em',
            color: activeSection.sectionColor ? getColor(activeSection.sectionColor).bg : '#FFFFFF',
            transition: 'color 300ms ease',
          }}>
            {activeSection.name || 'UNTITLED'}
          </h1>
          <BpmBar beatListenerRef={beatListenerRef} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSaveOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)',
              color: '#F5C518', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
              transition: 'background 150ms, border-color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.18)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.3)'; }}
          >
            Save
          </button>
          <SectionStrip />
        </div>
      </motion.div>

      {/* Workspace */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="flex gap-3"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}
      >
        {/* Left: editor */}
        <LyricsEditor beatListenerRef={beatListenerRef} />

        {/* Right: analysis panels — scrollable, drag-reorderable */}
        <RightPanel panelOrder={panelOrder} setPanelOrder={setPanelOrder} beatListenerRef={beatListenerRef} />
      </motion.div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function SongViewPage() {
  const { getColor, resetPalette } = useColorPalette();
  return (
    <AppProvider getColor={getColor} resetPalette={resetPalette}>
      <SongViewLayout />
    </AppProvider>
  );
}

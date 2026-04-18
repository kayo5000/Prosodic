import { useState, useRef, useEffect } from 'react';
import { useRegisterPinnableItems } from '../state/PinnableContext';
import PinButton from '../components/ui/PinButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, X, Loader2, ArrowRight, Mic2, BookMarked, Layers } from 'lucide-react';
import DottedSurface from '../components/ui/DottedSurface';
import { DEVICES as ACADEMIC_DEVICES } from './devices_data';
import { RICH_DEVICES } from './devices_rich';

// Merge: rich entries override academic entries of the same name;
// rich entries not found in academic list are prepended.
const richByName = Object.fromEntries(RICH_DEVICES.map(d => [d.name.toLowerCase(), d]));
const mergedAcademic = ACADEMIC_DEVICES.map(d => {
  const rich = richByName[d.name.toLowerCase()];
  return rich ? { ...d, ...rich } : d;
});
const richOnlyNames = new Set(RICH_DEVICES.map(d => d.name.toLowerCase()).filter(n => !ACADEMIC_DEVICES.find(d => d.name.toLowerCase() === n)));
const richOnly = RICH_DEVICES.filter(d => richOnlyNames.has(d.name.toLowerCase()));
const DEVICES = [...richOnly, ...mergedAcademic];

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function safeFetch(url) {
  try {
    const res = await window.fetch(url);
    return res;
  } catch (e) {
    throw new Error('Cannot reach the Prosodic server. Make sure it\'s running: python api.py');
  }
}

// ── Shared UI ──────────────────────────────────────────────

function GlassPanel({ children, style }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.12)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden',
        background: 'rgba(15,15,20,0.6)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 6 : 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'rgba(245,197,24,0.12)',
          border: '1px solid rgba(245,197,24,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color="#F5C518" />
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#EDEDEC' }}>
          {title}
        </span>
      </div>
      {subtitle && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B', margin: 0, lineHeight: 1.6, paddingLeft: 44 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function WordChip({ word, onClick, dim }) {
  return (
    <button
      onClick={() => onClick(word)}
      style={{
        padding: '4px 10px', borderRadius: 6,
        background: dim ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${dim ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'}`,
        color: dim ? '#6B6B6B' : '#EDEDEC',
        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12,
        transition: 'background 120ms, color 120ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.12)'; e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = dim ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = dim ? '#6B6B6B' : '#EDEDEC'; e.currentTarget.style.borderColor = dim ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'; }}
    >
      {word}
    </button>
  );
}

function ResultSection({ label, color, words, onWord, emptyText }) {
  const [open, setOpen] = useState(true);
  if (!words.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
          cursor: 'pointer', padding: '0 0 8px', width: '100%', textAlign: 'left',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1 }}>
          {label} ({words.length})
        </span>
        <span style={{ fontSize: 9, color: '#4A4A4A' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {words.map(w => <WordChip key={w} word={w} onClick={onWord} />)}
        </div>
      )}
    </div>
  );
}

// ── Motif Dictionary ──────────────────────────────────────


function MotifDictionary({ sharedWord, onWordSelect }) {
  const [customWord, setCustomWord]       = useState(sharedWord || '');
  const [searchWord, setSearchWord]       = useState('');
  const [results, setResults]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [filterQuery, setFilterQuery]     = useState('');
  const inputRef = useRef(null);
  const prevShared = useRef(sharedWord);

  const fetchSynonyms = async (word) => {
    if (!word.trim()) return;
    setLoading(true); setError(''); setResults(null); setFilterQuery('');
    try {
      const res = await safeFetch(`${API}/thesaurus?word=${encodeURIComponent(word.trim().toLowerCase())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lookup failed');
      setResults(data); setSearchWord(word.trim());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (sharedWord && sharedWord !== prevShared.current) {
      prevShared.current = sharedWord;
      setCustomWord(sharedWord);
      fetchSynonyms(sharedWord);
    }
  }, [sharedWord]);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    if (customWord.trim()) { fetchSynonyms(customWord.trim()); onWordSelect?.(customWord.trim()); }
  };

  const filtered = results?.synonyms
    ? results.synonyms.filter(s => !filterQuery || s.toLowerCase().includes(filterQuery.toLowerCase()))
    : [];

  return (
    <GlassPanel style={{ padding: 24 }}>
      <SectionHeader icon={BookOpen} title="Motif Dictionary"
        subtitle="Explore synonym clusters around a concept. Powered by the Moby Thesaurus — 30k root words, 2.5M synonyms." />


      <form onSubmit={handleCustomSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input ref={inputRef} value={customWord} onChange={e => setCustomWord(e.target.value)}
          placeholder="Look up any word…"
          style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#EDEDEC', fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none' }} />
        <button type="submit" style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600 }}>
          <ArrowRight size={14} /> Search
        </button>
      </form>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9B9B9B', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '12px 0' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Looking up "{searchWord || customWord}"…
          </motion.div>
        )}
        {error && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ color: '#EF4444', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '8px 0' }}>
            {error}
          </motion.div>
        )}
        {results && !loading && (
          <motion.div key={`results-${searchWord}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#F5C518' }}>{results.word}</span>
                {results.found
                  ? <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B' }}>{results.synonyms.length} synonyms</span>
                  : <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>not in dictionary</span>}
              </div>
              <button onClick={() => { setResults(null); setSearchWord(''); }}
                style={{ background: 'none', border: 'none', color: '#9B9B9B', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
            </div>
            {results.found && (
              <>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9B9B9B', pointerEvents: 'none' }} />
                  <input value={filterQuery} onChange={e => setFilterQuery(e.target.value)} placeholder="Filter results…"
                    style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#EDEDEC', fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 2px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                  {filtered.map(syn => (
                    <button key={syn} onClick={() => { setCustomWord(syn); fetchSynonyms(syn); onWordSelect?.(syn); }} title={`Look up "${syn}"`}
                      style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#EDEDEC', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12, transition: 'background 120ms, color 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.12)'; e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#EDEDEC'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                      {syn}
                    </button>
                  ))}
                  {filtered.length === 0 && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B' }}>No matches for "{filterQuery}"</span>}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}

// ── Rhyme Finder ──────────────────────────────────────────

function RhymeFinder({ sharedWord, onWordSelect }) {
  const [word, setWord]               = useState(sharedWord || '');
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [history, setHistory]         = useState([]);
  const inputRef = useRef(null);
  const prevShared = useRef(sharedWord);

  const search = async (w) => {
    const clean = w.trim().toLowerCase();
    if (!clean) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await safeFetch(`${API}/rhyme-find?word=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data);
      setWord(clean);
      setHistory(h => [clean, ...h.filter(x => x !== clean)].slice(0, 8));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (sharedWord && sharedWord !== prevShared.current) {
      prevShared.current = sharedWord;
      setWord(sharedWord);
      search(sharedWord);
    }
  }, [sharedWord]);

  const handleSubmit = (e) => { e.preventDefault(); search(word); onWordSelect?.(word.trim()); };

  const handleWordClick = (w) => { setWord(w); search(w); onWordSelect?.(w); };

  const totalCount = results ? results.perfect.length + results.near.length + results.slant.length : 0;

  return (
    <GlassPanel style={{ padding: 24 }}>
      <SectionHeader icon={Mic2} title="Rhyme Finder"
        subtitle="Find perfect, near, and slant rhymes for any word. Scans the entire CMU Pronouncing Dictionary." />

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          ref={inputRef}
          value={word}
          onChange={e => setWord(e.target.value)}
          placeholder="Enter a word to find rhymes…"
          style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#EDEDEC', fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none', caretColor: '#F5C518' }}
        />
        <button type="submit" style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600 }}>
          <Search size={14} /> Find
        </button>
      </form>

      {/* Recent history */}
      {history.length > 0 && !loading && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {history.map(h => (
            <button key={h} onClick={() => handleWordClick(h)}
              style={{ padding: '3px 10px', borderRadius: 6, background: results?.word === h ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${results?.word === h ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.08)'}`, color: results?.word === h ? '#F5C518' : '#6B6B6B', fontFamily: 'DM Sans, sans-serif', fontSize: 11, cursor: 'pointer' }}>
              {h}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9B9B9B', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '24px 0' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Scanning dictionary for "{word}"… (first search may take a moment)
          </motion.div>
        )}
        {error && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ color: '#EF4444', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '8px 0' }}>
            {error}
          </motion.div>
        )}
        {results && !loading && (
          <motion.div key={`results-${results.word}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 22, fontWeight: 700, color: '#F5C518' }}>{results.word}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#5A5A5A' }}>{totalCount} rhymes found</span>
              </div>
              <button onClick={() => setResults(null)}
                style={{ background: 'none', border: 'none', color: '#9B9B9B', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
            </div>

            {totalCount === 0 ? (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6B6B6B', fontStyle: 'italic' }}>
                No rhymes found — try a different word or spelling.
              </div>
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                <ResultSection
                  label="Perfect" color="#4ADE80"
                  words={results.perfect} onWord={handleWordClick}
                />
                <ResultSection
                  label="Near" color="#F5C518"
                  words={results.near} onWord={handleWordClick}
                />
                <ResultSection
                  label="Slant" color="#C084FC"
                  words={results.slant} onWord={handleWordClick}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}

// ── Dictionary ────────────────────────────────────────────

function Dictionary({ sharedWord, onWordSelect }) {
  const [query, setQuery] = useState(sharedWord || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevShared = useRef(sharedWord);

  const lookup = async (word) => {
    const w = word.trim().toLowerCase();
    if (!w) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
      if (!res.ok) { setError(`No definition found for "${w}"`); return; }
      const data = await res.json();
      setResult(data[0]);
    } catch {
      setError('Could not reach dictionary API.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (sharedWord && sharedWord !== prevShared.current) {
      prevShared.current = sharedWord;
      setQuery(sharedWord);
      lookup(sharedWord);
    }
  }, [sharedWord]);

  const handleKey = (e) => { if (e.key === 'Enter') { lookup(query); onWordSelect?.(query.trim()); } };

  const labelStyle = { fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
    color: '#F5C518', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 };
  const tagStyle = { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontFamily: 'DM Sans, sans-serif',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#CDCDCD', cursor: 'default' };

  return (
    <GlassPanel style={{ padding: 24 }}>
      <SectionHeader icon={BookMarked} title="Dictionary"
        subtitle="Look up definitions, pronunciation, and examples for any word." />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
          placeholder="Look up any word..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#EDEDEC', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
        />
        <button onClick={() => { lookup(query); onWordSelect?.(query.trim()); }} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10,
            background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.35)',
            color: '#F5C518', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
          Look up
        </button>
      </div>

      {error && <p style={{ color: '#FF6B6B', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>{error}</p>}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Word + phonetic */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 800, color: '#F5C518' }}>
              {result.word}
            </span>
            {result.phonetic && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#9B9B9B' }}>
                {result.phonetic}
              </span>
            )}
          </div>

          {/* Meanings */}
          {result.meanings?.map((m, mi) => (
            <div key={mi}>
              <div style={{ ...labelStyle }}>{m.partOfSpeech}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {m.definitions.slice(0, 4).map((d, di) => (
                  <div key={di} style={{ paddingLeft: 12, borderLeft: '2px solid rgba(245,197,24,0.3)' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EDEDEC', margin: 0, lineHeight: 1.6 }}>
                      {d.definition}
                    </p>
                    {d.example && (
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6B6B6B',
                        margin: '4px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{d.example}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

// ── Thesaurus ─────────────────────────────────────────────

function Thesaurus({ sharedWord, onWordSelect }) {
  const [query, setQuery] = useState(sharedWord || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePos, setActivePos] = useState(null);
  const prevShared = useRef(sharedWord);

  const lookup = async (word) => {
    const w = word.trim().toLowerCase();
    if (!w) return;
    setLoading(true); setError(null); setResult(null); setActivePos(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
      if (!res.ok) { setError(`No thesaurus results for "${w}"`); return; }
      const data = await res.json();
      const groups = [];
      for (const entry of data) {
        for (const m of entry.meanings || []) {
          const syns = new Set();
          const ants = new Set();
          for (const d of m.definitions || []) {
            (d.synonyms || []).forEach(s => syns.add(s));
            (d.antonyms || []).forEach(a => ants.add(a));
          }
          (m.synonyms || []).forEach(s => syns.add(s));
          (m.antonyms || []).forEach(a => ants.add(a));
          if (syns.size || ants.size) {
            const existing = groups.find(g => g.pos === m.partOfSpeech);
            if (existing) { syns.forEach(s => existing.synonyms.add(s)); ants.forEach(a => existing.antonyms.add(a)); }
            else groups.push({ pos: m.partOfSpeech, synonyms: syns, antonyms: ants });
          }
        }
      }
      if (!groups.length) { setError(`No synonyms found for "${w}"`); return; }
      setResult({ word: data[0].word, groups });
      setActivePos(groups[0].pos);
    } catch { setError('Could not reach dictionary API.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (sharedWord && sharedWord !== prevShared.current) {
      prevShared.current = sharedWord;
      setQuery(sharedWord);
      lookup(sharedWord);
    }
  }, [sharedWord]);

  const handleKey = (e) => { if (e.key === 'Enter') { lookup(query); onWordSelect?.(query.trim()); } };
  const activeGroup = result?.groups.find(g => g.pos === activePos);

  return (
    <GlassPanel style={{ padding: 24 }}>
      <SectionHeader icon={Layers} title="Thesaurus"
        subtitle="Find synonyms and antonyms for any word." />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
          placeholder="Look up any word..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#EDEDEC', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
        />
        <button onClick={() => { lookup(query); onWordSelect?.(query.trim()); }} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10,
            background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.35)',
            color: '#F5C518', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
          Look up
        </button>
      </div>

      {error && <p style={{ color: '#FF6B6B', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>{error}</p>}

      {result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 800, color: '#F5C518' }}>{result.word}</span>
          </div>
          {result.groups.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {result.groups.map(g => (
                <button key={g.pos} onClick={() => setActivePos(g.pos)}
                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                    background: activePos === g.pos ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${activePos === g.pos ? 'rgba(245,197,24,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: activePos === g.pos ? '#F5C518' : '#9B9B9B', cursor: 'pointer' }}>
                  {g.pos}
                </button>
              ))}
            </div>
          )}
          {activeGroup && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {activeGroup.synonyms.size > 0 && (
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
                    color: '#F5C518', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Synonyms</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[...activeGroup.synonyms].map(s => (
                      <button key={s} onClick={() => { setQuery(s); lookup(s); onWordSelect?.(s); }}
                        style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#CDCDCD', cursor: 'pointer', transition: 'all 120ms' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'; e.currentTarget.style.color = '#F5C518'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#CDCDCD'; }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeGroup.antonyms.size > 0 && (
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
                    color: '#FF6B6B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Antonyms</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[...activeGroup.antonyms].map(a => (
                      <button key={a} onClick={() => { setQuery(a); lookup(a); onWordSelect?.(a); }}
                        style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,80,80,0.2)',
                          color: '#CDCDCD', cursor: 'pointer', transition: 'all 120ms' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,80,80,0.5)'; e.currentTarget.style.color = '#FF6B6B'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,80,80,0.2)'; e.currentTarget.style.color = '#CDCDCD'; }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

// ── Literary Devices ──────────────────────────────────────


const DEVICE_CATEGORIES = ['All', ...new Set(DEVICES.map(d => d.category))];

function LiteraryDevices() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const visible = DEVICES.filter(d => {
    const matchesCat = activeCategory === 'All' || d.category === activeCategory;
    const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.definition.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <GlassPanel style={{ padding: 24 }}>
      <SectionHeader icon={BookOpen} title="Literary Devices"
        subtitle="Full index — common songwriting devices with examples and craft notes, plus 329 classical rhetorical devices from Silva Rhetoricae." />

      {/* Search + category filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5A5A', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search devices..."
            style={{ width: '100%', padding: '9px 10px 9px 30px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#EDEDEC',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEVICE_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                background: activeCategory === cat ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeCategory === cat ? 'rgba(245,197,24,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: activeCategory === cat ? '#F5C518' : '#9B9B9B', cursor: 'pointer' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Device list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(device => {
          const isOpen = expanded === device.name;
          return (
            <div key={device.name} style={{ borderRadius: 10, border: `1px solid ${isOpen ? 'rgba(245,197,24,0.25)' : 'rgba(255,255,255,0.07)'}`,
              background: isOpen ? 'rgba(245,197,24,0.04)' : 'rgba(255,255,255,0.02)', overflow: 'hidden', transition: 'border-color 150ms' }}>

              {/* Header row */}
              <button onClick={() => setExpanded(isOpen ? null : device.name)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: isOpen ? '#F5C518' : '#EDEDEC' }}>
                      {device.name}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontFamily: 'DM Sans, sans-serif',
                      background: 'rgba(255,255,255,0.06)', color: '#6B6B6B', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {device.category}
                    </span>
                  </div>
                  {!isOpen && (
                    <p style={{ margin: '3px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#5A5A5A', lineHeight: 1.4 }}>
                      {device.definition}
                    </p>
                  )}
                </div>
                <span style={{ color: '#4A4A4A', fontSize: 11, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Definition */}
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#F5C518',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Definition</div>
                    <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#CDCDCD', lineHeight: 1.6 }}>
                      {device.definition}
                    </p>
                  </div>

                  {/* Examples — only if present */}
                  {device.examples && device.examples.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#F5C518',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Examples</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {device.examples.map((ex, i) => (
                          <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.25)',
                            borderLeft: '2px solid rgba(245,197,24,0.4)' }}>
                            <p style={{ margin: 0, fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#EDEDEC',
                              fontStyle: 'italic', lineHeight: 1.5 }}>
                              "{ex.line}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* How it elevates — only if present */}
                  {device.elevates && (
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#4ADE80',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>How it elevates expression</div>
                      <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#CDCDCD', lineHeight: 1.6 }}>
                        {device.elevates}
                      </p>
                    </div>
                  )}

                  {/* Craft tip — only if present */}
                  {device.tip && (
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(245,197,24,0.06)',
                      border: '1px solid rgba(245,197,24,0.15)' }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#F5C518',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Craft tip</div>
                      <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B', lineHeight: 1.6 }}>
                        {device.tip}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

// ── Tab bar ───────────────────────────────────────────────

const TABS = [
  { id: 'motif',      label: 'Motif Dictionary',   icon: BookOpen   },
  { id: 'rhyme',      label: 'Rhyme Finder',        icon: Mic2       },
  { id: 'dictionary', label: 'Dictionary',           icon: BookMarked },
  { id: 'thesaurus',  label: 'Thesaurus',            icon: Layers     },
  { id: 'devices',    label: 'Literary Devices',     icon: BookOpen   },
];

// ── Page ──────────────────────────────────────────────────

const PINNABLE_TOOLS = TABS.map(t => ({
  id: `tool-${t.id}`,
  label: t.label,
  type: 'tool',
  subtitle: 'Tool',
  path: '/tools',
}));

export default function ToolsPage() {
  useRegisterPinnableItems(PINNABLE_TOOLS);
  const [tab, setTab] = useState('motif');
  const [sharedWord, setSharedWord] = useState('');

  // Hide the global HeroWaveBackground (caution tape shader) while on this page
  useEffect(() => {
    const el = document.querySelector('[data-hero-wave]');
    if (el) el.style.display = 'none';
    return () => { if (el) el.style.display = ''; };
  }, []);

  return (
    <>
      {/* Fixed backgrounds — sit above HeroWave (z:0) and ShaderBackground content (z:1) */}
      <div style={{ position: 'fixed', inset: 0, background: '#030305', zIndex: 10, pointerEvents: 'none' }} />
      <DottedSurface style={{ zIndex: 11 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,5,0.28)', zIndex: 12, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 13, height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 800, color: '#EDEDEC', margin: 0 }}>
            Tools
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9B9B9B', marginTop: 6 }}>
            Craft utilities for lyric writing
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {TABS.map(t => {
            const pinItem = PINNABLE_TOOLS.find(p => p.id === `tool-${t.id}`);
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: 10,
                    background: tab === t.id ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${tab === t.id ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: tab === t.id ? '#F5C518' : '#9B9B9B',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
                <PinButton item={pinItem} size="xs" />
              </div>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'motif'      && <MotifDictionary  sharedWord={sharedWord} onWordSelect={setSharedWord} />}
            {tab === 'rhyme'      && <RhymeFinder      sharedWord={sharedWord} onWordSelect={setSharedWord} />}
            {tab === 'dictionary' && <Dictionary        sharedWord={sharedWord} onWordSelect={setSharedWord} />}
            {tab === 'thesaurus'  && <Thesaurus         sharedWord={sharedWord} onWordSelect={setSharedWord} />}
            {tab === 'devices'    && <LiteraryDevices />}
          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

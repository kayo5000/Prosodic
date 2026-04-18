import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Music, MessageSquare, FolderKanban, ArrowUpRight } from 'lucide-react';
import GlassFilter from '../components/ui/GlassFilter';

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'songs',    label: 'Songs',    icon: Music },
  { id: 'chats',    label: 'Chats',    icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
];

const RECENT_SEARCHES = [
  'verse flow analysis',
  'multisyllabic rhymes',
  'pocket position',
];

const MOCK_RESULTS = [
  { id: 1, type: 'songs',    title: 'Made It Out',        sub: 'Verse 1 — BPM 93 · Last edited 2 days ago',   icon: Music },
  { id: 2, type: 'chats',    title: 'Analyze my flow',    sub: 'Chat session · 14 messages · Apr 1',           icon: MessageSquare },
  { id: 3, type: 'songs',    title: 'Echoes',             sub: 'Hook + Verse 2 — BPM 85 · Last edited 3 days ago', icon: Music },
  { id: 4, type: 'projects', title: 'Debut EP',           sub: '4 songs · In progress',                        icon: FolderKanban },
  { id: 5, type: 'chats',    title: 'Rhyme scheme help',  sub: 'Chat session · 8 messages · Mar 29',           icon: MessageSquare },
  { id: 6, type: 'songs',    title: 'No Cap',             sub: 'Verse 1 — BPM 97 · Last edited 5 days ago',   icon: Music },
  { id: 7, type: 'projects', title: 'Collab — Fade Away', sub: '2 songs · Draft',                              icon: FolderKanban },
  { id: 8, type: 'chats',    title: 'Pocket + BPM grid',  sub: 'Chat session · 22 messages · Mar 27',          icon: MessageSquare },
];

const TYPE_COLOR = {
  songs:    { bg: 'rgba(245,197,24,0.1)',  border: 'rgba(245,197,24,0.25)',  text: '#F5C518' },
  chats:    { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  text: '#60A5FA' },
  projects: { bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)', text: '#C084FC' },
};

function GlassSearchInput({ value, onChange, onClear, inputRef }) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <div className="absolute inset-0 rounded-2xl" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(15,15,20,0.55)', border: '1px solid rgba(255,255,255,0.1)' }} />
      <div className="relative z-10 flex items-center px-5 gap-4" style={{ height: 60 }}>
        <Search size={20} color={value ? '#F5C518' : '#9B9B9B'} strokeWidth={2} style={{ flexShrink: 0, transition: 'color 200ms' }} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Search songs, chats, projects…"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none text-base"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 16,
            color: '#EDEDEC',
            caretColor: '#F5C518',
          }}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onClick={onClear}
              className="flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}
            >
              <X size={13} color="#9B9B9B" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FilterPill({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-sm transition-all duration-150"
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.07)',
        color: active ? '#F5C518' : '#9B9B9B',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function ResultCard({ result, index }) {
  const [hovered, setHovered] = useState(false);
  const colors = TYPE_COLOR[result.type];
  const Icon = result.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-150"
      style={{
        background: hovered ? 'rgba(25,25,30,0.75)' : 'rgba(15,15,20,0.55)',
        border: hovered ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Icon */}
      <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: colors.bg, border: `1px solid ${colors.border}` }}>
        <Icon size={16} color={colors.text} strokeWidth={2} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#EDEDEC', marginBottom: 2 }}>
          {result.title}
        </p>
        <p className="truncate" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B' }}>
          {result.sub}
        </p>
      </div>

      {/* Type badge */}
      <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontFamily: 'DM Sans, sans-serif' }}>
        {result.type}
      </span>

      {/* Arrow */}
      <ArrowUpRight size={14} color={hovered ? '#F5C518' : '#2E2E2E'} style={{ flexShrink: 0, transition: 'color 150ms' }} />
    </motion.div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = MOCK_RESULTS.filter(r => {
    const matchesFilter = filter === 'all' || r.type === filter;
    const matchesQuery = !query || r.title.toLowerCase().includes(query.toLowerCase()) || r.sub.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="flex flex-col items-center min-h-screen px-6 pt-24 pb-16">
      <GlassFilter />

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 36, fontWeight: 700, color: '#EDEDEC', letterSpacing: '0.06em', marginBottom: 6 }}>
          SEARCH
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9B9B9B' }}>
          Find any song, chat, or project
        </p>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full mb-4"
        style={{ maxWidth: 640 }}
      >
        <GlassSearchInput
          value={query}
          onChange={e => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          inputRef={inputRef}
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="flex gap-2 mb-8"
        style={{ maxWidth: 640, width: '100%' }}
      >
        {FILTERS.map(f => (
          <FilterPill key={f.id} label={f.label} active={filter === f.id} onClick={() => setFilter(f.id)} />
        ))}
      </motion.div>

      {/* Recent searches — shown when input is empty */}
      <AnimatePresence>
        {!query && (
          <motion.div
            key="recents"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full mb-6"
            style={{ maxWidth: 640 }}
          >
            <p className="mb-3 flex items-center gap-2" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Clock size={11} /> Recent
            </p>
            <div className="flex flex-wrap gap-2">
              {RECENT_SEARCHES.map(s => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3 py-1.5 rounded-full transition-all duration-150"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#EDEDEC'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#9B9B9B'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="w-full flex flex-col gap-2" style={{ maxWidth: 640 }}>
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9B9B9B' }}>No results for "{query}"</p>
          </motion.div>
        ) : (
          filtered.map((r, i) => <ResultCard key={r.id} result={r} index={i} />)
        )}
      </div>
    </div>
  );
}

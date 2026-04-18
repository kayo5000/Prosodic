import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Search, Plus, Clock, Zap, ArrowUpRight, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassFilter from '../components/ui/GlassFilter';
import MetalButton from '../components/ui/MetalButton';
import { useRegisterPinnableItems } from '../state/PinnableContext';
import PinButton from '../components/ui/PinButton';

const SONGS = [
  { id: 1, title: 'Made It Out',   section: 'Verse 1',   bpm: 93, project: 'Dark Matter',          lines: 8,  updated: 'Today' },
  { id: 2, title: 'No Cap',        section: 'Verse 1',   bpm: 97, project: 'Dark Matter',          lines: 12, updated: 'Today' },
  { id: 3, title: 'Echoes',        section: 'Hook',      bpm: 85, project: 'Dark Matter',          lines: 4,  updated: 'Yesterday' },
  { id: 4, title: 'Static',        section: 'Verse 2',   bpm: 93, project: 'Dark Matter',          lines: 8,  updated: 'Yesterday' },
  { id: 5, title: 'Fade Away',     section: 'Freestyle', bpm: 88, project: 'Freestyle Pack',       lines: 16, updated: 'Apr 1' },
  { id: 6, title: 'Off the Dome',  section: 'Freestyle', bpm: 102,project: 'Freestyle Pack',       lines: 6,  updated: 'Mar 30' },
  { id: 7, title: 'Gravity',       section: 'Bridge',    bpm: 78, project: 'Collab — Verse Drafts', lines: 4, updated: 'Mar 29' },
  { id: 8, title: 'Pull Up',       section: 'Verse 1',   bpm: 110,project: 'Collab — Verse Drafts', lines: 10,updated: 'Mar 27' },
];

const PROJECTS = ['All', 'Dark Matter', 'Freestyle Pack', 'Collab — Verse Drafts'];

function SongCard({ song, index, pinItem }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate('/new-song')}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-150"
      style={{
        background: hovered ? 'rgba(25,25,30,0.75)' : 'rgba(15,15,20,0.55)',
        border: hovered ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: hovered ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 flex items-center justify-center rounded-xl"
        style={{ width: 42, height: 42, background: hovered ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.04)', border: hovered ? '1px solid rgba(245,197,24,0.2)' : '1px solid rgba(255,255,255,0.07)', transition: 'all 150ms' }}>
        <Music size={16} color={hovered ? '#F5C518' : '#9B9B9B'} strokeWidth={1.8} style={{ transition: 'color 150ms' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#EDEDEC', marginBottom: 3 }}>
          {song.title}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B' }}>
            {song.section}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B' }}>·</span>
          <div className="flex items-center gap-1" style={{ color: '#9B9B9B' }}>
            <FolderKanban size={11} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>{song.project}</span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.15)' }}>
          <Zap size={10} color="#F5C518" />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#F5C518' }}>{song.bpm}</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: '#9B9B9B' }}>
          <Clock size={10} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>{song.updated}</span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B' }}>
          {song.lines} lines
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <PinButton item={pinItem} size="sm" />
        <ArrowUpRight size={14} color={hovered ? '#F5C518' : 'transparent'} style={{ transition: 'color 150ms' }} />
      </div>
    </motion.div>
  );
}

const PINNABLE_SONGS = SONGS.map(s => ({
  id: `song-${s.id}`,
  label: s.title,
  type: 'song',
  subtitle: s.project,
  path: '/new-song',
}));

export default function SongsPage() {
  useRegisterPinnableItems(PINNABLE_SONGS);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('All');

  const filtered = SONGS.filter(s => {
    const matchProject = project === 'All' || s.project === project;
    const matchQuery = !query || s.title.toLowerCase().includes(query.toLowerCase()) || s.section.toLowerCase().includes(query.toLowerCase());
    return matchProject && matchQuery;
  });

  return (
    <div className="flex flex-col items-center min-h-screen px-6 pt-24 pb-16">
      <GlassFilter />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex items-center justify-between mb-8"
        style={{ maxWidth: 680 }}
      >
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 36, fontWeight: 700, color: '#EDEDEC', letterSpacing: '0.06em', marginBottom: 4 }}>
            SONGS
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B' }}>
            {SONGS.length} sessions
          </p>
        </div>
        <MetalButton onClick={() => navigate('/new-song')} size="sm">
          <Plus size={14} style={{ marginRight: 6, display: 'inline' }} />
          New Song
        </MetalButton>
      </motion.div>

      {/* Search + filter row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full mb-6 flex gap-3"
        style={{ maxWidth: 680 }}
      >
        {/* Search */}
        <div className="relative flex items-center flex-1 rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', height: 44 }}>
          <Search size={15} color="#4A4A4A" style={{ position: 'absolute', left: 14 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs…"
            className="w-full bg-transparent outline-none"
            style={{ padding: '0 14px 0 40px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EDEDEC', caretColor: '#F5C518' }}
          />
        </div>

        {/* Project filter pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {PROJECTS.map(p => (
            <button
              key={p}
              onClick={() => setProject(p)}
              className="px-3 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap"
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                fontWeight: project === p ? 600 : 400,
                background: project === p ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
                border: project === p ? '1px solid rgba(245,197,24,0.3)' : '1px solid rgba(255,255,255,0.07)',
                color: project === p ? '#F5C518' : '#9B9B9B',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Song list */}
      <div className="w-full flex flex-col gap-2" style={{ maxWidth: 680 }}>
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-3">
            <Music size={28} color="#2E2E2E" strokeWidth={1.4} />
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9B9B9B' }}>No songs match</p>
          </motion.div>
        ) : (
          filtered.map((song, i) => <SongCard key={song.id} song={song} index={i} pinItem={PINNABLE_SONGS.find(p => p.id === `song-${song.id}`)} />)
        )}
      </div>
    </div>
  );
}

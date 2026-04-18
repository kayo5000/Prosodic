import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowUpRight, Search, Plus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassFilter from '../components/ui/GlassFilter';
import MetalButton from '../components/ui/MetalButton';
import { useRegisterPinnableItems } from '../state/PinnableContext';
import PinButton from '../components/ui/PinButton';

const CHATS = [
  { id: 1, title: 'Analyze my flow',         preview: 'Your pocket position on bars 3 and 7 is syncopated — here\'s why that works…', summary: 'Discussed pocket position and syncopation', date: 'Today',      messages: 14 },
  { id: 2, title: 'Rhyme scheme breakdown',   preview: 'The ER family (turnt/merch/diverse) recurs across 4 lines — that\'s strong motif density…', summary: 'Analyzed rhyme families and motif recurrence', date: 'Today',      messages: 8 },
  { id: 3, title: 'Writing session — No Cap', preview: 'Here\'s a multisyllabic option for the second bar: "navigate the static"…', summary: 'Worked on multisyllabic rhymes and flow', date: 'Yesterday',  messages: 22 },
  { id: 4, title: 'BPM grid walkthrough',     preview: 'At 93 BPM your 16th note grid falls at 161ms intervals. Bar 5 is floating…', summary: 'Mapped out BPM grid and floating bars', date: 'Yesterday',  messages: 11 },
  { id: 5, title: 'Hook feedback — Echoes',   preview: 'The EAR family in cheers/years/naysayers is your strongest cross-line compound…', summary: 'Reviewed cross-word boundary rhymes', date: 'Apr 1',      messages: 7 },
  { id: 6, title: 'Verse structure ideas',    preview: 'Rest bars are first-class devices — the silence on bar 8 earns the reload…', summary: 'Talked about rest bars and compositional spacing', date: 'Mar 30',     messages: 19 },
  { id: 7, title: 'Pocket + syncopation',     preview: 'Floating syllables before the beat create tension that resolves on beat 4…', summary: 'Explored syncopation and tension on beat 4', date: 'Mar 29',     messages: 6 },
  { id: 8, title: 'Multisyllabic deep dive',  preview: 'winnin/thinnin is a compound rhyme — two phoneme families stacked (IN + ING)…', summary: 'Analyzed compound rhymes and stacked phonemes', date: 'Mar 27',     messages: 31 },
];

function ChatCard({ chat, index, pinItem }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/chat/${chat.id}`)}
      className="flex items-start gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-150"
      style={{
        background: hovered ? 'rgba(25,25,30,0.75)' : 'rgba(15,15,20,0.55)',
        border: hovered ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: hovered ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 flex items-center justify-center rounded-xl mt-0.5"
        style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <MessageSquare size={16} color={hovered ? '#F5C518' : '#9B9B9B'} strokeWidth={1.8} style={{ transition: 'color 150ms' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#EDEDEC', marginBottom: 4 }}>
          {chat.title}
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B', marginBottom: 3 }}>
          {chat.summary}
        </p>
        <p className="truncate" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B', lineHeight: 1.5 }}>
          {chat.preview}
        </p>
      </div>

      {/* Meta */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1" style={{ color: '#9B9B9B' }}>
          <Clock size={11} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>{chat.date}</span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B' }}>
          {chat.messages} msgs
        </span>
        <PinButton item={pinItem} size="xs" />
        <ArrowUpRight size={13} color={hovered ? '#F5C518' : 'transparent'} style={{ transition: 'color 150ms' }} />
      </div>
    </motion.div>
  );
}

const PINNABLE_CHATS = CHATS.map(c => ({
  id: `chat-${c.id}`,
  label: c.title,
  type: 'chat',
  subtitle: `${c.messages} messages · ${c.date}`,
  path: `/chat/${c.id}`,
}));

export default function ChatsPage() {
  useRegisterPinnableItems(PINNABLE_CHATS);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = CHATS.filter(c =>
    !query || c.title.toLowerCase().includes(query.toLowerCase()) || c.preview.toLowerCase().includes(query.toLowerCase())
  );

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
            CHATS
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B' }}>
            {CHATS.length} conversations
          </p>
        </div>
        <MetalButton onClick={() => navigate('/')} size="sm">
          <Plus size={14} style={{ marginRight: 6, display: 'inline' }} />
          New Chat
        </MetalButton>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full mb-6"
        style={{ maxWidth: 680 }}
      >
        <div className="relative flex items-center rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', height: 44 }}>
          <Search size={15} color="#4A4A4A" style={{ position: 'absolute', left: 16 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter chats…"
            className="w-full bg-transparent outline-none"
            style={{ padding: '0 16px 0 44px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EDEDEC', caretColor: '#F5C518' }}
          />
        </div>
      </motion.div>

      {/* Chat list */}
      <div className="w-full flex flex-col gap-2" style={{ maxWidth: 680 }}>
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9B9B9B' }}>No chats match "{query}"</p>
          </motion.div>
        ) : (
          filtered.map((chat, i) => <ChatCard key={chat.id} chat={chat} index={i} pinItem={PINNABLE_CHATS.find(p => p.id === `chat-${chat.id}`)} />)
        )}
      </div>
    </div>
  );
}

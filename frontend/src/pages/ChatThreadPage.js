import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowLeft, Sparkles, Copy, RotateCcw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlassFilter from '../components/ui/GlassFilter';
import ShaderLines from '../components/ui/ShaderLines';

const MOCK_THREAD = [
  {
    id: 1,
    role: 'user',
    text: 'Analyze my flow on this verse:\n\n"And I swear that it\'s turnt\nIt all begins with encore cheers\nFrom those wearin\' my merch\nFast forward through years of rehearsal"',
  },
  {
    id: 2,
    role: 'assistant',
    text: 'Strong phonetic density here. Let me break it down:\n\n**Rhyme Families Detected**\n\n— **ER family** (`turnt / merch / rehearsal`) — three-way recurrence across lines 1, 3, and 4. That\'s motif-level density.\n\n— **EAR family** (`cheers / years`) — cross-line compound, lines 2 and 4. Strong end-rhyme anchor.\n\n**Flow Analysis @ 93 BPM**\n\nLine 1 ("And I swear that it\'s turnt") sits slightly ahead of the beat — you\'re floating the "swear" into beat 2, which creates tension that resolves on "turnt." That\'s intentional syncopation.\n\nLine 3 ("From those wearin\' my merch") — pocket position is on-grid. The contraction "wearin\'" compresses the syllable count correctly for the 16th-note grid.\n\n**Density Score**\n- Internal rhyme: 74%\n- Multisyllabic: 61%\n- Motif recurrence: 88%\n\nThe ER family recurrence is doing a lot of heavy lifting. Consider building on it in the next 4 bars.',
  },
  {
    id: 3,
    role: 'user',
    text: 'What about the compound rhymes? I feel like "winnin/thinnin" is doing something special',
  },
  {
    id: 4,
    role: 'assistant',
    text: 'You\'re right — "winnin/thinnin" is a stacked compound rhyme, not just a simple end-rhyme.\n\n**Why it works:**\n\nBoth words share two phoneme families simultaneously:\n\n1. **IN family** — the stressed vowel (`wIN-nin`, `thIN-nin`)\n2. **ING family** — the unstressed suffix (`win-NIN`, `thin-NIN`)\n\nStacking two families in the same rhyme pair creates what we call a **compound match** — the syllable overlap is 100%, which is why it hits harder than a single-family rhyme like `cheers/years`.\n\n**Cross-word boundary detection:**\n\n"blessed I / stressin" across the next bars also fires — the phoneme boundary lands mid-word on "stressin" but the EH-S cluster matches "blessed." That\'s elite-level craft. Most writers don\'t hear that one consciously.\n\nWant me to map the full rhyme network across all 8 bars?',
  },
];

function UserBubble({ message, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-end"
    >
      <div
        style={{
          maxWidth: 520,
          background: 'rgba(15,15,20,0.55)',
          border: '1px solid rgba(245,197,24,0.2)',
          borderRadius: '18px 18px 4px 18px',
          padding: '12px 16px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          color: '#EDEDEC',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {message.text}
        </p>
      </div>
    </motion.div>
  );
}

function AssistantBubble({ message, index }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} style={{ color: '#EDEDEC', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      // Bullet lines starting with —
      if (line.startsWith('—') || line.startsWith('-')) {
        return (
          <div key={i} className="flex gap-2" style={{ marginBottom: 4 }}>
            <span style={{ color: '#F5C518', flexShrink: 0 }}>—</span>
            <span>{parts}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
      return <div key={i} style={{ marginBottom: 2 }}>{parts}</div>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-start"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ maxWidth: 580 }}>
        {/* Avatar */}
        <div className="flex items-center gap-2 mb-2">
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5C518, #9B873F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={11} color="#000" />
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#9B9B9B' }}>
            VEIL
          </span>
        </div>

        {/* Bubble */}
        <div
          style={{
            background: 'rgba(15,15,20,0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px 18px 18px 18px',
            padding: '14px 18px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: '#9B9B9B',
            lineHeight: 1.75,
          }}>
            {renderText(message.text)}
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 mt-2 pl-1"
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-120"
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                  color: copied ? '#F5C518' : '#9B9B9B',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <Copy size={11} />
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-120"
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <RotateCcw size={11} />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
    >
      <div style={{ maxWidth: 580 }}>
        <div className="flex items-center gap-2 mb-2">
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5C518, #9B873F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={11} color="#000" />
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#9B9B9B' }}>
            VEIL
          </span>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: '4px 18px 18px 18px',
          padding: '14px 18px',
          backdropFilter: 'blur(40px) saturate(180%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.5)',
          display: 'flex', gap: 5, alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#9B9B9B' }}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── VEIL intro overlay ───────────────────────────────────────────────────────

function VeilIntro({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Shader lines in the background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.6 }}>
        <ShaderLines style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />

      {/* Content */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Glow ring behind the name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            width: 220, height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,197,24,0.18) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
        />

        {/* V E I L wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
          transition={{ delay: 0.25, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: '0.22em',
            color: '#EDEDEC',
            lineHeight: 1,
            textShadow: '0 0 60px rgba(245,197,24,0.45), 0 0 120px rgba(245,197,24,0.15)',
          }}
        >
          VEIL
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: '0.28em',
            color: '#9B9B9B',
            textTransform: 'uppercase',
          }}
        >
          Craft Intelligence
        </motion.p>

        {/* Thin gold rule that draws in */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 48, height: 1,
            background: 'linear-gradient(90deg, transparent, #F5C518, transparent)',
            transformOrigin: 'center',
          }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatThreadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState(() => {
    const initial = location.state?.initialMessage;
    if (initial) return [{ id: Date.now(), role: 'user', text: initial }];
    return MOCK_THREAD;
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const text = input.trim();
    setInput('');
    const nextMessages = [...messages, { id: Date.now(), role: 'user', text }];
    setMessages(nextMessages);
    setTyping(true);
    try {
      const res = await fetch('http://localhost:5000/veil/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      setTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.reply || 'VEIL encountered an issue. Try again.',
      }]);
    } catch {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'Unable to reach VEIL. Make sure the backend is running.',
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: '#000' }}>
      <AnimatePresence>
        {showIntro && <VeilIntro onDone={() => setShowIntro(false)} />}
      </AnimatePresence>

      <GlassFilter />

      {/* Shader Lines background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <ShaderLines style={{ width: '100%', height: '100%' }} />
        {/* Scrim — just enough to keep text legible without killing the effect */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)' }} />
      </div>

      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{
          position: 'relative', zIndex: 1,
          height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(32px) saturate(180%)',
          background: 'rgba(0,0,0,0.45)',
          paddingLeft: 20,
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 transition-all duration-150"
          style={{ color: '#9B9B9B', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}
          onMouseEnter={e => e.currentTarget.style.color = '#EDEDEC'}
          onMouseLeave={e => e.currentTarget.style.color = '#9B9B9B'}
        >
          <ArrowLeft size={15} />
          New Chat
        </button>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#EDEDEC' }}>
          Analyze my flow
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '32px 0', position: 'relative', zIndex: 1 }}>
        <div className="flex flex-col gap-6 mx-auto" style={{ maxWidth: 720, padding: '0 24px' }}>
          {messages.map((msg, i) =>
            msg.role === 'user'
              ? <UserBubble key={msg.id} message={msg} index={i} />
              : <AssistantBubble key={msg.id} message={msg} index={i} />
          )}
          <AnimatePresence>
            {typing && <TypingIndicator key="typing" />}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0"
        style={{
          position: 'relative', zIndex: 1,
          padding: '12px 24px 20px',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(40px) saturate(180%)',
          background: 'rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="relative mx-auto flex items-center gap-3 rounded-2xl"
          style={{
            maxWidth: 720,
            background: 'rgba(15,15,20,0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 14px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your verse, rhyme schemes, flow…"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              color: '#EDEDEC',
              caretColor: '#F5C518',
              lineHeight: 1.6,
              overflowY: 'hidden',
            }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{
              width: 34, height: 34,
              background: input.trim() && !typing ? 'linear-gradient(135deg, #F5C518, #9B873F)' : 'rgba(255,255,255,0.1)',
              boxShadow: input.trim() && !typing ? '0 0 16px rgba(245,197,24,0.35)' : 'none',
              border: 'none',
              cursor: !input.trim() || typing ? 'default' : 'pointer',
              transition: 'background 200ms, box-shadow 200ms',
              marginBottom: 2,
            }}
          >
            <ArrowUp size={15} color={input.trim() && !typing ? '#000' : '#555'} strokeWidth={2.5} />
          </motion.button>
        </div>
        <p className="text-center mt-2" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#2E2E2E' }}>
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

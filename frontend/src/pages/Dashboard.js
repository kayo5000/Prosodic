import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ShaderBackground from '../components/ui/ShaderBackground';
import SideNav from '../components/layout/SideNav';
import { TimerProvider } from '../state/TimerContext';
import { useTimer } from '../state/TimerContext';
import NewChatPage from './NewChatPage';
import SearchPage from './SearchPage';
import ChatsPage from './ChatsPage';
import ProjectsPage from './ProjectsPage';
import NewSongPage from './NewSongPage';
import SongViewPage from './SongViewPage';
import SongsPage from './SongsPage';
import ChatThreadPage from './ChatThreadPage';
import FreewritePage from './FreewritePage';
import ToolsPage from './ToolsPage';
import NotepadPage from './NotepadPage';
import { PinnableProvider } from '../state/PinnableContext';
import { X } from 'lucide-react';

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function lerpHex(a, b, t) {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function timerColor(pct) {
  if (pct >= 0.5) return lerpHex('#4ADE80', '#F5C518', 1 - (pct - 0.5) * 2);
  return lerpHex('#F5C518', '#EF4444', 1 - pct * 2);
}

function FloatingTimer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { remaining, target, running, expired, reset } = useTimer();
  const visible = (running || expired) && location.pathname !== '/freewrite';
  const pct = target > 0 ? remaining / target : 0;
  const color = expired ? '#EF4444' : timerColor(pct);
  const pctElapsed = 1 - pct;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', top: 14, right: 20, zIndex: 999,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(15,15,20,0.75)',
            border: `1px solid ${color}55`,
            borderRadius: 12,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            overflow: 'hidden',
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}22`,
            transition: 'border-color 1.5s ease, box-shadow 1.5s ease',
          }}
        >
          {/* Progress bar along bottom edge */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', width: `${pctElapsed * 100}%`,
              background: color,
              boxShadow: `0 0 6px ${color}`,
              transition: 'width 1s linear, background 1.5s ease',
            }} />
          </div>

          {/* Clickable area → back to freewrite */}
          <button
            onClick={() => navigate('/freewrite')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px 10px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            {/* Mini arc */}
            <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
              <svg width={28} height={28} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={14} cy={14} r={11} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
                <circle
                  cx={14} cy={14} r={11} fill="none"
                  stroke={color} strokeWidth={2.5} strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 11}`}
                  strokeDashoffset={`${2 * Math.PI * 11 * pctElapsed}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 1.5s ease' }}
                />
              </svg>
            </div>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700,
              color, letterSpacing: '0.05em',
              transition: 'color 1.5s ease',
            }}>
              {expired ? 'Done' : formatTime(remaining)}
            </span>
          </button>

          {/* X — end timer */}
          <button
            onClick={reset}
            style={{
              width: 28, height: 28, borderRadius: 7, marginRight: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0,
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            title="End timer"
          >
            <X size={11} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlaceholderPage({ name }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: '#9B9B9B' }}>{name}</p>
    </div>
  );
}

// Wraps each page with enter/exit animation
function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1,    filter: 'blur(0px)' }}
      exit={{    opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    // mode="wait" — old page fully exits before new one enters
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"          element={<Page><NewChatPage /></Page>} />
        <Route path="/search"    element={<Page><SearchPage /></Page>} />
        <Route path="/chats"     element={<Page><ChatsPage /></Page>} />
        <Route path="/projects"  element={<Page><ProjectsPage /></Page>} />
        <Route path="/progress"  element={<Page><PlaceholderPage name="Progress" /></Page>} />
        <Route path="/notepad"   element={<Page><NotepadPage /></Page>} />
        <Route path="/songs"     element={<Page><SongsPage /></Page>} />
        <Route path="/chat/:id"  element={<Page><ChatThreadPage /></Page>} />
        <Route path="/new-song"   element={<Page><SongViewPage /></Page>} />
        <Route path="/song-view"  element={<Page><SongViewPage /></Page>} />
        <Route path="/freewrite"  element={<Page><FreewritePage /></Page>} />
        <Route path="/tools"      element={<Page><ToolsPage /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function Dashboard() {
  return (
    <TimerProvider>
      <PinnableProvider>
      <ShaderBackground>
        <SideNav />
        <FloatingTimer />
        {/* Offset content so nothing hides behind the 60px icon rail */}
        <div style={{ marginLeft: 60 }}>
          <AnimatedRoutes />
        </div>
      </ShaderBackground>
      </PinnableProvider>
    </TimerProvider>
  );
}

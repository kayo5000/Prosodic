import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquarePlus, Search, MessageSquare, FolderKanban,
  BarChart3, Music, FileAudio, ChevronRight, PenLine, Wrench,
  Pin, X, NotebookPen, Zap,
} from 'lucide-react';
import { usePins, MAX_PINS } from '../../state/PinnableContext';

const RAIL_W = 64;
const OPEN_W = 260;

const NAV_ITEMS = [
  { label: 'New Chat',   icon: MessageSquarePlus, path: '/' },
  { label: 'Search',     icon: Search,            path: '/search' },
  { label: 'Chats',      icon: MessageSquare,     path: '/chats' },
  { label: 'Projects',   icon: FolderKanban,      path: '/projects' },
  { label: 'Progress',   icon: BarChart3,         path: '/progress' },
  { label: 'Songs',      icon: Music,             path: '/songs' },
  { label: 'New Song',   icon: FileAudio,         path: '/new-song' },
  { label: 'Freewrite',  icon: PenLine,           path: '/freewrite' },
  { label: 'Tools',      icon: Wrench,            path: '/tools' },
  { label: 'Notepad',    icon: NotebookPen,       path: '/notepad' },
];

// Type config — icon + color per pin type
const PIN_TYPES = {
  song:       { icon: Music,         color: '#F5C518' },
  chat:       { icon: MessageSquare, color: '#38BDF8' },
  project:    { icon: FolderKanban,  color: '#A78BFA' },
  freewrite:  { icon: PenLine,       color: '#4ADE80' },
  challenge:  { icon: Zap,           color: '#FB923C' },
  tool:       { icon: Wrench,        color: '#94A3B8' },
};

function getPinType(type) {
  return PIN_TYPES[type] || PIN_TYPES.tool;
}


export default function SideNav() {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();
  const location        = useLocation();
  const { pins, removePin } = usePins();

  const go = (path) => {
    navigate(path);
    if (path.startsWith('/chat')) setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(3px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Panel ─────────────────────────────────────────────────────── */}
      <motion.div
        animate={{ width: open ? OPEN_W : RAIL_W }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed', top: 0, left: 0, height: '100dvh', zIndex: 50,
          display: 'flex', flexDirection: 'column',
          background: '#09090b',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Logo / toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Collapse' : 'Expand menu'}
          style={{
            display: 'flex', alignItems: 'center',
            padding: '16px 0', flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ width: RAIL_W, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, flexShrink: 0,
              backgroundImage: 'url(/logo.png)',
              backgroundSize: '185%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
            }} />
          </div>
          <AnimatePresence>
            {open && (
              <motion.span
                key="wordmark"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2, delay: 0.08 }}
                style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 17, fontWeight: 700, color: '#EDEDEC', whiteSpace: 'nowrap' }}
              >
                Prosodic
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* ── Nav items ─────────────────────────────────────────────── */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0', flexShrink: 0 }}>
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => go(path)}
                title={!open ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  width: '100%', height: 38,
                  borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: '1px solid transparent',
                  color: active ? '#F5C518' : '#9B9B9B',
                  transition: 'color 130ms',
                  flexShrink: 0, overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#EDEDEC'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#9B9B9B'; }}
              >
                <div style={{ width: RAIL_W, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'rgba(245,197,24,0.14)' : 'transparent',
                    border: active ? '1px solid rgba(245,197,24,0.28)' : '1px solid transparent',
                    transition: 'background 150ms, border 150ms',
                  }}>
                    <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                </div>
                <AnimatePresence>
                  {open && (
                    <motion.span
                      key={`lbl-${path}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.18, delay: 0.06 }}
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
                      }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {open && active && (
                  <ChevronRight size={12} style={{ marginRight: 10, opacity: 0.45, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Collapsed rail: pin dots ───────────────────────────────── */}
        {!open && pins.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '6px 0 4px' }}>
            {pins.map(pin => {
              const pt   = getPinType(pin.type);
              const Icon = pt.icon;
              return (
                <button
                  key={pin.id}
                  title={`📌 ${pin.label}`}
                  onClick={() => go(pin.path || '/')}
                  style={{
                    width: RAIL_W, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: pt.color + 'AA', transition: 'color 130ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = pt.color}
                  onMouseLeave={e => e.currentTarget.style.color = pt.color + 'AA'}
                >
                  <Icon size={14} strokeWidth={1.8} />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Expanded: Pins + Recents ───────────────────────────────── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="expanded-bottom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: 0.1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 12 }}
            >
              <div style={{ margin: '8px 14px 0', height: 1, background: 'rgba(255,255,255,0.06)' }} />

              {/* Pins header */}
              <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pin size={10} color="#9B9B9B" strokeWidth={2} />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                  color: '#9B9B9B', letterSpacing: '0.1em', textTransform: 'uppercase',
                  flex: 1,
                }}>
                  Pinned
                </span>
                {pins.length > 0 && (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, color: 'rgba(155,155,155,0.4)' }}>
                    {pins.length}/{MAX_PINS}
                  </span>
                )}
              </div>

              {/* Pin list */}
              {pins.length === 0 ? (
                <div style={{
                  margin: '2px 14px 6px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px dashed rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Pin size={11} color="rgba(155,155,155,0.3)" />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(155,155,155,0.35)' }}>
                    Pin items from any page
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 4 }}>
                  {pins.map(pin => {
                    const pt   = getPinType(pin.type);
                    const Icon = pt.icon;
                    return (
                      <div
                        key={pin.id}
                        style={{
                          display: 'flex', alignItems: 'center',
                          padding: '0 14px', height: 38,
                          cursor: 'pointer', borderRadius: 6,
                          transition: 'background 120ms',
                        }}
                        onClick={() => go(pin.path || '/')}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.querySelector('.unpin-btn').style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.querySelector('.unpin-btn').style.opacity = '0';
                        }}
                      >
                        <div style={{
                          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: pt.color + '14',
                          border: `1px solid ${pt.color}28`,
                          marginRight: 9,
                        }}>
                          <Icon size={12} strokeWidth={1.8} color={pt.color} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                            color: '#EDEDEC',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {pin.label}
                          </div>
                          {pin.subtitle && (
                            <div style={{
                              fontFamily: 'DM Sans, sans-serif', fontSize: 10,
                              color: pt.color + '77',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {pin.subtitle}
                            </div>
                          )}
                        </div>

                        <button
                          className="unpin-btn"
                          onClick={e => { e.stopPropagation(); removePin(pin.id); }}
                          title="Remove pin"
                          style={{
                            opacity: 0, flexShrink: 0,
                            width: 18, height: 18, borderRadius: 4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#666', cursor: 'pointer',
                            transition: 'opacity 120ms, color 120ms',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#FF6B6B'}
                          onMouseLeave={e => e.currentTarget.style.color = '#666'}
                        >
                          <X size={9} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recents */}
              <div style={{ margin: '4px 14px 0', height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                color: '#9B9B9B', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '8px 14px 4px',
              }}>
                Recents
              </p>
              {['Verse — "Made It Out"', 'Hook — "Echoes"', 'Verse — "No Cap"', 'Bridge — "Fade Away"'].map(item => (
                <div
                  key={item}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 14px', cursor: 'pointer', color: '#555',
                    transition: 'color 120ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#9B9B9B'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555'}
                >
                  <FileAudio size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </>
  );
}

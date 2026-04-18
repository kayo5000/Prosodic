/**
 * VeilRevivalPanel.js
 *
 * VEIL Revival — Dead Note Resurrection panel for NotepadPage.
 *
 * Opens as a full-height right-side panel layered over the note editor.
 * VEIL classifies the abandoned note and guides the writer back to life
 * through one focused question or tool at a time.
 *
 * Features:
 *   - Classifies note as lyric / concept / emotional / structural
 *   - Conversational interface matching the existing ChatThreadPage style
 *   - Export buttons after every VEIL response: SongView / FreeWrite / NotePad
 *   - Thread auto-saved to localStorage keyed by note ID
 *   - Grayed-out / disabled when note body is empty
 *
 * Props:
 *   note          {id, title, body}   — the note being revived
 *   onClose       () => void          — called when panel should close
 *   onExport      (destination, text) — called on export button click
 *                   destination: 'songview' | 'freewrite' | 'notepad'
 *                   text: string  (VEIL's last assistant reply)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, ArrowUpRight } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const STORAGE_PREFIX = 'prosodic_veil_revival_';

function loadThread(noteId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + noteId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThread(noteId, messages) {
  try {
    localStorage.setItem(STORAGE_PREFIX + noteId, JSON.stringify(messages));
  } catch {}
}

/** Single message bubble — matches ChatThreadPage style */
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: 'rgba(245,197,24,0.12)',
          border: '1px solid rgba(245,197,24,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 8, marginTop: 2,
        }}>
          <Sparkles size={12} color="#F5C518" strokeWidth={1.8} />
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        background: isUser
          ? 'rgba(245,197,24,0.12)'
          : 'rgba(255,255,255,0.05)',
        border: isUser
          ? '1px solid rgba(245,197,24,0.22)'
          : '1px solid rgba(255,255,255,0.08)',
        fontSize: 13,
        lineHeight: 1.7,
        color: isUser ? '#F5C518' : '#CACAC8',
        fontFamily: 'DM Sans, sans-serif',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

/** Typing indicator — 3 pulsing dots */
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: 'rgba(245,197,24,0.12)',
        border: '1px solid rgba(245,197,24,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={12} color="#F5C518" strokeWidth={1.8} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'rgba(245,197,24,0.5)',
            }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Export buttons shown after each VEIL response */
function ExportBar({ lastReply, onExport }) {
  const buttons = [
    { key: 'songview',  label: 'Send to SongView' },
    { key: 'freewrite', label: 'Send to FreeWrite' },
    { key: 'notepad',   label: 'Send to NotePad'  },
  ];
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14,
    }}>
      {buttons.map(btn => (
        <button
          key={btn.key}
          onClick={() => onExport(btn.key, lastReply)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#7B7B7B', fontSize: 11, fontWeight: 500,
            cursor: 'pointer', transition: 'all 110ms',
            fontFamily: 'DM Sans, sans-serif',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#F5C518';
            e.currentTarget.style.border = '1px solid rgba(245,197,24,0.3)';
            e.currentTarget.style.background = 'rgba(245,197,24,0.07)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#7B7B7B';
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.10)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
        >
          <ArrowUpRight size={10} strokeWidth={2.2} />
          {btn.label}
        </button>
      ))}
    </div>
  );
}

export default function VeilRevivalPanel({ note, onClose, onExport }) {
  const [messages, setMessages]   = useState(() => loadThread(note.id));
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [started, setStarted]     = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  const isEmpty = !note.body || !note.body.trim();

  // Persist thread whenever messages change
  useEffect(() => {
    saveThread(note.id, messages);
  }, [note.id, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-start revival on first open if no existing thread
  useEffect(() => {
    if (!started && messages.length === 0 && !isEmpty) {
      setStarted(true);
      sendToVeil([], true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToVeil(currentMessages, isFirstMessage = false) {
    setLoading(true);
    setError(null);
    try {
      const body = {
        note: { title: note.title, body: note.body },
        messages: currentMessages,
      };
      const res = await fetch(`${API_BASE}/veil/revival/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg = { role: 'assistant', content: data.reply };
      const next = [...currentMessages, assistantMsg];
      setMessages(next);
    } catch (err) {
      setError(err.message || 'VEIL is unavailable. Check the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    sendToVeil(next);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearThread() {
    setMessages([]);
    saveThread(note.id, []);
    setStarted(false);
    setTimeout(() => {
      setStarted(true);
      sendToVeil([], true);
    }, 100);
  }

  // last assistant reply (for export buttons)
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute', top: 0, right: 0,
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(10,10,14,0.97)',
        border: '1px solid rgba(245,197,24,0.18)',
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflow: 'hidden',
        zIndex: 10,
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(245,197,24,0.12)',
            border: '1px solid rgba(245,197,24,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={13} color="#F5C518" strokeWidth={1.8} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F5C518' }}>
              VEIL Revival
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#444', marginTop: 1 }}>
              {note.title || 'Untitled'} · Revival Session
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {messages.length > 0 && (
            <button
              onClick={handleClearThread}
              title="Restart revival"
              style={{
                padding: '4px 9px', borderRadius: 7,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#444', fontSize: 10, cursor: 'pointer',
                transition: 'all 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#888'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#444'; }}
            >
              restart
            </button>
          )}
          <button
            onClick={onClose}
            title="Close revival"
            style={{
              width: 28, height: 28, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#555', cursor: 'pointer', transition: 'all 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EDEDEC'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      {isEmpty ? (
        /* Empty note state */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center',
        }}>
          <Sparkles size={28} color="rgba(245,197,24,0.3)" strokeWidth={1.5} />
          <p style={{ margin: '16px 0 8px', fontSize: 14, color: '#444', fontWeight: 600 }}>
            Nothing to revive yet.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#333', lineHeight: 1.6 }}>
            Write something in this note first,<br />then VEIL can help bring it to life.
          </p>
        </div>
      ) : (
        <>
          {/* Messages list */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '18px 18px 8px',
          }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Bubble msg={msg} />
                  {/* Export bar after each assistant message */}
                  {msg.role === 'assistant' && (
                    <ExportBar lastReply={msg.content} onExport={onExport} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && <TypingDots />}

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                fontSize: 12, color: '#FF6B6B',
              }}>
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ──────────────────────────────────────────────── */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loading ? 'VEIL is thinking…' : 'Reply to VEIL…'}
              disabled={loading}
              rows={2}
              style={{
                flex: 1,
                padding: '9px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10,
                color: '#EDEDEC', caretColor: '#F5C518',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.5,
                resize: 'none', outline: 'none',
                transition: 'border-color 120ms',
                opacity: loading ? 0.5 : 1,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.3)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, alignSelf: 'flex-end',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() && !loading
                  ? 'rgba(245,197,24,0.15)'
                  : 'rgba(255,255,255,0.04)',
                border: input.trim() && !loading
                  ? '1px solid rgba(245,197,24,0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: input.trim() && !loading ? '#F5C518' : '#333',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 120ms', flexShrink: 0,
              }}
            >
              <Send size={13} strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, NotebookPen, Sparkles } from 'lucide-react';
import GlassFilter from '../components/ui/GlassFilter';
import VeilRevivalPanel from '../components/VeilRevivalPanel';

const STORAGE_KEY = 'prosodic_notepad_notes_v1';

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.length) return parsed;
  } catch {}
  return [{ id: crypto.randomUUID(), title: 'My first note', body: '', updatedAt: Date.now() }];
}

function saveNotes(notes) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotepadPage() {
  const navigate                      = useNavigate();
  const [notes, setNotes]             = useState(loadNotes);
  const [activeId, setActiveId]       = useState(() => loadNotes()[0]?.id);
  const [confirmDelete, setConfirm]   = useState(null); // id to confirm delete
  const [revivalOpen, setRevivalOpen] = useState(false); // VEIL Revival panel
  const [toast, setToast]             = useState(null);  // export toast message
  const bodyRef                       = useRef(null);

  const activeNote = notes.find(n => n.id === activeId) || notes[0];

  // Persist whenever notes change
  useEffect(() => { saveNotes(notes); }, [notes]);

  const updateNote = (id, patch) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
  };

  const addNote = () => {
    const n = { id: crypto.randomUUID(), title: 'Untitled', body: '', updatedAt: Date.now() };
    setNotes(prev => [n, ...prev]);
    setActiveId(n.id);
    // Focus title after render
    setTimeout(() => {
      document.getElementById('note-title-input')?.select();
    }, 80);
  };

  const deleteNote = (id) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      if (next.length === 0) {
        const blank = { id: crypto.randomUUID(), title: 'My first note', body: '', updatedAt: Date.now() };
        setActiveId(blank.id);
        return [blank];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
    setConfirm(null);
  };

  // Dismiss toast after 2.5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Handle VEIL Revival export buttons
  const handleRevivalExport = (destination, text) => {
    if (destination === 'songview') {
      setRevivalOpen(false);
      navigate('/song-view', { state: { initialText: text } });
    } else if (destination === 'freewrite') {
      setRevivalOpen(false);
      navigate('/freewrite', { state: { initialText: text } });
    } else if (destination === 'notepad') {
      // Create a new note with the VEIL reply as the body
      const n = {
        id: crypto.randomUUID(),
        title: `VEIL — ${activeNote?.title || 'Revival'}`,
        body: text,
        updatedAt: Date.now(),
      };
      setNotes(prev => [n, ...prev]);
      setActiveId(n.id);
      setRevivalOpen(false);
      setToast('Sent to NotePad');
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      padding: '28px 28px 28px 24px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <GlassFilter />

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(245,197,24,0.1)',
            border: '1px solid rgba(245,197,24,0.25)',
          }}>
            <NotebookPen size={16} color="#F5C518" strokeWidth={1.8} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#EDEDEC', lineHeight: 1.2 }}>Notepad</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#555', marginTop: 2 }}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
        </div>

        <button
          onClick={addNote}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'rgba(245,197,24,0.1)',
            border: '1px solid rgba(245,197,24,0.28)',
            color: '#F5C518',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New note
        </button>
      </div>

      {/* Main area: note list + editor */}
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>

        {/* ── Note list ───────────────────────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 4,
          overflowY: 'auto',
        }}>
          <AnimatePresence initial={false}>
            {notes.map(note => {
              const active = note.id === activeId;
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setActiveId(note.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: active ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.03)',
                    border: active ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'all 130ms',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)'; } }}
                >
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: active ? 600 : 500,
                    color: active ? '#F5C518' : '#EDEDEC',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {note.title || 'Untitled'}
                  </p>
                  <p style={{
                    margin: '4px 0 0', fontSize: 11, color: '#555',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {note.body ? note.body.replace(/\n/g, ' ').slice(0, 48) : 'No content'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: '#3A3A3A' }}>
                    {timeAgo(note.updatedAt)}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Note editor ─────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(15,15,20,0.55)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {activeNote ? (
            <>
              {/* VEIL Revival overlay */}
              <AnimatePresence>
                {revivalOpen && (
                  <VeilRevivalPanel
                    note={activeNote}
                    onClose={() => setRevivalOpen(false)}
                    onExport={handleRevivalExport}
                  />
                )}
              </AnimatePresence>

              {/* Export toast */}
              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: 'absolute', bottom: 52, left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '7px 14px', borderRadius: 9, zIndex: 20,
                      background: 'rgba(245,197,24,0.12)',
                      border: '1px solid rgba(245,197,24,0.3)',
                      color: '#F5C518', fontSize: 12, fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {toast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Editor header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <input
                  id="note-title-input"
                  value={activeNote.title}
                  onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Note title…"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 700,
                    color: '#EDEDEC', caretColor: '#F5C518',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#3A3A3A' }}>
                    {timeAgo(activeNote.updatedAt)}
                  </span>

                  {/* Revive with VEIL */}
                  <button
                    onClick={() => setRevivalOpen(true)}
                    disabled={!activeNote.body?.trim()}
                    title={activeNote.body?.trim() ? 'Revive with VEIL' : 'Add content to revive'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 7,
                      background: activeNote.body?.trim()
                        ? 'rgba(245,197,24,0.08)'
                        : 'rgba(255,255,255,0.03)',
                      border: activeNote.body?.trim()
                        ? '1px solid rgba(245,197,24,0.22)'
                        : '1px solid rgba(255,255,255,0.06)',
                      color: activeNote.body?.trim() ? '#F5C518' : '#2E2E2E',
                      fontSize: 11, fontWeight: 600,
                      cursor: activeNote.body?.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 120ms',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (activeNote.body?.trim()) {
                        e.currentTarget.style.background = 'rgba(245,197,24,0.14)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (activeNote.body?.trim()) {
                        e.currentTarget.style.background = 'rgba(245,197,24,0.08)';
                      }
                    }}
                  >
                    <Sparkles size={11} strokeWidth={2} />
                    Revive with VEIL
                  </button>

                  {/* Delete */}
                  {confirmDelete === activeNote.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#FF6B6B' }}>Delete?</span>
                      <button
                        onClick={() => deleteNote(activeNote.id)}
                        style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#FF6B6B', fontSize: 11, cursor: 'pointer',
                        }}
                      >Yes</button>
                      <button
                        onClick={() => setConfirm(null)}
                        style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#9B9B9B', fontSize: 11, cursor: 'pointer',
                        }}
                      >No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirm(activeNote.id)}
                      title="Delete note"
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#555', cursor: 'pointer',
                        transition: 'all 120ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.border = '1px solid rgba(239,68,68,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; }}
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body textarea */}
              <textarea
                ref={bodyRef}
                value={activeNote.body}
                onChange={e => updateNote(activeNote.id, { body: e.target.value })}
                placeholder="Start writing…"
                spellCheck={false}
                style={{
                  flex: 1,
                  padding: '18px 22px',
                  background: 'none', border: 'none', outline: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.8,
                  color: '#EDEDEC', caretColor: '#F5C518',
                  resize: 'none',
                }}
              />

              {/* Footer: word/char count */}
              <div style={{
                padding: '8px 20px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: 16, flexShrink: 0,
              }}>
                {[
                  ['words', activeNote.body.trim() ? activeNote.body.trim().split(/\s+/).length : 0],
                  ['chars', activeNote.body.length],
                  ['lines', activeNote.body ? activeNote.body.split('\n').length : 0],
                ].map(([label, val]) => (
                  <span key={label} style={{ fontSize: 11, color: '#3A3A3A' }}>
                    <span style={{ color: '#555' }}>{val}</span> {label}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

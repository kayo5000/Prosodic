import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Music, Plus, ChevronDown, ChevronRight, X, ArrowUpRight } from 'lucide-react';
import GlassFilter from '../components/ui/GlassFilter';
import MetalButton from '../components/ui/MetalButton';
import { useRegisterPinnableItems } from '../state/PinnableContext';
import PinButton from '../components/ui/PinButton';

const INITIAL_PROJECTS = [
  {
    id: 1,
    name: 'Dark Matter',
    description: 'Debut album sessions',
    songs: ['Made It Out', 'No Cap', 'Echoes', 'Static'],
    updated: 'Today',
  },
  {
    id: 2,
    name: 'Freestyle Pack',
    description: 'Quick drops, no polish',
    songs: ['Fade Away', 'Off the Dome Vol. 1'],
    updated: 'Yesterday',
  },
  {
    id: 3,
    name: 'Collab — Verse Drafts',
    description: 'Features and joint sessions',
    songs: ['Bridge — "Gravity"', 'Verse — "Pull Up"'],
    updated: 'Apr 1',
  },
];

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: desc.trim() });
    onClose();
  };

  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(12,10,2,0.96)',
          border: '1px solid rgba(245,197,24,0.18)',
          borderRadius: 16,
          backdropFilter: 'blur(24px)',
          padding: '28px 28px 24px',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 700, color: '#EDEDEC', letterSpacing: '0.06em' }}>
            NEW PROJECT
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ color: '#9B9B9B', transition: 'color 150ms' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EDEDEC'}
            onMouseLeave={e => e.currentTarget.style.color = '#9B9B9B'}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Album — Dark Matter"
              className="w-full rounded-xl outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                color: '#EDEDEC',
                caretColor: '#F5C518',
              }}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Description <span style={{ color: '#9B9B9B', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Debut album sessions"
              className="w-full rounded-xl outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                color: '#EDEDEC',
                caretColor: '#F5C518',
              }}
            />
          </div>
          <div className="flex justify-end mt-2">
            <MetalButton type="submit" size="sm" disabled={!name.trim()}>
              Create Project
            </MetalButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ProjectCard({ project, index, pinItem }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: hovered ? 'rgba(25,25,30,0.75)' : 'rgba(15,15,20,0.55)',
        border: hovered ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: hovered ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
        overflow: 'hidden',
        transition: 'background 150ms, border 150ms, box-shadow 150ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-4 w-full px-5 py-4 text-left"
      >
        {/* Folder icon */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{
            width: 42,
            height: 42,
            background: expanded ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
            border: expanded ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.08)',
            transition: 'background 200ms, border 200ms',
          }}
        >
          <FolderKanban size={17} color={expanded ? '#F5C518' : '#9B9B9B'} strokeWidth={1.8} style={{ transition: 'color 200ms' }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#EDEDEC', marginBottom: 2 }}>
            {project.name}
          </p>
          {project.description && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B' }}>
              {project.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 mr-1">
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B' }}>
            {project.updated}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B' }}>
            {project.songs.length} {project.songs.length === 1 ? 'song' : 'songs'}
          </span>
        </div>

        {/* Pin + Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <PinButton item={pinItem} size="xs" />
          <div style={{ color: expanded ? '#F5C518' : '#9B9B9B', transition: 'color 200ms' }}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>
        </div>
      </button>

      {/* Song list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="songs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="flex flex-col gap-0.5 px-4 pb-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="pt-3 pb-1 px-1">
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#9B9B9B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Songs
                </span>
              </div>
              {project.songs.map((song, i) => (
                <SongRow key={i} song={song} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SongRow({ song }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 120ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Music size={13} color={hovered ? '#F5C518' : '#9B9B9B'} strokeWidth={1.8} style={{ flexShrink: 0, transition: 'color 120ms' }} />
      <span className="flex-1 truncate" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: hovered ? '#EDEDEC' : '#9B9B9B', transition: 'color 120ms' }}>
        {song}
      </span>
      <ArrowUpRight size={12} color={hovered ? '#F5C518' : 'transparent'} style={{ flexShrink: 0, transition: 'color 120ms' }} />
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  useRegisterPinnableItems(
    INITIAL_PROJECTS.map(p => ({
      id: `project-${p.id}`,
      label: p.name,
      type: 'project',
      subtitle: p.description,
      path: '/projects',
    }))
  );
  const [showModal, setShowModal] = useState(false);

  const handleCreate = ({ name, description }) => {
    setProjects(prev => [
      ...prev,
      { id: Date.now(), name, description, songs: [], updated: 'Just now' },
    ]);
  };

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
            PROJECTS
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B' }}>
            {projects.length} {projects.length === 1 ? 'folder' : 'folders'}
          </p>
        </div>
        <MetalButton onClick={() => setShowModal(true)} size="sm">
          <Plus size={14} style={{ marginRight: 6, display: 'inline' }} />
          New Project
        </MetalButton>
      </motion.div>

      {/* Project list */}
      <div className="w-full flex flex-col gap-2" style={{ maxWidth: 680 }}>
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <FolderKanban size={32} color="#3a3a3a" strokeWidth={1.4} />
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9B9B9B' }}>
              No projects yet — create your first folder
            </p>
          </motion.div>
        ) : (
          projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} pinItem={{ id: `project-${project.id}`, label: project.name, type: 'project', subtitle: project.description, path: '/projects' }} />
          ))
        )}
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showModal && (
          <NewProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>
    </div>
  );
}

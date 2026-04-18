import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Zap, FolderKanban, ChevronDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassFilter from '../components/ui/GlassFilter';
import MetalButton from '../components/ui/MetalButton';

const PROJECTS = ['Dark Matter', 'Freestyle Pack', 'Collab — Verse Drafts'];
const SECTION_TYPES = ['Verse', 'Hook', 'Bridge', 'Outro', 'Intro', 'Pre-Hook', 'Freestyle'];

function Label({ children, required }) {
  return (
    <label style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 11,
      fontWeight: 600,
      color: '#9B9B9B',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: 8,
    }}>
      {children}
      {required && <span style={{ color: '#F5C518', marginLeft: 4 }}>*</span>}
    </label>
  );
}

function GlassInput({ value, onChange, placeholder, type = 'text', onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full rounded-xl outline-none"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: focused ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.08)',
        padding: '11px 14px',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 14,
        color: '#EDEDEC',
        caretColor: '#F5C518',
        transition: 'border 150ms',
      }}
    />
  );
}

function SelectDropdown({ value, onChange, options, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl outline-none appearance-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: focused ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.08)',
          padding: '11px 36px 11px 14px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          color: value ? '#EDEDEC' : '#9B9B9B',
          caretColor: '#F5C518',
          transition: 'border 150ms',
          cursor: 'pointer',
        }}
      >
        <option value="" disabled style={{ background: '#0a0800', color: '#9B9B9B' }}>{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o} style={{ background: '#0a0800', color: '#EDEDEC' }}>{o}</option>
        ))}
      </select>
      <ChevronDown size={14} color="#4A4A4A" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

function BpmPicker({ value, onChange }) {
  const [focused, setFocused] = useState(false);

  const nudge = (delta) => {
    const next = Math.min(300, Math.max(40, (parseInt(value) || 90) + delta));
    onChange(String(next));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="number"
          min={40}
          max={300}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="93"
          className="w-full rounded-xl outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: focused ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.08)',
            padding: '11px 14px',
            fontFamily: 'DM Mono, DM Sans, monospace',
            fontSize: 16,
            fontWeight: 600,
            color: value ? '#F5C518' : '#9B9B9B',
            caretColor: '#F5C518',
            transition: 'border 150ms',
          }}
        />
        {value && (
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B', pointerEvents: 'none',
          }}>
            BPM
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {[5, -5].map(delta => (
          <button
            key={delta}
            onClick={() => nudge(delta)}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32, height: 22,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9B9B9B',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 120ms, color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.color = '#F5C518'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9B9B9B'; }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NewSongPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [section, setSection] = useState('');
  const [project, setProject] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsBlurred, setLyricsBlurred] = useState(false);

  const canSubmit = title.trim() && bpm && parseInt(bpm) >= 40 && parseInt(bpm) <= 300;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // TODO: POST to /api/songs, then navigate to song view
    navigate('/song-view');
  };

  const lineCount = lyrics.trim() ? lyrics.trim().split('\n').filter(l => l.trim()).length : 0;

  return (
    <div className="flex flex-col items-center min-h-screen px-6 pt-24 pb-16">
      <GlassFilter />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full mb-8"
        style={{ maxWidth: 620 }}
      >
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 36, fontWeight: 700, color: '#EDEDEC', letterSpacing: '0.06em', marginBottom: 4 }}>
          NEW SONG
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B' }}>
          BPM is required — every analysis is grid-locked to tempo
        </p>
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-5"
        style={{
          maxWidth: 620,
          background: 'rgba(15,15,20,0.55)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '28px 28px 24px',
        }}
      >
        {/* Row 1: Title + Section */}
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <Label required>Song / Session Title</Label>
            <GlassInput
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g. "Made It Out — Verse 1"'
            />
          </div>
          <div style={{ width: 160, flexShrink: 0 }}>
            <Label>Section</Label>
            <SelectDropdown
              value={section}
              onChange={setSection}
              options={SECTION_TYPES}
              placeholder="Type…"
            />
          </div>
        </div>

        {/* Row 2: BPM + Project */}
        <div className="flex gap-4">
          <div style={{ width: 180, flexShrink: 0 }}>
            <Label required>
              <Zap size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              BPM
            </Label>
            <BpmPicker value={bpm} onChange={setBpm} />
          </div>
          <div className="flex-1 min-w-0">
            <Label>
              <FolderKanban size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Add to Project
            </Label>
            <SelectDropdown
              value={project}
              onChange={setProject}
              options={PROJECTS}
              placeholder="None"
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* Lyrics */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>
              <Music size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Lyrics
            </Label>
            {lineCount > 0 && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B' }}>
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            )}
          </div>
          <textarea
            value={lyrics}
            onChange={e => setLyrics(e.target.value)}
            onFocus={() => setLyricsBlurred(false)}
            onBlur={() => setLyricsBlurred(true)}
            placeholder={"Paste or write your lyrics here, one bar per line…\n\nAnd I swear that it's turnt\nIt all begins with encore cheers…"}
            rows={10}
            className="w-full rounded-xl outline-none resize-none"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: !lyricsBlurred && lyrics ? '1px solid rgba(245,197,24,0.2)' : '1px solid rgba(255,255,255,0.07)',
              padding: '14px 16px',
              fontFamily: 'DM Mono, monospace',
              fontSize: 13,
              lineHeight: 1.85,
              color: '#EDEDEC',
              caretColor: '#F5C518',
              transition: 'border 150ms',
            }}
          />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9B9B9B', marginTop: 6 }}>
            One bar per line. Beat switches = new section (different BPM).
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-1">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9B9B9B' }}>
            {!bpm ? 'Enter a BPM to continue' : !title.trim() ? 'Add a title to continue' : ''}
          </p>
          <MetalButton onClick={handleSubmit} disabled={!canSubmit}>
            Analyze
            <ArrowRight size={14} style={{ marginLeft: 8, display: 'inline', verticalAlign: 'middle' }} />
          </MetalButton>
        </div>
      </motion.div>
    </div>
  );
}

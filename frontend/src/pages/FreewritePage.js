import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRegisterPinnableItems } from '../state/PinnableContext';
import PinButton from '../components/ui/PinButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, X, Play, Pause, RotateCcw, Zap, ChevronRight, Pencil } from 'lucide-react';
import DottedSurface from '../components/ui/DottedSurface';
import GlassFilter from '../components/ui/GlassFilter';
import MetronomeBar from '../components/ui/MetronomeBar';
import { useTimer } from '../state/TimerContext';
import { analyze, suggestFamily } from '../api/prosodicApi';
import useColorPalette from '../hooks/useColorPalette';
import useCorrections, { applyCorrections } from '../hooks/useCorrections';

// ─── Challenge bank ───────────────────────────────────────────────────────────

const CHALLENGES = [
  {
    title: 'AABB Lock', device: 'Rhyme Scheme', duration: 120,
    desc: 'Write 8 bars in couplets — every two consecutive lines must share a rhyme family. No skipping lines. Forces you to commit to each rhyme before moving on.',
    example: '"I been grindin\' since a teen, never stopped for a break / everything I built was real, none of it was fake"',
  },
  {
    title: 'Internal Fire', device: 'Internal Rhyme', duration: 180,
    desc: 'Place at least one rhyme inside each line — not just at the end. The internal hit should land on a stressed syllable mid-bar, before the end rhyme fires.',
    example: '"I stay patient, no wasting time on the basics / I\'m ancient with the cadence, never fading"',
  },
  {
    title: 'Motif Lock', device: 'Motif', duration: 180,
    desc: 'Pick one phoneme family — like the AY sound — and plant it in every other bar, anywhere in the line. The listener shouldn\'t be able to predict where it hits.',
    example: 'AY family: "I made it out the maze / raised in darker days / the weight don\'t phase me now"',
  },
  {
    title: 'Compound Stack', device: 'Multisyllabic', duration: 240,
    desc: 'Every end rhyme must match on 2 or more syllables. Single-syllable rhymes are banned. Forces precision — you can\'t coast on simple words.',
    example: '"I\'m relentless with the sentence / independent of the penance / repentance wasn\'t in it"',
  },
  {
    title: 'Cross-Bar Bridge', device: 'Enjambment', duration: 180,
    desc: 'Start a thought in the middle of a bar and complete it in the next one. Never end a bar with a full stop. The meaning should spill across the line break.',
    example: '"I remember when the lights went / out and I was standing in the cold with nothing left"',
  },
  {
    title: 'Pocket Riding', device: 'Pocket', duration: 120,
    desc: 'Write 4 bars where your stressed syllables land directly on beats 1, 2, 3, and 4. No floating, no syncopation — locked to the grid like a drum hit.',
    example: '"GRIND (1) every (2) day (3) never (4) quit / BUILT (1) from the (2) ground (3) never (4) split"',
  },
  {
    title: 'Syncopation Run', device: 'Syncopation', duration: 150,
    desc: 'Write 4 bars where your stressed syllables consistently land between the beats — on the "and" or the "e." Avoid beat 1 entirely on at least 2 lines.',
    example: '"and-I-been-WAIT-ing, on-the-AND-count / never land-on-ONE, keep-it-OFF-mount"',
  },
  {
    title: 'ABAB Weave', device: 'Rhyme Scheme', duration: 150,
    desc: 'Write 8 bars where lines 1 & 3 share a rhyme family and lines 2 & 4 share a different one — alternating through the whole verse. Each pair must be distinct.',
    example: 'A: "never fold" / B: "stay on track" / A: "ten years old" / B: "never looked back"',
  },
  {
    title: 'Double Meaning', device: 'Wordplay', duration: 300,
    desc: 'Write 4 bars where at least two lines carry a second reading beneath the surface. The literal meaning and the deeper meaning should both land on their own.',
    example: '"I keep my circle tight" — means loyal crew AND protective boundaries',
  },
  {
    title: 'Syllable Crush', device: 'Meter', duration: 300,
    desc: 'Every bar must contain exactly 16 syllables — count them out loud. Too many, cut. Too few, expand. This trains you to fill the grid without rushing or dragging.',
    example: '"I-been-work-ing-since-the-morn-ing-nev-er-stop-for-no-one-real-talk" = 16',
  },
  {
    title: 'Phoneme Family', device: 'Assonance', duration: 180,
    desc: 'Pick one vowel sound and repeat it across every bar — in stressed OR unstressed syllables. It should create a tonal hum underneath the whole verse.',
    example: 'OH sound: "I know the road is cold and slow / but growth don\'t show until you go"',
  },
  {
    title: 'Anaphora Storm', device: 'Anaphora', duration: 150,
    desc: 'Begin every single bar with the exact same word or phrase. This creates momentum and a preacher-like cadence. The repeated opener should feel like a hammer.',
    example: '"I came from nothing / I came with hunger / I came through fire / I came up stronger"',
  },
  {
    title: 'No End Rhyme', device: 'Internal Rhyme', duration: 240,
    desc: 'All rhymes must happen inside the bar — never at the end of a line. End words should be plain and unrelated. The challenge is making it feel musical with no end anchor.',
    example: '"I been grinding through the timing, never finding what I\'m fighting for at night"',
  },
  {
    title: 'Triplet Storm', device: 'Rhyme Scheme', duration: 180,
    desc: 'Write in AAA triplets — three consecutive rhyming bars, then one free bar to breathe, then three more. The free bar resets before the next triplet locks in.',
    example: '"I grind it / I find it / I shine it / [free] — built from the bottom up"',
  },
  {
    title: 'One Breath', device: 'Flow', duration: 120,
    desc: 'Write a 4-bar run with zero punctuation — one unbroken sentence that snakes across all four lines. The listener should feel like they\'re being carried without a stop.',
    example: '"I came up from the bottom when the city was asleep and the streets were cold and deep and I never let the doubt creep in"',
  },
  {
    title: 'Reverse Build', device: 'Structure', duration: 240,
    desc: 'Write your punchline or conclusion as bar 1, then spend every remaining bar building the context for why it lands. The setup comes after the payoff.',
    example: 'Bar 1: "that\'s why I never looked back" → Bars 2–8: the story of what happened',
  },
  {
    title: 'Mirror Bar', device: 'Symmetry', duration: 180,
    desc: 'Write bar 1, then write bar 2 using the same phoneme sounds but entirely different words and meaning. Same sonic skeleton, different flesh.',
    example: 'Bar 1: "I stayed patient through the pain" → Bar 2: "the same cadence in the rain" — AY + N echoed',
  },
  {
    title: 'Consonance Chain', device: 'Consonance', duration: 180,
    desc: 'Pick a consonant cluster — like ST, GR, or TR — and plant it throughout every bar, in any position. Not just rhyme position, anywhere the word lands.',
    example: 'ST: "I stay strong, still standing, straight through the storm, structured not stressed"',
  },
  {
    title: 'Floating Flow', device: 'Flow', duration: 150,
    desc: 'Write 8 bars where your syllables never quite land on the beat — everything sits slightly behind or ahead. The verse should feel like it\'s drifting over the track.',
    example: 'Think Drake "Marvins Room" cadence — syllables slide between beats, never punching directly on 1',
  },
  {
    title: 'Imagery Lock', device: 'Imagery', duration: 300,
    desc: 'Every bar must contain a specific sensory image — something you can see, hear, smell, taste, or touch. Abstract statements are banned. Ground every line in the physical.',
    example: '"the smell of rain on hot pavement / the hum of the highway at 3am / hands cracked from the cold"',
  },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Smooth green → yellow → red based on pct remaining (1 = full, 0 = empty)
function timerColor(pct) {
  if (pct >= 0.5) {
    // green #4ADE80 → yellow #F5C518
    const t = 1 - (pct - 0.5) * 2;
    return lerpHex('#4ADE80', '#F5C518', t);
  }
  // yellow #F5C518 → red #EF4444
  const t = 1 - pct * 2;
  return lerpHex('#F5C518', '#EF4444', t);
}

function lerpHex(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function useBlink(active, ms = 500) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!active) { setOn(true); return; }
    const id = setInterval(() => setOn(v => !v), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return on;
}

// ─── Big centered timer ───────────────────────────────────────────────────────

function BigTimer({ barMode, setBarMode }) {
  const { target, remaining, running, expired, toggle, reset, setDuration } = useTimer();
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);
  const pct = target > 0 ? remaining / target : 0;
  const blink = useBlink(expired);

  const startEdit = () => {
    setInputVal(Math.round(target / 60).toString());
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = (val) => {
    setEditing(false);
    const mins = Math.max(1, Math.min(999, parseInt(val, 10) || 5));
    setDuration(mins * 60);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    const currentMins = Math.round(target / 60);
    const newMins = Math.max(1, Math.min(999, currentMins + delta));
    setDuration(newMins * 60);
  };

  const arcColor  = expired ? (blink ? '#EF4444' : 'transparent') : timerColor(pct);
  const timeColor = expired ? (blink ? '#EF4444' : 'transparent') : pct > 0.85 ? '#FFFFFF' : timerColor(pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Main display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Reset */}
        <button
          onClick={reset}
          style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.7)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} />
        </button>

        {/* Time display with arc ring */}
        <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
          {/* Arc */}
          <svg width={160} height={160} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx={80} cy={80} r={72} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
            <circle
              cx={80} cy={80} r={72} fill="none"
              stroke={arcColor}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 72}`}
              strokeDashoffset={`${2 * Math.PI * 72 * (1 - pct)}`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 1.5s ease' }}
            />
          </svg>
          {/* Center content */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <input
                  ref={inputRef}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => commitEdit(inputVal)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(inputVal);
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  style={{
                    width: 72, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'Outfit, sans-serif', fontSize: 36, fontWeight: 700,
                    color: '#F5C518', caretColor: '#F5C518', textAlign: 'center',
                  }}
                />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>m</span>
              </div>
            ) : (
              <div
                onClick={startEdit}
                onWheel={handleWheel}
                title="Click to set · Scroll to adjust"
                style={{
                  fontFamily: 'Outfit, sans-serif', fontSize: 36, fontWeight: 700,
                  color: timeColor, letterSpacing: '0.04em',
                  cursor: 'text', userSelect: 'none',
                  transition: 'color 1.5s ease, opacity 200ms ease',
                  textAlign: 'center',
                }}
              >
                {expired ? 'Done' : formatTime(remaining)}
              </div>
            )}
          </div>
        </div>

        {/* Play / Pause */}
        <button
          onClick={toggle}
          style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: running ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.06)',
            border: running ? '1px solid rgba(245,197,24,0.5)' : '1px solid rgba(255,255,255,0.7)',
            color: running ? '#F5C518' : '#FFFFFF', cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>

      {/* Bar mode toggle hint */}
      <button
        onClick={() => setBarMode(m => !m)}
        style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.28)',
          background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em',
          transition: 'color 200ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
      >
        {barMode ? 'show countdown' : 'hide countdown'}
      </button>
    </div>
  );
}

// ─── Progress bar (sits on top border of text box) ────────────────────────────

function TimerBar({ target, remaining, running, expired }) {
  const elapsed = target - remaining;
  const pctElapsed = target > 0 ? Math.min(1, elapsed / target) : 0;
  const pctRemaining = 1 - pctElapsed;
  const color = expired ? '#EF4444' : timerColor(pctRemaining);
  const blink = useBlink(expired, 500);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

  return (
    <div style={{
      position: 'absolute', top: -1, left: -1, right: -1, height: 3,
      borderRadius: '16px 16px 0 0',
      background: 'rgba(255,255,255,0.07)',
      overflow: 'hidden',
      zIndex: 10,
    }}>
      <motion.div
        animate={{ width: expired ? '100%' : `${pctElapsed * 100}%`, opacity: expired ? (blink ? 1 : 0) : 1 }}
        transition={{
          width: { duration: mounted.current ? (running ? 1 : 0) : 0, ease: 'linear' },
          opacity: { duration: 0.15 },
        }}
        style={{
          height: '100%',
          background: color,
          boxShadow: `0 0 10px ${color}99`,
          transition: 'background 1.5s ease',
        }}
      />
    </div>
  );
}

// ─── Challenge card (no own timer — uses main timer) ──────────────────────────

function ChallengeCard({ challenge, onDismiss, onNew, pinItem }) {
  const [showExample, setShowExample] = useState(false);

  // Reset example visibility when challenge changes
  useEffect(() => { setShowExample(false); }, [challenge]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.7)',
        background: 'rgba(15,15,20,0.55)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Device tag */}
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
          color: '#F5C518', letterSpacing: '0.08em', textTransform: 'uppercase',
          background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.25)',
          borderRadius: 6, padding: '4px 10px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {challenge.device}
        </span>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
            {challenge.title}
            <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>
              — {challenge.desc}
            </span>
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setShowExample(s => !s)}
            title="Show example"
            style={{
              height: 28, padding: '0 10px', borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: showExample ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.06)',
              border: showExample ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.15)',
              color: showExample ? '#F5C518' : '#FFFFFF',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              transition: 'all 150ms ease',
            }}
          >
            Example
          </button>
          {pinItem && <PinButton item={pinItem} size="xs" />}
          <button onClick={onNew} title="New challenge" style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFFFFF', cursor: 'pointer' }}>
            <Shuffle size={12} />
          </button>
          <button onClick={onDismiss} title="Dismiss" style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFFFFF', cursor: 'pointer' }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Example row */}
      <AnimatePresence>
        {showExample && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              paddingTop: 10,
              fontFamily: 'DM Sans, sans-serif', fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              <span style={{ color: 'rgba(245,197,24,0.7)', fontStyle: 'normal', fontWeight: 600, marginRight: 6 }}>eg.</span>
              {challenge.example}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Syllable estimator (front-end, no backend needed) ───────────────────────

function estimateSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = stripped.match(/[aeiouy]{1,2}/g);
  return m ? Math.max(1, m.length) : 1;
}

// ─── Rhyme map helpers ────────────────────────────────────────────────────────

const TOTAL_PALETTE = 44;

function buildColorMap(rhymeMap) {
  if (!rhymeMap?.length) return {};
  const counts = {};
  for (const e of rhymeMap) {
    if (e.color_id) counts[e.color_id] = (counts[e.color_id] || 0) + 1;
  }
  const map = {};
  for (const e of rhymeMap) {
    if (!e.color_id || counts[e.color_id] < 2) continue;
    const li = e.line_index;
    const wi = e.word_index ?? -1;
    if (wi < 0) continue;
    if (!map[li]) map[li] = {};
    if (!map[li][wi]) map[li][wi] = [];
    map[li][wi].push({ char_start: e.char_start ?? 0, char_end: e.char_end ?? e.word?.length ?? 0, color_id: e.color_id });
  }
  return map;
}

function renderLineColored(lineText, lineIndex, colorMap, getColor, onWordClick) {
  const lineHighlights = colorMap[lineIndex] || {};
  const tokens = lineText.split(/(\s+)/);
  let wordIndex = 0;
  return tokens.map((token, i) => {
    if (/^\s+$/.test(token) || token === '') return <span key={i}>{token}</span>;
    const wi = wordIndex++;
    const syllables = lineHighlights[wi];
    if (!syllables?.length) {
      if (onWordClick) {
        return <span key={i} data-li={lineIndex} data-wi={wi} onClick={e => onWordClick(e, lineIndex, wi, null)} style={{ cursor: 'pointer', borderRadius: 3 }}>{token}</span>;
      }
      return <span key={i}>{token}</span>;
    }
    const leadOffset = token.search(/[a-zA-Z']/);
    const lastLetterIdx = token.split('').reduce((acc, ch, idx) => /[a-zA-Z']/.test(ch) ? idx : acc, -1);
    const trailOffset = lastLetterIdx + 1;
    const clean = token.slice(leadOffset, trailOffset);
    const sorted = [...syllables].sort((a, b) => a.char_start - b.char_start);
    const merged = [];
    let mi = 0;
    while (mi < sorted.length) {
      let mj = mi + 1;
      while (mj < sorted.length && sorted[mj].color_id === sorted[mi].color_id) mj++;
      merged.push({ char_start: sorted[mi].char_start, char_end: sorted[mj - 1].char_end, color_id: sorted[mi].color_id });
      mi = mj;
    }
    const parts = [];
    if (leadOffset > 0) parts.push(<span key="lead">{token.slice(0, leadOffset)}</span>);
    let cursor = 0;
    for (let j = 0; j < merged.length; j++) {
      const { char_start, char_end, color_id } = merged[j];
      const s = Math.max(0, Math.min(char_start, clean.length));
      const e2 = Math.max(s, Math.min(char_end, clean.length));
      if (s > cursor) parts.push(<span key={`b${j}`}>{clean.slice(cursor, s)}</span>);
      const { bg, fg } = getColor(color_id);
      parts.push(<span key={`h${j}`} style={{ backgroundColor: bg, color: fg, borderRadius: 3, padding: '0 2px' }}>{clean.slice(s, e2)}</span>);
      cursor = e2;
    }
    if (cursor < clean.length) parts.push(<span key="tail">{clean.slice(cursor)}</span>);
    if (trailOffset < token.length) parts.push(<span key="trail">{token.slice(trailOffset)}</span>);
    const dominantColor = sorted[0].color_id;
    if (onWordClick) {
      return <span key={i} data-li={lineIndex} data-wi={wi} onClick={e => onWordClick(e, lineIndex, wi, dominantColor)} style={{ cursor: 'pointer' }}>{parts}</span>;
    }
    return <span key={i}>{parts}</span>;
  });
}

function ColorSwatch({ cid, isCurrent, getColor, onClick, scorePct }) {
  if (cid === 0) {
    return (
      <button onClick={onClick} title="No color"
        style={{ width: 26, height: 26, borderRadius: 5, background: 'rgba(255,255,255,0.04)',
          border: isCurrent ? '2px solid #EF4444' : '1px dashed rgba(255,255,255,0.2)',
          cursor: 'pointer', fontSize: 11, color: isCurrent ? '#EF4444' : '#4A4A4A',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >⊘</button>
    );
  }
  const { bg, fg } = getColor(cid);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={onClick} title={scorePct != null ? `Family ${cid} — ${scorePct}% match` : `Family ${cid}`}
        style={{ width: 26, height: 26, borderRadius: 5, background: bg, color: fg,
          border: isCurrent ? `2px solid ${fg}` : '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >{cid}</button>
      {scorePct != null && (
        <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, fontWeight: 700, color: fg, whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif', pointerEvents: 'none' }}>{scorePct}%</div>
      )}
    </div>
  );
}

function FamilySection({ label, ids, resolvedColorId, getColor, onAdd, activeCharStart, activeCharEnd, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!ids.length) return null;
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%',
          background: 'none', border: 'none', padding: '0 0 5px', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
          color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1 }}>{label} ({ids.length})</span>
        <span style={{ fontSize: 9, color: '#4A4A4A' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {ids.map(cid => (
            <ColorSwatch key={cid} cid={cid} isCurrent={cid === resolvedColorId}
              getColor={getColor} onClick={() => onAdd(cid, activeCharStart, activeCharEnd)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CorrectionPopover({ x, y, syllables, word, colorFamilies, familySamples, getColor, onRemove, onAdd, onRestore, onClose }) {
  const ref = useRef(null);
  const [selIdx, setSelIdx] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const fetchRef = useRef(0);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const lookup = selIdx != null ? (syllables[selIdx]?.text || word) : word;
    if (!lookup || !colorFamilies.length) { setSuggestions([]); return; }
    setSuggestions(null);
    const id = ++fetchRef.current;
    const families = colorFamilies.map(cid => ({ color_id: cid, sample_words: (familySamples?.[cid] || []).slice(0, 8) }));
    suggestFamily(lookup, families).then(({ data }) => {
      if (fetchRef.current !== id) return;
      setSuggestions(data?.suggestions || []);
    }).catch(() => { if (fetchRef.current === id) setSuggestions([]); });
  }, [word, selIdx, syllables, colorFamilies, familySamples]); // eslint-disable-line

  const multiSyllable = syllables.length > 1;
  const allSameColor = multiSyllable && syllables[0]?.color_id != null && syllables.every(s => s.color_id === syllables[0].color_id);
  const activeCharStart = selIdx != null ? syllables[selIdx]?.char_start ?? null : null;
  const activeCharEnd   = selIdx != null ? syllables[selIdx]?.char_end   ?? null : null;
  const wholeWordColorId = syllables.find(s => s.color_id)?.color_id ?? null;
  const resolvedColorId  = selIdx != null ? (syllables[selIdx]?.color_id ?? null) : wholeWordColorId;
  const hasColor = resolvedColorId != null;
  const usedSet = new Set(colorFamilies);
  const usedIds   = Array.from({ length: TOTAL_PALETTE }, (_, i) => i + 1).filter(id => usedSet.has(id));
  const unusedIds = Array.from({ length: TOTAL_PALETTE }, (_, i) => i + 1).filter(id => !usedSet.has(id));
  const popH = Math.min(window.innerHeight - 40, 520);
  const top  = Math.min(y + 8, window.innerHeight - popH - 8);
  const left = Math.min(x, window.innerWidth - 258);
  const divider = <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0' }} />;
  const btnStyle = (bg, fg) => ({ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px', borderRadius: 6, background: bg, border: '1px solid rgba(255,255,255,0.07)', color: fg, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, marginBottom: 3 });

  return (
    <div ref={ref} style={{ position: 'fixed', top, left, zIndex: 9999, background: 'rgba(14,14,14,0.97)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, backdropFilter: 'blur(40px)', width: 248, maxHeight: popH, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.8)' }}>
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
        {multiSyllable && (
          <>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>Scope</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {(() => {
                const allIsActive = selIdx === null;
                const allBg = allSameColor ? getColor(syllables[0].color_id).bg : null;
                const allFg = allSameColor ? getColor(syllables[0].color_id).fg : null;
                return (
                  <button onClick={() => setSelIdx(null)} style={{ padding: '3px 8px', borderRadius: 5, background: allSameColor ? allBg : allIsActive ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)', border: allSameColor ? allIsActive ? `2px solid ${allFg}` : `1px solid ${allFg}88` : allIsActive ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)', color: allSameColor ? allFg : allIsActive ? '#F5C518' : '#9B9B9B', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>All</button>
                );
              })()}
              {syllables.map((s, idx) => {
                const isActive = selIdx === idx;
                const showColor = !allSameColor && s.color_id != null;
                const { bg, fg } = showColor ? getColor(s.color_id) : { bg: 'rgba(255,255,255,0.05)', fg: '#9B9B9B' };
                return (
                  <button key={idx} onClick={() => setSelIdx(idx)}
                    style={{ padding: '3px 8px', borderRadius: 5, background: isActive ? (showColor ? bg : 'rgba(255,255,255,0.12)') : (showColor ? bg : 'rgba(255,255,255,0.05)'), border: isActive ? `2px solid ${showColor ? fg : 'rgba(255,255,255,0.5)'}` : `1px solid ${showColor ? fg + '88' : 'rgba(255,255,255,0.1)'}`, color: isActive ? (showColor ? fg : '#FFFFFF') : (showColor ? fg : '#9B9B9B'), fontFamily: 'DM Mono, DM Sans, monospace', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}
                  >{s.text || `syl${idx + 1}`}</button>
                );
              })}
            </div>
            {divider}
          </>
        )}
        {hasColor && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: getColor(resolvedColorId).bg, flexShrink: 0 }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#AAAAAA', flex: 1 }}>Family {resolvedColorId}</span>
            </div>
            <button style={btnStyle('rgba(239,68,68,0.12)', '#EF4444')} onClick={() => onRemove(activeCharStart)}><X size={11} /> Remove from family</button>
            <button style={btnStyle('rgba(255,255,255,0.05)', '#6B6B6B')} onClick={() => onRestore(activeCharStart)}>Restore engine default</button>
          </>
        )}
        {!hasColor && (
          <button style={btnStyle('rgba(255,255,255,0.05)', '#6B6B6B')} onClick={() => onRestore(activeCharStart)}>Restore engine default</button>
        )}
        <div style={{ marginTop: 10, padding: '8px 0 6px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#F5C518', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Suggested match</div>
          {suggestions === null && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.4)', borderTopColor: '#F5C518', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6B6B6B' }}>Scoring…</span>
            </div>
          )}
          {suggestions?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingBottom: 4 }}>
              {suggestions.map(({ color_id, score }) => (
                <ColorSwatch key={color_id} cid={color_id} isCurrent={color_id === resolvedColorId} getColor={getColor} scorePct={Math.round(score * 100)} onClick={() => onAdd(color_id, activeCharStart, activeCharEnd)} />
              ))}
            </div>
          )}
          {suggestions?.length === 0 && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555', fontStyle: 'italic' }}>No phonetic match — pick from palette below</span>
          )}
        </div>
        {divider}
      </div>
      <div style={{ overflowY: 'auto', padding: '0 12px 12px', flex: 1 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>No color</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <ColorSwatch cid={0} isCurrent={resolvedColorId === 0} getColor={getColor} onClick={() => onAdd(0, activeCharStart, activeCharEnd)} />
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '0 0 8px' }} />
        <FamilySection label={hasColor ? 'Move to used family' : 'Used families'} ids={usedIds} resolvedColorId={resolvedColorId} getColor={getColor} onAdd={onAdd} activeCharStart={activeCharStart} activeCharEnd={activeCharEnd} defaultOpen={true} />
        <FamilySection label="New family" ids={unusedIds} resolvedColorId={resolvedColorId} getColor={getColor} onAdd={onAdd} activeCharStart={activeCharStart} activeCharEnd={activeCharEnd} defaultOpen={usedIds.length === 0} />
      </div>
    </div>
  );
}

// ─── Writing area ─────────────────────────────────────────────────────────────

function WriteArea({ barMode, bpm = 90, scrollContainerRef }) {
  const { target, remaining, running, expired, start: startTimer } = useTimer();
  const [text, setText]       = useState('');
  const [focused, setFocused] = useState(false);
  const hasTyped              = useRef(false);
  const hasContent            = text.trim().length > 0;
  const lines                 = text.split('\n');
  const wordCount             = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Bar grouping
  const [groupBarMode, setGroupBarMode] = useState(false);
  const [barSize, setBarSize]           = useState(4);
  const [barBoundaries, setBarBoundaries] = useState(new Set());
  const [barDropdownOpen, setBarDropdownOpen] = useState(false);
  const barDropdownRef = useRef(null);

  // Syllable count mode
  const [syllMode, setSyllMode] = useState('off'); // 'off' | 'words' | 'bars'

  // Rhyme analysis features
  const { getColor, resetPalette } = useColorPalette();
  const { corrections, removeColor: removeCorrection, addColor: addCorrection, clearWord, clear: clearAllCorrections } = useCorrections('freewrite');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [correctMode, setCorrectMode] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const [popover, setPopover] = useState(null);
  const analyzeTimerRef = useRef(null);

  useEffect(() => {
    if (!barDropdownOpen) return;
    const handler = (e) => {
      if (barDropdownRef.current && !barDropdownRef.current.contains(e.target))
        setBarDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [barDropdownOpen]);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (!hasTyped.current && val.trim()) {
      hasTyped.current = true;
      startTimer();
    }
    // Schedule rhyme analysis (debounced, BPM 90 default)
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    const ls = val.split('\n');
    if (ls.some(l => l.trim())) {
      setAnalyzing(true);
      analyzeTimerRef.current = setTimeout(async () => {
        const { data } = await analyze(ls, bpm);
        setAnalyzing(false);
        if (data) setAnalysis(data);
      }, 900);
    } else {
      setAnalysis(null);
      setAnalyzing(false);
    }
  };

  // Normalized rhyme map (IDs clamped to palette range)
  const normalizedRhymeMap = useMemo(() => {
    const raw = analysis?.rhyme_map;
    if (!raw?.length) return [];
    return raw.map(e => ({ ...e, color_id: e.color_id ? ((e.color_id - 1) % TOTAL_PALETTE) + 1 : e.color_id }));
  }, [analysis]);

  const baseColorMap = useMemo(() => buildColorMap(normalizedRhymeMap), [normalizedRhymeMap]);
  const colorMap     = useMemo(() => mapVisible ? applyCorrections(baseColorMap, corrections) : {}, [mapVisible, baseColorMap, corrections]);

  const colorFamilies = useMemo(() => [...new Set(Object.values(colorMap).flatMap(wi => Object.values(wi).flatMap(arr => arr.map(e => e.color_id))))].filter(Boolean), [colorMap]);
  const familySamples = useMemo(() => {
    const map = {};
    for (const e of normalizedRhymeMap) {
      if (!e.color_id) continue;
      if (!map[e.color_id]) map[e.color_id] = [];
      if (map[e.color_id].length < 8 && e.word) map[e.color_id].push(e.word);
    }
    return map;
  }, [normalizedRhymeMap]);

  // Syllable counts from API (per word), falls back to estimator
  const apiSyllCounts = useMemo(() => {
    const m = {};
    for (const e of normalizedRhymeMap) {
      const k = `${e.line_index}_${e.word_index}`;
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [normalizedRhymeMap]);

  // Per-line syllable totals — prefer API data when available
  const lineSyllCounts = useMemo(() => {
    if (syllMode === 'off') return {};
    if (normalizedRhymeMap.length > 0) {
      const m = {};
      for (const k in apiSyllCounts) {
        const li = parseInt(k.split('_')[0], 10);
        m[li] = (m[li] || 0) + apiSyllCounts[k];
      }
      return m;
    }
    const m = {};
    lines.forEach((line, li) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      m[li] = words.reduce((sum, w) => sum + estimateSyllables(w), 0);
    });
    return m;
  }, [lines, syllMode, normalizedRhymeMap, apiSyllCounts]);


  const nonEmpty = lines.filter(l => l.trim()).length;

  // Detect blank-line-separated groups for pasted lyrics with natural bar breaks
  const blankGroupEnds = useMemo(() => {
    const s = new Set();
    lines.forEach((l, i) => {
      if (l.trim() && (!lines[i + 1] || !lines[i + 1].trim())) s.add(i);
    });
    return s;
  }, [lines]);
  const blankGroupCount = useMemo(() =>
    lines.reduce((acc, l, i) => l.trim() && (i === 0 || !lines[i - 1].trim()) ? acc + 1 : acc, 0),
  [lines]);
  const useBlankGroups = barBoundaries.size === 0 && blankGroupCount > 1 && blankGroupCount < nonEmpty;

  const barCount = barBoundaries.size > 0
    ? barBoundaries.size + 1
    : useBlankGroups ? blankGroupCount
    : Math.ceil(nonEmpty / barSize);

  const LINE_H = 16 * 1.85; // px — must match textarea lineHeight

  return (
    <div style={{
      flex: 1, position: 'relative', borderRadius: 16,
      border: focused
        ? '1px solid rgba(255,255,255,0.9)'
        : hasContent ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.18)',
      overflow: 'visible', transition: 'border 400ms ease',
    }}>
      {/* Timer bar — sits on top border line */}
      {barMode && (running || expired || target !== remaining) && (
        <TimerBar target={target} remaining={remaining} running={running} expired={expired} />
      )}

      {/* Glass fill */}
      <motion.div
        animate={{ opacity: hasContent ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          background: 'rgba(15,15,20,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Stats / toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px',
          borderBottom: hasContent ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
          flexShrink: 0, transition: 'border 400ms ease',
        }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Freewrite
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Syll toggle */}
            <button
              onClick={() => setSyllMode(m => m === 'off' ? 'words' : m === 'words' ? 'bars' : 'off')}
              title={`Syllable count: ${syllMode} — click to cycle`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 6,
                background: syllMode !== 'off' ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)',
                border: syllMode !== 'off' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: syllMode !== 'off' ? '#38BDF8' : '#3A3A3A', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms',
              }}
            >Syll{syllMode !== 'off' ? `: ${syllMode}` : ''}</button>

            {/* Words count */}
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              {wordCount} words
            </span>

            {/* Lines / Bars merged control */}
            {nonEmpty > 0 && (
              <div ref={barDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setGroupBarMode(m => !m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 7px', borderRadius: barDropdownOpen ? '6px 0 0 6px' : 6,
                    background: groupBarMode ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
                    border: groupBarMode ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    borderRight: barDropdownOpen ? 'none' : undefined,
                    color: groupBarMode ? '#F5C518' : 'rgba(255,255,255,0.35)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                >
                  {groupBarMode ? `${barSize} bars` : `${nonEmpty} lines`}
                </button>
                <button
                  onClick={() => setBarDropdownOpen(o => !o)}
                  title="Set bars per phrase"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2px 5px', borderRadius: '0 6px 6px 0',
                    background: barDropdownOpen ? 'rgba(245,197,24,0.2)' : groupBarMode ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
                    border: groupBarMode ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    color: groupBarMode ? '#F5C518' : '#3A3A3A',
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                >
                  <ChevronRight size={9} style={{ transform: barDropdownOpen ? 'rotate(270deg)' : 'rotate(90deg)', transition: 'transform 150ms' }} />
                </button>
                {barDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 500,
                    background: 'rgba(14,14,14,0.97)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: 10, backdropFilter: 'blur(40px)',
                    padding: 8, minWidth: 120,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                  }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Bars per phrase
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                      {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => {
                          setBarSize(n);
                          setBarBoundaries(new Set());
                          setBarDropdownOpen(false);
                          if (!groupBarMode) setGroupBarMode(true);
                        }}
                          style={{
                            padding: '4px 0', borderRadius: 5, textAlign: 'center',
                            background: barSize === n && barBoundaries.size === 0 ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
                            border: barSize === n && barBoundaries.size === 0 ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            color: barSize === n && barBoundaries.size === 0 ? '#F5C518' : '#9B9B9B',
                            fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >{n}</button>
                      ))}
                    </div>
                    {barBoundaries.size > 0 && (
                      <>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '8px 0 6px' }} />
                        <button
                          onClick={() => { setBarBoundaries(new Set()); setBarDropdownOpen(false); }}
                          style={{
                            width: '100%', padding: '5px 0', borderRadius: 6, textAlign: 'center',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#EF4444', cursor: 'pointer',
                            fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                          }}
                        >Clear custom bars</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Correct mode toggle */}
            <button
              onClick={() => { if (analysis) { setCorrectMode(m => !m); setPopover(null); } }}
              title={!analysis ? 'Analyzing…' : correctMode ? 'Exit correction mode' : 'Click words to adjust rhyme colors'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 6,
                background: correctMode ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
                border: correctMode ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: correctMode ? '#F5C518' : analysis ? '#9B9B9B' : '#3A3A3A',
                cursor: analysis ? 'pointer' : 'default',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms', opacity: analysis ? 1 : 0.45,
              }}
            >
              <Pencil size={10} />
              {correctMode ? 'Done' : 'Correct'}
            </button>

            {/* Colors — reset palette */}
            <button
              onClick={() => { resetPalette(); clearAllCorrections(); }}
              title="Regenerate color palette"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9B9B9B', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms',
              }}
            >
              <RotateCcw size={10} />
              Colors
            </button>

            {/* Map — toggle rhyme highlighting */}
            <button
              onClick={() => setMapVisible(v => !v)}
              title={!analysis ? (analyzing ? 'Analyzing…' : 'Waiting for analysis') : mapVisible ? 'Hide rhyme map' : 'Show rhyme map'}
              style={{
                padding: '2px 7px', borderRadius: 6,
                background: (mapVisible && analysis) ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                border: (mapVisible && analysis) ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: (mapVisible && analysis) ? '#4ADE80' : analysis ? '#9B9B9B' : '#3A3A3A',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500,
                transition: 'all 120ms', opacity: analysis ? 1 : 0.45,
              }}
            >{analyzing ? '…' : 'Map'}</button>

          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {/* Line numbers — grows with content */}
          <div style={{ width: 44, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.04)', padding: '16px 0', alignSelf: 'flex-start' }}>
            {lines.map((_, i) => {
              const isBarEnd = groupBarMode && (
                barBoundaries.size > 0 ? barBoundaries.has(i) :
                useBlankGroups ? blankGroupEnds.has(i) :
                (i + 1) % barSize === 0
              );
              const isCustom = barBoundaries.has(i);
              const syllTotal = lineSyllCounts[i];
              return (
                <div key={i}>
                  <div
                    onClick={groupBarMode ? () => setBarBoundaries(prev => {
                      const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
                    }) : undefined}
                    style={{
                      height: LINE_H,
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      paddingRight: syllMode !== 'off' && syllTotal > 0 ? 4 : 10,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                      color: isCustom ? '#F5C518'
                           : isBarEnd ? 'rgba(245,197,24,0.4)'
                           : 'rgba(255,255,255,0.15)',
                      userSelect: 'none', cursor: groupBarMode ? 'pointer' : 'default',
                      transition: 'color 150ms', gap: 3,
                    }}
                  >
                    {syllMode !== 'off' && syllTotal > 0 && (
                      <span style={{
                        fontSize: 8, color: syllMode === 'bars' ? 'rgba(56,189,248,0.6)' : 'rgba(56,189,248,0.35)',
                        fontWeight: 600, lineHeight: 1,
                      }}>{syllTotal}</span>
                    )}
                    <span style={{ paddingRight: syllMode !== 'off' ? 0 : 0, minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
                  </div>
                  {isBarEnd && (
                    <div style={{ height: 1, background: 'rgba(245,197,24,0.3)', margin: '1px 2px 1px 0' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Editor column — mirror sets height, textarea overlays absolutely */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            {!text && (
              <div style={{
                position: 'absolute', top: 16, left: 20,
                fontFamily: 'DM Sans, sans-serif', fontSize: 16, lineHeight: 1.85,
                color: 'rgba(255,255,255,0.15)', pointerEvents: 'none', userSelect: 'none',
                zIndex: 0,
              }}>
                Just write…
              </div>
            )}
            {/* Mirror — natural flow, sets container height */}
            <div
              aria-hidden
              style={{
                padding: '16px 20px',
                fontFamily: 'DM Sans, sans-serif', fontSize: 16, lineHeight: 1.85,
                color: '#EDEDEC', whiteSpace: 'pre-wrap', wordBreak: 'break-word', wordWrap: 'break-word',
                pointerEvents: correctMode ? 'auto' : 'none',
                boxSizing: 'border-box', position: 'relative', zIndex: 1,
                minHeight: 300,
              }}
            >
              {lines.map((line, i) => (
                <div key={i} style={{ minHeight: LINE_H }}>
                  {renderLineColored(line, i, colorMap, getColor, correctMode ? (e, li, wi, colorId) => {
                    e.stopPropagation();
                    const wordTokens = line.split(/(\s+)/).filter(t => !/^\s+$/.test(t) && t !== '');
                    const rawWord = wordTokens[wi] || '';
                    const leadOffset = rawWord.search(/[a-zA-Z']/);
                    const lastLetterIdx = rawWord.split('').reduce((acc, ch, idx) => /[a-zA-Z']/.test(ch) ? idx : acc, -1);
                    const word = leadOffset >= 0 ? rawWord.slice(leadOffset, lastLetterIdx + 1) : rawWord;
                    const wordSylls = normalizedRhymeMap.filter(r => r.line_index === li && r.word_index === wi).sort((a, b) => (a.char_start ?? 0) - (b.char_start ?? 0));
                    const syllables = wordSylls.length > 0
                      ? wordSylls.map(r => ({ char_start: r.char_start ?? 0, char_end: r.char_end ?? word.length, color_id: colorMap[li]?.[wi]?.find(e2 => e2.char_start === (r.char_start ?? 0))?.color_id ?? null, text: word.slice(r.char_start ?? 0, r.char_end ?? word.length) || word }))
                      : [{ char_start: 0, char_end: word.length, color_id: colorId, text: word }];
                    setPopover({ x: e.clientX, y: e.clientY, li, wi, word, syllables });
                  } : null)}
                </div>
              ))}
            </div>
            {/* Textarea — absolutely overlays mirror */}
            <textarea
              value={text}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onWheel={(e) => {
                e.stopPropagation();
                if (scrollContainerRef?.current) {
                  scrollContainerRef.current.scrollBy({ top: e.deltaY });
                }
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                padding: '16px 20px',
                fontFamily: 'DM Sans, sans-serif', fontSize: 16, lineHeight: 1.85,
                color: correctMode ? 'transparent' : 'transparent',
                caretColor: '#F5C518',
                background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', boxSizing: 'border-box', overflow: 'hidden',
                zIndex: 2,
                pointerEvents: correctMode ? 'none' : 'auto',
              }}
            />
          </div>
        </div>

      </div>

      {/* Correction popover */}
      {popover && (
        <CorrectionPopover
          x={popover.x} y={popover.y}
          syllables={popover.syllables}
          word={popover.word}
          colorFamilies={colorFamilies}
          familySamples={familySamples}
          getColor={getColor}
          onRemove={(charStart) => { removeCorrection(popover.li, popover.wi, popover.word, popover.syllables[0]?.color_id, charStart); setPopover(null); }}
          onAdd={(colorId, charStart, charEnd) => { addCorrection(popover.li, popover.wi, colorId, popover.word, charStart, charEnd); setPopover(null); }}
          onRestore={(charStart) => { clearWord(popover.li, popover.wi, charStart); setPopover(null); }}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Compact sticky timer (mirrors Dashboard FloatingTimer) ──────────────────

function CompactTimer({ onExpand }) {
  const { remaining, target, running, expired, reset } = useTimer();
  const pct = target > 0 ? remaining / target : 0;
  const color = expired ? '#EF4444' : timerColor(pct);
  const pctElapsed = 1 - pct;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.94 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(15,15,20,0.8)',
        border: `1px solid ${color}55`,
        borderRadius: 12, backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden', position: 'relative',
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${color}22`,
      }}
    >
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: `${pctElapsed * 100}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: 'width 1s linear, background 1.5s ease' }} />
      </div>
      <button onClick={onExpand} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px 9px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
          <svg width={26} height={26} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={13} cy={13} r={10} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
            <circle cx={13} cy={13} r={10} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 * pctElapsed}`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 1.5s ease' }} />
          </svg>
        </div>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, color, letterSpacing: '0.05em', transition: 'color 1.5s ease' }}>
          {expired ? 'Done' : formatTime(remaining)}
        </span>
      </button>
      <button onClick={reset} style={{ width: 26, height: 26, borderRadius: 7, marginRight: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}>
        <X size={11} />
      </button>
    </motion.div>
  );
}

const PINNABLE_CHALLENGES = CHALLENGES.map((c, i) => ({
  id: `challenge-${i}`,
  label: c.title,
  type: 'challenge',
  subtitle: c.device,
  path: '/freewrite',
}));

export default function FreewritePage() {
  useRegisterPinnableItems(PINNABLE_CHALLENGES);
  const [challenge, setChallenge] = useState(null);
  const [barMode, setBarMode]     = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [metroBpm, setMetroBpm]   = useState(90);
  const scrollRef = useRef(null);
  const usedRef = useRef(new Set());
  const { setDuration } = useTimer();

  // Hide global HeroWave shader (same as ToolsPage)
  useEffect(() => {
    const el = document.querySelector('[data-hero-wave]');
    if (el) el.style.display = 'none';
    return () => { if (el) el.style.display = ''; };
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrolled(scrollRef.current.scrollTop > 80);
  }, []);

  const pickChallenge = useCallback(() => {
    if (usedRef.current.size >= CHALLENGES.length) usedRef.current.clear();
    const pool = CHALLENGES.filter((_, i) => !usedRef.current.has(i));
    const idx = CHALLENGES.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    usedRef.current.add(idx);
    const picked = CHALLENGES[idx];
    setChallenge(picked);
    setDuration(picked.duration);
  }, [setDuration]);

  return (
    <>
      {/* Fixed backgrounds — same as ToolsPage */}
      <div style={{ position: 'fixed', inset: 0, background: '#030305', zIndex: 10, pointerEvents: 'none' }} />
      <DottedSurface style={{ zIndex: 11 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,5,0.28)', pointerEvents: 'none', zIndex: 12 }} />
      <GlassFilter />

      {/* Scrollable content container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ position: 'relative', zIndex: 13, height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent', padding: '60px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >

      {/* Timer row — big timer OR compact when scrolled; sticky so clock stays visible */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flexShrink: 0, position: 'sticky', top: 8, zIndex: 20, minHeight: 52 }}>
        <AnimatePresence mode="wait">
          {!scrolled ? (
            <motion.div key="big"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
            >
              {!barMode && <BigTimer barMode={barMode} setBarMode={setBarMode} />}
              {barMode && (
                <button onClick={() => setBarMode(false)}
                  style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', padding: '8px 0' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
                >show countdown</button>
              )}
              <MetronomeBar bpm={metroBpm} onBpmChange={setMetroBpm} />
            </motion.div>
          ) : (
            <motion.div key="compact"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 20 }}
            >
              <CompactTimer onExpand={() => { if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              <MetronomeBar bpm={metroBpm} onBpmChange={setMetroBpm} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Challenge + challenge button row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative', zIndex: 20 }}
      >
        <AnimatePresence mode="wait">
          {challenge ? (
            <div key="card" style={{ flex: 1 }}>
              <ChallengeCard
                challenge={challenge}
                onDismiss={() => setChallenge(null)}
                onNew={pickChallenge}
                pinItem={PINNABLE_CHALLENGES.find(p => p.label === challenge.title)}
              />
            </div>
          ) : (
            <motion.div key="empty" style={{ flex: 1 }} />
          )}
        </AnimatePresence>

        <button
          onClick={pickChallenge}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
            background: challenge ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.06)',
            border: challenge ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.7)',
            color: challenge ? '#F5C518' : '#FFFFFF',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
            transition: 'all 200ms ease',
            height: 44,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.12)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'; e.currentTarget.style.color = '#F5C518'; }}
          onMouseLeave={e => {
            e.currentTarget.style.background = challenge ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = challenge ? 'rgba(245,197,24,0.35)' : 'rgba(255,255,255,0.7)';
            e.currentTarget.style.color = challenge ? '#F5C518' : '#FFFFFF';
          }}
        >
          <Zap size={14} />
          {challenge ? 'New' : 'Challenge'}
        </button>
      </motion.div>

      {/* Writing area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', position: 'relative', zIndex: 10, minHeight: '60vh', flexShrink: 0 }}
      >
        <WriteArea barMode={barMode} bpm={metroBpm} scrollContainerRef={scrollRef} />
      </motion.div>

      </div>
    </>
  );
}

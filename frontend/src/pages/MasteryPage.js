import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Lock,
  Zap, Music2, Layers, BarChart2,
  Mic2, Cpu, Hash, Shuffle
} from 'lucide-react';
import { getMastery } from '../api/prosodicApi';

// ── Dev mock data (toggle only) ───────────────────────────────────────────────
const MOCK_REPORT = {
  ready: true,
  data_snapshot: { songs_analyzed: 11, total_bars: 88, total_rhyme_events: 312, total_cadence_events: 176 },
  volume: { score: 62, songs_analyzed: 11, total_bars: 88, total_rhyme_events: 312 },
  devices: {
    total_lines_scanned: 176,
    signature: [
      { id: 'alliteration', name: 'Alliteration',  category: 'Sound',      definition: 'Consecutive words that open with the same consonant sound — the ear locks onto the chain.', tip: 'Two alliterative words is subtle; three in a row is a signature. Use it to make a bar stick.', count: 62, rate_per_100_lines: 35.2, status: 'signature', examples: ['built from the bottom broke bread with brothers who believed', 'still standing strong swear i sealed my soul in silence'] },
      { id: 'simile',       name: 'Simile',         category: 'Comparison', definition: 'A direct comparison using "like" or "as" — bridges abstract emotion to vivid imagery.', tip: 'Reach for something specific to your world — not "cold as ice" but "cold as the smell of bleach at 3am."', count: 38, rate_per_100_lines: 21.6, status: 'signature', examples: ['move like water through the cracks they never filled', 'hit like the first winter you spent with nothing on the shelves'] },
      { id: 'repetition',   name: 'Repetition',     category: 'Emphasis',   definition: 'A key word used 4+ times across a verse — driving a single idea home through frequency.', tip: 'Repetition is weaponized emphasis. Let the word echo until the listener starts hearing it before you say it.', count: 9, rate_per_100_lines: 5.1, status: 'signature', examples: ['they never asked they never called they never showed up at all'] },
    ],
    overused: [
      { id: 'simile', name: 'Simile', category: 'Comparison', definition: 'A direct comparison using "like" or "as."', tip: 'You lean heavily on similes — try converting some into metaphors for more declarative force. "I\'m like a storm" → "I am the storm."', count: 38, rate_per_100_lines: 21.6, status: 'overused', examples: ['move like water through the cracks', 'sharp like the hunger that raised me'] },
    ],
    emerging: [
      { id: 'anaphora',     name: 'Anaphora',    category: 'Structural', definition: 'The same word or phrase opens back-to-back lines.', tip: 'Anaphora builds urgency. Used over 3+ lines it becomes a chant structure the crowd owns.', count: 11, rate_per_100_lines: 6.3, status: 'emerging', examples: ['never gave up / never looked back / never let them see me fold'] },
      { id: 'enumeration',  name: 'Enumeration', category: 'Structural', definition: 'Stacking 3+ items in a comma-separated list.', tip: 'End the list on the word that breaks the pattern — the last item should land differently.', count: 8,  rate_per_100_lines: 4.5, status: 'emerging', examples: ['the hustle, the hunger, the silence, the war'] },
      { id: 'assonance',    name: 'Assonance',   category: 'Sound',      definition: 'Repeated vowel sounds within a line — internal sonic texture beyond end rhyme.', tip: 'Three words in a bar sharing the same vowel builds a hum the listener feels before they consciously hear it.', count: 6, rate_per_100_lines: 3.4, status: 'emerging', examples: ['pain in the rain i maintain stay sane'] },
    ],
    untapped: [
      { id: 'anadiplosis',        name: 'Anadiplosis',        category: 'Structural', definition: 'The last word of one line becomes the first word of the next — a chain link between bars.', tip: 'Anadiplosis makes the verse feel like one unbroken argument — each bar grows directly from the one before it.', count: 1, rate_per_100_lines: 0.6, status: 'untapped', examples: [] },
      { id: 'rhetorical_question',name: 'Rhetorical Question', category: 'Rhetorical', definition: 'A question the listener isn\'t meant to answer — forces them to feel the weight of the implied answer.', tip: 'One rhetorical question mid-verse stops the listener cold and creates a pocket of silence in the flow.', count: 1, rate_per_100_lines: 0.6, status: 'untapped', examples: [] },
      { id: 'epistrophe',         name: 'Epistrophe',         category: 'Structural', definition: 'The same word or phrase closes consecutive lines.', tip: 'Where anaphora opens hard, epistrophe closes heavy — it\'s the period at the end of the paragraph, repeated.', count: 0, rate_per_100_lines: 0, status: 'untapped', examples: [] },
      { id: 'asyndeton',          name: 'Asyndeton',          category: 'Structural', definition: 'Listing items without conjunctions — stripping "and"/"or" for speed and punch.', tip: 'Asyndeton compresses time. Drop the conjunctions when the bars need to hit rapid-fire.', count: 0, rate_per_100_lines: 0, status: 'untapped', examples: [] },
    ],
  },
  categories: [
    { id: 'flow', name: 'Flow & Cadence', description: 'Syllabic density control, pocket consistency, and cadence variety.', score: 74, level: 'Competent', level_color: '#F5C518', details: { most_used_cadence: 'standard', avg_syllables_per_beat: 3.4, avg_inversion_rate: 0.21, cadence_variety: 4, density_control_pct: 68.2 }, trend: { direction: 'up', delta: 16, early_score: 58, recent_score: 74 }, example_lines: ['never told nobody what i been through just kept moving through the mud', 'stack it fold it flip it back to nothing now i got it all figured out'] },
    { id: 'rhyme_architecture', name: 'Rhyme Architecture', description: 'Precision and range of your rhyme structures.', score: 82, level: 'Exemplary', level_color: '#4ADE80', details: { most_used_rhyme_type: 'nucleus', avg_similarity_score: 0.891, total_rhyme_pairs: 312, aave_bridge_pct: 8.3 }, trend: { direction: 'up', delta: 9, early_score: 73, recent_score: 82 }, example_lines: ['they said i was lost but i found myself in the fire', 'higher than the wire they built around the empire'] },
    { id: 'internal_rhyme', name: 'Internal Rhyme Density', description: 'How densely rhyme sound appears within and across bars.', score: 57, level: 'Approaching', level_color: '#F97316', details: { avg_density_pct: 52.1, peak_density_pct: 91.0, density_consistency: 74.3, bars_measured: 88 }, trend: { direction: 'neutral', delta: 2, early_score: 55, recent_score: 57 }, example_lines: ['pain in the rain i maintain stay sane when they blame me for everything'] },
    { id: 'multisyllabic', name: 'Multisyllabic Flow', description: 'Compression and high-syllable-count line construction.', score: 63, level: 'Competent', level_color: '#F5C518', details: { compression_rate_pct: 41.2, high_density_lines_pct: 55.7, avg_syllables_per_beat: 3.4 }, trend: { direction: 'up', delta: 22, early_score: 41, recent_score: 63 }, example_lines: ['navigating every situation calculating every move that i make deliberating'] },
    { id: 'motif', name: 'Motif Architecture', description: 'Semantic field depth, cluster strength, and thematic recurrence.', score: 38, level: 'Developing', level_color: '#9B9B9B', details: { motifs_found: 14, unique_fields: 5, avg_cluster_strength: 0.41, most_used_field: 'struggle' }, trend: { direction: 'up', delta: 8, early_score: 30, recent_score: 38 }, example_lines: ['built from the bottom rose up when nobody believed'] },
    { id: 'stress', name: 'Stress Architecture', description: 'Controlled use of stress inversions and pattern diversity.', score: 69, level: 'Competent', level_color: '#F5C518', details: { avg_inversion_rate: 0.23, avg_inversions_per_line: 1.4, stress_pattern_variety: 17, control_score: 96.0 }, trend: { direction: 'neutral', delta: -2, early_score: 71, recent_score: 69 }, example_lines: ['never told them where i was going just kept going till it made sense'] },
    { id: 'rhyme_diversity', name: 'Phoneme Family Range', description: 'Breadth of distinct rhyme families and phoneme vocabulary.', score: 88, level: 'Exemplary', level_color: '#4ADE80', details: { unique_rhyme_words: 198, distinct_phoneme_tails: 44 }, trend: { direction: 'up', delta: 11, early_score: 77, recent_score: 88 }, example_lines: ['from the concrete to the palace same soul different angle'] },
  ],
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD   = '#F5C518';
const DARK   = 'rgba(15,15,20,0.85)';
const BORDER = 'rgba(255,255,255,0.09)';
const MUTED  = '#9B9B9B';
const TEXT   = '#EDEDEC';

const FONTS = {
  display: 'Outfit, DM Sans, sans-serif',
  body:    'DM Sans, sans-serif',
  mono:    'DM Mono, monospace',
};

const LEVEL_CONFIG = {
  Exemplary:   { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)' },
  Competent:   { color: GOLD,      bg: 'rgba(245,197,24,0.08)', border: 'rgba(245,197,24,0.2)'  },
  Approaching: { color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)'  },
  Developing:  { color: MUTED,     bg: 'rgba(155,155,155,0.07)',border: 'rgba(155,155,155,0.15)' },
};

const CATEGORY_ICONS = {
  flow:              Mic2,
  rhyme_architecture: Music2,
  internal_rhyme:    Layers,
  multisyllabic:     Zap,
  motif:             Cpu,
  stress:            BarChart2,
  rhyme_diversity:   Hash,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(score) { return `${Math.min(100, score)}%`; }

function ScoreBar({ score, color, animated = true }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div style={{
      position: 'relative', height: 8, borderRadius: 4,
      background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: animated ? pct(width) : pct(score),
        borderRadius: 4,
        background: `linear-gradient(90deg, ${color}bb, ${color})`,
        boxShadow: `0 0 8px ${color}55`,
        transition: animated ? 'width 900ms cubic-bezier(0.16,1,0.3,1)' : 'none',
      }} />
      {/* Score marker line */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, width: 2,
        left: `calc(${pct(score)} - 1px)`,
        background: color,
        opacity: 0.8,
      }} />
    </div>
  );
}

function TrendBadge({ trend }) {
  if (!trend || trend.direction === 'neutral') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Minus size={11} color={MUTED} />
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: MUTED }}>stable</span>
      </div>
    );
  }
  const up = trend.direction === 'up';
  const color = up ? '#4ADE80' : '#EF4444';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} color={color} />
      <span style={{ fontFamily: FONTS.mono, fontSize: 11, color }}>
        {up ? '+' : ''}{trend.delta}
      </span>
    </div>
  );
}

function LevelPill({ level }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.Developing;
  return (
    <span style={{
      fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 6,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {level}
    </span>
  );
}

// ── Detail rows rendered per category ────────────────────────────────────────

const DETAIL_LABELS = {
  most_used_cadence:        'Most used cadence',
  avg_syllables_per_beat:   'Avg syllables / beat',
  avg_inversion_rate:       'Avg inversion rate',
  cadence_variety:          'Cadence classes used',
  density_control_pct:      'Density control',
  most_used_rhyme_type:     'Dominant rhyme type',
  avg_similarity_score:     'Avg rhyme precision',
  total_rhyme_pairs:        'Total rhyme pairs',
  aave_bridge_pct:          'AAVE bridge usage',
  rhyme_type_breakdown:     null,           // skip object field
  avg_density_pct:          'Avg internal density',
  peak_density_pct:         'Peak density',
  density_consistency:      'Density consistency',
  bars_measured:            'Bars measured',
  compression_rate_pct:     'Compression lines',
  high_density_lines_pct:   'High-density lines',
  motifs_found:             'Motif clusters found',
  unique_fields:            'Semantic fields used',
  avg_cluster_strength:     'Avg cluster strength',
  most_used_field:          'Dominant field',
  avg_inversions_per_line:  'Avg inversions / line',
  stress_pattern_variety:   'Stress patterns used',
  control_score:            'Control score',
  unique_rhyme_words:       'Unique rhyme vocab',
  distinct_phoneme_tails:   'Distinct phoneme tails',
};

function ExampleLines({ lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div style={{
      marginTop: 10, padding: '10px 12px', borderRadius: 8,
      background: 'rgba(245,197,24,0.04)',
      borderLeft: '2px solid rgba(245,197,24,0.3)',
    }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: 'rgba(245,197,24,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
        From your lyrics
      </span>
      {lines.map((line, i) => (
        <p key={i} style={{
          fontFamily: FONTS.mono, fontSize: 12, color: 'rgba(237,237,236,0.75)',
          lineHeight: 1.5, margin: i > 0 ? '6px 0 0' : 0,
          fontStyle: 'italic',
        }}>
          "{line}"
        </p>
      ))}
    </div>
  );
}

function DetailGrid({ details }) {
  const entries = Object.entries(details)
    .filter(([k, v]) => DETAIL_LABELS[k] !== null && DETAIL_LABELS[k] !== undefined && typeof v !== 'object');

  if (!entries.length) return null;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '8px 20px', marginTop: 14,
    }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {DETAIL_LABELS[k]}
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: TEXT, textAlign: 'right' }}>
            {typeof v === 'number' ? (
              v % 1 !== 0 ? v.toFixed(v < 10 ? 3 : 1) : v
            ) : String(v)}
            {(k.endsWith('_pct') || k === 'density_control_pct' || k === 'control_score') && typeof v === 'number' ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────────────────────

function CategoryCard({ cat, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[cat.level] || LEVEL_CONFIG.Developing;
  const Icon = CATEGORY_ICONS[cat.id] || Shuffle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 14,
        background: DARK,
        border: `1px solid ${BORDER}`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* ── Top accent bar ── */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${cfg.color}44, ${cfg.color}cc, ${cfg.color}44)` }} />

      <div style={{ padding: '16px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>
            <Icon size={16} color={cfg.color} strokeWidth={1.8} />
          </div>

          {/* Name + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: TEXT }}>
                {cat.name}
              </span>
              <LevelPill level={cat.level} />
            </div>
            <p style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>
              {cat.description}
            </p>
          </div>

          {/* Score + trend */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
              {cat.score}
            </span>
            <TrendBadge trend={cat.trend} />
          </div>

          {/* Expand chevron */}
          <div style={{ flexShrink: 0, color: MUTED, marginLeft: 4 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {/* Score bar */}
        <div style={{ marginTop: 12 }}>
          <ScoreBar score={cat.score} color={cfg.color} />
          {/* Level ticks */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            {['Developing', 'Approaching', 'Competent', 'Exemplary'].map((lbl, i) => {
              const thresholds = [0, 40, 65, 82];
              const isActive = cat.level === lbl;
              return (
                <span key={lbl} style={{
                  fontFamily: FONTS.mono, fontSize: 9,
                  color: isActive ? LEVEL_CONFIG[lbl].color : 'rgba(255,255,255,0.2)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  fontWeight: isActive ? 700 : 400,
                }}>
                  {lbl}
                </span>
              );
            })}
          </div>
        </div>

        {/* Trend detail when expanded */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {/* Trend bar: early vs recent */}
              {cat.trend && cat.trend.early_score > 0 && (
                <div style={{
                  marginTop: 16, padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <p style={{ fontFamily: FONTS.body, fontSize: 11, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Progress
                  </p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: MUTED }}>Early</span>
                      <ScoreBar score={cat.trend.early_score} color="rgba(255,255,255,0.3)" animated={false} />
                      <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: MUTED }}>{cat.trend.early_score}</span>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <TrendBadge trend={cat.trend} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: MUTED }}>Recent</span>
                      <ScoreBar score={cat.trend.recent_score} color={cfg.color} animated={false} />
                      <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: cfg.color }}>{cat.trend.recent_score}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Detail stats */}
              {cat.details && Object.keys(cat.details).length > 0 && (
                <div style={{
                  marginTop: 12, padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <p style={{ fontFamily: FONTS.body, fontSize: 11, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Breakdown
                  </p>
                  <DetailGrid details={cat.details} />
                </div>
              )}

              {/* Example lines from their lyrics */}
              <ExampleLines lines={cat.example_lines} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Volume / snapshot strip ───────────────────────────────────────────────────

function SnapshotStrip({ volume, snapshot }) {
  const stats = [
    { label: 'Songs Analyzed',  value: snapshot.songs_analyzed },
    { label: 'Total Bars',      value: snapshot.total_bars },
    { label: 'Rhyme Pairs',     value: snapshot.total_rhyme_events },
    { label: 'Cadence Lines',   value: snapshot.total_cadence_events },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24,
    }}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          style={{
            borderRadius: 12, padding: '14px 16px',
            background: DARK, border: `1px solid ${BORDER}`,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: 700, color: GOLD, display: 'block' }}>
            {s.value}
          </span>
          <span style={{ fontFamily: FONTS.body, fontSize: 11, color: MUTED, marginTop: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {s.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Not-ready state ───────────────────────────────────────────────────────────

function NotReadyState({ report }) {
  const snap = report.data_snapshot || {};
  const missing = report.missing || [];

  const milestones = [
    { label: 'Songs analyzed',  value: snap.songs_analyzed || 0,       target: 3,  unit: 'songs' },
    { label: 'Rhyme pairs',     value: snap.total_rhyme_events || 0,   target: 40, unit: 'pairs' },
    { label: 'Bars analyzed',   value: snap.total_bars || 0,           target: 15, unit: 'bars'  },
    { label: 'Cadence lines',   value: snap.total_cadence_events || 0, target: 20, unit: 'lines' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, paddingBottom: 60 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          borderRadius: 20, padding: '40px 48px',
          background: DARK, border: `1px solid ${BORDER}`,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          maxWidth: 520, width: '100%', textAlign: 'center',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)',
        }}>
          <Lock size={22} color={GOLD} strokeWidth={1.8} />
        </div>

        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 10 }}>
          Mastery Report Locked
        </h2>
        <p style={{ fontFamily: FONTS.body, fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>
          {report.reason}
          <br />Write more, analyze more, and the full coaching report will unlock.
        </p>

        {/* Progress toward unlock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {milestones.map((m) => {
            const progress = Math.min(1, m.value / m.target);
            const done = m.value >= m.target;
            const barColor = done ? '#4ADE80' : GOLD;
            return (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, color: done ? '#4ADE80' : TEXT }}>
                    {done ? '✓ ' : ''}{m.label}
                  </span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: MUTED }}>
                    {m.value} / {m.target}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${progress * 100}%`,
                    background: barColor,
                    boxShadow: `0 0 6px ${barColor}66`,
                    transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ── Overall summary bar ───────────────────────────────────────────────────────

function OverallSummary({ categories }) {
  const avg = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
  const cfg = LEVEL_CONFIG[
    avg >= 82 ? 'Exemplary' : avg >= 65 ? 'Competent' : avg >= 40 ? 'Approaching' : 'Developing'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        borderRadius: 16, padding: '20px 24px', marginBottom: 20,
        background: DARK, border: `1px solid ${BORDER}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}
    >
      {/* Big score */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: FONTS.display, fontSize: 48, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
          {avg}
        </span>
        <div style={{ marginTop: 4 }}>
          <LevelPill level={avg >= 82 ? 'Exemplary' : avg >= 65 ? 'Competent' : avg >= 40 ? 'Approaching' : 'Developing'} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: 'stretch', background: BORDER }} />

      {/* Mini bars for each category */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
        {categories.map(cat => {
          const c = LEVEL_CONFIG[cat.level] || LEVEL_CONFIG.Developing;
          return (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: FONTS.body, fontSize: 11, color: MUTED, width: 130, flexShrink: 0, lineHeight: 1.2 }}>
                {cat.name}
              </span>
              <div style={{ flex: 1, height: 5, borderRadius: 2.5, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2.5,
                  width: `${cat.score}%`,
                  background: c.color,
                  transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.color, width: 28, textAlign: 'right', flexShrink: 0 }}>
                {cat.score}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Literary Devices Section ──────────────────────────────────────────────────

const DEVICE_STATUS_CONFIG = {
  signature: { label: 'Signature',  color: '#F5C518', bg: 'rgba(245,197,24,0.08)',  border: 'rgba(245,197,24,0.2)'  },
  overused:  { label: 'Heavy',      color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
  emerging:  { label: 'Developing', color: '#F97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)'  },
  untapped:  { label: 'Untapped',   color: MUTED,     bg: 'rgba(155,155,155,0.06)', border: 'rgba(155,155,155,0.14)'},
};

const CAT_COLORS = {
  Sound:      '#A78BFA',
  Structural: '#38BDF8',
  Comparison: '#34D399',
  Emphasis:   '#FB923C',
  Rhetorical: '#F472B6',
};

function DeviceCard({ device, index }) {
  const [open, setOpen] = useState(false);
  const cfg = DEVICE_STATUS_CONFIG[device.status];
  const catColor = CAT_COLORS[device.category] || MUTED;
  const isUntapped = device.status === 'untapped';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      onClick={() => setOpen(v => !v)}
      style={{
        borderRadius: 10, cursor: 'pointer',
        background: isUntapped ? 'rgba(10,10,14,0.6)' : DARK,
        border: `1px solid ${open ? cfg.border : BORDER}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        transition: 'border-color 180ms',
        overflow: 'hidden',
      }}
    >
      {/* Status accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${cfg.color}88, transparent)` }} />

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Category dot */}
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: catColor, flexShrink: 0 }} />

          {/* Name */}
          <span style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, color: TEXT, flex: 1 }}>
            {device.name}
          </span>

          {/* Category pill */}
          <span style={{
            fontFamily: FONTS.mono, fontSize: 9, color: catColor,
            background: `${catColor}14`, border: `1px solid ${catColor}30`,
            padding: '2px 6px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
          }}>
            {device.category}
          </span>

          {/* Rate or "never" */}
          <span style={{
            fontFamily: FONTS.mono, fontSize: 11,
            color: device.rate_per_100_lines === 0 ? 'rgba(155,155,155,0.4)' : cfg.color,
            width: 52, textAlign: 'right', flexShrink: 0,
          }}>
            {device.rate_per_100_lines === 0 ? 'never' : `${device.rate_per_100_lines}/100`}
          </span>

          {/* Expand */}
          <div style={{ color: MUTED, flexShrink: 0 }}>
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                <p style={{ fontFamily: FONTS.body, fontSize: 12, color: '#BBBBB8', lineHeight: 1.55, margin: '0 0 8px' }}>
                  {device.definition}
                </p>
                <ExampleLines lines={device.examples} />
                <div style={{
                  padding: '8px 10px', borderRadius: 7,
                  marginTop: device.examples?.length ? 8 : 0,
                  background: isUntapped ? 'rgba(245,197,24,0.05)' : 'rgba(255,255,255,0.04)',
                  border: isUntapped ? '1px solid rgba(245,197,24,0.15)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: isUntapped ? GOLD : MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {isUntapped ? '→ Try this' : device.status === 'overused' ? '⚠ Watch out' : 'Tip'}
                  </span>
                  <p style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '4px 0 0' }}>
                    {device.tip}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DevicesSection({ devices }) {
  if (!devices) return null;

  const sections = [
    {
      key: 'signature',
      label: 'Signature Devices',
      subtitle: 'Your fingerprint — what you reach for instinctively.',
      color: '#F5C518',
      items: devices.signature || [],
    },
    {
      key: 'overused',
      label: 'Heavy Usage',
      subtitle: "Used so often it's becoming a crutch — vary the approach.",
      color: '#EF4444',
      items: devices.overused || [],
    },
    {
      key: 'emerging',
      label: 'Developing',
      subtitle: "You're using these — keep building consistency.",
      color: '#F97316',
      items: devices.emerging || [],
    },
    {
      key: 'untapped',
      label: 'Untapped Potential',
      subtitle: 'Devices you rarely or never use — high-value expansion territory.',
      color: MUTED,
      items: devices.untapped || [],
    },
  ].filter(s => s.items.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      style={{ marginTop: 28 }}
    >
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 17, fontWeight: 700, color: TEXT, margin: 0 }}>
          Literary Devices
        </h2>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: MUTED }}>
          {devices.total_lines_scanned} lines scanned
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {sections.map(section => (
          <div key={section.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: section.color, flexShrink: 0 }} />
              <span style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, color: section.color }}>
                {section.label}
              </span>
              <span style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED }}>
                — {section.subtitle}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {[0, 1].map(col => (
                <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {section.items.filter((_, i) => i % 2 === col).map((device, i) => (
                    <DeviceCard key={device.id} device={device} index={i} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MasteryPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devUnlocked, setDevUnlocked] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMastery().then(({ data, error: err }) => {
      if (err) setError(err);
      else setReport(data);
      setLoading(false);
    });
  }, []);

  const activeReport = devUnlocked ? MOCK_REPORT : report;

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(6,6,9,0.78)', backdropFilter: 'blur(72px)', WebkitBackdropFilter: 'blur(72px)' }}>
    <div style={{
      padding: '32px 28px 60px',
      maxWidth: 860, margin: '0 auto',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{
              fontFamily: FONTS.display, fontSize: 26, fontWeight: 800,
              color: TEXT, margin: 0, letterSpacing: '-0.02em',
            }}>
              Mastery Report
            </h1>
            <span style={{
              fontFamily: FONTS.mono, fontSize: 11,
              color: GOLD, background: 'rgba(245,197,24,0.08)',
              border: '1px solid rgba(245,197,24,0.2)',
              padding: '2px 8px', borderRadius: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Craft Analytics
            </span>
          </div>

          {/* Dev toggle */}
          <button
            onClick={() => setDevUnlocked(v => !v)}
            style={{
              fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.07em',
              textTransform: 'uppercase', padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
              background: devUnlocked ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
              border: devUnlocked ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.12)',
              color: devUnlocked ? '#4ADE80' : MUTED,
              transition: 'all 180ms',
            }}
          >
            {devUnlocked ? '⚡ unlocked' : '🔒 locked'} · dev
          </button>
        </div>
        <p style={{ fontFamily: FONTS.body, fontSize: 14, color: MUTED, margin: 0 }}>
          Where you are now and how you've grown — across every dimension the engine tracks.
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `2px solid rgba(245,197,24,0.15)`,
              borderTop: `2px solid ${GOLD}`,
            }}
          />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          borderRadius: 12, padding: '16px 20px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontFamily: FONTS.body, fontSize: 14, color: '#EF4444',
        }}>
          Could not load mastery data — make sure the Prosodic server is running.
        </div>
      )}

      {/* Not ready */}
      {!loading && !error && activeReport && !activeReport.ready && (
        <NotReadyState report={activeReport} />
      )}

      {/* Full report */}
      {!loading && !error && activeReport && activeReport.ready && (
        <AnimatePresence>
          {/* Snapshot stats */}
          <SnapshotStrip volume={activeReport.volume} snapshot={activeReport.data_snapshot} />

          {/* Overall summary */}
          {activeReport.categories?.length > 0 && (
            <OverallSummary categories={activeReport.categories} />
          )}

          {/* Category cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeReport.categories?.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} />
            ))}
          </div>

          {/* Devices */}
          {activeReport.devices && <DevicesSection devices={activeReport.devices} />}

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              fontFamily: FONTS.body, fontSize: 12, color: 'rgba(155,155,155,0.5)',
              textAlign: 'center', marginTop: 32,
            }}
          >
            Scores update each time you analyze a song. Click any row to expand the full breakdown.
          </motion.p>
        </AnimatePresence>
      )}
    </div>
    </div>
  );
}

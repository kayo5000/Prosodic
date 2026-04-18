import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Audio engine ─────────────────────────────────────────────────────────────

function useMetronome(bpm, active, pocketCount, onBeat) {
  const audioCtxRef   = useRef(null);
  const beatCountRef  = useRef(0);
  const [flash, setFlash] = useState(false);
  const onBeatRef = useRef(onBeat);
  useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);

  const playClick = useCallback((isAccent) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    // Shared limiter — prevents any clipping on small speakers
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value      = 3;
    limiter.ratio.value     = 20;
    limiter.attack.value    = 0.001;
    limiter.release.value   = 0.05;
    limiter.connect(ctx.destination);

    if (isAccent) {
      // ── Bar / downbeat: soft pitched tick ────────────────────────────────────
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type            = 'sine';
      osc.frequency.value = 1100;
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(limiter);
      osc.start(now);
      osc.stop(now + 0.045);
    } else {
      // ── Subdivision / off-beat: sharp wooden click ───────────────────────────
      const bufSize  = Math.floor(ctx.sampleRate * 0.018);
      const buf      = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data     = buf.getChannelData(0);
      const attackSamples = Math.floor(ctx.sampleRate * 0.002); // 2ms attack ramp
      for (let i = 0; i < bufSize; i++) {
        const attack = i < attackSamples ? i / attackSamples : 1;
        data[i] = (Math.random() * 2 - 1) * attack * Math.pow(1 - i / bufSize, 14);
      }
      const src    = ctx.createBufferSource();
      src.buffer   = buf;
      const filter = ctx.createBiquadFilter();
      filter.type  = 'bandpass';
      filter.frequency.value = 2800;
      filter.Q.value         = 0.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(limiter);
      src.start(now);
    }
  }, []);

  useEffect(() => {
    if (!active || !bpm) { beatCountRef.current = 0; return; }
    const pc         = Math.max(1, pocketCount);
    const intervalMs = 60000 / Math.max(1, bpm);
    beatCountRef.current = 0;

    const tick = () => {
      const isAccent = beatCountRef.current % pc === 0;
      playClick(isAccent);
      setFlash(f => !f);
      onBeatRef.current?.(beatCountRef.current, pc);
      beatCountRef.current = (beatCountRef.current + 1) % pc;
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [active, bpm, pocketCount, playClick]);

  return flash;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_TAPS = 16;

function calcBpm(tapTimes) {
  if (tapTimes.length < 2) return null;
  const diffs = [];
  for (let i = 1; i < tapTimes.length; i++) diffs.push(tapTimes[i] - tapTimes[i - 1]);
  const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const bpm = Math.round(60000 / avgMs);
  return bpm >= 1 && bpm <= 999 ? bpm : null;
}

function TapOverlay({ tapCount, liveBpm, onTap, onExit }) {
  const remaining = MAX_TAPS - tapCount;
  const [flash, setFlash] = useState(false);

  // Keyboard + mouse capture
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'x' || e.key === 'X') { onExit(); return; }
      e.preventDefault();
      onTap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTap, onExit]);

  // Flash on tap
  useEffect(() => {
    if (tapCount === 0) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 80);
    return () => clearTimeout(t);
  }, [tapCount]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {/* Big TAP word */}
      <motion.div
        animate={{ scale: flash ? 1.08 : 1, opacity: flash ? 1 : 0.9 }}
        transition={{ duration: 0.07, ease: 'easeOut' }}
        style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 800,
          fontSize: 'clamp(80px, 20vw, 160px)',
          color: flash ? '#F5C518' : '#FFFFFF',
          letterSpacing: '-0.02em', lineHeight: 1,
          textShadow: flash ? '0 0 60px rgba(245,197,24,0.6)' : 'none',
          transition: 'color 80ms, text-shadow 80ms',
        }}
      >
        TAP
      </motion.div>

      {/* Tap dots — 16 slots */}
      <div style={{ display: 'flex', gap: 8, margin: '32px 0 24px' }}>
        {Array.from({ length: MAX_TAPS }, (_, i) => (
          <div key={i} style={{
            width: i < tapCount ? 10 : 7,
            height: i < tapCount ? 10 : 7,
            borderRadius: '50%',
            background: i < tapCount ? '#F5C518' : 'rgba(255,255,255,0.15)',
            boxShadow: i < tapCount ? '0 0 8px rgba(245,197,24,0.7)' : 'none',
            transition: 'all 100ms ease',
            alignSelf: 'center',
          }} />
        ))}
      </div>

      {/* Live BPM */}
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 32, fontWeight: 700, color: liveBpm ? '#F5C518' : 'rgba(255,255,255,0.2)', letterSpacing: '0.04em', marginBottom: 12, transition: 'color 200ms' }}>
        {liveBpm ? `${liveBpm} BPM` : '— BPM'}
      </div>

      {/* Taps remaining */}
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
        {remaining > 0 ? `${remaining} tap${remaining === 1 ? '' : 's'} left` : 'Done'}
      </div>

      {/* X instruction */}
      <div
        onClick={(e) => { e.stopPropagation(); onExit(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 24px', borderRadius: 10,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)',
        }}
      >
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#EF4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, padding: '1px 8px' }}>X</span>
        Press X to save tempo and close
      </div>
    </motion.div>
  );
}

export default function MetronomeBar({ bpm, onBpmChange, onBeat }) {
  const [metroOn,     setMetroOn]     = useState(false);
  const [pocketCount, setPocketCount] = useState(4);
  const [bpmInput,    setBpmInput]    = useState(String(bpm ?? 90));
  const [pocketOpen,  setPocketOpen]  = useState(false);
  const [tapMode,     setTapMode]     = useState(false);
  const [tapTimes,    setTapTimes]    = useState([]);
  const pocketRef = useRef(null);
  const flash = useMetronome(bpm, metroOn, pocketCount, onBeat);

  const liveBpm = calcBpm(tapTimes);

  // Keep input in sync when bpm prop changes externally
  useEffect(() => { setBpmInput(String(bpm ?? 90)); }, [bpm]);

  // Close pocket dropdown on outside click
  useEffect(() => {
    if (!pocketOpen) return;
    const handler = (e) => {
      if (pocketRef.current && !pocketRef.current.contains(e.target)) setPocketOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pocketOpen]);

  const commitBpm = (val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 999) {
      onBpmChange(n);
    } else {
      setBpmInput(String(bpm ?? 90));
    }
  };

  const handleTapHit = useCallback(() => {
    const now = performance.now();
    setTapTimes(prev => {
      // Reset if last tap was >3s ago
      const recent = prev.filter(t => now - t < 3000);
      const next = [...recent, now];
      const detected = calcBpm(next);
      if (detected) {
        onBpmChange(detected);
        setBpmInput(String(detected));
      }
      if (next.length >= MAX_TAPS) {
        // Auto-close after 16 taps
        setTimeout(() => setTapMode(false), 120);
      }
      return next.length >= MAX_TAPS ? next : next;
    });
  }, [onBpmChange]);

  const exitTapMode = useCallback(() => {
    setTapMode(false);
    setTapTimes([]);
  }, []);

  const openTapMode = () => {
    setTapTimes([]);
    setTapMode(true);
  };

  const btnBase = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  };

  return (
    <>
      <AnimatePresence>
        {tapMode && (
          <TapOverlay
            tapCount={tapTimes.length}
            liveBpm={liveBpm}
            onTap={handleTapHit}
            onExit={exitTapMode}
          />
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

        {/* Pulse dot — toggle on/off */}
        <button onClick={() => setMetroOn(m => !m)} style={btnBase} title={metroOn ? 'Stop metronome' : 'Start metronome'}>
          <motion.div
            animate={metroOn ? { scale: flash ? 1.7 : 1, opacity: flash ? 1 : 0.3 } : { scale: 1, opacity: 0.18 }}
            transition={{ duration: 0.05, ease: 'easeOut' }}
            style={{
              width: 7, height: 7, borderRadius: '50%', background: '#F5C518', flexShrink: 0,
              boxShadow: metroOn && flash ? '0 0 10px rgba(245,197,24,0.9)' : 'none',
            }}
          />
        </button>

        {/* BPM input */}
        <input
          type="text"
          inputMode="numeric"
          value={bpmInput}
          onChange={e => setBpmInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
          onBlur={() => commitBpm(bpmInput)}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); commitBpm(bpmInput); } }}
          onWheel={e => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1 : -1;
            const cur = parseInt(bpmInput, 10) || (bpm ?? 90);
            const next = Math.max(1, Math.min(999, cur + delta));
            setBpmInput(String(next));
            onBpmChange(next);
          }}
          style={{
            width: 40, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700,
            color: '#F5C518', caretColor: '#F5C518', textAlign: 'right',
          }}
        />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>BPM</span>

        {/* Pocket count selector */}
        <div ref={pocketRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setPocketOpen(o => !o)}
            title="Set pocket (beats per measure)"
            style={{
              padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
              background: pocketOpen ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
              border: pocketOpen ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: pocketOpen ? '#F5C518' : 'rgba(255,255,255,0.5)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
              transition: 'all 120ms', flexShrink: 0,
            }}
          >
            {pocketCount}/{pocketCount}
          </button>

          {pocketOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 9999,
              background: 'rgba(14,14,14,0.97)', border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 10, backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              padding: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                Pocket (beats per measure)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => { setPocketCount(n); setPocketOpen(false); }}
                    style={{
                      padding: '4px 0', borderRadius: 5, textAlign: 'center', cursor: 'pointer',
                      background: pocketCount === n ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
                      border: pocketCount === n ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: pocketCount === n ? '#F5C518' : '#9B9B9B',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700,
                      transition: 'all 80ms',
                    }}
                  >
                    {n}/{n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tap tempo — opens overlay */}
        <button
          onClick={openTapMode}
          title="Tap tempo"
          style={{
            padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
            transition: 'all 80ms', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.3)'; e.currentTarget.style.color = '#F5C518'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
        >
          Tap
        </button>

      </div>
    </>
  );
}

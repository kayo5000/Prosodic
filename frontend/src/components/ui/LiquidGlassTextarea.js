import { useRef } from 'react';

export default function LiquidGlassTextarea({ value, onChange, onKeyDown, placeholder, disabled }) {
  const ref = useRef(null);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden" style={{ boxShadow: '0 6px 6px rgba(0,0,0,0.3), 0 0 30px rgba(0,0,0,0.15)' }}>
      {/* Distortion layer */}
      <div
        className="absolute inset-0 z-0 rounded-3xl"
        style={{
          backdropFilter: 'blur(8px) url(#glass-distortion)',
          WebkitBackdropFilter: 'blur(8px)',
          isolation: 'isolate',
        }}
      />
      {/* White tint */}
      <div
        className="absolute inset-0 z-10 rounded-3xl"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      />
      {/* Inner shine */}
      <div
        className="absolute inset-0 z-20 rounded-3xl"
        style={{
          boxShadow: 'inset 2px 2px 1px rgba(255,255,255,0.25), inset -1px -1px 1px rgba(255,255,255,0.15)',
          border: '1px solid rgba(245,197,24,0.2)',
        }}
      />
      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="relative z-30 w-full bg-transparent text-white placeholder-white/30 resize-none outline-none text-base leading-relaxed"
        style={{
          padding: '18px 60px 18px 24px',
          fontFamily: 'DM Sans, sans-serif',
          minHeight: '60px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
        onInput={e => {
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
        }}
      />
    </div>
  );
}

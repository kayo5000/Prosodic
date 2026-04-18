import { useState, useEffect } from 'react';

const GOLD = {
  outer: 'linear-gradient(to bottom, #917100, #EAD98F)',
  inner: 'linear-gradient(to bottom, #FFFDDD, #856807 50%, #FFF1B3)',
  button: 'linear-gradient(to bottom, #FFEBA1, #9B873F)',
  textColor: '#FFFDE5',
  textShadow: '0 -1px 0 rgba(178,140,2,1)',
};

export default function MetalButton({ children, onClick, disabled, type = 'button', className = '', size = 'default' }) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const sizeStyles = {
    default: { padding: '0 24px', height: '44px', fontSize: '14px' },
    sm:      { padding: '0 16px', height: '36px', fontSize: '13px' },
    lg:      { padding: '0 32px', height: '52px', fontSize: '16px' },
    icon:    { width: '44px',     height: '44px', fontSize: '14px' },
  };

  const transition = 'all 250ms cubic-bezier(0.1, 0.4, 0.2, 1)';

  return (
    <div
      className={`relative inline-flex rounded-md ${className}`}
      style={{
        background: GOLD.outer,
        padding: '1.25px',
        borderRadius: '8px',
        transform: pressed ? 'translateY(2px) scale(0.99)' : 'translateY(0) scale(1)',
        boxShadow: pressed
          ? '0 1px 2px rgba(0,0,0,0.2)'
          : hovered && !isTouch
          ? '0 4px 16px rgba(245,197,24,0.35)'
          : '0 3px 10px rgba(0,0,0,0.2)',
        transition,
      }}
    >
      {/* Inner gradient ring */}
      <div
        className="absolute inset-px rounded-md"
        style={{
          background: GOLD.inner,
          filter: hovered && !pressed && !isTouch ? 'brightness(1.05)' : 'none',
          transition,
        }}
      />
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => !isTouch && setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        className="relative z-10 inline-flex items-center justify-center rounded-md font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
        style={{
          background: GOLD.button,
          color: GOLD.textColor,
          textShadow: GOLD.textShadow,
          margin: '1px',
          borderRadius: '6px',
          ...sizeStyles[size] || sizeStyles.default,
          transform: pressed ? 'scale(0.97)' : 'scale(1)',
          filter: hovered && !pressed && !isTouch ? 'brightness(1.02)' : 'none',
          transition,
          fontFamily: 'DM Sans, sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {/* Shine on hover */}
        {hovered && !pressed && !isTouch && (
          <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-t from-transparent to-white/10" />
        )}
        {/* Press flash */}
        {pressed && (
          <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-20" />
        )}
        {children}
      </button>
    </div>
  );
}

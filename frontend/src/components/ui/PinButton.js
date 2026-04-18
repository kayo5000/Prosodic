import { Pin, PinOff } from 'lucide-react';
import { usePins, MAX_PINS } from '../../state/PinnableContext';

/**
 * Small pin toggle button for use on any item card/row.
 *
 * item: { id, label, type, subtitle?, path? }
 * size: 'sm' (default) | 'xs'
 */
export default function PinButton({ item, size = 'sm' }) {
  const { addPin, removePin, isPinned, pins } = usePins();
  const pinned  = isPinned(item.id);
  const full    = !pinned && pins.length >= MAX_PINS;
  const dim     = size === 'xs' ? 9 : 11;
  const boxSize = size === 'xs' ? 22 : 26;

  const handleClick = (e) => {
    e.stopPropagation();
    if (pinned) removePin(item.id);
    else if (!full) addPin(item);
  };

  return (
    <button
      onClick={handleClick}
      title={pinned ? 'Unpin' : full ? `Max ${MAX_PINS} pins reached` : 'Pin'}
      style={{
        width: boxSize, height: boxSize, borderRadius: size === 'xs' ? 5 : 6,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: pinned ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.05)',
        border: pinned
          ? '1px solid rgba(245,197,24,0.35)'
          : '1px solid rgba(255,255,255,0.09)',
        color: pinned ? '#F5C518' : full ? '#2A2A2A' : '#555',
        cursor: full ? 'not-allowed' : 'pointer',
        transition: 'all 130ms',
        opacity: full ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (full) return;
        if (!pinned) {
          e.currentTarget.style.background = 'rgba(245,197,24,0.08)';
          e.currentTarget.style.border = '1px solid rgba(245,197,24,0.25)';
          e.currentTarget.style.color = '#F5C518';
        } else {
          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
          e.currentTarget.style.border = '1px solid rgba(239,68,68,0.3)';
          e.currentTarget.style.color = '#FF6B6B';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = pinned ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.05)';
        e.currentTarget.style.border = pinned ? '1px solid rgba(245,197,24,0.35)' : '1px solid rgba(255,255,255,0.09)';
        e.currentTarget.style.color = pinned ? '#F5C518' : '#555';
      }}
    >
      {pinned
        ? <PinOff size={dim} strokeWidth={2} />
        : <Pin size={dim} strokeWidth={2} />}
    </button>
  );
}

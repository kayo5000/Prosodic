import React from 'react';

interface GraphicProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

/**
 * Inverted corner SVG graphic that creates the sleek organic cutout corners
 * seen in the 21st.dev Photography Portfolio header and mobile menu button.
 */
export function Graphic({ className, style, color = 'currentColor' }: GraphicProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        width: 18,
        height: 18,
        lineHeight: 0,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <path fill={color} d="M0 0v18C0 8.059 8.059 0 18 0Z" />
      </svg>
    </div>
  );
}

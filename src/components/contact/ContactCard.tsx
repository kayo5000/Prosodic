import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Mail, Music } from 'lucide-react';

export type ContactCardType =
  | 'contact'
  | 'instagram'
  | 'github'
  | 'twitter'
  | 'studio';

interface ContactCardProps {
  title: string;
  type: ContactCardType;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  isDark?: boolean;
}

export function ContactCard({
  title,
  type,
  href,
  onClick,
  primary = false,
  isDark = true,
}: ContactCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const renderIcon = () => {
    switch (type) {
      case 'contact':
        return <Mail size={17} />;
      case 'instagram':
        return (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      case 'github':
        return (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        );
      case 'twitter':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'studio':
        return <Music size={17} />;
      default:
        return <Mail size={17} />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const bgClass = primary
    ? 'bg-[#0066FF] hover:bg-[#0055D4] text-white shadow-[0_4px_14px_rgba(0,102,255,0.35)]'
    : isDark
    ? 'bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F2F2F7] border border-white/5'
    : 'bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] border border-black/5';

  return (
    <a
      href={href || '#'}
      onClick={handleClick}
      target={href && href.startsWith('http') ? '_blank' : undefined}
      rel={href && href.startsWith('http') ? 'noopener noreferrer' : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 18px',
        borderRadius: 14,
        textDecoration: 'none',
        transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
        cursor: 'pointer',
        userSelect: 'none',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      }}
      className={bgClass}
    >
      <span style={{ fontSize: 14, fontWeight: primary ? 600 : 500 }}>
        {title}
      </span>

      <div
        style={{
          position: 'relative',
          width: 18,
          height: 18,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Default icon - moves up on hover */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isHovered ? 'translateY(-120%)' : 'translateY(0)',
            opacity: isHovered ? 0 : 1,
            transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease',
          }}
        >
          {renderIcon()}
        </span>

        {/* Hover arrow - slides in from bottom on hover */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isHovered ? 'translateY(0)' : 'translateY(120%)',
            opacity: isHovered ? 1 : 0,
            transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease',
          }}
        >
          {type === 'studio' ? <ArrowLeft size={17} /> : <ArrowUpRight size={17} />}
        </span>
      </div>
    </a>
  );
}

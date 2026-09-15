import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Compass,
  Layers,
  MapPin,
  Menu,
  Moon,
  Music,
  Sliders,
  Sun,
  X,
} from 'lucide-react';

import { ContactCard } from './ContactCard';
import { Graphic } from './Graphic';
import { PhotoCarousel } from './PhotoCarousel';

interface PhotographyPortfolioScreenProps {
  onBackToStudio?: () => void;
}

export function PhotographyPortfolioScreen({
  onBackToStudio,
}: PhotographyPortfolioScreenProps) {
  const [isDark, setIsDark] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const themeBg = isDark ? '#0A0A0C' : '#F5F5F7';
  const cardBg = isDark ? '#141416' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#1C1C1E';
  const textMuted = isDark ? '#8E8E93' : '#636366';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  const handleReturn = () => {
    if (onBackToStudio) {
      onBackToStudio();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: themeBg,
        color: textPrimary,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        overflowX: 'hidden',
      }}
    >
      {/* 1. TOP HEADER WITH INVERTED CORNER NOTCHES */}
      <header
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: 12,
          zIndex: 50,
          backgroundColor: cardBg,
          borderBottomRightRadius: 18,
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.45)'
            : '0 4px 20px rgba(0,0,0,0.06)',
          border: `1px solid ${borderSubtle}`,
          borderTop: 'none',
          borderLeft: 'none',
        }}
      >
        <div style={{ position: 'relative', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={handleReturn}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#FFFFFF' : '#1C1C1E',
              }}
            >
              <Camera size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                SERA
              </span>
              <span style={{ fontSize: 9, color: textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                PROSODIC
              </span>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handleReturn}
              style={{
                background: 'none',
                border: 'none',
                color: textMuted,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = textPrimary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = textMuted)}
            >
              Studio
            </button>
            <span style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>Portfolio</span>
            <a
              href="#contact-section"
              style={{
                color: textMuted,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                padding: '4px 8px',
                transition: 'color 0.15s ease',
              }}
            >
              Contact
            </a>
          </nav>

          {/* Theme Switch */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? '#242426' : '#E5E5EA',
              border: `1px solid ${borderSubtle}`,
              color: textPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Inverted Corner Cutouts */}
          <div style={{ position: 'absolute', left: 0, bottom: -18, width: 18, height: 18 }}>
            <Graphic color={cardBg} />
          </div>
          <div style={{ position: 'absolute', top: 0, right: -18, width: 18, height: 18 }}>
            <Graphic color={cardBg} />
          </div>
        </div>
      </header>

      {/* 2. MOBILE MENU BUTTON AT TOP-RIGHT */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Open navigation menu"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 12,
          zIndex: 50,
          backgroundColor: cardBg,
          borderBottomLeftRadius: 18,
          padding: '10px 18px',
          border: `1px solid ${borderSubtle}`,
          borderTop: 'none',
          borderRight: 'none',
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.45)'
            : '0 4px 20px rgba(0,0,0,0.06)',
          cursor: 'pointer',
          color: textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500 }}>Menu</span>
        <Menu size={16} />

        {/* Inverted Corner Cutouts */}
        <div style={{ position: 'absolute', right: 0, bottom: -18, width: 18, height: 18, transform: 'rotate(90deg)' }}>
          <Graphic color={cardBg} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: -18, width: 18, height: 18, transform: 'rotate(90deg)' }}>
          <Graphic color={cardBg} />
        </div>
      </button>

      {/* 3. MOBILE MENU OVERLAY DRAWER */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 24,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Camera size={20} color="#FFFFFF" />
              <span style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, letterSpacing: 1.2 }}>SERA · PROSODIC</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, margin: 'auto 0' }}>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleReturn();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Music size={24} />
              Return to Studio
            </button>
            <a
              href="#contact-section"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Contact & Inquiries
            </a>
            <a
              href="mailto:contact@prosodic.shop"
              style={{
                color: '#0066FF',
                fontSize: 20,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              contact@prosodic.shop
            </a>
          </div>

          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, textAlign: 'center' }}>
            Prosodic Studio · Photography & Sonic Architecture
          </div>
        </div>
      )}

      {/* 4. MAIN SPLIT CONTENT */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
          padding: 12,
          boxSizing: 'border-box',
        }}
        className="lg:flex-row"
      >
        {/* LEFT COLUMN: HERO PHOTO CAROUSEL */}
        <div
          style={{
            width: '100%',
            height: '62vh',
            minHeight: 400,
            borderRadius: 20,
            overflow: 'hidden',
          }}
          className="lg:w-1/2 lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:p-3"
        >
          <PhotoCarousel isDark={isDark} />
        </div>

        {/* DESKTOP SPACER */}
        <div className="hidden lg:block lg:w-1/2" style={{ flexShrink: 0 }} />

        {/* RIGHT COLUMN: SCROLLABLE PROFILE & CONTACT CONTENT */}
        <div
          id="contact-section"
          style={{
            width: '100%',
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            paddingBottom: 40,
          }}
          className="lg:w-1/2 lg:mt-0 lg:pl-4"
        >
          {/* PROFILE CARD */}
          <div
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 24,
              border: `1px solid ${borderSubtle}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              boxShadow: isDark
                ? '0 6px 24px rgba(0, 0, 0, 0.3)'
                : '0 6px 24px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Top row: Avatar & Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  overflow: 'hidden',
                  backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                  flexShrink: 0,
                  border: `2px solid ${borderSubtle}`,
                }}
              >
                <img
                  src="./avatar.jpg"
                  alt="Sera Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    // Fallback to cat avatar unspash
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80';
                  }}
                />
              </div>

              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, margin: '0 0 3px 0' }}>
                  Sera
                </h1>
                <p style={{ fontSize: 13, color: textMuted, margin: 0, fontWeight: 500 }}>
                  Photographer & Creative Director
                </p>
              </div>
            </div>

            {/* Bio */}
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.55,
                color: textMuted,
                margin: 0,
                fontWeight: 400,
              }}
            >
              I'm Sera, dedicated to capturing authentic moments and telling stories
              through creative and emotional imagery, wherever my journey takes me.
              Specializing in cinematic architecture, urban street narratives, and studio
              energy.
            </p>

            {/* Social / Contact Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                marginTop: 4,
              }}
            >
              <ContactCard
                title="Contact me"
                type="contact"
                href="mailto:contact@prosodic.shop"
                primary
                isDark={isDark}
              />
              <ContactCard
                title="Return to Studio"
                type="studio"
                onClick={handleReturn}
                isDark={isDark}
              />
              <ContactCard
                title="Instagram"
                type="instagram"
                href="https://instagram.com"
                isDark={isDark}
              />
              <ContactCard
                title="GitHub"
                type="github"
                href="https://github.com"
                isDark={isDark}
              />
            </div>
          </div>

          {/* CITY SETS / CURATED WORKS */}
          <div
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 22,
              border: `1px solid ${borderSubtle}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="#0066FF" />
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>City Archives</h2>
              </div>
              <span style={{ fontSize: 12, color: textMuted }}>4 Series</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { city: 'Macau', count: '18 Photos', img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80' },
                { city: 'Hong Kong', count: '32 Photos', img: 'https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=400&q=80' },
                { city: 'Tokyo', count: '24 Photos', img: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80' },
                { city: 'Paris', count: '14 Photos', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80' },
              ].map((item) => (
                <div
                  key={item.city}
                  style={{
                    position: 'relative',
                    height: 100,
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: `1px solid ${borderSubtle}`,
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.city}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)',
                    }}
                  />
                  <div style={{ position: 'absolute', bottom: 8, left: 10, color: '#FFFFFF' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{item.city}</p>
                    <p style={{ fontSize: 10, opacity: 0.8, margin: 0 }}>{item.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GEAR & INSTRUMENTATION */}
          <div
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 22,
              border: `1px solid ${borderSubtle}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Sliders size={16} color={textPrimary} />
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Production & Optical Gear</h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { brand: 'SONY', model: 'Alpha 7R II' },
                { brand: 'DJI', model: 'Air 2S' },
                { brand: 'Tamron', model: '50-400mm F/4.5-6.3' },
                { brand: 'Sigma', model: '35mm F/1.4 DG HSM' },
                { brand: 'Viltrox', model: 'AF 40mm F/2.5 FE' },
                { brand: 'Prosodic', model: 'Cadence Audio Engine' },
              ].map((g) => (
                <div
                  key={g.model}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                    border: `1px solid ${borderSubtle}`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: textMuted, letterSpacing: 0.6 }}>
                    {g.brand}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: textPrimary }}>
                    {g.model}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <footer
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '16px 0',
              color: textMuted,
              fontSize: 12,
            }}
          >
            <p style={{ margin: 0 }}>
              &copy; {new Date().getFullYear()} Prosodic Studio · Designed with 21st.dev template
            </p>
            <button
              onClick={handleReturn}
              style={{
                background: 'none',
                border: 'none',
                color: '#0066FF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft size={14} /> Back to Studio
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

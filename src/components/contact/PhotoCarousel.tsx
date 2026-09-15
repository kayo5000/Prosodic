import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PhotoSlide {
  id: string;
  title: string;
  location: string;
  url: string;
}

export const DEMO_PHOTOS: PhotoSlide[] = [
  {
    id: 'photo-1',
    title: 'Grand Lisboa at Twilight',
    location: 'Macau, S.A.R.',
    url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 'photo-2',
    title: 'Des Voeux Tramway',
    location: 'Hong Kong Island',
    url: 'https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 'photo-3',
    title: 'Metropolis Glow',
    location: 'Shinjuku · Tokyo',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 'photo-4',
    title: 'Sonic Sanctuary',
    location: 'Studio Acoustic A',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 'photo-5',
    title: 'Minimalist Horizons',
    location: 'Alps Panorama',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=85',
  },
];

interface PhotoCarouselProps {
  slides?: PhotoSlide[];
  isDark?: boolean;
}

export function PhotoCarousel({
  slides = DEMO_PHOTOS,
  isDark = true,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(nextSlide, 5500);
    return () => clearInterval(interval);
  }, [nextSlide, isHovered]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) prevSlide();
      else nextSlide();
    }
    touchStartXRef.current = null;
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 380,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: isDark ? '#141416' : '#E5E5EA',
        userSelect: 'none',
      }}
    >
      {/* Slides Container */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            style={{
              position: 'relative',
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <img
              src={slide.url}
              alt={slide.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              loading={idx === 0 ? 'eager' : 'lazy'}
            />

            {/* Subtle Gradient Shadow Vignette */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Slide Metadata Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                color: '#FFFFFF',
                textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                pointerEvents: 'none',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  opacity: 0.85,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}
              >
                {slide.location}
              </p>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: -0.2,
                  margin: 0,
                }}
              >
                {slide.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Prev / Next Navigation Buttons */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        style={{
          position: 'absolute',
          top: '50%',
          left: 18,
          transform: 'translateY(-50%)',
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease, transform 0.15s ease',
          zIndex: 10,
        }}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next slide"
        style={{
          position: 'absolute',
          top: '50%',
          right: 18,
          transform: 'translateY(-50%)',
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease, transform 0.15s ease',
          zIndex: 10,
        }}
      >
        <ChevronRight size={20} />
      </button>

      {/* Pagination Indicator Dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          zIndex: 10,
        }}
      >
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            style={{
              width: index === currentIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                index === currentIndex
                  ? '#FFFFFF'
                  : 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

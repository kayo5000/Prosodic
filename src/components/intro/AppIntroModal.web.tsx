import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { LiquidGlassCard } from '../ui/LiquidGlassCard';

import {
  PROSODIC_WHITE_LOGO_BASE64,
} from './logoBase64';

interface AppIntroModalProps {
  onDismiss: () => void;
}

const INTRO_ANIMATION_KEYFRAMES = `
@keyframes prosodicBreathe {
  0% {
    transform: scale(1.0);
  }
  50% {
    transform: scale(1.018);
  }
  100% {
    transform: scale(1.0);
  }
}

@keyframes prosodicShimmer {
  0% {
    transform: translateX(-140%) translateY(-20%) rotate(25deg);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  38% {
    transform: translateX(140%) translateY(20%) rotate(25deg);
    opacity: 1;
  }
  42% {
    opacity: 0;
  }
  100% {
    transform: translateX(140%) translateY(20%) rotate(25deg);
    opacity: 0;
  }
}

@keyframes prosodicAura {
  0% {
    transform: scale(0.92);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.75;
  }
  100% {
    transform: scale(0.92);
    opacity: 0.35;
  }
}

/* Hide native WebKit / iOS media controls and play button overlay (Low Power Mode) */
video::-webkit-media-controls {
  display: none !important;
}
video::-webkit-media-controls-start-playback-button {
  display: none !important;
  -webkit-appearance: none !important;
  opacity: 0 !important;
}
video::-webkit-media-controls-play-button {
  display: none !important;
  -webkit-appearance: none !important;
  opacity: 0 !important;
}
video::-webkit-media-controls-enclosure {
  display: none !important;
}
`;

export function AppIntroModal({ onDismiss }: AppIntroModalProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isOutroPhase, setIsOutroPhase] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Inject hardware-accelerated luxury animation keyframes once
    const styleId = 'prosodic-intro-styles';
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = INTRO_ANIMATION_KEYFRAMES;
      document.head.appendChild(styleEl);
    }

    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('preload', 'auto');

      const attemptPlay = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsAutoplayBlocked(false);
              setIsVideoPlaying(true);
            })
            .catch(() => {
              // iOS Low Power Mode or browser autoplay policy blocked autoplay
              setIsAutoplayBlocked(true);
              setIsVideoPlaying(false);
            });
        }
      };

      attemptPlay();

      const onPlay = () => {
        setIsVideoPlaying(true);
        setIsAutoplayBlocked(false);
      };
      const onPause = () => {
        setIsVideoPlaying(false);
      };

      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);

      // On any user touch or click anywhere on screen, immediately activate video playback
      const handleUserGesture = () => {
        if (video.paused) {
          attemptPlay();
        }
      };

      window.addEventListener('touchstart', handleUserGesture, { passive: true });
      window.addEventListener('pointerdown', handleUserGesture, { passive: true });
      window.addEventListener('click', handleUserGesture, { passive: true });

      const handleTimeUpdate = () => {
        const t = video.currentTime;
        // Segment 3 fades to black starting at 7.0s and reaches full black at 8.0s;
        // Segment 4 is pure black from 8.0s to 11.0s
        const outro = t >= 7.4 && t <= 11.0;
        setIsOutroPhase(outro);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);

      // Lock page background to pure black while intro plays to prevent any white gap peeking through
      const origBodyBg = document.body.style.backgroundColor;
      const origHtmlBg = document.documentElement.style.backgroundColor;
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        window.removeEventListener('touchstart', handleUserGesture);
        window.removeEventListener('pointerdown', handleUserGesture);
        window.removeEventListener('click', handleUserGesture);
        document.body.style.backgroundColor = origBodyBg;
        document.documentElement.style.backgroundColor = origHtmlBg;
      };
    }
  }, []);

  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const hasEnteredRef = useRef(false);
  const handleEnter = () => {
    if (hasEnteredRef.current) return;
    
    // Only show on mobile browsers, skip on desktop or if already standalone PWA
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone);
    
    if (isMobile && !isStandalone) {
      setShowPwaPrompt(true);
      return;
    }

    hasEnteredRef.current = true;
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('prosodic_intro_seen', 'true');
      } catch (e) {}
    }
    setIsFadingOut(true);
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
    }
    setTimeout(() => {
      onDismiss();
    }, 400);
  };

  const proceedFromPwaPrompt = () => {
    hasEnteredRef.current = true;
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('prosodic_intro_seen', 'true');
      } catch (e) {}
    }
    setShowPwaPrompt(false);
    setIsFadingOut(true);
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
    }
    setTimeout(() => {
      onDismiss();
    }, 400);
  };

  const handleOverlayPress = () => {
    const video = videoRef.current;
    // If video is paused (e.g. Low Power Mode), tapping anywhere will just start playback, but it will NOT dismiss the screen anymore.
    if (video && video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsAutoplayBlocked(false);
            setIsVideoPlaying(true);
          })
          .catch(() => {});
      }
    }
  };

  return (
    <React.Fragment>
    {showPwaPrompt && (
      <View style={{...styles.overlay, zIndex: 999999, justifyContent: 'center', alignItems: 'center'}}>
        <View style={styles.centerContainer}>
          <LiquidGlassCard borderRadius={16} style={{ padding: 24, maxWidth: 400, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
              For the BEST Mobile Experience
            </Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 24, gap: 8 }}>
              <Text style={{ color: '#ccc', fontSize: 16 }}>• Press Share (In Browser)</Text>
              <Text style={{ color: '#ccc', fontSize: 16 }}>• View More</Text>
              <Text style={{ color: '#ccc', fontSize: 16 }}>• Add To Home Screen</Text>
              <Text style={{ color: '#ccc', fontSize: 16 }}>• Ensure "Open As Web App" toggle is enabled</Text>
              <Text style={{ color: '#ccc', fontSize: 16 }}>• Close Browser & Open Web App From Home Screen</Text>
            </View>
            <Pressable
              onPress={proceedFromPwaPrompt}
              style={[styles.craftButton, { width: '100%' }]}
            >
              <Text style={styles.craftButtonText}>Continue to Beta</Text>
            </Pressable>
          </LiquidGlassCard>
        </View>
      </View>
    )}
    <Pressable
      style={[
        styles.overlay,
        isFadingOut && styles.overlayFading,
      ]}
      onPress={handleOverlayPress}
      accessibilityLabel="Prosodic Entrance Screen"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        video::-webkit-media-controls {
          display: none !important;
        }
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          -webkit-appearance: none;
        }
      `}} />
      {/* Background Video (11-second cinematic loop ending on pure black outro) */}
      <video
        ref={videoRef}
        src="./assets/videos/intro-bg.mp4?v=6"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <source src="./assets/videos/intro-bg.mp4?v=6" type="video/mp4" />
      </video>

      {/* Cinematic Dark Gradient Overlay */}
      <View
        style={styles.vignetteOverlay}
        pointerEvents="none"
      />

      {/* Top-Right Contact Link (Pure Font) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          right: 24,
          zIndex: 20,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (typeof window !== 'undefined') {
              window.location.href = '/contact';
            }
          }}
          aria-label="Contact and Portfolio"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 0.6,
            cursor: 'pointer',
            transition: 'color 0.2s ease, opacity 0.2s ease',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
            outline: 'none',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
            e.currentTarget.style.opacity = '0.85';
          }}
        >
          Contact
        </button>
      </div>

      {/* Center Prosodic Logo with Premium Specular Sheen and Breathing Effect */}
      <View style={styles.centerContainer} pointerEvents="none">
        {/* Soft Ambient Radial Backlight Bloom */}
        <div
          style={{
            position: 'absolute',
            width: 290,
            height: 290,
            borderRadius: '50%',
            background: isOutroPhase
              ? 'radial-gradient(circle, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.08) 45%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 70%)',
            filter: 'blur(36px)',
            animation: 'prosodicAura 5.5s ease-in-out infinite alternate',
            pointerEvents: 'none',
            transition: 'background 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Breathing Logo Container */}
        <div
          style={{
            position: 'relative',
            width: 210,
            maxWidth: '54vw',
            aspectRatio: '733 / 799',
            animation: 'prosodicBreathe 6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* White Logo (White the entire time: 75% opacity during video, seamless illumination to 100% on black outro) */}
          <img
            src={PROSODIC_WHITE_LOGO_BASE64}
            alt="Prosodic Logo White"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              opacity: isOutroPhase ? 1.0 : 0.75,
              filter: isOutroPhase
                ? 'drop-shadow(0 4px 28px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.45))'
                : 'drop-shadow(0 4px 28px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.2))',
              transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none',
            }}
          />

          {/* Masked Specular Light Ray Shimmer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              maskImage: `url(${PROSODIC_WHITE_LOGO_BASE64})`,
              WebkitMaskImage: `url(${PROSODIC_WHITE_LOGO_BASE64})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
              overflow: 'hidden',
              pointerEvents: 'none',
              opacity: isOutroPhase ? 1.0 : 0.75,
              transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background:
                  'linear-gradient(115deg, transparent 25%, rgba(255, 255, 255, 0.0) 38%, rgba(255, 255, 255, 0.85) 48%, rgba(255, 255, 255, 0.98) 51%, rgba(255, 255, 255, 0.50) 55%, transparent 68%)',
                animation: 'prosodicShimmer 4.4s cubic-bezier(0.25, 1, 0.5, 1) infinite',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </View>

      {/* Bottom Action Section: Transparent Bordered "Test Your Craft" Button */}
      <View style={styles.bottomContainer}>
        <LiquidGlassCard borderRadius={18}>
          <Pressable
            onPress={(e: any) => {
              if (e && e.stopPropagation) e.stopPropagation();
              handleEnter();
            }}
            style={({ pressed, hovered }: any) => [
              styles.craftButton,
              hovered && styles.craftButtonHovered,
              pressed && styles.craftButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Test Your Craft"
          >
            <Text style={styles.craftButtonText}>
              Test Your Craft
            </Text>
          </Pressable>
        </LiquidGlassCard>

        <View style={styles.betaWrapper} accessibilityLabel="Beta version">
          <Text style={styles.betaText}>
            Beta
          </Text>
        </View>
      </View>
    </Pressable>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    minHeight: '100dvh',
    zIndex: 99999,
    backgroundColor: '#000000',
    overflow: 'hidden',
    transition: 'opacity 0.35s ease',
    opacity: 1,
    cursor: 'pointer' as any,
  } as any,
  overlayFading: {
    opacity: 0,
    pointerEvents: 'none',
  } as any,
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.65) 100%)',
    transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 1,
  } as any,
  vignetteHidden: {
    opacity: 0,
  } as any,
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  craftButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 9999,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
    transition: 'all 0.25s ease',
    userSelect: 'none' as any,
  } as any,
  craftButtonHovered: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  } as any,
  craftButtonPressed: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  } as any,
  craftButtonText: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.6,
    userSelect: 'none' as any,
  } as any,
  betaWrapper: {
    paddingVertical: 1,
    paddingHorizontal: 16,
    userSelect: 'none' as any,
  } as any,
  betaText: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } as any,
});



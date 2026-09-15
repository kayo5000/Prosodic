import React from 'react';

import type { MoodType } from './types';

interface Mood3DIconProps {
  mood: MoodType;
  size?: number;
}

export function Mood3DIcon({ mood, size = 64 }: Mood3DIconProps) {
  switch (mood) {
    case 'excited': // The glowing dimensional star matching Apple Journal reference image
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFF9D2" stopOpacity="1" />
              <stop offset="35%" stopColor="#FFE066" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#A88B2D" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="starGlass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FFEAA7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#F39C12" stopOpacity="0.8" />
            </linearGradient>
            <filter id="starShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#F1C40F" floodOpacity="0.35" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#starGlow)" />
          {/* Concentric 3D Star Layers */}
          <path
            d="M50 12 L59 34 L82 36 L65 52 L70 75 L50 63 L30 75 L35 52 L18 36 L41 34 Z"
            fill="url(#starGlass)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#starShadow)"
          />
          <path
            d="M50 24 L56 39 L72 40 L60 51 L63 67 L50 58 L37 67 L40 51 L28 40 L44 39 Z"
            fill="rgba(255, 255, 255, 0.45)"
            stroke="#FFF275"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="49" r="6" fill="#FFFFFF" opacity="0.9" />
        </svg>
      );

    case 'aggressive': // 3D volcanic flame
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF416C" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#FF4B2B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF4B2B" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#D63031" />
              <stop offset="50%" stopColor="#FF7675" />
              <stop offset="100%" stopColor="#FFF275" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#flameGlow)" />
          <path
            d="M50 14 C56 28 68 34 72 48 C76 62 66 82 50 84 C34 82 24 62 28 48 C32 34 44 28 50 14 Z"
            fill="url(#flameGrad)"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="2"
          />
          <path
            d="M50 36 C54 44 60 50 62 58 C64 66 58 76 50 77 C42 76 36 66 38 58 C40 50 46 44 50 36 Z"
            fill="#FFF89A"
            opacity="0.9"
          />
        </svg>
      );

    case 'confident': // 3D prismatic diamond gem
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="gemTop" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#74B9FF" />
              <stop offset="100%" stopColor="#0984E3" />
            </linearGradient>
            <linearGradient id="gemBottom" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0984E3" />
              <stop offset="50%" stopColor="#6C5CE7" />
              <stop offset="100%" stopColor="#A29BFE" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="rgba(116, 185, 255, 0.2)" />
          <polygon points="26,38 74,38 62,20 38,20" fill="url(#gemTop)" stroke="#FFFFFF" strokeWidth="1.5" />
          <polygon points="26,38 74,38 50,82" fill="url(#gemBottom)" stroke="#FFFFFF" strokeWidth="1.5" />
          <polygon points="38,20 62,20 50,38" fill="rgba(255, 255, 255, 0.4)" stroke="#FFFFFF" strokeWidth="1" />
          <polygon points="26,38 50,38 50,82" fill="rgba(255, 255, 255, 0.25)" />
        </svg>
      );

    case 'melancholy': // 3D luminous crescent / orb
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id="moonGlow" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#E0C3FC" />
              <stop offset="100%" stopColor="#8EC5FC" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="rgba(142, 197, 252, 0.25)" />
          <path
            d="M62 20 C42 20 28 36 28 54 C28 72 42 86 60 86 C68 86 75 83 80 78 C62 76 50 62 50 48 C50 35 56 24 68 20 C66 20 64 20 62 20 Z"
            fill="url(#moonGlow)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="2"
          />
          <circle cx="68" cy="38" r="3" fill="#FFFFFF" opacity="0.9" />
          <circle cx="76" cy="52" r="2" fill="#FFFFFF" opacity="0.8" />
        </svg>
      );

    case 'flow': // 3D liquid wave / droplet
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00CEC9" />
              <stop offset="100%" stopColor="#0984E3" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="rgba(0, 206, 201, 0.2)" />
          <path
            d="M50 16 C50 16 26 50 26 66 C26 79 37 88 50 88 C63 88 74 79 74 66 C74 50 50 16 50 16 Z"
            fill="url(#waveGrad)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="2"
          />
          <path
            d="M42 54 C42 54 34 64 34 72 C34 78 39 82 46 82 C44 78 44 68 46 62 Z"
            fill="#FFFFFF"
            opacity="0.45"
          />
        </svg>
      );

    case 'street': // 3D neon bolt
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEE140" />
              <stop offset="100%" stopColor="#FA709A" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="rgba(254, 225, 64, 0.25)" />
          <polygon
            points="54,14 26,52 48,52 44,86 74,44 52,44"
            fill="url(#boltGrad)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

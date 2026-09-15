/**
 * build_osborn_ai_voice_orb.js
 *
 * DESIGN LOOP: Generates the exact Luminous 3D AI Voice Orb matching the YouTube reference
 * with:
 * - 3D Multi-layer Spherical Glassmorphic Orb (Crimson/Amber/Ruby radial mesh)
 * - Top-Right Dream Icon (Ethereal cloud + sparkle)
 * - Top-Left Close Button
 * - Bottom Chat Input Box with Microphone Icon and Send button
 */

const fs = require('fs');
const path = require('path');

const orbSvg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="spaceBg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1A100B"/>
      <stop offset="60%" stop-color="#0B0E14"/>
      <stop offset="100%" stop-color="#05070A"/>
    </radialGradient>

    <!-- Outer Ambient Glow for Orb -->
    <radialGradient id="orbAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#EA580C" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#DC2626" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Core Orb 3D Radial Gradient (Exact YouTube Video Sampling) -->
    <radialGradient id="orbCore" cx="62%" cy="42%" r="58%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="25%" stop-color="#F97316"/>
      <stop offset="55%" stop-color="#DC2626"/>
      <stop offset="85%" stop-color="#991B1B"/>
      <stop offset="100%" stop-color="#5B0E0E"/>
    </radialGradient>

    <!-- Secondary Fluid Shift (Sunburst Flare) -->
    <radialGradient id="orbFlare" cx="35%" cy="65%" r="50%">
      <stop offset="0%" stop-color="#B91C1C" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#7F1D1D" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#450A0A" stop-opacity="0"/>
    </radialGradient>

    <!-- Glassmorphic Rim Light (White Halo / Specular Edge) -->
    <linearGradient id="orbRimLight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"/>
      <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.75"/>
    </linearGradient>

    <!-- Translucent Frosted Glass Header Button -->
    <radialGradient id="frostedButton" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.08"/>
    </radialGradient>

    <!-- Dream Icon Glow -->
    <radialGradient id="dreamAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#C084FC" stop-opacity="0"/>
    </radialGradient>

    <!-- Drop Shadow Filter for Floating Elements -->
    <filter id="orbBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="28"/>
    </filter>

    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>

  <!-- Canvas Frame with Rounded Device Corners -->
  <rect width="393" height="852" rx="44" fill="url(#spaceBg)"/>

  <!-- ==================== STATUS BAR ==================== -->
  <g id="Status_Bar">
    <text x="36" y="42" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="15" font-weight="600">9:41</text>
    <g transform="translate(305, 30)">
      <rect x="0" y="8" width="3" height="4" rx="0.75" fill="#F8FAFC"/>
      <rect x="5" y="6" width="3" height="6" rx="0.75" fill="#F8FAFC"/>
      <rect x="10" y="3" width="3" height="9" rx="0.75" fill="#F8FAFC"/>
      <rect x="15" y="0" width="3" height="12" rx="0.75" fill="#F8FAFC"/>
    </g>
    <g transform="translate(328, 30)">
      <path d="M1 3C5.5 -1 12.5 -1 17 3M3.5 6C6.5 3 11.5 3 14.5 6M6.5 9C8 7.5 10 7.5 11.5 9M9 11.5C9 11.78 8.78 12 8.5 12C8.22 12 8 11.78 8 11.5C8 11.22 8.22 11 8.5 11C8.78 11 9 11.22 9 11.5Z" stroke="#F8FAFC" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g transform="translate(350, 31)">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="#F8FAFC" stroke-width="1"/>
      <rect x="2" y="2" width="14" height="8" rx="2" fill="#F8FAFC"/>
    </g>
  </g>

  <!-- ==================== TOP NAVIGATION HEADER ==================== -->
  <g id="Header_Navigation" transform="translate(24, 64)">
    <!-- Close [X] Button (Left) -->
    <g id="Button_Close_Screen">
      <circle cx="20" cy="20" r="20" fill="url(#frostedButton)"/>
      <circle cx="20" cy="20" r="19.5" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1"/>
      <path d="M14 14L26 26M26 14L14 26" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </g>

    <!-- Center Screen Title -->
    <text x="172" y="25" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="16" font-weight="700" letter-spacing="0.5">Osborn AI</text>

    <!-- DREAM ICON (Top Right) -->
    <g id="Button_Dream_Mode" transform="translate(305, 0)">
      <circle cx="20" cy="20" r="30" fill="url(#dreamAura)"/>
      <circle cx="20" cy="20" r="20" fill="url(#frostedButton)"/>
      <circle cx="20" cy="20" r="19.5" stroke="#C084FC" stroke-opacity="0.4" stroke-width="1"/>
      <!-- Dream Cloud + Sparkle Vector Icon -->
      <g transform="translate(9, 10)">
        <path d="M6 16C4 16 2.5 14.5 2.5 12.5C2.5 10.8 3.7 9.4 5.3 9.1C5.7 6.5 8 4.5 10.7 4.5C13.2 4.5 15.3 6.2 16 8.5C17.7 8.8 19 10.3 19 12C19 14.2 17.2 16 15 16H6" stroke="#E9D5FF" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M18 3L19 5L21 6L19 7L18 9L17 7L15 6L17 5L18 3Z" fill="#FACC15"/>
      </g>
    </g>
  </g>

  <!-- ==================== CENTER HERO: THE LUMINOUS 3D AI VOICE ORB ==================== -->
  <g id="Hero_AI_Voice_Orb_Group" transform="translate(196.5, 360)">
    <!-- 1. Deep Ambient Aura / Dispersion -->
    <circle cx="0" cy="0" r="150" fill="url(#orbAura)" filter="url(#orbBlur)"/>

    <!-- 2. Primary 3D Spherical Core (Radius: 110px, Diameter: 220px) -->
    <circle cx="0" cy="0" r="110" fill="url(#orbCore)"/>

    <!-- 3. Secondary Internal Fluid Layer (Crimson Depth Shadow) -->
    <circle cx="-15" cy="20" r="95" fill="url(#orbFlare)"/>

    <!-- 4. Top-Right Ambient Specular Sunburst -->
    <ellipse cx="38" cy="-28" rx="60" ry="50" fill="#FDE68A" fill-opacity="0.35" filter="url(#softGlow)"/>

    <!-- 5. Frosted Glass Membrane Rim (Specular Halo) -->
    <circle cx="0" cy="0" r="110" stroke="url(#orbRimLight)" stroke-width="2.5" fill="none"/>
    <circle cx="0" cy="0" r="108" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1" fill="none"/>

    <!-- 6. Active Voice Pulse Wave Rings (Subtle Radiating Soundwaves) -->
    <circle cx="0" cy="0" r="128" stroke="#F97316" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="4 8"/>
    <circle cx="0" cy="0" r="144" stroke="#DC2626" stroke-opacity="0.15" stroke-width="1"/>

    <!-- Status Text Beneath Orb -->
    <text x="0" y="150" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="16" font-weight="600">"Listening to your flow..."</text>
    <text x="0" y="174" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12.5">90 BPM • Cyan / Rose Rhyme Scheme Active</text>
  </g>

  <!-- ==================== BOTTOM CHAT INPUT BAR WITH MICROPHONE ==================== -->
  <g id="Bottom_Chat_Input_Bar" transform="translate(24, 740)">
    <!-- Pill Background Container -->
    <rect width="345" height="58" rx="29" fill="#131B2E" stroke="#334155" stroke-width="1.2"/>

    <!-- MICROPHONE ICON (Left Circle) -->
    <g id="Button_Microphone" transform="translate(8, 7)">
      <circle cx="22" cy="22" r="22" fill="#2563EB"/>
      <!-- Crisp Mic Vector -->
      <rect x="19" y="11" width="6" height="11" rx="3" fill="#FFFFFF"/>
      <path d="M15 17C15 20.8 18.2 24 22 24C25.8 24 29 20.8 29 17" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
      <line x1="22" y1="24" x2="22" y2="29" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="29" x2="26" y2="29" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </g>

    <!-- Chat Placeholder Text -->
    <text x="64" y="34" fill="#64748B" font-family="-apple-system, sans-serif" font-size="13.5">Ask Osborn for rhymes, cadence...</text>

    <!-- SEND BUTTON (Right Circle) -->
    <g id="Button_Send_Message" transform="translate(293, 7)">
      <circle cx="22" cy="22" r="22" fill="#1E293B" stroke="#334155"/>
      <path d="M22 13L16 19M22 13L28 19M22 13V29" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`;

// Write Files to Desktop and Scratch
const desktopDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop';
const scratchDir = path.resolve(__dirname, '..', 'scratch');

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

fs.writeFileSync(path.join(scratchDir, 'Figma_Osborn_AI_Voice_Orb.svg'), orbSvg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Osborn_AI_Voice_Orb.svg'), orbSvg, 'utf8');

console.log('✅ Generated 1:1 Pixel-Perfect AI Voice Orb Frame:');
console.log(' - ' + path.join(desktopDir, 'Figma_Osborn_AI_Voice_Orb.svg'));

const fs = require('fs');
const path = require('path');

const svgContent = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <radialGradient id="bgAura" cx="50%" cy="28%" r="65%" fx="50%" fy="20%">
      <stop offset="0%" stop-color="#1E1B4B" stop-opacity="0.75" />
      <stop offset="45%" stop-color="#0F172A" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#040407" stop-opacity="1" />
    </radialGradient>

    <!-- Ring Glow Gradient -->
    <linearGradient id="masteryGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#C084FC" />
    </linearGradient>

    <!-- Card Glass Gradient -->
    <linearGradient id="glassCard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.07" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.02" />
    </linearGradient>

    <!-- Glass Border Gradient -->
    <linearGradient id="glassBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.05" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- 1. Background Void Canvas -->
  <rect width="393" height="852" fill="#040407" />
  <rect width="393" height="852" fill="url(#bgAura)" />

  <!-- 2. Status Bar Area -->
  <g id="StatusBar">
    <text x="36" y="38" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="14" font-weight="600" letter-spacing="-0.2">9:41</text>
    <!-- Dynamic Island Pill -->
    <rect x="136" y="18" width="120" height="30" rx="15" fill="#000000" stroke="#1E293B" stroke-width="1" />
    <circle cx="152" cy="33" r="3.5" fill="#38BDF8" filter="url(#softGlow)" />
    <text x="164" y=\"37\" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="11" font-weight="600" letter-spacing="0.5">OSBORN</text>
    <path d="M236 29 V37 M240 26 V40 M244 31 V35" stroke="#818CF8" stroke-width="1.5" stroke-linecap="round" />
    <!-- Battery and Wifi Icons -->
    <path d="M340 30 H354 A2 2 0 0 1 356 32 V36 A2 2 0 0 1 354 38 H340 A2 2 0 0 1 338 36 V32 A2 2 0 0 1 340 30 Z" stroke="#F8FAFC" stroke-width="1.2" fill="none" />
    <rect x="341.5" y="32" width="9" height="4" rx="1" fill="#F8FAFC" />
    <path d="M357 33.5 V34.5" stroke="#F8FAFC" stroke-width="1.2" stroke-linecap="round" />
  </g>

  <!-- 3. Top Header Bar -->
  <g id="TopHeader" transform="translate(24, 68)">
    <!-- User Profile / Settings Button -->
    <rect x="0" y="0" width="40" height="40" rx="20" fill="url(#glassCard)" stroke="url(#glassBorder)" stroke-width="0.8" />
    <path d="M15 16 C15 13.5 17 11.5 20 11.5 C23 11.5 25 13.5 25 16 C25 18.5 23 20.5 20 20.5 C17 20.5 15 18.5 15 16 Z M12 28 C12 24.5 15.5 23 20 23 C24.5 23 28 24.5 28 28" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" fill="none" />

    <!-- Center Wordmark -->
    <text x="172" y="25" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="17" font-weight="700" letter-spacing="1.5">PROSODIC</text>

    <!-- Streak / Fire Badge -->
    <rect x="285" y="0" width="60" height="40" rx="20" fill="url(#glassCard)" stroke="url(#glassBorder)" stroke-width="0.8" />
    <path d="M304 24 C304 20 308 17 308 13 C312 17 315 19 315 22 C315 25 312 27 308 27 C305 27 304 25.5 304 24 Z" fill="#F59E0B" />
    <text x="322" y="25" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="13" font-weight="700">14</text>
  </g>

  <!-- 4. Hero Section: Opal-Style Mastery Countdown Orb -->
  <g id="MasteryOrbHero" transform="translate(196, 230)">
    <!-- Outer Ambient Glow -->
    <circle cx="0" cy="0" r="98" fill="none" stroke="#38BDF8" stroke-opacity="0.15" stroke-width="24" filter="url(#glowEffect)" />
    
    <!-- Background Track Ring -->
    <circle cx="0" cy="0" r="88" fill="none" stroke="#1E293B" stroke-opacity="0.6" stroke-width="8" stroke-linecap="round" />

    <!-- Active Glowing Progress Arc (16h completed = 16/10000) -->
    <circle cx="0" cy="0" r="88" fill="none" stroke="url(#masteryGlow)" stroke-width="8" stroke-dasharray="553" stroke-dashoffset="120" stroke-linecap="round" transform="rotate(-90)" filter="url(#softGlow)" />

    <!-- Inner Frosted Disk -->
    <circle cx="0" cy="0" r="76" fill="#090D16" fill-opacity="0.85" stroke="url(#glassBorder)" stroke-width="0.8" />

    <!-- Center Typography -->
    <text x="0" y="-18" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="10" font-weight="700" letter-spacing="2">MASTERY COUNTDOWN</text>
    <text x="0" y="16" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, SF Pro Display, sans-serif" font-size="34" font-weight="800" letter-spacing="-0.5">9,984</text>
    <text x="0" y="34" text-anchor="middle" fill="#38BDF8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="11" font-weight="600" letter-spacing="0.5">HOURS TO ZERO</text>
    <text x="0" y="48" text-anchor="middle" fill="#64748B" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9" font-weight="500">Active Keystroke &amp; Voice Timer</text>
  </g>

  <!-- 5. Active Sessions / Recent Tracks (1D Stack) -->
  <g id="ActiveSessionsSection" transform="translate(24, 370)">
    <text x="0" y="0" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2">ACTIVE SESSIONS</text>
    <text x="345" y="0" text-anchor="end" fill="#38BDF8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="12" font-weight="600">See All</text>

    <!-- Card 1 (Primary Active Track) -->
    <g transform="translate(0, 16)">
      <rect x="0" y="0" width="345" height="88" rx="20" fill="url(#glassCard)" stroke="url(#glassBorder)" stroke-width="1" />
      
      <!-- Track Icon Wave / Note -->
      <rect x="16" y="16" width="56" height="56" rx="16" fill="#131D31" stroke="#1E3A8A" stroke-width="1" />
      <path d="M38 34 V48 M44 30 V52 M50 38 V44" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" />

      <!-- Track Info -->
      <text x="86" y="38" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="16" font-weight="700">Midnight Reverie</text>
      <text x="86" y="58" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="12" font-weight="500">16 Bars • 90 BPM • 4/4 Pocket</text>

      <!-- Rhyme Family Pill -->
      <rect x="260" y="32" width="70" height="24" rx="12" fill="#1E293B" stroke="#38BDF8" stroke-width="0.8" />
      <text x="295" y="48" text-anchor="middle" fill="#38BDF8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="10" font-weight="700">/iː/ Cyan</text>
    </g>

    <!-- Card 2 (Secondary Draft) -->
    <g transform="translate(0, 116)">
      <rect x="0" y="0" width="345" height="76" rx="20" fill="url(#glassCard)" stroke="url(#glassBorder)" stroke-width="0.8" />
      
      <rect x="14" y="14" width="48" height="48" rx="14" fill="#1E1B4B" stroke="#3730A3" stroke-width="1" />
      <path d="M32 30 V46 M38 26 V50 M44 34 V42" stroke="#A855F7" stroke-width="2" stroke-linecap="round" />

      <text x="76" y="36" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="15" font-weight="600">Obsidian Flow Scheme</text>
      <text x="76" y="54" fill="#64748B" font-family="-apple-system, SF Pro Display, sans-serif" font-size="12" font-weight="500">8 Bars • 140 BPM • Trap Pocket</text>

      <rect x="265" y="26" width="65" height="24" rx="12" fill="#1E293B" stroke="#A855F7" stroke-width="0.8" />
      <text x="297" y="42" text-anchor="middle" fill="#C084FC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="10" font-weight="700">/eɪ/ Violet</text>
    </g>
  </g>

  <!-- 6. Craft Momentum Metric Tiles (Opal 2-Column Grid) -->
  <g id="CraftMomentumGrid" transform="translate(24, 595)">
    <text x="0" y="0" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2">CRAFT CALIBRATION</text>

    <!-- Tile 1: Cadence Velocity -->
    <g transform="translate(0, 14)">
      <rect x="0" y="0" width="166" height="105" rx="20" fill="url(#glassCard)" stroke="url(#glassBorder)" stroke-width="1" />
      <text x="16" y="28" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="11" font-weight="600">CADENCE VELOCITY</text>
      <text x="16" y="60" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="24" font-weight="800">4.2 <tspan font-size="13" font-weight="500" fill="#64748B">SPS</tspan></text>
      <rect x="16" y="76" width="134" height="5" rx="2.5" fill="#1E293B" />
      <rect x="16" y="76" width="95" height="5" rx="2.5" fill="#10B981" />
      <text x="16" y="94" fill="#10B981" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9.5" font-weight="600">Target Hip-Hop Pocket</text>
    </g>

    <!-- Tile 2: Multisyllabic Depth -->
    <g transform="translate(178, 14)">
      <rect x="0" y="0" width="167" height="105" rx="20" fill="url(#glassCard)" stroke="url(#glassBorder)" stroke-width="1" />
      <text x="16" y="28" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="11" font-weight="600">MULTI-WEAVE DEPTH</text>
      <text x="16" y="60" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="24" font-weight="800">92<tspan font-size="14" font-weight="500" fill="#64748B">%</tspan></text>
      <rect x="16" y="76" width="135" height="5" rx="2.5" fill="#1E293B" />
      <rect x="16" y="76" width="124" height="5" rx="2.5" fill="#818CF8" />
      <text x="16" y="94" fill="#818CF8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9.5" font-weight="600">3+ Syllable Density</text>
    </g>
  </g>

  <!-- 7. Bottom Floating Navigation Dock (Apple/Opal Capsule) -->
  <g id="FloatingDock" transform="translate(20, 735)">
    <!-- Frosted Capsule -->
    <rect x="0" y="0" width="285" height="62" rx="31" fill="#0F172A" fill-opacity="0.9" stroke="#334155" stroke-width="1.2" filter="url(#softGlow)" />

    <!-- Tab 1: Studio (Active) -->
    <g transform="translate(22, 11)">
      <rect x="-8" y="-3" width="50" height="46" rx="16" fill="#1E293B" />
      <!-- Minimalist Pen Line Icon -->
      <path d="M17 5 L23 11 L10 24 L4 25 L5 19 Z" stroke="#F8FAFC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <text x="14" y="37" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9.5" font-weight="700">Studio</text>
    </g>

    <!-- Tab 2: Lexicon -->
    <g transform="translate(88, 11)">
      <!-- Book Line Icon -->
      <path d="M6 6 C9 4 15 4 18 6 V22 C15 20 9 20 6 22 Z M18 6 C21 4 27 4 30 6 V22 C27 20 21 20 18 22 Z" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <text x="18" y="37" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9.5" font-weight="600">Lexicon</text>
    </g>

    <!-- Tab 3: Practice -->
    <g transform="translate(152, 11)">
      <!-- Target Line Icon -->
      <circle cx="16" cy="14" r="8" stroke="#94A3B8" stroke-width="1.5" fill="none" />
      <circle cx="16" cy="14" r="3" stroke="#94A3B8" stroke-width="1.5" fill="none" />
      <text x="16" y="37" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9.5" font-weight="600">Practice</text>
    </g>

    <!-- Tab 4: Planner -->
    <g transform="translate(216, 11)">
      <!-- Calendar Line Icon -->
      <rect x="7" y="6" width="18" height="16" rx="4" stroke="#94A3B8" stroke-width="1.5" fill="none" />
      <path d="M11 3 V7 M21 3 V7 M7 11 H25" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" />
      <text x="16" y="37" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="9.5" font-weight="600">Planner</text>
    </g>

    <!-- Detached Action FAB (+) -->
    <g transform="translate(297, 0)">
      <circle cx="31" cy="31" r="31" fill="#2563EB" stroke="#60A5FA" stroke-width="1.5" filter="url(#softGlow)" />
      <path d="M31 20 V42 M20 31 H42" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
    </g>
  </g>

  <!-- 8. Home Indicator Bar -->
  <rect x="128" y="838" width="138" height="5" rx="2.5" fill="#64748B" />
</svg>`;

const destDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop\\GO';
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
const target = path.join(destDir, '01_Opal_Style_Home_Dashboard.svg');
fs.writeFileSync(target, svgContent, 'utf-8');
console.log('✅ Exported Opal-Style Home Dashboard to:', target);

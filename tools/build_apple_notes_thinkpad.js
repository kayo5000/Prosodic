const fs = require('fs');
const path = require('path');

const svgContent = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Card Glass Gradient -->
    <linearGradient id="toolTrayGlass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.98" />
    </linearGradient>

    <!-- Glass Border Gradient -->
    <linearGradient id="hairlineBorder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#334155" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#1E293B" stop-opacity="0.4" />
    </linearGradient>

    <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- 1. Background Void Canvas -->
  <rect width="393" height="852" fill="#000000" />

  <!-- 2. Status Bar -->
  <g id="StatusBar">
    <text x="36" y="38" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="14" font-weight="600" letter-spacing="-0.2">9:41</text>
    <!-- Dynamic Island Pill -->
    <rect x="136" y="18" width="120" height="30" rx="15" fill="#090D16" stroke="#1E293B" stroke-width="1" />
    <circle cx="152" cy="33" r="3.5" fill="#38BDF8" />
    <text x="164" y="37" fill="#94A3B8" font-family="-apple-system, SF Pro Display, sans-serif" font-size="11" font-weight="600" letter-spacing="0.5">OSBORN</text>
    <path d="M236 29 V37 M240 26 V40 M244 31 V35" stroke="#818CF8" stroke-width="1.5" stroke-linecap="round" />
    <!-- Battery and Wifi Icons -->
    <path d="M340 30 H354 A2 2 0 0 1 356 32 V36 A2 2 0 0 1 354 38 H340 A2 2 0 0 1 338 36 V32 A2 2 0 0 1 340 30 Z" stroke="#F8FAFC" stroke-width="1.2" fill="none" />
    <rect x="341.5" y="32" width="9" height="4" rx="1" fill="#F8FAFC" />
    <path d="M357 33.5 V34.5" stroke="#F8FAFC" stroke-width="1.2" stroke-linecap="round" />
  </g>

  <!-- 3. Apple Notes Top Navigation Bar -->
  <g id="NavBar" transform="translate(20, 64)">
    <!-- Back / Folders Chevron -->
    <g transform="translate(0, 8)">
      <path d="M12 4 L4 12 L12 20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <text x="18" y="16" fill="#F59E0B" font-family="-apple-system, SF Pro Text, sans-serif" font-size="17" font-weight="400">Tracks</text>
    </g>

    <!-- Right Action Items -->
    <g transform="translate(250, 4)">
      <!-- Share Glyph -->
      <g transform="translate(0, 0)">
        <path d="M12 4 V16 M12 4 L7 9 M12 4 L17 9 M4 13 V20 C4 21.1 4.9 22 6 22 H18 C19.1 22 20 21.1 20 20 V13" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
      <!-- More / Circle Options Glyph -->
      <g transform="translate(42, 0)">
        <circle cx="12" cy="13" r="10" stroke="#F59E0B" stroke-width="1.8" fill="none" />
        <circle cx="8" cy="13" r="1.2" fill="#F59E0B" />
        <circle cx="12" cy="13" r="1.2" fill="#F59E0B" />
        <circle cx="16" cy="13" r="1.2" fill="#F59E0B" />
      </g>
      <!-- Done Button -->
      <text x="82" y="17" fill="#F59E0B" font-family="-apple-system, SF Pro Text, sans-serif" font-size="17" font-weight="600">Done</text>
    </g>
  </g>

  <!-- 4. Main Writing Canvas -->
  <g id="NotesBody" transform="translate(24, 130)">
    <!-- Track Title Header (Large Apple Notes Title Style) -->
    <text x="36" y="24" fill="#FFFFFF" font-family="-apple-system, SF Pro Display, sans-serif" font-size="28" font-weight="800" letter-spacing="-0.5">Midnight Reverie</text>

    <!-- Date & Craft Metadata Line -->
    <text x="36" y="48" fill="#64748B" font-family="-apple-system, SF Pro Text, sans-serif" font-size="13" font-weight="400">September 3, 2026 at 9:41 AM  •  90 BPM (4/4 Pocket)</text>

    <!-- Content Area: Syllable Gutter & Pristine Lyrics -->
    <g transform="translate(0, 75)">
      <!-- Minimalist Syllable Gutter Column -->
      <g id="SyllableGutter">
        <line x1="24" y1="0" x2="24" y2="480" stroke="#1E293B" stroke-width="1" />

        <!-- Line 1 Syllable Badge -->
        <text x="12" y="22" text-anchor="middle" fill="#10B981" font-family="-apple-system, SF Pro Text, monospace" font-size="12" font-weight="700">14</text>

        <!-- Line 2 Syllable Badge -->
        <text x="12" y="58" text-anchor="middle" fill="#10B981" font-family="-apple-system, SF Pro Text, monospace" font-size="12" font-weight="700">13</text>

        <!-- Line 3 Syllable Badge -->
        <text x="12" y="94" text-anchor="middle" fill="#10B981" font-family="-apple-system, SF Pro Text, monospace" font-size="12" font-weight="700">15</text>

        <!-- Line 4 Syllable Badge -->
        <text x="12" y="130" text-anchor="middle" fill="#10B981" font-family="-apple-system, SF Pro Text, monospace" font-size="12" font-weight="700">14</text>

        <!-- Line 5 Syllable Badge -->
        <text x="12" y="180" text-anchor="middle" fill="#64748B" font-family="-apple-system, SF Pro Text, monospace" font-size="12" font-weight="600">12</text>

        <!-- Line 6 Syllable Badge -->
        <text x="12" y="216" text-anchor="middle" fill="#64748B" font-family="-apple-system, SF Pro Text, monospace" font-size="12" font-weight="600">14</text>
      </g>

      <!-- Lyrics Canvas (Clean Apple Typography with Subtle Rhyme Underlines) -->
      <g id="LyricsText" transform="translate(36, 0)">
        <!-- Bar 1 -->
        <text x="0" y="22" fill="#F8FAFC" font-family="-apple-system, SF Pro Text, monospace" font-size="16" font-weight="400">I grab the mic and spit a syllable <tspan fill="#38BDF8" font-weight="600">scheme</tspan></text>
        <line x1="262" y1="26" x2="318" y2="26" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" />

        <!-- Bar 2 -->
        <text x="0" y="58" fill="#F8FAFC" font-family="-apple-system, SF Pro Text, monospace" font-size="16" font-weight="400">Never miss a beat inside of the <tspan fill="#38BDF8" font-weight="600">machine</tspan></text>
        <line x1="242" y1="62" x2="304" y2="62" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" />

        <!-- Bar 3 -->
        <text x="0" y="94" fill="#F8FAFC" font-family="-apple-system, SF Pro Text, monospace" font-size="16" font-weight="400">The flow is cold and my tone is <tspan fill="#38BDF8" font-weight="600">supreme</tspan></text>
        <line x1="248" y1="98" x2="310" y2="98" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" />

        <!-- Bar 4 -->
        <text x="0" y="130" fill="#F8FAFC" font-family="-apple-system, SF Pro Text, monospace" font-size="16" font-weight="400">Living out the dream inside of the <tspan fill="#38BDF8" font-weight="600">cream</tspan></text>
        <line x1="265" y1="134" x2="310" y2="134" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" />

        <!-- Stanza Break Space -->

        <!-- Bar 5 -->
        <text x="0" y="180" fill="#F8FAFC" font-family="-apple-system, SF Pro Text, monospace" font-size="16" font-weight="400">Cutting through the static with a razor blade</text>

        <!-- Bar 6 with Active Caret Cursor -->
        <text x="0" y="216" fill="#F8FAFC" font-family="-apple-system, SF Pro Text, monospace" font-size="16" font-weight="400">Every single cadence that I ever made</text>
        <!-- Apple Amber Cursor -->
        <rect x="296" y="200" width="2" height="20" fill="#F59E0B" rx="1" filter="url(#subtleGlow)" />
      </g>
    </g>
  </g>

  <!-- 5. Apple Notes Keyboard-Docked Tool Tray -->
  <g id="ToolTray" transform="translate(0, 776)">
    <!-- Frosted Tray Background -->
    <rect width="393" height="76" fill="url(#toolTrayGlass)" />
    <line x1="0" y1="0" x2="393" y2="0" stroke="url(#hairlineBorder)" stroke-width="1" />

    <!-- Tool Tray Action Glyphs -->
    <g transform="translate(24, 12)">
      <!-- 1. Typography / Aa Format Icon -->
      <g transform="translate(10, 0)">
        <text x="0" y="20" fill="#F8FAFC" font-family="-apple-system, SF Pro Display, sans-serif" font-size="18" font-weight="700">Aa</text>
      </g>

      <!-- 2. Checklist / Bar Measure Icon -->
      <g transform="translate(80, 2)">
        <circle cx="6" cy="12" r="5" stroke="#94A3B8" stroke-width="1.5" fill="none" />
        <line x1="16" y1="12" x2="32" y2="12" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round" />
      </g>

      <!-- 3. Metronome / Cadence Pocket Grid -->
      <g transform="translate(150, 2)">
        <rect x="4" y="4" width="20" height="16" rx="4" stroke="#94A3B8" stroke-width="1.5" fill="none" />
        <line x1="14" y1="4" x2="14" y2="20" stroke="#94A3B8" stroke-width="1.5" />
        <line x1="4" y1="12" x2="24" y2="12" stroke="#94A3B8" stroke-width="1.5" />
      </g>

      <!-- 4. Vocal Record / Mic Wave Glyph -->
      <g transform="translate(225, 2)">
        <rect x="8" y="3" width="10" height="14" rx="5" stroke="#94A3B8" stroke-width="1.5" fill="none" />
        <path d="M4 11 C4 16 22 16 22 11" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" fill="none" />
        <line x1="13" y1="17" x2="13" y2="21" stroke="#94A3B8" stroke-width="1.5" />
      </g>

      <!-- 5. Rhyme / Lexicon Marker Pen -->
      <g transform="translate(300, 2)">
        <path d="M6 18 L18 6 L22 10 L10 22 L4 24 L6 18 Z" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
    </g>

    <!-- Home Indicator -->
    <rect x="128" y="62" width="138" height="5" rx="2.5" fill="#64748B" />
  </g>
</svg>`;

const destDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop\\GO';
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
const target = path.join(destDir, '02_Apple_Notes_Style_Think_Pad.svg');
fs.writeFileSync(target, svgContent, 'utf-8');
console.log('✅ Exported Apple Notes-Style Think Pad Studio to:', target);

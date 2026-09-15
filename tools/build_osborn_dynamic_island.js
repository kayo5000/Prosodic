/**
 * build_osborn_dynamic_island.js
 *
 * Generates the complete 3-Frame Dynamic Island + Liquid Morph + Osborn Chat HUD (with Dream Icon & Bottom Mic Bar)
 * for direct Figma drag-and-drop import.
 */

const fs = require('fs');
const path = require('path');

// 1. Shared Definitions
const defs = `
  <defs>
    <!-- Dark Glassmorphism Gradient -->
    <linearGradient id="hudGradient" x1="196.5" y1="0" x2="196.5" y2="520" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#060911"/>
    </linearGradient>

    <!-- Translucent Pill Gradient -->
    <linearGradient id="pillGradient" x1="0" y1="0" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>

    <!-- Glowing Dream Accent Radial -->
    <radialGradient id="dreamGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>

    <!-- Heavy Drop Shadow for Floating Modal -->
    <filter id="modalShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="#000000" flood-opacity="0.85"/>
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>
`;

// Helper: Status Bar
function renderStatusBar() {
  return `
  <g id="Status_Bar">
    <text x="36" y="38" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="14" font-weight="600">9:41</text>
    <g transform="translate(305, 26)">
      <rect x="0" y="8" width="3" height="4" rx="0.75" fill="#F8FAFC"/>
      <rect x="5" y="6" width="3" height="6" rx="0.75" fill="#F8FAFC"/>
      <rect x="10" y="3" width="3" height="9" rx="0.75" fill="#F8FAFC"/>
      <rect x="15" y="0" width="3" height="12" rx="0.75" fill="#F8FAFC"/>
    </g>
    <g transform="translate(328, 26)">
      <path d="M1 3C5.5 -1 12.5 -1 17 3M3.5 6C6.5 3 11.5 3 14.5 6M6.5 9C8 7.5 10 7.5 11.5 9" stroke="#F8FAFC" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g transform="translate(350, 27)">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="#F8FAFC" stroke-width="1"/>
      <rect x="2" y="2" width="14" height="8" rx="2" fill="#F8FAFC"/>
    </g>
  </g>
  `;
}

// Helper: Studio Think Pad Background Layer
function renderThinkPadBase() {
  return `
  <g id="Think_Pad_Canvas_Layer">
    <!-- Top Header -->
    <g transform="translate(20, 60)">
      <rect width="40" height="40" rx="12" fill="#1E293B" stroke="#334155"/>
      <rect x="10" y="12" width="20" height="2.5" rx="1.25" fill="#F8FAFC"/>
      <rect x="10" y="19" width="20" height="2.5" rx="1.25" fill="#F8FAFC"/>
      <rect x="10" y="26" width="14" height="2.5" rx="1.25" fill="#F8FAFC"/>

      <text x="60" y="24" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="15" font-weight="700">Midnight Reverie</text>
      <rect x="200" y="10" width="68" height="20" rx="6" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.4"/>
      <text x="234" y="24" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="10" font-weight="800">90 BPM</text>
    </g>

    <!-- Writing Surface Box -->
    <g transform="translate(20, 116)">
      <rect width="353" height="620" rx="16" fill="#0B111E" stroke="#1E293B"/>

      <!-- Gutter -->
      <rect width="44" height="620" rx="16" fill="#06090F"/>
      <text x="22" y="44" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="13" font-weight="800">12</text>
      <text x="22" y="90" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="13" font-weight="800">14</text>
      <text x="22" y="136" text-anchor="middle" fill="#EAB308" font-family="monospace" font-size="13" font-weight="800">11</text>
      <text x="22" y="182" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="13" font-weight="800">13</text>

      <!-- Lyrics Text -->
      <g transform="translate(56, 0)">
        <text y="44" fill="#EAB308" font-family="monospace" font-size="13.5" font-weight="700">I grab the mic <tspan fill="#CBD5E1" font-weight="400">and spit a syllable </tspan><tspan fill="#06B6D4" font-weight="700">scheme</tspan></text>
        <text y="90" fill="#CBD5E1" font-family="monospace" font-size="13.5">Never miss a <tspan fill="#F43F5E" font-weight="700">beat </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">machine</tspan></text>
        <text y="136" fill="#CBD5E1" font-family="monospace" font-size="13.5">The flow is <tspan fill="#EAB308" font-weight="700">cold </tspan><tspan fill="#CBD5E1">and my tone is </tspan><tspan fill="#06B6D4" font-weight="700">supreme</tspan></text>
        <text y="182" fill="#CBD5E1" font-family="monospace" font-size="13.5">Living out the <tspan fill="#F43F5E" font-weight="700">dream </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">cream</tspan></text>
      </g>
    </g>

    <!-- Bottom Action Bar -->
    <g transform="translate(20, 756)">
      <rect width="108" height="38" rx="19" fill="#2563EB"/>
      <text x="54" y="24" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">💾 Save Track</text>
    </g>
  </g>
  `;
}

// 2. FRAME 1: Resting Island Pill
const frame1Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="#090D16"/>

  ${renderThinkPadBase()}
  ${renderStatusBar()}

  <!-- RESTING DYNAMIC ISLAND PILL -->
  <g id="Dynamic_Island_Resting" transform="translate(136, 10)">
    <rect width="120" height="35" rx="17.5" fill="#000000"/>
    <rect x="0.5" y="0.5" width="119" height="34" rx="17" stroke="#1E293B" stroke-width="1"/>

    <!-- Left: Osborn AI Pulse Dot -->
    <circle cx="18" cy="17.5" r="4.5" fill="#3B82F6"/>
    <circle cx="18" cy="17.5" r="7.5" stroke="#60A5FA" stroke-opacity="0.4" stroke-width="1.5"/>

    <!-- Center Label -->
    <text x="32" y="22" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="12" font-weight="700">Osborn</text>

    <!-- Right: Mini Wave Indicator -->
    <g transform="translate(88, 11)">
      <rect x="0" y="4" width="2" height="6" rx="1" fill="#A855F7"/>
      <rect x="4" y="1" width="2" height="12" rx="1" fill="#A855F7"/>
      <rect x="8" y="3" width="2" height="8" rx="1" fill="#A855F7"/>
      <rect x="12" y="5" width="2" height="4" rx="1" fill="#A855F7"/>
    </g>
  </g>
</svg>`;

// 3. FRAME 2: Liquid Stretch / Pull State
const frame2Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="#090D16"/>

  ${renderThinkPadBase()}
  <!-- Dimming Scrim -->
  <rect width="393" height="852" rx="44" fill="#000000" fill-opacity="0.4"/>
  ${renderStatusBar()}

  <!-- LIQUID STRETCH / MORPHING ISLAND -->
  <g id="Dynamic_Island_Liquid_Morph" transform="translate(66, 10)">
    <!-- Molten Organic Liquid Path stretching downward -->
    <path d="M60 0H200C233 0 260 27 260 60V80C260 120 220 160 180 170H80C40 160 0 120 0 80V60C0 27 27 0 60 0Z" fill="#000000" stroke="#334155" stroke-width="1.5"/>

    <!-- Expanding Content -->
    <circle cx="36" cy="38" r="8" fill="#3B82F6"/>
    <text x="56" y="43" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Opening Osborn HUD...</text>

    <!-- Liquid Wave Ripples -->
    <path d="M40 110C80 125 180 125 220 110" stroke="#A855F7" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M70 130C100 140 160 140 190 130" stroke="#60A5FA" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`;

// 4. FRAME 3: Full Expanded Osborn Chat HUD (with Dream Icon & Bottom Mic Bar)
const frame3Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="#090D16"/>

  ${renderThinkPadBase()}
  <!-- Background Scrim -->
  <rect width="393" height="852" rx="44" fill="#000000" fill-opacity="0.6"/>
  ${renderStatusBar()}

  <!-- EXPANDED OSBORN DYNAMIC ISLAND HUD -->
  <g id="Dynamic_Island_Expanded_HUD" transform="translate(16, 54)" filter="url(#modalShadow)">
    <!-- Main Floating Capsule Container -->
    <rect width="361" height="520" rx="36" fill="url(#hudGradient)"/>
    <rect x="0.75" y="0.75" width="359.5" height="518.5" rx="35.25" stroke="#334155" stroke-width="1.5"/>

    <!-- Ambient Dream Glow Accent behind top-right -->
    <circle cx="300" cy="40" r="70" fill="url(#dreamGlow)"/>

    <!-- ==================== HUD TOP HEADER ==================== -->
    <g id="HUD_Header" transform="translate(24, 28)">
      <!-- Left: Osborn AI Identity -->
      <g id="Osborn_Identity">
        <circle cx="18" cy="18" r="18" fill="#2563EB" stroke="#60A5FA" stroke-width="1.5"/>
        <text x="18" y="24" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="14" font-weight="900">🤖</text>
        <text x="46" y="16" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="16" font-weight="800">Osborn AI</text>
        <text x="46" y="30" fill="#10B981" font-family="-apple-system, sans-serif" font-size="11" font-weight="700">● Session Active • Pocket Tuned</text>
      </g>

      <!-- Right: DREAM ICON & Close Button -->
      <g id="Header_Right_Actions" transform="translate(240, 0)">
        <!-- DREAM ICON (Thought Cloud + Sparkle Stars) -->
        <g id="Icon_Dream_Mode" transform="translate(0, 0)">
          <rect width="36" height="36" rx="12" fill="#1E293B" stroke="#A855F7" stroke-width="1.2"/>
          <!-- Dream Cloud + Sparkle Icon -->
          <path d="M12 24C9.8 24 8 22.2 8 20C8 18.1 9.3 16.5 11.1 16.1C11.6 13.2 14.1 11 17 11C19.6 11 21.8 12.8 22.6 15.2C24.5 15.5 26 17.1 26 19C26 21.2 24.2 23 22 23H12" stroke="#C084FC" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- Star Sparkle -->
          <path d="M25 9L26 11L28 12L26 13L25 15L24 13L22 12L24 11L25 9Z" fill="#FACC15"/>
        </g>

        <!-- Close Button [X] -->
        <g id="Icon_Close_HUD" transform="translate(44, 0)">
          <rect width="36" height="36" rx="12" fill="#1E293B" stroke="#334155"/>
          <path d="M12 12L24 24M24 12L12 24" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
        </g>
      </g>
    </g>

    <!-- ==================== HUD CONVERSATION / SUGGESTION STREAM ==================== -->
    <g id="HUD_Body_Stream" transform="translate(24, 94)">
      <!-- Osborn Greeting Message Bubble -->
      <g id="Message_Osborn_Greeting">
        <rect width="313" height="66" rx="16" fill="#1E293B" stroke="#334155" stroke-opacity="0.6"/>
        <text x="14" y="24" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="13.5" font-weight="600">"What are we writing today, Alex?"</text>
        <text x="14" y="46" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11.5">You're flowing in 90 BPM with Cyan / Rose rhymes.</text>
      </g>

      <!-- Live Interactive Craft Suggestion Chips -->
      <g id="Craft_Suggestions" transform="translate(0, 78)">
        <text x="0" y="14" fill="#64748B" font-family="-apple-system, sans-serif" font-size="11" font-weight="800" letter-spacing="0.5">RHYME &amp; CADENCE SUGGESTIONS</text>

        <!-- Suggestion Card 1: Rhyme Matches -->
        <g transform="translate(0, 24)">
          <rect width="313" height="58" rx="14" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.4"/>
          <text x="14" y="22" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">Cyan Family Rhymes for "supreme":</text>
          <text x="14" y="42" fill="#F8FAFC" font-family="monospace" font-size="12.5">routine • regime • stream • gleam</text>
        </g>

        <!-- Suggestion Card 2: 3-Syllable Compound Weave -->
        <g transform="translate(0, 92)">
          <rect width="313" height="58" rx="14" fill="#18182E" stroke="#A855F7" stroke-opacity="0.4"/>
          <text x="14" y="22" fill="#C084FC" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">Polysyllabic Compound Weave:</text>
          <text x="14" y="42" fill="#F8FAFC" font-family="monospace" font-size="12.5">"guillotine" ──► "silver screen"</text>
        </g>

        <!-- Suggestion Card 3: Velocity & Pocket -->
        <g transform="translate(0, 160)">
          <rect width="313" height="48" rx="14" fill="#0B111E" stroke="#1E293B"/>
          <text x="14" y="28" fill="#10B981" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">⚡ Velocity:</text>
          <text x="82" y="28" fill="#CBD5E1" font-family="-apple-system, sans-serif" font-size="12">4.2 SPS is locking tight on Beat 4</text>
        </g>
      </g>
    </g>

    <!-- ==================== HUD BOTTOM CHAT INPUT BAR WITH MIC ==================== -->
    <g id="HUD_Bottom_Chat_Bar" transform="translate(20, 440)">
      <!-- Outer Input Box -->
      <rect width="321" height="56" rx="28" fill="#0B111E" stroke="#334155" stroke-width="1.5"/>

      <!-- MICROPHONE ICON (LEFT) -->
      <g id="Icon_Microphone" transform="translate(18, 14)">
        <circle cx="14" cy="14" r="14" fill="#1E293B"/>
        <!-- Mic Shape -->
        <rect x="11" y="6" width="6" height="10" rx="3" fill="#60A5FA"/>
        <path d="M8 12C8 15.3 10.7 18 14 18C17.3 18 20 15.3 20 12" stroke="#60A5FA" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="14" y1="18" x2="14" y2="21" stroke="#60A5FA" stroke-width="1.6"/>
      </g>

      <!-- Chat Input Placeholder Text -->
      <text x="58" y="32" fill="#64748B" font-family="-apple-system, sans-serif" font-size="13">Ask Osborn for rhymes, cadence...</text>

      <!-- SEND BUTTON (RIGHT) -->
      <g id="Button_Send_Query" transform="translate(275, 10)">
        <circle cx="18" cy="18" r="18" fill="#2563EB"/>
        <path d="M18 11L12 17M18 11L24 17M18 11V25" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>
  </g>
</svg>`;

// 5. Master Board with All 3 Frames Side-by-Side
const masterBoardSvg = `<svg width="1320" height="960" viewBox="0 0 1320 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1320" height="960" fill="#030712"/>

  <!-- Master Titles -->
  <text x="40" y="44" fill="#60A5FA" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800">FRAME 1: RESTING ISLAND</text>
  <text x="480" y="44" fill="#A855F7" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800">FRAME 2: LIQUID MORPH STRETCH</text>
  <text x="920" y="44" fill="#10B981" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800">FRAME 3: OSBORN CHAT &amp; DREAM HUD</text>

  <!-- Subtitles -->
  <text x="40" y="66" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Trigger: Tap or Drag Island Down ──► Smart Animate (Quick)</text>
  <text x="480" y="66" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Molten Liquid Stretch State ──► Smart Animate (Gentle 450ms)</text>
  <text x="920" y="66" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Features: Dream Icon (Top Right), Stream, Mic &amp; Chat Bar (Bottom)</text>

  <!-- Frame Instances -->
  <g transform="translate(40, 84)">
    ${frame1Svg}
  </g>

  <g transform="translate(480, 84)">
    ${frame2Svg}
  </g>

  <g transform="translate(920, 84)">
    ${frame3Svg}
  </g>
</svg>`;

// Write Files to Desktop and Scratch
const desktopDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop';
const scratchDir = path.resolve(__dirname, '..', 'scratch');

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

fs.writeFileSync(path.join(scratchDir, 'Figma_Osborn_Island_Frame1_Resting.svg'), frame1Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Osborn_Island_Frame2_Liquid_Morph.svg'), frame2Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Osborn_Island_Frame3_Expanded_HUD.svg'), frame3Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Osborn_Dynamic_Island_Board.svg'), masterBoardSvg, 'utf8');

fs.writeFileSync(path.join(desktopDir, 'Figma_Osborn_Island_Frame1_Resting.svg'), frame1Svg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Osborn_Island_Frame2_Liquid_Morph.svg'), frame2Svg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Osborn_Island_Frame3_Expanded_HUD.svg'), frame3Svg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Osborn_Dynamic_Island_Board.svg'), masterBoardSvg, 'utf8');

console.log('✅ Generated Complete 3-Frame Osborn Dynamic Island Package:');
console.log(' - ' + path.join(desktopDir, 'Figma_Osborn_Dynamic_Island_Board.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Osborn_Island_Frame1_Resting.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Osborn_Island_Frame2_Liquid_Morph.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Osborn_Island_Frame3_Expanded_HUD.svg'));

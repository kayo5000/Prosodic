/**
 * build_2screen_prototype.js
 *
 * Builds the complete 2-Screen Smart Animate Figma Prototype Package for Prosodic:
 * - Screen 1: Think Pad (Closed) with off-screen staged menu elements and full writing studio.
 * - Screen 2: Slide Menu (Open) with on-screen menu elements and scaled 3D inset Think Pad.
 * - Master Board: Both screens side-by-side ready for 1-click Figma import.
 */

const fs = require('fs');
const path = require('path');

// 1. Shared Definitions (Gradients & Shadows)
const defs = `
  <defs>
    <!-- Seamless 5-Stop Emerald-to-Forest Green Gradient -->
    <linearGradient id="greenBg" x1="196.5" y1="0" x2="196.5" y2="852" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3FA373"/>
      <stop offset="25%" stop-color="#359A6A"/>
      <stop offset="50%" stop-color="#28895B"/>
      <stop offset="75%" stop-color="#1E754B"/>
      <stop offset="100%" stop-color="#165C35"/>
    </linearGradient>

    <!-- Translucent Glassmorphism White Fill for Header Circles -->
    <radialGradient id="glassCircle" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.14"/>
    </radialGradient>

    <!-- Drop Shadow Filter for Inset Screen -->
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="-10" dy="15" stdDeviation="20" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>
`;

// 2. Comprehensive Think Pad Component
function renderThinkPad(isScaled = false) {
  const width = isScaled ? 306 : 393;
  const height = isScaled ? 664 : 852;
  const rx = isScaled ? 24 : 0;
  const scaleRatio = isScaled ? 0.78 : 1.0;

  return `
  <!-- Think Pad Screen Component -->
  <g id="Think_Pad_Screen" ${isScaled ? 'filter="url(#cardShadow)"' : ''}>
    <!-- Background Canvas -->
    <rect width="${width}" height="${height}" rx="${rx}" fill="#090D16"/>
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${rx}" stroke="#1E293B" stroke-width="1"/>

    <!-- Inner Content Scaled -->
    <g transform="scale(${scaleRatio})">
      <!-- Status Bar -->
      <g id="Status_Bar">
        <text x="32" y="38" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="14" font-weight="600">9:41</text>
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

      <!-- Top Studio Header -->
      <g id="Studio_Header" transform="translate(20, 56)">
        <!-- Hamburger Menu Button (Trigger) -->
        <g id="Button_Menu_Trigger">
          <rect width="40" height="40" rx="12" fill="#1E293B" stroke="#334155"/>
          <rect x="10" y="12" width="20" height="2.5" rx="1.25" fill="#F8FAFC"/>
          <rect x="10" y="19" width="20" height="2.5" rx="1.25" fill="#F8FAFC"/>
          <rect x="10" y="26" width="14" height="2.5" rx="1.25" fill="#F8FAFC"/>
        </g>

        <!-- Track Title & Tempo Badge -->
        <g transform="translate(60, 4)">
          <text x="0" y="14" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="15" font-weight="700">Midnight Reverie</text>
          <g transform="translate(0, 20)">
            <rect width="66" height="16" rx="6" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.4"/>
            <text x="33" y="12" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="9.5" font-weight="800">90 BPM • 4/4</text>
          </g>
        </g>

        <!-- Metronome / Tap Tempo Button -->
        <g id="Button_Metronome" transform="translate(313, 0)">
          <rect width="40" height="40" rx="12" fill="#1E293B" stroke="#334155"/>
          <!-- Metronome Icon -->
          <path d="M14 30L20 10L26 30H14Z" stroke="#60A5FA" stroke-width="1.8" stroke-linejoin="round"/>
          <line x1="20" y1="18" x2="26" y2="13" stroke="#F43F5E" stroke-width="2" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Density & Dialect Indicator Strip -->
      <g id="Studio_Toolbar" transform="translate(20, 114)">
        <rect width="353" height="34" rx="10" fill="#0B111E" stroke="#1E293B"/>
        <!-- SPS Metric Pill -->
        <rect x="6" y="5" width="80" height="24" rx="6" fill="#131D31"/>
        <text x="46" y="21" text-anchor="middle" fill="#10B981" font-family="-apple-system, sans-serif" font-size="10.5" font-weight="800">⚡ 4.2 SPS</text>

        <!-- Visual Mode Toggles -->
        <text x="140" y="21" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">Density: Dense</text>
        <g transform="translate(270, 5)">
          <rect width="76" height="24" rx="6" fill="#1E293B" stroke="#3B82F6" stroke-opacity="0.3"/>
          <text x="38" y="16" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="10" font-weight="700">🔬 Craft</text>
        </g>
      </g>

      <!-- Comprehensive Writing Canvas Surface -->
      <g id="Writing_Canvas_Surface" transform="translate(20, 160)">
        <rect width="353" height="570" rx="16" fill="#0B111E" stroke="#1E293B"/>

        <!-- Syllable Gutter (Left) -->
        <g id="Syllable_Gutter">
          <rect width="46" height="570" rx="16" fill="#06090F"/>
          <line x1="46" y1="0" x2="46" y2="570" stroke="#1E293B" stroke-width="1"/>

          <!-- Bar Syllable Counts -->
          <text x="23" y="44" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="13" font-weight="800">12</text>
          <text x="23" y="90" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="13" font-weight="800">14</text>
          <text x="23" y="136" text-anchor="middle" fill="#EAB308" font-family="monospace" font-size="13" font-weight="800">11</text>
          <text x="23" y="182" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="13" font-weight="800">13</text>
          <text x="23" y="228" text-anchor="middle" fill="#64748B" font-family="monospace" font-size="13" font-weight="700">0</text>
        </g>

        <!-- Live Color-Coded Rhyme Lyrics -->
        <g id="Lyrics_Text_Editor" transform="translate(60, 0)">
          <!-- Line 1 -->
          <g transform="translate(0, 44)">
            <text fill="#EAB308" font-family="monospace" font-size="14" font-weight="700">I grab the mic <tspan fill="#CBD5E1" font-weight="400">and spit a syllable </tspan><tspan fill="#06B6D4" font-weight="700">scheme</tspan></text>
          </g>

          <!-- Line 2 -->
          <g transform="translate(0, 90)">
            <text fill="#CBD5E1" font-family="monospace" font-size="14">Never miss a <tspan fill="#F43F5E" font-weight="700">beat </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">machine</tspan></text>
          </g>

          <!-- Line 3 -->
          <g transform="translate(0, 136)">
            <text fill="#CBD5E1" font-family="monospace" font-size="14">The flow is <tspan fill="#EAB308" font-weight="700">cold </tspan><tspan fill="#CBD5E1">and my tone is </tspan><tspan fill="#06B6D4" font-weight="700">supreme</tspan></text>
          </g>

          <!-- Line 4 -->
          <g transform="translate(0, 182)">
            <text fill="#CBD5E1" font-family="monospace" font-size="14">Living out the <tspan fill="#F43F5E" font-weight="700">dream </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">cream</tspan></text>
          </g>

          <!-- Active Caret Line 5 -->
          <g transform="translate(0, 228)">
            <line x1="0" y1="-12" x2="0" y2="4" stroke="#60A5FA" stroke-width="2"/>
            <text x="6" y="0" fill="#475569" font-family="monospace" font-size="13">Write bar 5...</text>
          </g>
        </g>
      </g>

      <!-- Bottom Studio Action Footer -->
      <g id="Studio_Footer" transform="translate(20, 746)">
        <!-- Save Track Button -->
        <g id="Button_Save_Track">
          <rect width="108" height="38" rx="19" fill="#2563EB"/>
          <text x="54" y="24" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">💾 Save Track</text>
        </g>

        <!-- Undo / Redo Controls -->
        <g id="Undo_Redo_Controls" transform="translate(120, 0)">
          <rect width="38" height="38" rx="12" fill="#1E293B" stroke="#334155"/>
          <text x="19" y="24" text-anchor="middle" fill="#94A3B8" font-size="14">↶</text>
          <g transform="translate(46, 0)">
            <rect width="38" height="38" rx="12" fill="#1E293B" stroke="#334155"/>
            <text x="19" y="24" text-anchor="middle" fill="#94A3B8" font-size="14">↷</text>
          </g>
        </g>

        <!-- Syllable / Bar Tally -->
        <text x="353" y="24" text-anchor="end" fill="#64748B" font-family="-apple-system, sans-serif" font-size="11" font-weight="500">50 syllables • 4 bars</text>
      </g>
    </g>

    ${isScaled ? '<!-- Dimming Touch Overlay --><rect width="306" height="664" rx="24" fill="#000000" fill-opacity="0.25"/>' : ''}
  </g>
  `;
}

// 3. Slide Menu Elements Component
function renderSlideMenuElements(stageX = 48) {
  const closeX = stageX === 48 ? 341 : 341 + (stageX - 48);

  return `
  <!-- Slide Menu Elements Group -->
  <g id="Slide_Menu_Elements">
    <!-- User Profile Button (Left) -->
    <g id="Button_User_Profile" transform="translate(${stageX + 28}, 116)">
      <circle cx="0" cy="0" r="28" fill="url(#glassCircle)"/>
      <circle cx="0" cy="-6" r="6" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M-11 9C-11 4 -6 2 0 2C6 2 11 4 11 9" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/>
    </g>

    <!-- Close [X] Button (Right) -->
    <g id="Button_Close_Menu" transform="translate(${closeX}, 116)">
      <circle cx="0" cy="0" r="28" fill="url(#glassCircle)"/>
      <path d="M-7 -7L7 7M7 -7L-7 7" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    </g>

    <!-- 1. Studio -->
    <g id="Menu_Item_Studio" transform="translate(${stageX}, 210)">
      <path d="M17 3L21 7L7 21H3V17L17 3Z" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
      <path d="M14 6L18 10" stroke="#FFFFFF" stroke-width="2"/>
      <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="500">Studio</text>
    </g>

    <!-- 2. Projects -->
    <g id="Menu_Item_Projects" transform="translate(${stageX}, 275)">
      <path d="M2 5C2 3.89 2.89 3 4 3H9L11 5H20C21.1 5 22 5.89 22 7V17C22 18.1 21.1 19 20 19H4C2.89 19 2 18.1 2 17V5Z" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
      <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="500">Projects</text>
    </g>

    <!-- 3. My Tracks -->
    <g id="Menu_Item_My_Tracks" transform="translate(${stageX}, 340)">
      <rect x="2" y="6" width="3" height="12" rx="1.5" fill="#FFFFFF"/>
      <rect x="8" y="2" width="3" height="20" rx="1.5" fill="#FFFFFF"/>
      <rect x="14" y="8" width="3" height="8" rx="1.5" fill="#FFFFFF"/>
      <rect x="20" y="4" width="3" height="16" rx="1.5" fill="#FFFFFF"/>
      <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="500">My Tracks</text>
    </g>

    <!-- 4. Lexicon -->
    <g id="Menu_Item_Lexicon" transform="translate(${stageX}, 405)">
      <path d="M2 4C5 4 9 2 12 2C15 2 19 4 22 4V19C19 19 15 17 12 17C9 17 5 19 2 19V4Z" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
      <line x1="12" y1="2" x2="12" y2="17" stroke="#FFFFFF" stroke-width="2"/>
      <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="500">Lexicon</text>
    </g>

    <!-- 5. Practice -->
    <g id="Menu_Item_Practice" transform="translate(${stageX}, 470)">
      <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="12" cy="12" r="5" stroke="#FFFFFF" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF"/>
      <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="500">Practice</text>
    </g>

    <!-- 6. Planner -->
    <g id="Menu_Item_Planner" transform="translate(${stageX}, 535)">
      <rect x="2" y="3" width="20" height="18" rx="4" stroke="#FFFFFF" stroke-width="2"/>
      <line x1="2" y1="8" x2="22" y2="8" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="7" cy="13" r="1.5" fill="#FFFFFF"/>
      <circle cx="12" cy="13" r="1.5" fill="#FFFFFF"/>
      <circle cx="17" cy="13" r="1.5" fill="#FFFFFF"/>
      <circle cx="7" cy="17" r="1.5" fill="#FFFFFF"/>
      <circle cx="12" cy="17" r="1.5" fill="#FFFFFF"/>
      <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="500">Planner</text>
    </g>
  </g>
  `;
}

// 4. Build Screen 1: Think Pad (Closed)
const screen1Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}

  <!-- Screen 1 Frame (Clip Content: True) -->
  <g id="Screen_1_Think_Pad_Closed" clip-path="url(#screenClip1)">
    <clipPath id="screenClip1">
      <rect width="393" height="852" rx="44"/>
    </clipPath>

    <!-- Background -->
    <rect width="393" height="852" rx="44" fill="url(#greenBg)"/>

    <!-- Staged OUTSIDE Frame (X: -180px) for Smart Animate Entrance -->
    ${renderSlideMenuElements(-180)}

    <!-- Front Layer: Full-Size Think Pad Screen (X: 0, Y: 0) -->
    <g transform="translate(0, 0)">
      ${renderThinkPad(false)}
    </g>
  </g>
</svg>`;

// 5. Build Screen 2: Slide Menu (Open)
const screen2Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}

  <!-- Screen 2 Frame (Clip Content: True) -->
  <g id="Screen_2_Slide_Menu_Open" clip-path="url(#screenClip2)">
    <clipPath id="screenClip2">
      <rect width="393" height="852" rx="44"/>
    </clipPath>

    <!-- Background -->
    <rect width="393" height="852" rx="44" fill="url(#greenBg)"/>

    <!-- Slid INSIDE Frame (X: +48px) -->
    ${renderSlideMenuElements(48)}

    <!-- 3D Inset Scaled Think Pad (Shifted to X: 240, Y: 70, Scaled 78%, Radius 24px) -->
    <g transform="translate(240, 70)">
      ${renderThinkPad(true)}
    </g>
  </g>
</svg>`;

// 6. Master 2-Screen Board for Figma Import (Side-by-Side with Connections)
const masterBoardSvg = `<svg width="900" height="960" viewBox="0 0 900 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="900" height="960" fill="#030712"/>

  <!-- Board Headers -->
  <text x="40" y="44" fill="#60A5FA" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800" letter-spacing="0.5">SCREEN 1: THINK PAD (CLOSED)</text>
  <text x="470" y="44" fill="#60A5FA" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800" letter-spacing="0.5">SCREEN 2: 3D SLIDE MENU (OPEN)</text>

  <!-- Subtitle Instructions -->
  <text x="40" y="66" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Trigger: Tap [☰] Button ──► Smart Animate (Gentle 450ms)</text>
  <text x="470" y="66" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Close: Tap [✕] or Scaled Card ──► Smart Animate (Gentle 450ms)</text>

  <!-- Screen 1 Instance -->
  <g transform="translate(40, 84)">
    ${screen1Svg}
  </g>

  <!-- Screen 2 Instance -->
  <g transform="translate(470, 84)">
    ${screen2Svg}
  </g>
</svg>`;

// Write Files to Desktop and Scratch
const desktopDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop';
const scratchDir = path.resolve(__dirname, '..', 'scratch');

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

fs.writeFileSync(path.join(scratchDir, 'Figma_Screen1_ThinkPad_Closed.svg'), screen1Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Screen2_SlideMenu_Open.svg'), screen2Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Prosodic_2Screen_Prototype_Board.svg'), masterBoardSvg, 'utf8');

fs.writeFileSync(path.join(desktopDir, 'Figma_Screen1_ThinkPad_Closed.svg'), screen1Svg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Screen2_SlideMenu_Open.svg'), screen2Svg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Prosodic_2Screen_Prototype_Board.svg'), masterBoardSvg, 'utf8');

console.log('✅ Generated Complete 2-Screen Figma Smart Animate Package:');
console.log(' - ' + path.join(desktopDir, 'Figma_Prosodic_2Screen_Prototype_Board.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Screen1_ThinkPad_Closed.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Screen2_SlideMenu_Open.svg'));

/**
 * generate_figma_svgs.js
 *
 * Generates two 1:1 vector Figma frames (Frame 1: Studio Closed, Frame 2: 3D Inset Menu Open)
 * that can be dragged directly onto the Figma canvas to instantly create the UI frames.
 */

const fs = require('fs');
const path = require('path');

const frame1Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="393" height="852" rx="44" fill="#090D16"/>
  <rect x="0.5" y="0.5" width="392" height="851" rx="43.5" stroke="#1E293B"/>

  <!-- Status Bar -->
  <text x="32" y="38" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="14" font-weight="600">9:41</text>
  <circle cx="340" cy="34" r="3" fill="#F8FAFC"/>
  <circle cx="348" cy="34" r="3" fill="#F8FAFC"/>
  <circle cx="356" cy="34" r="3" fill="#F8FAFC"/>
  <rect x="365" y="28" width="18" height="11" rx="3" stroke="#F8FAFC" stroke-width="1.5"/>
  <rect x="367" y="30" width="10" height="7" rx="1.5" fill="#F8FAFC"/>

  <!-- Top Navigation -->
  <!-- Hamburger Menu -->
  <rect x="20" y="60" width="38" height="38" rx="10" fill="#1E293B" stroke="#334155"/>
  <rect x="29" y="71" width="20" height="2.5" rx="1.25" fill="#F8FAFC"/>
  <rect x="29" y="78" width="20" height="2.5" rx="1.25" fill="#F8FAFC"/>
  <rect x="29" y="85" width="14" height="2.5" rx="1.25" fill="#F8FAFC"/>

  <!-- Center Title & BPM -->
  <text x="196" y="76" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="1">PROSODIC STUDIO</text>
  <text x="196" y="92" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="11" font-weight="700">90 BPM • 4/4 POCKET</text>

  <!-- Right Icon -->
  <rect x="335" y="60" width="38" height="38" rx="10" fill="#1E293B" stroke="#334155"/>
  <circle cx="354" cy="79" r="6" stroke="#60A5FA" stroke-width="2"/>

  <!-- Hero Track Banner -->
  <rect x="20" y="118" width="353" height="72" rx="16" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.3"/>
  <text x="36" y="148" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Midnight Reverie (Draft 2)</text>
  <text x="36" y="168" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11">16 Bars • Dense Polysyllabic Pocket</text>
  <rect x="295" y="138" width="62" height="26" rx="8" fill="#090D16" stroke="#10B981" stroke-opacity="0.4"/>
  <text x="326" y="155" text-anchor="middle" fill="#10B981" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">4.2 SPS</text>

  <!-- Lyrics Editor Box -->
  <rect x="20" y="206" width="353" height="530" rx="16" fill="#0B111E" stroke="#1E293B"/>

  <!-- Syllable Gutter -->
  <rect x="20" y="206" width="44" height="530" rx="16" fill="#090D16"/>
  <text x="42" y="248" text-anchor="middle" fill="#60A5FA" font-family="monospace" font-size="12" font-weight="700">12</text>
  <text x="42" y="284" text-anchor="middle" fill="#60A5FA" font-family="monospace" font-size="12" font-weight="700">14</text>
  <text x="42" y="320" text-anchor="middle" fill="#60A5FA" font-family="monospace" font-size="12" font-weight="700">11</text>
  <text x="42" y="356" text-anchor="middle" fill="#60A5FA" font-family="monospace" font-size="12" font-weight="700">13</text>

  <!-- Lyric Lines with Rhyme Map Glow -->
  <text x="76" y="248" fill="#EAB308" font-family="monospace" font-size="13" font-weight="700">I grab the mic <tspan fill="#CBD5E1" font-weight="400">and spit a syllable </tspan><tspan fill="#06B6D4" font-weight="700">scheme</tspan></text>
  <text x="76" y="284" fill="#CBD5E1" font-family="monospace" font-size="13">Never miss a <tspan fill="#F43F5E" font-weight="700">beat </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">machine</tspan></text>
  <text x="76" y="320" fill="#CBD5E1" font-family="monospace" font-size="13">The flow is <tspan fill="#EAB308" font-weight="700">cold </tspan><tspan fill="#CBD5E1">and my tone is </tspan><tspan fill="#06B6D4" font-weight="700">supreme</tspan></text>
  <text x="76" y="356" fill="#CBD5E1" font-family="monospace" font-size="13">Living out the <tspan fill="#F43F5E" font-weight="700">dream </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">cream</tspan></text>

  <!-- Bottom Bar -->
  <rect x="20" y="754" width="100" height="36" rx="18" fill="#2563EB"/>
  <text x="70" y="776" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">Save Track</text>
  <text x="373" y="776" text-anchor="end" fill="#64748B" font-family="-apple-system, sans-serif" font-size="11">50 total syllables • 4 bars</text>
</svg>`;

const frame2Svg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Canvas -->
  <rect width="393" height="852" rx="44" fill="#090D16"/>

  <!-- SIDE DRAWER CONTENT (LEFT) -->
  <!-- Profile Header -->
  <circle cx="48" cy="80" r="22" fill="#2563EB" stroke="#60A5FA" stroke-width="1.5"/>
  <text x="48" y="86" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="15" font-weight="800">AR</text>
  <text x="82" y="78" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Alex Rivera</text>
  <rect x="82" y="84" width="76" height="18" rx="6" fill="#1E293B" stroke="#3B82F6" stroke-opacity="0.3"/>
  <text x="120" y="96" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="9" font-weight="800" letter-spacing="0.5">PRO WRITER</text>

  <!-- Dialect Section -->
  <text x="26" y="142" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="1">LANGUAGE DIALECT</text>
  <rect x="26" y="152" width="200" height="32" rx="8" fill="#030712" stroke="#1E293B"/>
  <rect x="28" y="154" width="64" height="28" rx="6" fill="#1E293B" stroke="#3B82F6"/>
  <text x="60" y="172" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="10" font-weight="800">💡 Simple</text>
  <text x="126" y="172" text-anchor="middle" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10" font-weight="700">⚡ Dual</text>
  <text x="192" y="172" text-anchor="middle" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10" font-weight="700">🔬 Craft</text>

  <!-- Projects Section -->
  <text x="26" y="218" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="1">📂 PROJECTS &amp; VAULT</text>

  <!-- Project 1 (Active) -->
  <rect x="26" y="232" width="200" height="52" rx="10" fill="#131D31" stroke="#3B82F6"/>
  <text x="38" y="254" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">Midnight Reverie</text>
  <text x="38" y="270" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10">90 BPM • 16 bars</text>

  <!-- Project 2 -->
  <rect x="26" y="292" width="200" height="52" rx="10" fill="#0F172A" stroke="#1E293B"/>
  <text x="38" y="314" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">Double Time Drill</text>
  <text x="38" y="330" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10">140 BPM • 8 bars</text>

  <!-- Project 3 -->
  <rect x="26" y="352" width="200" height="52" rx="10" fill="#0F172A" stroke="#1E293B"/>
  <text x="38" y="374" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">Ghost Pocket V1</text>
  <text x="38" y="390" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10">82 BPM • 24 bars</text>

  <!-- Craft Gauntlet -->
  <text x="26" y="440" fill="#64748B" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="1">🎯 CRAFT GAUNTLET</text>
  <rect x="26" y="454" width="200" height="120" rx="10" fill="#0F172A" stroke="#1E293B"/>
  <text x="38" y="480" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11">⚡ Compound Gauntlet</text>
  <text x="38" y="510" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11">🏎️ Velocity Workout</text>
  <text x="38" y="540" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11">🧬 Cross-Bar Weave</text>

  <!-- Footer -->
  <text x="26" y="800" fill="#EF4444" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">🚪 Switch Artist Profile</text>

  <!-- TRANSFORMED MAIN SCREEN (INSET, SCALED & SHIFTED RIGHT) -->
  <g transform="translate(240, 50) scale(0.85)">
    <!-- Deep Drop Shadow -->
    <rect x="-10" y="0" width="393" height="852" rx="32" fill="#000000" opacity="0.6"/>

    <!-- Main Screen Body -->
    <rect width="393" height="852" rx="32" fill="#090D16" stroke="#3B82F6" stroke-width="2"/>

    <!-- Top Navigation -->
    <rect x="20" y="40" width="38" height="38" rx="10" fill="#1E293B"/>
    <text x="196" y="65" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="14" font-weight="800">PROSODIC STUDIO</text>

    <!-- Workspace Banner -->
    <rect x="20" y="100" width="353" height="72" rx="16" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.3"/>
    <text x="36" y="130" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Midnight Reverie (Draft 2)</text>

    <!-- Lyrics Box -->
    <rect x="20" y="190" width="353" height="560" rx="16" fill="#0B111E" stroke="#1E293B"/>
    <text x="40" y="240" fill="#EAB308" font-family="monospace" font-size="13" font-weight="700">I grab the mic <tspan fill="#CBD5E1">and spit a syllable </tspan><tspan fill="#06B6D4">scheme</tspan></text>
    <text x="40" y="276" fill="#CBD5E1" font-family="monospace" font-size="13">Never miss a <tspan fill="#F43F5E" font-weight="700">beat </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4">machine</tspan></text>
    <text x="40" y="312" fill="#CBD5E1" font-family="monospace" font-size="13">The flow is <tspan fill="#EAB308" font-weight="700">cold </tspan><tspan fill="#CBD5E1">and my tone is </tspan><tspan fill="#06B6D4">supreme</tspan></text>

    <!-- Dimming Glass Tint Overlay -->
    <rect width="393" height="852" rx="32" fill="#000000" opacity="0.3"/>
  </g>
</svg>`;

// Both frames side-by-side on one master Figma board (840 x 880)
const combinedBoardSvg = `<svg width="840" height="900" viewBox="0 0 840 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="840" height="900" fill="#030712"/>
  <text x="40" y="36" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="18" font-weight="800">FRAME 1: STUDIO (CLOSED)</text>
  <text x="460" y="36" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="18" font-weight="800">FRAME 2: 3D SLIDE MENU (OPEN)</text>
  <g transform="translate(20, 50)">
    ${frame1Svg}
  </g>
  <g transform="translate(440, 50)">
    ${frame2Svg}
  </g>
</svg>`;

// Write to Desktop and Scratch for easy drag-and-drop into Figma
const desktopDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop';
const scratchDir = path.resolve(__dirname, '..', 'scratch');

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

fs.writeFileSync(path.join(scratchDir, 'Figma_Frame1_Studio_Closed.svg'), frame1Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Frame2_Menu_Open.svg'), frame2Svg, 'utf8');
fs.writeFileSync(path.join(scratchDir, 'Figma_Slide_Menu_Full_Board.svg'), combinedBoardSvg, 'utf8');

// Copy directly to user's Desktop for instant drag-and-drop into Figma!
fs.writeFileSync(path.join(desktopDir, 'Figma_Slide_Menu_Full_Board.svg'), combinedBoardSvg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Frame1_Studio_Closed.svg'), frame1Svg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Frame2_Menu_Open.svg'), frame2Svg, 'utf8');

console.log('✅ Generated Figma SVG files:');
console.log(' - ' + path.join(desktopDir, 'Figma_Slide_Menu_Full_Board.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Frame1_Studio_Closed.svg'));
console.log(' - ' + path.join(desktopDir, 'Figma_Frame2_Menu_Open.svg'));

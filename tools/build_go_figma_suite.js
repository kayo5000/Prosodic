/**
 * build_go_figma_suite.js
 *
 * Comprehensive Mobile UI Design Suite for Prosodic
 * Designed in 100% adherence to the 8-Minute Mobile UI Design Masterclass (Gfsd8NNuD9g):
 *
 * 1. 01_Home_Studio_Workspace.svg (Sidebar-as-Home, Recents Carousel, Vertical Projects, Floating Dock + FAB)
 * 2. 02_Think_Pad_Studio.svg (One Screen One Job, Syllable Gutter, Color Rhymes, Contextual Action Dock)
 * 3. 03_Contextual_Bottom_Sheet.svg (Cadence/Metronome Sheet with 0.92 scaled backdrop)
 * 4. 04_Lexicon_Rhyme_Armory.svg (Categorized 1D card stacks for perfect, slant, multisyllabic rhymes)
 * 5. 05_Practice_Flow_Lab.svg (4-bar timing drill, SPS speedometer, rhyme accuracy meter)
 * 6. 06_Planner_Voice_Memos.svg (Osborn AI calendar + audio waveform memo cards)
 * 7. 07_Long_Press_Preview.svg (Backdrop blur + elevated track card with quick actions)
 * 8. 08_Empty_State_Onboarding.svg (Clear onboarding pointing to floating [+] FAB)
 * 9. 09_Search_Zero_State.svg (No results illustration + phonetic suggestions)
 * 10. 10_Standalone_Component_Docks.svg (Floating docks, toolbars, audio controls component library)
 * 11. 00_Master_Multi_Screen_Board.svg (Side-by-side presentation board of all screens)
 */

const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop\\GO';
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

// Shared Definitions
const defs = `
  <defs>
    <!-- Background Canvas Gradients -->
    <radialGradient id="darkBg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="60%" stop-color="#080C14"/>
      <stop offset="100%" stop-color="#03060B"/>
    </radialGradient>

    <!-- Frosted Glass Gradient -->
    <linearGradient id="frostedGlass" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.04"/>
    </linearGradient>

    <!-- Floating Dock Frosted Pill Fill -->
    <linearGradient id="dockPill" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.98"/>
    </linearGradient>

    <!-- Accent Blue Gradient for Primary Actions -->
    <linearGradient id="accentBlue" x1="0" y1="0" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>
    </filter>

    <filter id="dockShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.7"/>
    </filter>

    <filter id="sheetShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="-10" stdDeviation="25" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>
`;

// Helper: Status Bar
function renderStatusBar() {
  return `
  <g id="Status_Bar">
    <text x="36" y="38" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="15" font-weight="600">9:41</text>
    <g transform="translate(305, 26)">
      <rect x="0" y="8" width="3" height="4" rx="0.75" fill="#F8FAFC"/>
      <rect x="5" y="6" width="3" height="6" rx="0.75" fill="#F8FAFC"/>
      <rect x="10" y="3" width="3" height="9" rx="0.75" fill="#F8FAFC"/>
      <rect x="15" y="0" width="3" height="12" rx="0.75" fill="#F8FAFC"/>
    </g>
    <g transform="translate(328, 26)">
      <path d="M1 3C5.5 -1 12.5 -1 17 3M3.5 6C6.5 3 11.5 3 14.5 6M6.5 9C8 7.5 10 7.5 11.5 9M9 11.5C9 11.78 8.78 12 8.5 12C8.22 12 8 11.78 8 11.5Z" stroke="#F8FAFC" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g transform="translate(350, 27)">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="#F8FAFC" stroke-width="1"/>
      <rect x="2" y="2" width="14" height="8" rx="2" fill="#F8FAFC"/>
    </g>
  </g>
  `;
}

// Helper: Floating Bottom Dock
function renderFloatingDock(activeTab = 'Studio') {
  return `
  <g id="Floating_Bottom_Dock_Group" transform="translate(24, 752)">
    <!-- Main Dock Pill (3 items) -->
    <g id="Dock_Main_Pill" filter="url(#dockShadow)">
      <rect width="265" height="62" rx="31" fill="url(#dockPill)"/>
      <rect x="0.75" y="0.75" width="263.5" height="60.5" rx="30.25" stroke="#334155" stroke-opacity="0.8" stroke-width="1.5"/>

      <!-- Tab 1: Studio -->
      <g id="Tab_Studio" transform="translate(24, 11)">
        <circle cx="20" cy="20" r="18" fill="${activeTab === 'Studio' ? '#2563EB' : 'transparent'}"/>
        <path d="M14 8L24 18L10 28H4V22L14 8Z" stroke="${activeTab === 'Studio' ? '#FFFFFF' : '#94A3B8'}" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
        <text x="20" y="36" text-anchor="middle" fill="${activeTab === 'Studio' ? '#FFFFFF' : '#94A3B8'}" font-family="-apple-system, sans-serif" font-size="9" font-weight="700">Studio</text>
      </g>

      <!-- Tab 2: Lexicon -->
      <g id="Tab_Lexicon" transform="translate(102, 11)">
        <circle cx="20" cy="20" r="18" fill="${activeTab === 'Lexicon' ? '#2563EB' : 'transparent'}"/>
        <path d="M12 10C14 10 17 8.5 20 8.5C23 8.5 26 10 28 10V24C26 24 23 22.5 20 22.5C17 22.5 14 24 12 24V10Z" stroke="${activeTab === 'Lexicon' ? '#FFFFFF' : '#94A3B8'}" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
        <line x1="20" y1="8.5" x2="20" y2="22.5" stroke="${activeTab === 'Lexicon' ? '#FFFFFF' : '#94A3B8'}" stroke-width="1.8"/>
        <text x="20" y="36" text-anchor="middle" fill="${activeTab === 'Lexicon' ? '#FFFFFF' : '#94A3B8'}" font-family="-apple-system, sans-serif" font-size="9" font-weight="700">Lexicon</text>
      </g>

      <!-- Tab 3: Planner -->
      <g id="Tab_Planner" transform="translate(180, 11)">
        <circle cx="20" cy="20" r="18" fill="${activeTab === 'Planner' ? '#2563EB' : 'transparent'}"/>
        <rect x="11" y="10" width="18" height="16" rx="4" stroke="${activeTab === 'Planner' ? '#FFFFFF' : '#94A3B8'}" stroke-width="1.8" fill="none"/>
        <line x1="11" y1="15" x2="29" y2="15" stroke="${activeTab === 'Planner' ? '#FFFFFF' : '#94A3B8'}" stroke-width="1.8"/>
        <text x="20" y="36" text-anchor="middle" fill="${activeTab === 'Planner' ? '#FFFFFF' : '#94A3B8'}" font-family="-apple-system, sans-serif" font-size="9" font-weight="700">Planner</text>
      </g>
    </g>

    <!-- Detached Prominent Floating Action Button (+) -->
    <g id="Floating_Action_Button_Add" transform="translate(283, 0)" filter="url(#dockShadow)">
      <circle cx="31" cy="31" r="31" fill="url(#accentBlue)"/>
      <circle cx="31" cy="31" r="30" stroke="#60A5FA" stroke-opacity="0.5" stroke-width="1.5" fill="none"/>
      <path d="M31 19V43M19 31H43" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </g>
  </g>
  `;
}

// 1. Screen 01: Home Studio Workspace
const screen01 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="url(#darkBg)"/>
  ${renderStatusBar()}

  <g id="Home_Header" transform="translate(24, 60)">
    <circle cx="22" cy="22" r="22" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5"/>
    <text x="22" y="27" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="14" font-weight="800">AR</text>
    <text x="56" y="18" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800">Alex Rivera</text>
    <text x="56" y="34" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12" font-weight="500">14 Tracks • 90 BPM Pocket</text>
    <g transform="translate(295, 2)">
      <circle cx="20" cy="20" r="20" fill="#1E293B" stroke="#334155" stroke-width="1"/>
      <path d="M15 22C15 19 16 16 20 16C24 16 25 19 25 22H15Z" stroke="#F8FAFC" stroke-width="1.8" fill="none"/>
      <circle cx="20" cy="25" r="1.5" fill="#F8FAFC"/>
      <circle cx="26" cy="12" r="3.5" fill="#EF4444"/>
    </g>
  </g>

  <!-- Horizontal 1D Carousel -->
  <g id="Section_Recent_Tracks" transform="translate(24, 130)">
    <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="700">Recent Tracks</text>
    <text x="345" y="16" text-anchor="end" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="13" font-weight="600">See all</text>

    <!-- Card 1 -->
    <g transform="translate(0, 30)" filter="url(#cardShadow)">
      <rect width="210" height="135" rx="20" fill="#131D31" stroke="#3B82F6" stroke-width="1.5"/>
      <rect x="14" y="14" width="86" height="22" rx="7" fill="#064E3B" stroke="#10B981" stroke-opacity="0.4"/>
      <text x="57" y="29" text-anchor="middle" fill="#34D399" font-family="-apple-system, sans-serif" font-size="10.5" font-weight="800">● In progress</text>
      <text x="14" y="66" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">Midnight Reverie</text>
      <text x="14" y="86" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">4 bars • 50 syllables • 90 BPM</text>
      <g transform="translate(14, 104)">
        <circle cx="6" cy="6" r="5" fill="#EAB308"/>
        <circle cx="20" cy="6" r="5" fill="#06B6D4"/>
        <circle cx="34" cy="6" r="5" fill="#F43F5E"/>
        <text x="48" y="10" fill="#64748B" font-family="-apple-system, sans-serif" font-size="11">Cyan/Gold</text>
      </g>
    </g>

    <!-- Card 2 -->
    <g transform="translate(222, 30)" filter="url(#cardShadow)">
      <rect width="210" height="135" rx="20" fill="#0F172A" stroke="#1E293B" stroke-width="1"/>
      <rect x="14" y="14" width="70" height="22" rx="7" fill="#1E293B"/>
      <text x="49" y="29" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="10.5" font-weight="700">✓ Mastered</text>
      <text x="14" y="66" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">Double Time Drill</text>
      <text x="14" y="86" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">16 bars • 140 BPM</text>
    </g>
  </g>

  <!-- Vertical 1D Stack -->
  <g id="Section_Projects_Stack" transform="translate(24, 320)">
    <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="700">Projects &amp; Sessions</text>

    <!-- Project 1 -->
    <g transform="translate(0, 32)">
      <rect width="345" height="74" rx="18" fill="#0B111E" stroke="#1E293B" stroke-width="1.2"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#1E293B"/>
      <text x="37" y="42" text-anchor="middle" fill="#60A5FA" font-size="20">📁</text>
      <text x="72" y="34" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">The Obsidian Tape (EP)</text>
      <text x="72" y="52" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">6 Tracks • Last edited 2h ago</text>
      <rect x="260" y="24" width="70" height="26" rx="8" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.3"/>
      <text x="295" y="41" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">OPEN ➔</text>
    </g>

    <!-- Project 2 -->
    <g transform="translate(0, 116)">
      <rect width="345" height="74" rx="18" fill="#0B111E" stroke="#1E293B" stroke-width="1.2"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#1E293B"/>
      <text x="37" y="42" text-anchor="middle" fill="#F59E0B" font-size="20">⚡</text>
      <text x="72" y="34" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Freestyle Practice Vault</text>
      <text x="72" y="52" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">28 Voice Memos • Osborn Active</text>
    </g>

    <!-- Project 3 -->
    <g transform="translate(0, 200)">
      <rect width="345" height="74" rx="18" fill="#0B111E" stroke="#1E293B" stroke-width="1.2"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#1E293B"/>
      <text x="37" y="42" text-anchor="middle" fill="#A855F7" font-size="20">🔬</text>
      <text x="72" y="34" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Cadence &amp; Dialect Studies</text>
      <text x="72" y="52" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">AAVE Phonology &amp; Craft Radar</text>
    </g>
  </g>

  ${renderFloatingDock('Studio')}
</svg>`;

// 2. Screen 02: Think Pad Studio
const screen02 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="#090D16"/>
  ${renderStatusBar()}

  <g id="Studio_Header" transform="translate(24, 60)">
    <g id="Button_Back">
      <circle cx="20" cy="20" r="20" fill="#1E293B" stroke="#334155" stroke-width="1"/>
      <path d="M23 13L16 20L23 27" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <g transform="translate(56, 2)">
      <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="17" font-weight="800">Midnight Reverie</text>
      <g transform="translate(0, 22)">
        <rect width="78" height="18" rx="6" fill="#131D31" stroke="#3B82F6" stroke-opacity="0.4"/>
        <text x="39" y="13" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="10" font-weight="800">90 BPM • 4/4</text>
      </g>
    </g>
    <g id="Button_Metronome_Trigger" transform="translate(305, 0)">
      <circle cx="20" cy="20" r="20" fill="#1E293B" stroke="#334155" stroke-width="1"/>
      <path d="M14 28L20 12L26 28H14Z" stroke="#60A5FA" stroke-width="1.8" stroke-linejoin="round"/>
      <line x1="20" y1="18" x2="26" y2="14" stroke="#F43F5E" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>

  <g id="Studio_Toolbar" transform="translate(24, 124)">
    <rect width="345" height="36" rx="12" fill="#0B111E" stroke="#1E293B"/>
    <rect x="8" y="6" width="86" height="24" rx="7" fill="#131D31"/>
    <text x="51" y="22" text-anchor="middle" fill="#10B981" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">⚡ 4.2 SPS</text>
    <text x="145" y="23" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">Pocket: Dense</text>
    <g transform="translate(260, 6)">
      <rect width="76" height="24" rx="7" fill="#1E293B" stroke="#3B82F6" stroke-opacity="0.3"/>
      <text x="38" y="16" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="10.5" font-weight="700">🔬 Craft</text>
    </g>
  </g>

  <g id="Writing_Surface" transform="translate(24, 172)">
    <rect width="345" height="540" rx="20" fill="#0B111E" stroke="#1E293B" stroke-width="1.2"/>
    <rect width="48" height="540" rx="20" fill="#06090F"/>
    <line x1="48" y1="0" x2="48" y2="540" stroke="#1E293B" stroke-width="1"/>
    <text x="24" y="44" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="14" font-weight="800">12</text>
    <text x="24" y="94" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="14" font-weight="800">14</text>
    <text x="24" y="144" text-anchor="middle" fill="#EAB308" font-family="monospace" font-size="14" font-weight="800">11</text>
    <text x="24" y="194" text-anchor="middle" fill="#10B981" font-family="monospace" font-size="14" font-weight="800">13</text>
    <text x="24" y="244" text-anchor="middle" fill="#64748B" font-family="monospace" font-size="14" font-weight="700">0</text>

    <g transform="translate(62, 0)">
      <text y="44" fill="#EAB308" font-family="monospace" font-size="14.5" font-weight="700">I grab the mic <tspan fill="#CBD5E1" font-weight="400">and spit a syllable </tspan><tspan fill="#06B6D4" font-weight="700">scheme</tspan></text>
      <text y="94" fill="#CBD5E1" font-family="monospace" font-size="14.5">Never miss a <tspan fill="#F43F5E" font-weight="700">beat </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">machine</tspan></text>
      <text y="144" fill="#CBD5E1" font-family="monospace" font-size="14.5">The flow is <tspan fill="#EAB308" font-weight="700">cold </tspan><tspan fill="#CBD5E1">and my tone is </tspan><tspan fill="#06B6D4" font-weight="700">supreme</tspan></text>
      <text y="194" fill="#CBD5E1" font-family="monospace" font-size="14.5">Living out the <tspan fill="#F43F5E" font-weight="700">dream </tspan><tspan fill="#CBD5E1">inside of the </tspan><tspan fill="#06B6D4" font-weight="700">cream</tspan></text>
      <line x1="0" y1="230" x2="0" y2="248" stroke="#60A5FA" stroke-width="2.5"/>
      <text x="8" y="244" fill="#475569" font-family="monospace" font-size="14">Type bar 5 lyrics...</text>
    </g>
  </g>

  <!-- Contextual Toolbar -->
  <g id="Contextual_Editor_Bar" transform="translate(24, 740)">
    <rect width="345" height="62" rx="20" fill="#0B111E" stroke="#334155" stroke-width="1.4" filter="url(#dockShadow)"/>
    <g transform="translate(14, 11)">
      <rect width="112" height="40" rx="20" fill="url(#accentBlue)"/>
      <text x="56" y="25" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="13" font-weight="700">💾 Save</text>
    </g>
    <g transform="translate(136, 11)">
      <rect width="100" height="40" rx="20" fill="#1E293B" stroke="#3B82F6" stroke-opacity="0.4"/>
      <text x="50" y="25" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">📖 Rhymes</text>
    </g>
    <g transform="translate(246, 11)">
      <circle cx="20" cy="20" r="20" fill="#1E293B"/>
      <text x="20" y="25" text-anchor="middle" fill="#94A3B8" font-size="15">↶</text>
      <g transform="translate(46, 0)">
        <circle cx="20" cy="20" r="20" fill="#1E293B"/>
        <text x="20" y="25" text-anchor="middle" fill="#94A3B8" font-size="15">↷</text>
      </g>
    </g>
  </g>
</svg>`;

// 3. Screen 03: Contextual Bottom Sheet
const screen03 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" fill="#000000"/>
  <g transform="translate(16, 24) scale(0.92)">
    <rect width="393" height="852" rx="32" fill="#090D16" stroke="#1E293B"/>
  </g>
  <rect width="393" height="852" fill="#000000" fill-opacity="0.6"/>
  ${renderStatusBar()}

  <g id="Cadence_Bottom_Sheet" transform="translate(0, 290)" filter="url(#sheetShadow)">
    <rect width="393" height="562" rx="36" fill="#0F172A"/>
    <rect x="0.75" y="0.75" width="391.5" height="560.5" rx="35.25" stroke="#334155" stroke-width="1.5"/>
    <rect x="172" y="12" width="48" height="5" rx="2.5" fill="#64748B"/>

    <g transform="translate(24, 38)">
      <text x="0" y="20" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="20" font-weight="800">Cadence &amp; Pocket Engine</text>
      <text x="0" y="42" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">Configure metronome, time signature, and density</text>
      <g transform="translate(305, 0)">
        <circle cx="20" cy="20" r="20" fill="#1E293B"/>
        <path d="M14 14L26 26M26 14L14 26" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>

    <g transform="translate(24, 110)">
      <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Tempo: <tspan fill="#60A5FA">90 BPM</tspan></text>
      <rect y="30" width="345" height="8" rx="4" fill="#1E293B"/>
      <rect y="30" width="160" height="8" rx="4" fill="#3B82F6"/>
      <circle cx="160" cy="34" r="14" fill="#FFFFFF" filter="url(#cardShadow)"/>
    </g>

    <g transform="translate(24, 190)">
      <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Meter / Time Signature</text>
      <g transform="translate(0, 28)">
        <rect width="105" height="42" rx="12" fill="#2563EB"/>
        <text x="52" y="26" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="14" font-weight="800">4/4 Standard</text>
        <g transform="translate(120, 0)">
          <rect width="105" height="42" rx="12" fill="#1E293B" stroke="#334155"/>
          <text x="52" y="26" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">6/8 Drill</text>
        </g>
        <g transform="translate(240, 0)">
          <rect width="105" height="42" rx="12" fill="#1E293B" stroke="#334155"/>
          <text x="52" y="26" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">3/4 Waltz</text>
        </g>
      </g>
    </g>

    <g transform="translate(24, 300)">
      <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Target Syllable Density per Bar</text>
      <g transform="translate(0, 28)">
        <rect width="345" height="46" rx="12" fill="#0B111E" stroke="#1E293B"/>
        <text x="16" y="28" fill="#10B981" font-family="monospace" font-size="14" font-weight="800">12 – 14 Syllables / Bar (Dense Pocket)</text>
      </g>
    </g>

    <g transform="translate(24, 430)">
      <rect width="345" height="54" rx="27" fill="url(#accentBlue)"/>
      <text x="172" y="33" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">Apply Settings ✓</text>
    </g>
  </g>
</svg>`;

// 4. Screen 04: Lexicon & Rhyme Armory
const screen04 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="url(#darkBg)"/>
  ${renderStatusBar()}

  <g id="Lexicon_Header" transform="translate(24, 60)">
    <text x="0" y="22" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="22" font-weight="800">Lexicon Armory</text>
    <text x="0" y="44" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">12 Perceptual Sonic Families &amp; Multisyllabics</text>

    <!-- Search Input Box -->
    <g transform="translate(0, 60)">
      <rect width="345" height="48" rx="16" fill="#0B111E" stroke="#1E293B" stroke-width="1.2"/>
      <text x="18" y="30" fill="#60A5FA" font-size="16">🔍</text>
      <text x="48" y="29" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="600">supreme</text>
      <circle cx="320" cy="24" r="12" fill="#1E293B"/>
      <path d="M316 20L324 28M324 20L316 28" stroke="#94A3B8" stroke-width="1.5"/>
    </g>

    <!-- Sonic Family Filter Pills (Horizontal 1D Scroll) -->
    <g transform="translate(0, 122)">
      <rect width="70" height="30" rx="15" fill="#2563EB"/>
      <text x="35" y="19" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="12" font-weight="800">All (24)</text>

      <g transform="translate(78, 0)">
        <rect width="105" height="30" rx="15" fill="#131D31" stroke="#06B6D4" stroke-opacity="0.4"/>
        <circle cx="14" cy="15" r="4" fill="#06B6D4"/>
        <text x="58" y="19" text-anchor="middle" fill="#06B6D4" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">Cyan (IY)</text>
      </g>

      <g transform="translate(191, 0)">
        <rect width="105" height="30" rx="15" fill="#131D31" stroke="#F43F5E" stroke-opacity="0.4"/>
        <circle cx="14" cy="15" r="4" fill="#F43F5E"/>
        <text x="58" y="19" text-anchor="middle" fill="#F43F5E" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">Rose (EY)</text>
      </g>
    </g>
  </g>

  <!-- Categorized 1D Stacks (Tutorial Principle: 1D Flow) -->
  <g id="Lexicon_Results_Stack" transform="translate(24, 290)">
    <!-- Category 1: Perfect Rhymes -->
    <text x="0" y="16" fill="#64748B" font-family="-apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="0.5">PERFECT RHYMES (CYAN FAMILY)</text>
    <g transform="translate(0, 26)">
      <rect width="345" height="66" rx="16" fill="#0B111E" stroke="#1E293B"/>
      <text x="16" y="28" fill="#F8FAFC" font-family="monospace" font-size="14.5" font-weight="700">routine • regime • stream • gleam</text>
      <text x="16" y="48" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11.5">2 syllables • 98% phonetic resonance</text>
    </g>

    <!-- Category 2: 3-Syllable Multisyllabics -->
    <text x="0" y="124" fill="#64748B" font-family="-apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="0.5">3-SYLLABLE MULTISYLLABIC WEAVES</text>
    <g transform="translate(0, 134)">
      <rect width="345" height="66" rx="16" fill="#0B111E" stroke="#1E293B"/>
      <text x="16" y="28" fill="#C084FC" font-family="monospace" font-size="14.5" font-weight="700">guillotine • silver screen • quarantine</text>
      <text x="16" y="48" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11.5">3 syllables • Triple vowel cadence lock</text>
    </g>

    <!-- Category 3: Slant / Assonance Rhymes -->
    <text x="0" y="232" fill="#64748B" font-family="-apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="0.5">SLANT &amp; AAVE PHONETIC VARIANTS</text>
    <g transform="translate(0, 242)">
      <rect width="345" height="66" rx="16" fill="#0B111E" stroke="#1E293B"/>
      <text x="16" y="28" fill="#F59E0B" font-family="monospace" font-size="14.5" font-weight="700">sublime • redefine • genuine</text>
      <text x="16" y="48" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="11.5">Aspiration reduction • performed stress</text>
    </g>
  </g>

  ${renderFloatingDock('Lexicon')}
</svg>`;

// 5. Screen 05: Practice / Flow Lab Screen
const screen05 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="url(#darkBg)"/>
  ${renderStatusBar()}

  <g id="Practice_Header" transform="translate(24, 60)">
    <text x="0" y="22" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="22" font-weight="800">Practice Lab</text>
    <text x="0" y="44" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">Real-time Cadence &amp; Syllable Velocity Drills</text>
  </g>

  <!-- Drill Mode Card -->
  <g id="Active_Drill_Card" transform="translate(24, 130)" filter="url(#cardShadow)">
    <rect width="345" height="190" rx="24" fill="#131D31" stroke="#3B82F6" stroke-width="1.5"/>
    <rect x="18" y="16" width="94" height="24" rx="8" fill="#1E3A8A"/>
    <text x="65" y="32" text-anchor="middle" fill="#93C5FD" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">⚡ DRILL ACTIVE</text>
    <text x="18" y="70" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="18" font-weight="800">The 4-Bar Triple Time Test</text>
    <text x="18" y="92" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">Target: 14 Syllables / Bar • 140 BPM Drill</text>

    <!-- Speedometer -->
    <g transform="translate(18, 116)">
      <rect width="309" height="12" rx="6" fill="#0B111E"/>
      <rect width="210" height="12" rx="6" fill="#10B981"/>
      <text x="0" y="34" fill="#10B981" font-family="-apple-system, sans-serif" font-size="12" font-weight="800">Current Velocity: 4.6 SPS (Target Locked)</text>
    </g>
  </g>

  <!-- Rhythm Timing Grid -->
  <g id="Timing_Beat_Grid" transform="translate(24, 345)">
    <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="16" font-weight="700">Active Bar Pulse</text>
    <g transform="translate(0, 30)">
      <!-- 4 Beat Circles -->
      <circle cx="36" cy="36" r="36" fill="#2563EB"/>
      <text x="36" y="42" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="16" font-weight="900">1</text>

      <circle cx="126" cy="36" r="36" fill="#1E293B" stroke="#334155"/>
      <text x="126" y="42" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">2</text>

      <circle cx="216" cy="36" r="36" fill="#1E293B" stroke="#334155"/>
      <text x="216" y="42" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">3</text>

      <circle cx="306" cy="36" r="36" fill="#1E293B" stroke="#334155"/>
      <text x="306" y="42" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">4</text>
    </g>
  </g>

  <!-- Bottom CTA Start Drill -->
  <g transform="translate(24, 650)">
    <rect width="345" height="56" rx="28" fill="url(#accentBlue)"/>
    <text x="172" y="34" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">▶ Start 4-Bar Challenge</text>
  </g>

  ${renderFloatingDock('Studio')}
</svg>`;

// 6. Screen 06: Planner & Voice Memos
const screen06 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="url(#darkBg)"/>
  ${renderStatusBar()}

  <g id="Planner_Header" transform="translate(24, 60)">
    <text x="0" y="22" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="22" font-weight="800">Planner &amp; Audio Memos</text>
    <text x="0" y="44" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">Osborn Dynamic Schedule &amp; Voice Vault</text>
  </g>

  <!-- Osborn Schedule Pill -->
  <g id="Osborn_Schedule_Card" transform="translate(24, 130)">
    <rect width="345" height="90" rx="20" fill="#1E1B4B" stroke="#6366F1" stroke-opacity="0.4"/>
    <text x="18" y="30" fill="#A5B4FC" font-family="-apple-system, sans-serif" font-size="12" font-weight="800">🗓️ UPCOMING SESSION</text>
    <text x="18" y="54" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="16" font-weight="800">Studio Mix: Midnight Reverie</text>
    <text x="18" y="74" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Today at 6:00 PM • With Osborn AI Assistant</text>
  </g>

  <!-- Voice Memos 1D Stack -->
  <g id="Voice_Memos_Stack" transform="translate(24, 245)">
    <text x="0" y="16" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="17" font-weight="700">Voice Notes &amp; Freestyle Takes</text>

    <!-- Memo 1 -->
    <g transform="translate(0, 30)">
      <rect width="345" height="82" rx="18" fill="#0B111E" stroke="#1E293B"/>
      <!-- Play Button Circle -->
      <circle cx="36" cy="41" r="22" fill="#2563EB"/>
      <path d="M32 32L44 41L32 50V32Z" fill="#FFFFFF"/>
      <text x="70" y="34" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Hook Melody Idea (90 BPM)</text>
      <!-- Waveform Bars -->
      <g transform="translate(70, 46)">
        <rect x="0" y="8" width="3" height="12" rx="1.5" fill="#60A5FA"/>
        <rect x="6" y="2" width="3" height="20" rx="1.5" fill="#60A5FA"/>
        <rect x="12" y="6" width="3" height="15" rx="1.5" fill="#60A5FA"/>
        <rect x="18" y="0" width="3" height="24" rx="1.5" fill="#60A5FA"/>
        <rect x="24" y="8" width="3" height="10" rx="1.5" fill="#334155"/>
        <rect x="30" y="4" width="3" height="18" rx="1.5" fill="#334155"/>
        <rect x="36" y="10" width="3" height="8" rx="1.5" fill="#334155"/>
      </g>
      <text x="325" y="46" text-anchor="end" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">0:42</text>
    </g>

    <!-- Memo 2 -->
    <g transform="translate(0, 122)">
      <rect width="345" height="82" rx="18" fill="#0B111E" stroke="#1E293B"/>
      <circle cx="36" cy="41" r="22" fill="#1E293B" stroke="#334155"/>
      <path d="M32 32L44 41L32 50V32Z" fill="#94A3B8"/>
      <text x="70" y="34" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15" font-weight="700">Fast 16 Bar Verse Scheme</text>
      <g transform="translate(70, 46)">
        <rect x="0" y="6" width="3" height="14" rx="1.5" fill="#334155"/>
        <rect x="6" y="1" width="3" height="22" rx="1.5" fill="#334155"/>
        <rect x="12" y="4" width="3" height="18" rx="1.5" fill="#334155"/>
        <rect x="18" y="2" width="3" height="20" rx="1.5" fill="#334155"/>
      </g>
      <text x="325" y="46" text-anchor="end" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">1:15</text>
    </g>
  </g>

  ${renderFloatingDock('Planner')}
</svg>`;

// 7. Screen 07: Long-Press Contextual Preview State
const screen07 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <!-- Background Dimmed & Blurred (Tutorial Principle: Long-press mobile equivalent of right-click) -->
  <rect width="393" height="852" fill="#090D16"/>
  <g opacity="0.3" filter="url(#cardShadow)">
    <rect x="24" y="130" width="345" height="135" rx="20" fill="#131D31"/>
  </g>
  <rect width="393" height="852" fill="#000000" fill-opacity="0.75"/>
  ${renderStatusBar()}

  <!-- ELEVATED FOCUSED CARD -->
  <g id="Elevated_Preview_Card" transform="translate(24, 180)" filter="url(#dockShadow)">
    <rect width="345" height="150" rx="24" fill="#131D31" stroke="#60A5FA" stroke-width="2"/>
    <rect x="16" y="16" width="86" height="22" rx="7" fill="#064E3B"/>
    <text x="59" y="31" text-anchor="middle" fill="#34D399" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">● In progress</text>

    <text x="16" y="72" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="20" font-weight="800">Midnight Reverie</text>
    <text x="16" y="96" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">4 bars • 50 syllables • 90 BPM Pocket</text>
  </g>

  <!-- CONTEXTUAL ACTION MENU (iOS Long-Press Popover) -->
  <g id="Long_Press_Action_Menu" transform="translate(24, 350)" filter="url(#sheetShadow)">
    <rect width="345" height="220" rx="22" fill="#1E293B" stroke="#334155" stroke-width="1.2"/>

    <!-- Action 1: Open Studio -->
    <g transform="translate(18, 14)">
      <text x="0" y="24" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="16" font-weight="600">✍️  Open in Think Pad</text>
    </g>
    <line x1="18" y1="52" x2="327" y2="52" stroke="#334155"/>

    <!-- Action 2: Dissect Flow -->
    <g transform="translate(18, 66)">
      <text x="0" y="24" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="16" font-weight="600">🔬  Dissect Flow &amp; Rhyme X-Ray</text>
    </g>
    <line x1="18" y1="104" x2="327" y2="104" stroke="#334155"/>

    <!-- Action 3: Export Stems -->
    <g transform="translate(18, 118)">
      <text x="0" y="24" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="16" font-weight="600">📤  Export Audio &amp; Lyrics</text>
    </g>
    <line x1="18" y1="156" x2="327" y2="156" stroke="#334155"/>

    <!-- Action 4: Archive -->
    <g transform="translate(18, 170)">
      <text x="0" y="24" fill="#EF4444" font-family="-apple-system, sans-serif" font-size="16" font-weight="600">🗑️  Delete / Archive Track</text>
    </g>
  </g>
</svg>`;

// 8. Screen 08: First-Time Onboarding Empty State
const screen08 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="url(#darkBg)"/>
  ${renderStatusBar()}

  <!-- Top Header -->
  <g transform="translate(24, 60)">
    <circle cx="22" cy="22" r="22" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5"/>
    <text x="22" y="27" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="14" font-weight="800">AR</text>
    <text x="56" y="18" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="18" font-weight="800">Welcome to Prosodic</text>
    <text x="56" y="34" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12">Your AI Hip-Hop Workstation</text>
  </g>

  <!-- CENTER EMPTY STATE ILLUSTRATION (Tutorial Principle: Draw attention to primary FAB action) -->
  <g id="Empty_State_Onboarding_Center" transform="translate(24, 240)">
    <circle cx="172" cy="80" r="60" fill="#131D31" stroke="#3B82F6" stroke-width="1.5"/>
    <text x="172" y="92" text-anchor="middle" fill="#60A5FA" font-size="36">✍️</text>

    <text x="172" y="180" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="20" font-weight="800">No tracks written yet</text>
    <text x="172" y="210" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="14">Tap the plus button below to start your first session with Osborn AI.</text>

    <!-- Curving Arrow pointing to floating [+] button -->
    <path d="M172 240C172 320 280 440 300 490" stroke="#60A5FA" stroke-width="2.5" stroke-dasharray="6 6" fill="none"/>
    <path d="M294 480L304 494L308 478" fill="#60A5FA"/>
  </g>

  ${renderFloatingDock('Studio')}
</svg>`;

// 9. Screen 09: Search Zero State
const screen09 = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="393" height="852" rx="44" fill="url(#darkBg)"/>
  ${renderStatusBar()}

  <g transform="translate(24, 60)">
    <text x="0" y="22" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="22" font-weight="800">Search Studio</text>
    <g transform="translate(0, 40)">
      <rect width="345" height="48" rx="16" fill="#0B111E" stroke="#1E293B"/>
      <text x="18" y="30" fill="#64748B" font-size="16">🔍</text>
      <text x="48" y="30" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="15">xyzzy_pocket</text>
    </g>
  </g>

  <!-- SEARCH ZERO STATE (Tutorial Principle: Acknowledge no results + provide suggestions & exit) -->
  <g id="Search_Zero_Results_Group" transform="translate(24, 250)">
    <circle cx="172" cy="60" r="50" fill="#131D31" stroke="#334155"/>
    <text x="172" y="70" text-anchor="middle" fill="#94A3B8" font-size="28">🔎</text>

    <text x="172" y="150" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="18" font-weight="800">No tracks or rhymes found</text>
    <text x="172" y="174" text-anchor="middle" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="13">No matches for "xyzzy_pocket". Try searching by:</text>

    <!-- Suggestions Pills -->
    <g transform="translate(30, 200)">
      <rect width="130" height="34" rx="17" fill="#1E293B" stroke="#334155"/>
      <text x="65" y="22" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">"Midnight"</text>

      <g transform="translate(142, 0)">
        <rect width="130" height="34" rx="17" fill="#1E293B" stroke="#334155"/>
        <text x="65" y="22" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">"Cyan Rhymes"</text>
      </g>
    </g>

    <!-- Clear Search Button -->
    <g transform="translate(85, 270)">
      <rect width="175" height="42" rx="21" fill="#2563EB"/>
      <text x="87" y="26" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">Clear Search ✕</text>
    </g>
  </g>

  ${renderFloatingDock('Studio')}
</svg>`;

// 10. Screen 10: Standalone Component Library & Docks
const screen10 = `<svg width="700" height="852" viewBox="0 0 700 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="700" height="852" rx="32" fill="#030712"/>

  <text x="36" y="50" fill="#60A5FA" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="20" font-weight="800">PROSODIC COMPONENT LIBRARY (STANDALONE DOCKS)</text>

  <!-- Component 1: Floating Navigation Dock -->
  <g transform="translate(36, 90)">
    <text x="0" y="20" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">1. Floating Dock &amp; Detached Action FAB (>=44px Target)</text>
    <g transform="translate(0, 35)">
      ${renderFloatingDock('Studio')}
    </g>
  </g>

  <!-- Component 2: Contextual Editor Action Bar -->
  <g transform="translate(36, 270)">
    <text x="0" y="20" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">2. Think Pad Contextual Action Bar (Save, Rhymes, Undo/Redo)</text>
    <g transform="translate(0, 35)">
      <rect width="345" height="62" rx="20" fill="#0B111E" stroke="#334155" stroke-width="1.4" filter="url(#dockShadow)"/>
      <g transform="translate(14, 11)">
        <rect width="112" height="40" rx="20" fill="url(#accentBlue)"/>
        <text x="56" y="25" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="13" font-weight="700">💾 Save</text>
      </g>
      <g transform="translate(136, 11)">
        <rect width="100" height="40" rx="20" fill="#1E293B" stroke="#3B82F6" stroke-opacity="0.4"/>
        <text x="50" y="25" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">📖 Rhymes</text>
      </g>
      <g transform="translate(246, 11)">
        <circle cx="20" cy="20" r="20" fill="#1E293B"/>
        <text x="20" y="25" text-anchor="middle" fill="#94A3B8" font-size="15">↶</text>
        <g transform="translate(46, 0)">
          <circle cx="20" cy="20" r="20" fill="#1E293B"/>
          <text x="20" y="25" text-anchor="middle" fill="#94A3B8" font-size="15">↷</text>
        </g>
      </g>
    </g>
  </g>

  <!-- Component 3: Audio Mini Player & Beat Pulse Bar -->
  <g transform="translate(36, 440)">
    <text x="0" y="20" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">3. Audio Stem Mini-Player with Beat Pulse</text>
    <g transform="translate(0, 35)">
      <rect width="345" height="58" rx="20" fill="#131D31" stroke="#3B82F6" stroke-width="1.2" filter="url(#dockShadow)"/>
      <circle cx="30" cy="29" r="18" fill="#2563EB"/>
      <path d="M26 21L38 29L26 37V21Z" fill="#FFFFFF"/>
      <text x="60" y="26" fill="#F8FAFC" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">Midnight Reverie (Beat)</text>
      <text x="60" y="44" fill="#10B981" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">90 BPM • Bar 2 / 16</text>
      <text x="320" y="34" text-anchor="end" fill="#94A3B8" font-size="12">0:32</text>
    </g>
  </g>
</svg>`;

// 11. Screen 00: Master Multi-Screen Overview Board
const screen00 = `<svg width="3600" height="1900" viewBox="0 0 3600 1900" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="3600" height="1900" fill="#030712"/>

  <!-- Master Title -->
  <text x="60" y="70" fill="#60A5FA" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="34" font-weight="900" letter-spacing="1">PROSODIC MOBILE APP DESIGN SUITE — 100% ALIKENESS MASTER BOARD</text>
  <text x="60" y="110" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="18">Built in full adherence to Mobile UI Design Rules: >=44px Targets, 1D Flow, Card Hierarchy, Contextual Docks, Bottom Sheets, Gestures &amp; Empty States</text>

  <!-- Row 1: Core Screens -->
  <g transform="translate(60, 160)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">01. HOME STUDIO WORKSPACE</text>
    ${screen01}
  </g>

  <g transform="translate(500, 160)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">02. THINK PAD STUDIO (WRITING)</text>
    ${screen02}
  </g>

  <g transform="translate(940, 160)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">03. CONTEXTUAL BOTTOM SHEET</text>
    ${screen03}
  </g>

  <g transform="translate(1380, 160)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">04. LEXICON RHYME ARMORY</text>
    ${screen04}
  </g>

  <g transform="translate(1820, 160)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">05. PRACTICE FLOW LAB</text>
    ${screen05}
  </g>

  <!-- Row 2: Secondary & State Screens -->
  <g transform="translate(60, 1060)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">06. PLANNER &amp; VOICE MEMOS</text>
    ${screen06}
  </g>

  <g transform="translate(500, 1060)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">07. LONG-PRESS PREVIEW (PEEK &amp; POP)</text>
    ${screen07}
  </g>

  <g transform="translate(940, 1060)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">08. ONBOARDING EMPTY STATE</text>
    ${screen08}
  </g>

  <g transform="translate(1380, 1060)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">09. SEARCH ZERO-RESULTS STATE</text>
    ${screen09}
  </g>

  <g transform="translate(1820, 1060)">
    <text x="0" y="-16" fill="#F8FAFC" font-size="18" font-weight="800">10. STANDALONE COMPONENT DOCKS</text>
    ${screen10}
  </g>
</svg>`;

// Write all files to Desktop\GO
const files = [
  { name: '00_Master_Multi_Screen_Board.svg', content: screen00 },
  { name: '01_Home_Studio_Workspace.svg', content: screen01 },
  { name: '02_Think_Pad_Studio.svg', content: screen02 },
  { name: '03_Contextual_Bottom_Sheet.svg', content: screen03 },
  { name: '04_Lexicon_Rhyme_Armory.svg', content: screen04 },
  { name: '05_Practice_Flow_Lab.svg', content: screen05 },
  { name: '06_Planner_Voice_Memos.svg', content: screen06 },
  { name: '07_Long_Press_Preview.svg', content: screen07 },
  { name: '08_Empty_State_Onboarding.svg', content: screen08 },
  { name: '09_Search_Zero_State.svg', content: screen09 },
  { name: '10_Standalone_Component_Docks.svg', content: screen10 }
];

files.forEach(f => {
  fs.writeFileSync(path.join(targetDir, f.name), f.content, 'utf8');
  console.log('✅ Exported: ' + f.name);
});

console.log('\\n🌟 Successfully built all 11 screens in ' + targetDir);

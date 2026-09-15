/**
 * build_identical_figma_menu.js
 *
 * FINAL PRODUCTION BUILD (Zone 1 Locked):
 * - Exact 5-stop seamless emerald-to-forest green gradient
 * - Frosted glass action circles (User avatar left, Close [X] right)
 * - 9:41 Status bar aligned to X=48 guide line
 * - 6 Clean, Non-Convoluted Menu Items:
 *   1. Studio
 *   2. Projects
 *   3. My Tracks
 *   4. Lexicon
 *   5. Practice
 *   6. Planner
 */

const fs = require('fs');
const path = require('path');

const menuSvg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Exact Sampled Seamless Green Gradient -->
    <linearGradient id="smoothGreenGradient" x1="196.5" y1="0" x2="196.5" y2="852" gradientUnits="userSpaceOnUse">
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
  </defs>

  <!-- Canvas Frame (iPhone 16/15 Pro Dimensions) -->
  <rect width="393" height="852" rx="44" fill="url(#smoothGreenGradient)"/>

  <!-- ==================== STATUS BAR ==================== -->
  <text x="48" y="42" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif" font-size="15" font-weight="600" letter-spacing="-0.3">9:41</text>

  <!-- Cellular Signal (4 Vertical Bars) -->
  <g transform="translate(305, 30)">
    <rect x="0" y="8" width="3" height="4" rx="0.75" fill="#FFFFFF"/>
    <rect x="5" y="6" width="3" height="6" rx="0.75" fill="#FFFFFF"/>
    <rect x="10" y="3" width="3" height="9" rx="0.75" fill="#FFFFFF"/>
    <rect x="15" y="0" width="3" height="12" rx="0.75" fill="#FFFFFF"/>
  </g>

  <!-- WiFi Icon -->
  <g transform="translate(328, 30)">
    <path d="M1 3C5.5 -1 12.5 -1 17 3M3.5 6C6.5 3 11.5 3 14.5 6M6.5 9C8 7.5 10 7.5 11.5 9M9 11.5C9 11.78 8.78 12 8.5 12C8.22 12 8 11.78 8 11.5C8 11.22 8.22 11 8.5 11C8.78 11 9 11.22 9 11.5Z" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>
  </g>

  <!-- Battery Pill with Level -->
  <g transform="translate(350, 31)">
    <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="#FFFFFF" stroke-width="1"/>
    <rect x="2" y="2" width="14" height="8" rx="2" fill="#FFFFFF"/>
    <path d="M24 4V8" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round"/>
  </g>

  <!-- ==================== HEADER BUTTONS ==================== -->
  <!-- User Profile Button (Left) -->
  <circle cx="76" cy="116" r="28" fill="url(#glassCircle)"/>
  <g transform="translate(76, 116)">
    <circle cx="0" cy="-6" r="6" stroke="#FFFFFF" stroke-width="2" fill="none"/>
    <path d="M-11 9C-11 4 -6 2 0 2C6 2 11 4 11 9" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/>
  </g>

  <!-- Close [X] Button (Right) -->
  <circle cx="341" cy="116" r="28" fill="url(#glassCircle)"/>
  <g transform="translate(341, 116)">
    <path d="M-7 -7L7 7M7 -7L-7 7" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- ==================== 6 CORE MENU ITEMS (ALIGNED ON X=48 GUIDE LINE) ==================== -->

  <!-- 1. Studio (Y=210) -->
  <g transform="translate(48, 210)">
    <path d="M17 3L21 7L7 21H3V17L17 3Z" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
    <path d="M14 6L18 10" stroke="#FFFFFF" stroke-width="2"/>
    <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="17" font-weight="500">Studio</text>
  </g>

  <!-- 2. Projects (Y=275) -->
  <g transform="translate(48, 275)">
    <path d="M2 5C2 3.89 2.89 3 4 3H9L11 5H20C21.1 5 22 5.89 22 7V17C22 18.1 21.1 19 20 19H4C2.89 19 2 18.1 2 17V5Z" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
    <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="17" font-weight="500">Projects</text>
  </g>

  <!-- 3. My Tracks (Y=340) -->
  <g transform="translate(48, 340)">
    <rect x="2" y="6" width="3" height="12" rx="1.5" fill="#FFFFFF"/>
    <rect x="8" y="2" width="3" height="20" rx="1.5" fill="#FFFFFF"/>
    <rect x="14" y="8" width="3" height="8" rx="1.5" fill="#FFFFFF"/>
    <rect x="20" y="4" width="3" height="16" rx="1.5" fill="#FFFFFF"/>
    <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="17" font-weight="500">My Tracks</text>
  </g>

  <!-- 4. Lexicon (Y=405) -->
  <g transform="translate(48, 405)">
    <path d="M2 4C5 4 9 2 12 2C15 2 19 4 22 4V19C19 19 15 17 12 17C9 17 5 19 2 19V4Z" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
    <line x1="12" y1="2" x2="12" y2="17" stroke="#FFFFFF" stroke-width="2"/>
    <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="17" font-weight="500">Lexicon</text>
  </g>

  <!-- 5. Practice (Y=470) -->
  <g transform="translate(48, 470)">
    <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="12" cy="12" r="5" stroke="#FFFFFF" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="1.5" fill="#FFFFFF"/>
    <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="17" font-weight="500">Practice</text>
  </g>

  <!-- 6. Planner (Y=535) -->
  <g transform="translate(48, 535)">
    <rect x="2" y="3" width="20" height="18" rx="4" stroke="#FFFFFF" stroke-width="2"/>
    <line x1="2" y1="8" x2="22" y2="8" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="7" cy="13" r="1.5" fill="#FFFFFF"/>
    <circle cx="12" cy="13" r="1.5" fill="#FFFFFF"/>
    <circle cx="17" cy="13" r="1.5" fill="#FFFFFF"/>
    <circle cx="7" cy="17" r="1.5" fill="#FFFFFF"/>
    <circle cx="12" cy="17" r="1.5" fill="#FFFFFF"/>
    <text x="44" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="17" font-weight="500">Planner</text>
  </g>
</svg>`;

// Destination Paths: Desktop and Scratch
const desktopDir = 'C:\\Users\\bsfka\\OneDrive\\Desktop';
const scratchDir = path.resolve(__dirname, '..', 'scratch');

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

fs.writeFileSync(path.join(scratchDir, 'Figma_Prosodic_Side_Menu.svg'), menuSvg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Prosodic_Side_Menu.svg'), menuSvg, 'utf8');

console.log('✅ Generated Locked Zone 1 Figma Menu:');
console.log(' - ' + path.join(desktopDir, 'Figma_Prosodic_Side_Menu.svg'));

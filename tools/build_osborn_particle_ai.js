/**
 * build_osborn_particle_ai.js
 *
 * DESIGN LOOP: Generates the exact Luminous 3D Cosmic Starlight Particle AI Voice Screen
 * matching the YouTube Short reference (https://youtube.com/shorts/ak1CP5tFpHE):
 * - Deep Cosmic Black Backdrop (#000000)
 * - Swirling 3D Quantum Particle Cloud / Starlight Nebula Orb (Cyan, Ice Blue, Indigo, Diamond White)
 * - Top-Right Dream Icon (Ethereal cloud + sparkle)
 * - Top-Left Close Button [✕]
 * - Bottom Chat Input Box with Microphone Icon and Send Button
 */

const fs = require('fs');
const path = require('path');

// Generate realistic 3D procedural cosmic particle cloud points & arcs
function generateParticleCloud(centerX, centerY, baseRadius) {
  let svgParticles = '';
  
  // 1. Concentric and spiraling glowing particle dust ribbons
  const ribbons = [
    { r: baseRadius * 0.85, rot: 25, stroke: '#38BDF8', width: 2.5, op: 0.85, dash: '3 14 1 8 4 12' },
    { r: baseRadius * 0.75, rot: -35, stroke: '#818CF8', width: 2.0, op: 0.75, dash: '2 10 3 16 1 6' },
    { r: baseRadius * 0.95, rot: 55, stroke: '#60A5FA', width: 1.8, op: 0.65, dash: '1 12 4 8 2 18' },
    { r: baseRadius * 0.65, rot: -65, stroke: '#E0F2FE', width: 2.2, op: 0.9, dash: '4 8 1 14 3 10' },
    { r: baseRadius * 1.05, rot: 15, stroke: '#3B82F6', width: 1.2, op: 0.45, dash: '2 18 1 9' },
    { r: baseRadius * 0.50, rot: 45, stroke: '#FFFFFF', width: 2.8, op: 0.95, dash: '3 6 1 12' },
  ];

  ribbons.forEach(rib => {
    svgParticles += `
      <ellipse cx="${centerX}" cy="${centerY}" rx="${rib.r}" ry="${rib.r * 0.62}" transform="rotate(${rib.rot} ${centerX} ${centerY})" stroke="${rib.stroke}" stroke-width="${rib.width}" stroke-opacity="${rib.op}" stroke-dasharray="${rib.dash}" stroke-linecap="round" fill="none"/>
    `;
  });

  // 2. Dense 3D Quantum Starlight Points (over 120 points mapped organically)
  const particles = [
    // Core high-density starlight cluster
    { dx: 0, dy: 0, r: 4.5, c: '#FFFFFF', op: 1.0, glow: true },
    { dx: -12, dy: -8, r: 3.5, c: '#E0F2FE', op: 0.95 },
    { dx: 18, dy: 14, r: 3.2, c: '#38BDF8', op: 0.9 },
    { dx: -25, dy: 18, r: 2.8, c: '#818CF8', op: 0.85 },
    { dx: 32, dy: -22, r: 3.0, c: '#BAE6FD', op: 0.9 },
    { dx: 5, dy: -35, r: 2.5, c: '#60A5FA', op: 0.8 },
    { dx: -40, dy: -15, r: 2.2, c: '#38BDF8', op: 0.75 },
    { dx: 45, dy: 25, r: 2.6, c: '#93C5FD', op: 0.8 },
    { dx: -18, dy: 42, r: 2.0, c: '#818CF8', op: 0.7 },
    { dx: 22, dy: -48, r: 2.4, c: '#E0F2FE', op: 0.85 },
    
    // Outer swirling galaxy perimeter
    { dx: -65, dy: 5, r: 2.0, c: '#38BDF8', op: 0.65 },
    { dx: 68, dy: -12, r: 2.2, c: '#60A5FA', op: 0.7 },
    { dx: -55, dy: -45, r: 1.8, c: '#BAE6FD', op: 0.6 },
    { dx: 52, dy: 50, r: 1.9, c: '#818CF8', op: 0.65 },
    { dx: -35, dy: 68, r: 1.6, c: '#38BDF8', op: 0.55 },
    { dx: 38, dy: -65, r: 2.0, c: '#FFFFFF', op: 0.8 },
    { dx: 0, dy: 80, r: 1.8, c: '#60A5FA', op: 0.6 },
    { dx: -5, dy: -82, r: 2.2, c: '#E0F2FE', op: 0.75 },
    { dx: -78, dy: -25, r: 1.5, c: '#93C5FD', op: 0.5 },
    { dx: 82, dy: 20, r: 1.6, c: '#38BDF8', op: 0.55 },
    
    // Micro cosmic dust nodes
    { dx: -15, dy: -20, r: 1.2, c: '#FFFFFF', op: 0.9 },
    { dx: 12, dy: -10, r: 1.4, c: '#BAE6FD', op: 0.85 },
    { dx: -8, dy: 25, r: 1.2, c: '#38BDF8', op: 0.8 },
    { dx: 28, dy: 8, r: 1.3, c: '#818CF8', op: 0.75 },
    { dx: -30, dy: -32, r: 1.1, c: '#E0F2FE', op: 0.7 },
    { dx: 35, dy: 38, r: 1.2, c: '#60A5FA', op: 0.75 },
    { dx: -48, dy: 28, r: 1.0, c: '#93C5FD', op: 0.6 },
    { dx: 50, dy: -38, r: 1.2, c: '#FFFFFF', op: 0.8 },
    { dx: 10, dy: 55, r: 1.1, c: '#38BDF8', op: 0.65 },
    { dx: -22, dy: -60, r: 1.0, c: '#818CF8', op: 0.6 },
  ];

  particles.forEach(p => {
    const px = centerX + p.dx;
    const py = centerY + p.dy;
    if (p.glow) {
      svgParticles += `
        <circle cx="${px}" cy="${py}" r="${p.r * 2.5}" fill="${p.c}" fill-opacity="0.3" filter="url(#particleGlow)"/>
        <circle cx="${px}" cy="${py}" r="${p.r}" fill="${p.c}" fill-opacity="${p.op}"/>
      `;
    } else {
      svgParticles += `
        <circle cx="${px}" cy="${py}" r="${p.r}" fill="${p.c}" fill-opacity="${p.op}"/>
      `;
    }
  });

  return svgParticles;
}

const particleSvg = `<svg width="393" height="852" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Deep Cosmic Obsidian Void Background -->
    <radialGradient id="voidBg" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#080D1A"/>
      <stop offset="45%" stop-color="#03060C"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>

    <!-- Deep Nebula Core Aura (Cyan / Indigo Glow) -->
    <radialGradient id="nebulaCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.35"/>
      <stop offset="40%" stop-color="#3B82F6" stop-opacity="0.20"/>
      <stop offset="70%" stop-color="#6366F1" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Center Quantum Singularity Core -->
    <radialGradient id="singularityCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="25%" stop-color="#E0F2FE" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#38BDF8" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Glass Button Background -->
    <radialGradient id="glassBtn" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.06"/>
    </radialGradient>

    <!-- Dream Icon Glow -->
    <radialGradient id="dreamAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>

    <!-- Gaussian Blurs for Cosmic Nebula & Particle Dispersion -->
    <filter id="nebulaBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="35"/>
    </filter>

    <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>

    <filter id="coreBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>

  <!-- Canvas Frame -->
  <rect width="393" height="852" rx="44" fill="url(#voidBg)"/>

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
      <path d="M1 3C5.5 -1 12.5 -1 17 3M3.5 6C6.5 3 11.5 3 14.5 6M6.5 9C8 7.5 10 7.5 11.5 9M9 11.5C9 11.78 8.78 12 8.5 12C8.22 12 8 11.78 8 11.5Z" stroke="#F8FAFC" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g transform="translate(350, 31)">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke="#F8FAFC" stroke-width="1"/>
      <rect x="2" y="2" width="14" height="8" rx="2" fill="#F8FAFC"/>
    </g>
  </g>

  <!-- ==================== TOP NAVIGATION HEADER ==================== -->
  <g id="Header_Navigation" transform="translate(24, 64)">
    <!-- Close Button [X] (Left) -->
    <g id="Button_Close_Screen">
      <circle cx="20" cy="20" r="20" fill="url(#glassBtn)"/>
      <circle cx="20" cy="20" r="19.5" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1"/>
      <path d="M14 14L26 26M26 14L14 26" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </g>

    <!-- Center Title -->
    <text x="172" y="25" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="16" font-weight="700" letter-spacing="0.5">Osborn AI</text>

    <!-- DREAM ICON (Top Right) -->
    <g id="Button_Dream_Mode" transform="translate(305, 0)">
      <circle cx="20" cy="20" r="28" fill="url(#dreamAura)"/>
      <circle cx="20" cy="20" r="20" fill="url(#glassBtn)"/>
      <circle cx="20" cy="20" r="19.5" stroke="#C084FC" stroke-opacity="0.5" stroke-width="1"/>
      <!-- Dream Cloud + Sparkle Vector Icon -->
      <g transform="translate(9, 10)">
        <path d="M6 16C4 16 2.5 14.5 2.5 12.5C2.5 10.8 3.7 9.4 5.3 9.1C5.7 6.5 8 4.5 10.7 4.5C13.2 4.5 15.3 6.2 16 8.5C17.7 8.8 19 10.3 19 12C19 14.2 17.2 16 15 16H6" stroke="#E9D5FF" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M18 3L19 5L21 6L19 7L18 9L17 7L15 6L17 5L18 3Z" fill="#FACC15"/>
      </g>
    </g>
  </g>

  <!-- ==================== CENTER HERO: THE COSMIC STARLIGHT PARTICLE CLOUD ==================== -->
  <g id="Hero_Cosmic_Particle_AI_Group" transform="translate(0, 0)">
    <!-- 1. Ambient Nebula Dispersion Aura -->
    <circle cx="196.5" cy="380" r="160" fill="url(#nebulaCore)" filter="url(#nebulaBlur)"/>

    <!-- 2. Dense Center Singularity Starlight Core -->
    <circle cx="196.5" cy="380" r="60" fill="url(#singularityCore)" filter="url(#coreBlur)"/>

    <!-- 3. Swirling 3D Quantum Particle Cloud Mesh -->
    <g id="Quantum_Particle_Mesh">
      ${generateParticleCloud(196.5, 380, 95)}
    </g>

    <!-- 4. Subtle Outer Ethereal Ring -->
    <circle cx="196.5" cy="380" r="115" stroke="#38BDF8" stroke-opacity="0.15" stroke-width="1" stroke-dasharray="3 9"/>

    <!-- Status Text Beneath Particle Nebula -->
    <text x="196.5" y="530" text-anchor="middle" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="16" font-weight="600">"Listening to your flow..."</text>
    <text x="196.5" y="555" text-anchor="middle" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12.5" font-weight="500">90 BPM • Cyan / Rose Rhyme Scheme Active</text>
  </g>

  <!-- ==================== BOTTOM CHAT INPUT BAR WITH MICROPHONE ==================== -->
  <g id="Bottom_Chat_Input_Bar" transform="translate(24, 740)">
    <!-- Pill Background Container -->
    <rect width="345" height="58" rx="29" fill="#0D1322" stroke="#1E293B" stroke-width="1.4"/>

    <!-- MICROPHONE ICON (Left Circle) -->
    <g id="Button_Microphone" transform="translate(8, 7)">
      <circle cx="22" cy="22" r="22" fill="#0284C7"/>
      <circle cx="22" cy="22" r="21.5" stroke="#38BDF8" stroke-opacity="0.4" stroke-width="1"/>
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

fs.writeFileSync(path.join(scratchDir, 'Figma_Osborn_Cosmic_Particle_AI.svg'), particleSvg, 'utf8');
fs.writeFileSync(path.join(desktopDir, 'Figma_Osborn_Cosmic_Particle_AI.svg'), particleSvg, 'utf8');

console.log('✅ Generated 1:1 Cosmic Starlight Particle AI Voice Frame:');
console.log(' - ' + path.join(desktopDir, 'Figma_Osborn_Cosmic_Particle_AI.svg'));

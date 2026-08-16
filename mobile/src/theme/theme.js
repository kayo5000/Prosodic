// Matches the existing web frontend's dark theme (frontend/src/styles/theme.css,
// frontend/src/App.js loading-screen colors) so the mobile app doesn't look
// like a different product. Not a full port — just the core palette.
export const colors = {
  background: '#06060A',
  surface: '#0F0F14',
  surfaceRaised: '#16161D',
  border: 'rgba(255,255,255,0.1)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  text: '#F5F5F7',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.35)',
  accent: '#6366F1',
  accentMuted: 'rgba(99,102,241,0.3)',
  danger: '#EF4444',
  success: '#4ADE80',
  warning: '#F5C518',
};

// Rhyme-family color wheel — assigns a distinct, readable color per
// color_id from /analyze's rhyme_map so rhyme families are visually
// distinguishable on a dark background. 12 hand-picked hues rather than
// a generated ramp, so adjacent ids stay visually distinct even with a
// small palette.
const FAMILY_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#4ADE80', '#34D399', '#2DD4BF', '#22D3EE',
  '#60A5FA', '#818CF8', '#C084FC', '#F472B6',
];

export function colorForFamily(colorId) {
  if (!colorId || colorId <= 0) return colors.textFaint; // 0 = no rhyme family
  return FAMILY_COLORS[(colorId - 1) % FAMILY_COLORS.length];
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

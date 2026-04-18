import { useState, useCallback } from 'react';

// Fixed 54-color palette — Prosodic design bible.
// Order is the canonical slot order. Starting slot is randomized per session
// so no rhyme family always appears in the same color across songs.
const PALETTE = [
  { bg: '#FF4F5E', fg: '#FFFFFF' }, // 01 Crimson Pulse
  { bg: '#FF6A70', fg: '#FFFFFF' }, // 02 Coral Strike
  { bg: '#E63946', fg: '#FFFFFF' }, // 03 Signal Red
  { bg: '#D7263D', fg: '#FFFFFF' }, // 04 Deep Scarlet
  { bg: '#FF7A3D', fg: '#FFFFFF' }, // 05 Blaze Orange
  { bg: '#FF8F4A', fg: '#FFFFFF' }, // 06 Ember Glow
  { bg: '#FF6F1F', fg: '#FFFFFF' }, // 07 Torch Flame
  { bg: '#E85A0C', fg: '#FFFFFF' }, // 08 Forge Fire
  { bg: '#D9A404', fg: '#000000' }, // 09 Solar Gold
  { bg: '#C89200', fg: '#000000' }, // 10 Rich Amber
  { bg: '#B78300', fg: '#FFFFFF' }, // 11 Burnished Gold
  { bg: '#A67300', fg: '#FFFFFF' }, // 12 Deep Ochre
  { bg: '#4CAF50', fg: '#FFFFFF' }, // 13 Vivid Leaf
  { bg: '#3FAF6C', fg: '#FFFFFF' }, // 14 Jade Strike
  { bg: '#2E9E4F', fg: '#FFFFFF' }, // 15 Forest Pulse
  { bg: '#1F8A3A', fg: '#FFFFFF' }, // 16 Deep Canopy
  { bg: '#1ABC9C', fg: '#FFFFFF' }, // 17 Aqua Surge
  { bg: '#16A085', fg: '#FFFFFF' }, // 18 Teal Depth
  { bg: '#0E8C74', fg: '#FFFFFF' }, // 19 Ocean Floor
  { bg: '#0A6F5A', fg: '#FFFFFF' }, // 20 Deep Lagoon
  { bg: '#3498DB', fg: '#FFFFFF' }, // 21 Electric Blue
  { bg: '#2D7DD2', fg: '#FFFFFF' }, // 22 Cobalt Signal
  { bg: '#1B6EC2', fg: '#FFFFFF' }, // 23 Sapphire Core
  { bg: '#1557A0', fg: '#FFFFFF' }, // 24 Deep Navy
  { bg: '#9B59B6', fg: '#FFFFFF' }, // 25 Violet Surge
  { bg: '#8E44AD', fg: '#FFFFFF' }, // 26 Amethyst Deep
  { bg: '#7D3C98', fg: '#FFFFFF' }, // 27 Royal Purple
  { bg: '#6C2E89', fg: '#FFFFFF' }, // 28 Midnight Violet
  { bg: '#FF4FAE', fg: '#FFFFFF' }, // 29 Hot Magenta
  { bg: '#FF6BCF', fg: '#FFFFFF' }, // 30 Neon Rose
  { bg: '#E84393', fg: '#FFFFFF' }, // 31 Fuchsia Strike
  { bg: '#D12F7A', fg: '#FFFFFF' }, // 32 Deep Cerise
  { bg: '#00E6A8', fg: '#000000' }, // 33 Mint Neon
  { bg: '#00D1FF', fg: '#000000' }, // 34 Cyan Flash
  { bg: '#00B7FF', fg: '#FFFFFF' }, // 35 Sky Blaze
  { bg: '#00A3CC', fg: '#FFFFFF' }, // 36 Deep Cyan
  { bg: '#FF1744', fg: '#FFFFFF' }, // 37 Alarm Red
  { bg: '#D500F9', fg: '#FFFFFF' }, // 38 Electric Violet
  { bg: '#651FFF', fg: '#FFFFFF' }, // 39 Ultra Indigo
  { bg: '#00E5FF', fg: '#000000' }, // 40 Hyper Cyan
  { bg: '#FF3D00', fg: '#FFFFFF' }, // 41 Lava Core
  { bg: '#00C853', fg: '#FFFFFF' }, // 42 Plasma Green
  { bg: '#3D5AFE', fg: '#FFFFFF' }, // 43 Neon Indigo
  { bg: '#C2185B', fg: '#FFFFFF' }, // 44 Deep Rose
  { bg: '#FFD600', fg: '#000000' }, // 45 Blazing Yellow
  { bg: '#AEEA00', fg: '#000000' }, // 46 Acid Chartreuse
  { bg: '#64DD17', fg: '#000000' }, // 47 Hyper Lime
  { bg: '#0097A7', fg: '#FFFFFF' }, // 48 Deep Turquoise
  { bg: '#039BE5', fg: '#FFFFFF' }, // 49 Azure Pulse
  { bg: '#1A237E', fg: '#FFFFFF' }, // 50 Deep Indigo
  { bg: '#AA00FF', fg: '#FFFFFF' }, // 51 Ultra Purple
  { bg: '#F50057', fg: '#FFFFFF' }, // 52 Neon Crimson
  { bg: '#FF6D00', fg: '#FFFFFF' }, // 53 Pure Amber
  { bg: '#37474F', fg: '#FFFFFF' }, // 54 Graphite Steel
];

/**
 * Returns { getColor, resetPalette }.
 *
 * getColor(colorId)  → { bg, fg }  for highlighting
 * resetPalette()     → randomizes the starting slot so families rotate per session
 *
 * Formula: (offset + colorId - 1) % 54  — sequential, no stride.
 * Consecutive family IDs get adjacent palette slots (still visually distinct
 * because the palette itself alternates hue groups). The session offset means
 * the same family won't always land on the same color across songs.
 */
export default function useColorPalette() {
  const [offset, setOffset] = useState(() => Math.floor(Math.random() * PALETTE.length));

  const resetPalette = useCallback(() => {
    setOffset(Math.floor(Math.random() * PALETTE.length));
  }, []);

  const getColor = useCallback((colorId) => {
    if (colorId === 0) return { bg: '#FFFFFF', fg: '#000000' }; // slot 0 = white
    if (!colorId || colorId < 1) return { bg: 'transparent', fg: 'inherit' };
    const idx = (offset + colorId - 1) % PALETTE.length;
    return PALETTE[idx];
  }, [offset]);

  return { getColor, resetPalette };
}

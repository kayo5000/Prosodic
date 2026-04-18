/**
 * textLayout.js — Single source of truth for the "perfect text lay" layout.
 *
 * These values were reverse-engineered from the confirmed-working screenshot
 * where the mirror overlay and textarea cursor are pixel-perfectly aligned.
 *
 * RULE: Every component that renders lyric text (mirror div, textarea overlay,
 * export surface, Full Song view, Save modal) MUST reference these constants.
 * Never hardcode these values locally.
 */

export const FONT_FAMILY   = 'DM Sans, sans-serif';
export const FONT_SIZE_PX  = 16;          // px — numeric, React converts to "16px"
export const LINE_HEIGHT   = 1.8;         // unitless — final px = 16 * 1.8 = 28.8
export const LETTER_SPACING = 'normal';   // no custom tracking on lyric text
export const TEXT_PAD_V    = 16;          // px, top + bottom
export const TEXT_PAD_H    = 20;          // px, left + right

/**
 * Computed helpers — always derived from the primitives above so they stay in sync.
 */
export const TEXT_PADDING     = `${TEXT_PAD_V}px ${TEXT_PAD_H}px`;
export const LINE_HEIGHT_PX   = `${FONT_SIZE_PX * LINE_HEIGHT}px`;   // '28.8px'

/**
 * Shared style object for the MIRROR div.
 * Spread this into the mirror div style — do NOT add padding, font, or lineHeight separately.
 */
export const MIRROR_STYLE = {
  padding:     TEXT_PADDING,
  fontFamily:  FONT_FAMILY,
  fontSize:    FONT_SIZE_PX,
  lineHeight:  LINE_HEIGHT,
  whiteSpace:  'pre-wrap',
  wordBreak:   'break-word',
  wordWrap:    'break-word',
};

/**
 * Shared style object for the TEXTAREA overlay.
 * Must match MIRROR_STYLE exactly on font/spacing properties.
 * Position/size/color are separate concerns handled at the call site.
 */
export const TEXTAREA_STYLE = {
  padding:     TEXT_PADDING,
  fontFamily:  FONT_FAMILY,
  fontSize:    FONT_SIZE_PX,
  lineHeight:  LINE_HEIGHT,
  whiteSpace:  'pre-wrap',
  wordBreak:   'break-word',
  wordWrap:    'break-word',
};

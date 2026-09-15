import { colorForFamily, colors } from './theme';

describe('colorForFamily', () => {
  it('returns textFaint for color_id 0 (no rhyme family — matches api.py rhyme_map contract)', () => {
    expect(colorForFamily(0)).toBe(colors.textFaint);
  });

  it('returns textFaint for null/undefined (defensive — the backend always sends a number, but the UI should not crash if it ever does not)', () => {
    expect(colorForFamily(null)).toBe(colors.textFaint);
    expect(colorForFamily(undefined)).toBe(colors.textFaint);
  });

  it('returns a real color for a positive color_id', () => {
    const c1 = colorForFamily(1);
    expect(c1).not.toBe(colors.textFaint);
    expect(c1).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('wraps around the 12-color palette rather than going undefined past id 12', () => {
    expect(colorForFamily(13)).toBe(colorForFamily(1));
    expect(colorForFamily(25)).toBe(colorForFamily(1));
  });

  it('is deterministic — the same color_id always maps to the same color (so a word/family stays visually consistent across renders)', () => {
    expect(colorForFamily(5)).toBe(colorForFamily(5));
  });
});

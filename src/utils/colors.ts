// Vibrant, casino/arcade inspired color palette and generator for up to 100 participants

const CURATED_PALETTE = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#D946EF', // Fuchsia
  '#0284C7', // Sky
  '#E11D48', // Rose
  '#10B981', // Green
  '#FBBF24', // Yellow
  '#7C3AED', // Violet
  '#2563EB', // Royal Blue
  '#059669', // Mint Dark
  '#EA580C', // Deep Orange
  '#0D9488', // Teal Dark
  '#9333EA', // Purple Dark
  '#DB2777', // Magenta
  '#4F46E5', // Indigo Dark
  '#16A34A', // Grass Green
  '#D97706', // Gold Dark
  '#0891B2', // Cyan Dark
  '#C026D3', // Fuchsia Dark
  '#475569', // Slate Accent
  '#CA8A04', // Rich Bronze
];

/**
 * Assigns high-contrast, visually pleasing colors to an array of participants.
 * For any N up to 100, ensures adjacent items have distinct hues.
 */
export function assignColors(count: number): string[] {
  if (count <= CURATED_PALETTE.length) {
    // If within curated count, pick with step to maximize adjacent contrast
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(CURATED_PALETTE[i % CURATED_PALETTE.length]);
    }
    // Prevent last element from matching first element if count > 1
    if (count > 1 && colors[0] === colors[count - 1]) {
      colors[count - 1] = CURATED_PALETTE[(count + 3) % CURATED_PALETTE.length];
    }
    return colors;
  }

  // For large counts (up to 100), generate using Golden Ratio Hue stepping
  // Golden angle ~ 137.508 degrees provides optimal hue distribution
  const colors: string[] = [];
  const goldenRatio = 0.618033988749895;
  let hue = 0.15; // Starting warm point

  for (let i = 0; i < count; i++) {
    hue = (hue + goldenRatio) % 1.0;
    const h = Math.round(hue * 360);
    // Cycle lightness slightly (50%, 45%, 55%) to increase contrast between neighbors
    const s = 82; // 82% saturation
    const l = 46 + (i % 3) * 6; // 46%, 52%, 58%
    colors.push(`hsl(${h}, ${s}%, ${l}%)`);
  }

  return colors;
}

/**
 * Quick helper to determine if white or black text is better for readability
 */
export function getContrastTextColor(hexOrHsl: string): '#FFFFFF' | '#111827' {
  if (hexOrHsl.startsWith('#')) {
    const hex = hexOrHsl.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#111827' : '#FFFFFF';
  }
  // For HSL, our generator uses ~50% lightness which pairs cleanly with white text with subtle shadow
  return '#FFFFFF';
}

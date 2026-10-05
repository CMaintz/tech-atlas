/**
 * Colour at a strength, for the two ways the 3D map blends. Night map (additive):
 * a colour's brightness is its strength, and black is invisible. Cream map (multiply):
 * a colour mixed towards white by its strength, and white is invisible. Pure.
 */
type Rgb = { r: number; g: number; b: number };

/** `c` at strength `k`: scaled down on the night map, mixed from white on the cream one. */
export const atStrength = (
  { r, g, b }: Rgb,
  k: number,
  light: boolean,
): [number, number, number] =>
  light ? [1 - (1 - r) * k, 1 - (1 - g) * k, 1 - (1 - b) * k] : [r * k, g * k, b * k];

const hexRgb = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
};

/** A `#rrggbb` colour as a CSS `rgba()` at alpha `a`. */
export const rgba = (hex: string, a: number) => `rgba(${hexRgb(hex).join(',')},${a})`;

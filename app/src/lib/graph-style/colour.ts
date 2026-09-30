/** Colour maths for the map palette: HSL → hex, hue distance and WCAG contrast. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A hue in degrees, wrapped into 0–360. */
export const wrapHue = (h: number) => ((h % 360) + 360) % 360;

/** HSL (h in degrees, s and l in percent) → `#rrggbb`. */
export function hslToHex(h: number, s: number, l: number): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + wrapHue(h) / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/** Shortest distance between two hues on the colour wheel (0–180). */
export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(wrapHue(a) - wrapHue(b));
  return Math.min(d, 360 - d);
};

/** WCAG relative luminance of `#rrggbb`. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio of two `#rrggbb` colours (1–21). */
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

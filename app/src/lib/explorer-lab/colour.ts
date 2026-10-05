/**
 * Colour shifts for the visual lab: fade an edge by its importance, or tone a
 * term or edge on the cream map. Hex in, hex out; anything else passes through.
 */
type Rgb = [number, number, number];

/** #rrggbb as hue (0 to 6), saturation and lightness (0 to 1). */
function toHsl(hex: string): Rgb {
  const v = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [h, s, l];
}

/** The (r, g, b) before lightness is added, for hue sextant 0–5 (chroma c, second x). */
function sextant(h: number, c: number, x: number): Rgb {
  const table: Rgb[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  return table[Math.min(5, Math.floor(h))];
}

function fromHsl(h: number, s0: number, l0: number): string {
  const s = Math.min(1, Math.max(0, s0));
  const l = Math.min(1, Math.max(0, l0));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  const hex2 = (u: number) =>
    Math.round(Math.min(1, Math.max(0, u + m)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${sextant(h, c, x).map(hex2).join('')}`;
}

const isHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);

/**
 * A colour faded by intensity: saturation falls and lightness drifts towards the map's
 * background (night map: darker; cream map: lighter), so unimportant edges recede.
 */
export function emphasise(hex: string, k: number, light: boolean): string {
  if (!isHex(hex)) return hex;
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, s * (0.15 + 0.85 * k), l + ((light ? 0.92 : 0.1) - l) * (1 - k) * 0.75);
}

/** A colour with its saturation scaled and its lightness shifted (non-hex passes through). */
export function tone(hex: string, sat: number, light: number): string {
  if (!isHex(hex) || (sat === 1 && light === 0)) return hex;
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, s * sat, l + light);
}

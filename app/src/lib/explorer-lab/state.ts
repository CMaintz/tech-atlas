/**
 * The hidden visual lab's toggle state: its shape, today's defaults, reading it
 * from the address (so a headless run is a list of URLs, and nothing is stored) and
 * reporting what differs from today.
 */
import type { Emphasis } from './emphasis';

export type Lab2D = {
  /** Resting backbone edges: straight haystack (today), bezier, or curved unbundled-bezier. */
  curve: 'haystack' | 'bezier' | 'unbundled';
  /** Edges fade from the source's domain colour to the target's. */
  gradient: boolean;
  /** One-way edges: overlay dots (today), the old marching dashes, or still. */
  flow: 'dots' | 'dashes' | 'none';
  /** Hover: today's (restyle the visible map) or the old one (restyle every element). */
  hover: 'current' | 'old';
  glow: boolean;
  all: boolean;
  labels: 'none' | 'hubs' | 'current' | 'all';
  /** Curve strength (× the edge's own offset) and flow speed (× today's). */
  strength: number;
  speed: number;
  /** Cytoscape draws a snapshot while the user pans or zooms (today). */
  texture: boolean;
  /** Emphasis by importance: off (today), or how an edge's importance is expressed. */
  emph: Emphasis;
  /** Contrast between important and unimportant edges (0 = none). */
  spread: number;
  /** Cream-map label weight (hundreds: 4 = 400, today) and halo width (px). */
  labelWeight: number;
  labelHalo: number;
} & Layout &
  Tone;

/**
 * Relayout (lab only): the minimum distance between terms (× today's, re-running the
 * spacing pass) and sub-domain clustering (tighter clusters, wider gaps between them).
 */
export type Layout = { mindist: number; sub: boolean };

/**
 * Light-theme contrast (applied on the cream map only): term saturation (×) and lightness
 * (+/-), edge darkness (+ darker) and opacity (×), glow / shadow strength (×).
 */
export type Tone = {
  nodeSat: number;
  nodeLight: number;
  edgeDark: number;
  edgeAlpha: number;
  shadow: number;
};
const TONE: Tone = { nodeSat: 1, nodeLight: 0, edgeDark: 0, edgeAlpha: 1, shadow: 1 };
const LAYOUT: Layout = { mindist: 1, sub: false };

export type Lab3D = {
  /** One merged line geometry (today) or a tube per link with arrow cones (old). */
  links: 'lines' | 'tubes';
  curvature: number;
  /** Comets on one point cloud (today), the old per-link particles, or none. */
  flow: 'comets' | 'particles' | 'none';
  speed: number;
  /** Glow: one additive point cloud (today) or a sprite per term (old). */
  glow: 'cloud' | 'sprites';
  bloom: boolean;
  spin: boolean;
  fog: boolean;
  /** Distances between terms (× today's); sizes stay. */
  spacing: number;
  all: boolean;
  emph: Emphasis;
  spread: number;
  /** Faint cluster names at each cluster's centre. */
  clabels: boolean;
} & Layout &
  Tone;

export const DEFAULT_2D: Lab2D = {
  curve: 'haystack',
  gradient: false,
  flow: 'dots',
  hover: 'current',
  glow: true,
  all: false,
  labels: 'current',
  strength: 1,
  speed: 1,
  texture: true,
  emph: 'off',
  spread: 1.5,
  labelWeight: 4,
  labelHalo: 2,
  ...LAYOUT,
  ...TONE,
};

export const DEFAULT_3D: Lab3D = {
  links: 'lines',
  curvature: 0.12,
  flow: 'comets',
  speed: 1,
  glow: 'cloud',
  bloom: false,
  spin: false,
  fog: true,
  spacing: 1,
  all: false,
  emph: 'off',
  spread: 1.5,
  clabels: false,
  ...LAYOUT,
  ...TONE,
};

/** The tone values chosen, as the numbers to adopt ("copy values"). */
export function toneValues(s: Tone & Partial<Pick<Lab2D, 'labelWeight' | 'labelHalo'>>) {
  const out: Record<string, number> = {
    nodeSaturation: s.nodeSat,
    nodeLightness: s.nodeLight,
    edgeDarken: s.edgeDark,
    edgeOpacity: s.edgeAlpha,
    shadowStrength: s.shadow,
  };
  if (s.labelWeight !== undefined) out.labelWeight = s.labelWeight * 100;
  if (s.labelHalo !== undefined) out.labelHaloPx = s.labelHalo;
  return out;
}
/**
 * Toggle state from a query string: each key of `defaults` may appear with a value of
 * the same kind (booleans as 1/0, numbers clamped to a sane range, strings from `choices`).
 */
export function fromQuery<T extends Record<string, string | number | boolean>>(
  search: string,
  defaults: T,
  choices: { [K in keyof T]?: readonly string[] },
): T {
  const params = new URLSearchParams(search);
  const out: Record<string, string | number | boolean> = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = params.get(key);
    if (raw === null) continue;
    if (typeof fallback === 'boolean') out[key] = raw === '1' || raw === 'true';
    else if (typeof fallback === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) out[key] = Math.min(9, Math.max(-1, n));
    } else if (choices[key]?.includes(raw)) out[key] = raw;
  }
  return out as T;
}

/** The toggles that differ from `defaults`, as `key=value` (the panel's "active" note). */
export function changed<T extends Record<string, unknown>>(state: T, defaults: T): string[] {
  return Object.keys(defaults)
    .filter((k) => state[k] !== defaults[k])
    .map((k) => `${k}=${String(state[k])}`);
}

/** The cream-map tone keys 2D and 3D share; 2D adds label weight and halo. */
const SHARED_TONE = ['nodeSat', 'nodeLight', 'edgeDark', 'edgeAlpha', 'shadow'] as const;
const TONE_KEYS = [...SHARED_TONE, 'labelWeight', 'labelHalo'] as const;

/** Whether any cream-map tone value differs from today's. */
export const toneActive = (s: Record<string, unknown>) =>
  TONE_KEYS.some((k) => k in s && s[k] !== (DEFAULT_2D as Record<string, unknown>)[k]);

/** Whether any of the shared tone values differs between two states. */
export const toneChanged = (a: Tone, b: Tone) => SHARED_TONE.some((k) => a[k] !== b[k]);

/**
 * The hidden visual lab (A96): the pure half. Toggle state read from the address (so a
 * headless run is a list of URLs, and nothing is stored), frame-time statistics for the
 * FPS meter, and the 2D stylesheet rules each toggle adds over the Explorer's own.
 */
import type { EdgeType } from '../schema';

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
};

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
};

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
};

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
      if (Number.isFinite(n)) out[key] = Math.min(4, Math.max(0, n));
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

export type FrameStats = {
  /** Frames drawn in the last second. */
  fps: number;
  /** The frame rate of the slowest 1 % of frames (1000 / 99th-percentile frame time). */
  low: number;
  /** The longest frame, in ms. */
  longest: number;
};

/**
 * Statistics over frame timestamps (ms, ascending): the frame rate over the last second,
 * the 1 % low and the longest frame over the whole window.
 */
export function frameStats(times: readonly number[]): FrameStats {
  if (times.length < 2) return { fps: 0, low: 0, longest: 0 };
  const now = times[times.length - 1];
  const dts: number[] = [];
  for (let i = 1; i < times.length; i++) dts.push(times[i] - times[i - 1]);
  const lastSecond = times.filter((t) => t > now - 1000).length;
  const sorted = [...dts].sort((a, b) => a - b);
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  return {
    fps: lastSecond,
    low: Math.round(1000 / (p99 || 1)),
    longest: Math.round(sorted[sorted.length - 1]),
  };
}

/** Average frame rate of a run: frames after the first over the time they took. */
export function averageFps(times: readonly number[]): number {
  if (times.length < 2) return 0;
  const span = times[times.length - 1] - times[0];
  return span > 0 ? Math.round(((times.length - 1) * 1000) / span) : 0;
}

type Rule = { selector: string; style: Record<string, string | number | number[]> };

/** Stylesheet rules the 2D toggles add after the Explorer's own (later rules win). */
export function rules2D(s: Lab2D, dash: readonly [number, number]): Rule[] {
  const out: Rule[] = [];
  if (s.curve === 'bezier')
    out.push({
      selector: 'edge.bb',
      style: { 'curve-style': 'bezier', 'control-point-step-size': 30 * s.strength },
    });
  if (s.curve === 'unbundled')
    out.push({
      selector: 'edge.bb',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 'data(labCurve)',
        'control-point-weights': 0.5,
      },
    });
  if (s.gradient)
    out.push({
      selector: 'edge[labGradient]',
      style: {
        'line-fill': 'linear-gradient',
        'line-gradient-stop-colors': 'data(labGradient)',
        'line-gradient-stop-positions': '0 100',
      },
    });
  if (s.flow === 'dashes')
    out.push({
      selector: 'edge.labflow',
      style: { 'line-style': 'dashed', 'line-dash-pattern': [...dash] },
    });
  if (!s.glow) out.push({ selector: 'node[size]', style: { 'underlay-opacity': 0 } });
  if (s.labels === 'none') out.push({ selector: 'node[size]', style: { 'text-opacity': 0 } });
  if (s.labels === 'hubs')
    out.push({ selector: 'node[size][farFont = 0]', style: { 'text-opacity': 0 } });
  if (s.labels === 'all')
    out.push({
      selector: 'node[size]',
      style: { 'text-opacity': 1, 'min-zoomed-font-size': 0 },
    });
  // Emphasis by importance: per-edge values the lab writes as data (see ExplorerLab).
  const alpha = s.emph === 'opacity' || s.emph === 'combined';
  const colour = s.emph === 'colour' || s.emph === 'combined';
  const width = s.emph === 'width' || s.emph === 'combined';
  if (colour) {
    out.push({ selector: 'edge.bb[labTint]', style: { 'line-color': 'data(labTint)' } });
    out.push({
      selector: 'edge.all[labColour], edge.lit[labColour], edge.focus[labColour]',
      style: { 'line-color': 'data(labColour)', 'target-arrow-color': 'data(labColour)' },
    });
  }
  if (width) out.push({ selector: 'edge[labWidth]', style: { width: 'data(labWidth)' } });
  if (alpha) {
    out.push({ selector: 'edge.bb[labAlpha]', style: { opacity: 'data(labAlpha)' } });
    out.push({ selector: 'edge.bb.xc[labAlphaXc]', style: { opacity: 'data(labAlphaXc)' } });
    out.push({ selector: 'edge.all[labAlphaAll]', style: { opacity: 'data(labAlphaAll)' } });
  }
  return out;
}

/**
 * The base stylesheet's edge state rules (hover fade, selection dim, focus, highlight),
 * to lay again after the emphasis rules so those states still win.
 */
export function edgeStateRules<T extends { selector: string }>(base: readonly T[]): T[] {
  return base.filter((r) => /edge[^,]*\.(faded|dim|lit|focus|hl)\b/.test(r.selector));
}

// ---- Emphasis by importance ---------------------------------------------------------

/** How an edge's importance shows: off (today), opacity, colour, width, or all three. */
export type Emphasis = 'off' | 'opacity' | 'colour' | 'width' | 'combined';
export const EMPHASES: readonly Emphasis[] = ['off', 'opacity', 'colour', 'width', 'combined'];

/**
 * How much each relationship type matters on the map (the owner's default ranking):
 * structure first, then cause and effect, then lineage, then comparisons and "used with".
 */
export const TYPE_IMPORTANCE: Record<EdgeType, number> = {
  requires: 1,
  'kind-of': 1,
  'part-of': 1,
  mitigates: 0.85,
  exploits: 0.85,
  causes: 0.85,
  mandates: 0.85,
  implements: 0.7,
  supersedes: 0.7,
  'contrasts-with': 0.5,
  'alternative-to': 0.5,
  'used-with': 0.35,
};

/**
 * Each link's importance in [0, 1]: its type's weight × its own weight (graph.json's
 * `weight` already folds in strength, confidence and degree), normalised to the heaviest
 * link and softened (square root) so a few hubs do not flatten everything else.
 */
export function importance(links: readonly { type: EdgeType; weight: number }[]): number[] {
  const top = Math.max(1e-9, ...links.map((l) => l.weight));
  return links.map((l) => TYPE_IMPORTANCE[l.type] * Math.sqrt(Math.max(0, l.weight) / top));
}

/**
 * Intensity in [0, 1] for an importance: `spread` 0 makes every edge 1 (no contrast);
 * higher values push unimportant edges further down (importance ^ spread).
 */
export const intensity = (imp: number, spread: number) =>
  Math.min(1, Math.max(0, imp)) ** Math.max(0, spread);

/** An opacity multiplier for an intensity: 0.15 × at the bottom, 1.8 × at the top. */
export const alphaGain = (k: number) => 0.15 + 1.65 * k;

/** A line width multiplier for an intensity: 0.4 × at the bottom, 2.2 × at the top. */
export const widthGain = (k: number) => 0.4 + 1.8 * k;

/**
 * A colour faded by intensity: saturation falls and lightness drifts towards the map's
 * background (night map: darker; cream map: lighter), so unimportant edges recede.
 */
export function emphasise(hex: string, k: number, light: boolean): string {
  const v = parseInt(hex.slice(1, 7), 16);
  const [r0, g0, b0] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => c / 255);
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const d = max - min;
  const l0 = (max + min) / 2;
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  let h = 0;
  if (d) {
    if (max === r0) h = ((g0 - b0) / d + 6) % 6;
    else if (max === g0) h = (b0 - r0) / d + 2;
    else h = (r0 - g0) / d + 4;
  }
  const s = s0 * (0.15 + 0.85 * k);
  const l = l0 + ((light ? 0.92 : 0.1) - l0) * (1 - k) * 0.75;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  const sextant: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const hex2 = (u: number) =>
    Math.round(Math.min(1, Math.max(0, u + m)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${sextant[Math.min(5, Math.floor(h))].map(hex2).join('')}`;
}

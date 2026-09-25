/**
 * The hidden visual lab (A96): the pure half. Toggle state read from the address (so a
 * headless run is a list of URLs, and nothing is stored), frame-time statistics for the
 * FPS meter, and the 2D stylesheet rules each toggle adds over the Explorer's own.
 */

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
  return out;
}

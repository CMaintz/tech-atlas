import type { Emphasis } from './emphasis';

export type Lab2D = {
  curve: 'haystack' | 'bezier' | 'unbundled';
  gradient: boolean;
  flow: 'dots' | 'dashes' | 'none';
  hover: 'current' | 'old';
  glow: boolean;
  all: boolean;
  labels: 'none' | 'hubs' | 'current' | 'all';
  strength: number;
  speed: number;
  texture: boolean;
  emph: Emphasis;
  spread: number;
  labelWeight: number;
  labelHalo: number;
} & Layout &
  Tone;

export type Layout = { mindist: number; sub: boolean };

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
  links: 'lines' | 'tubes';
  curvature: number;
  flow: 'comets' | 'particles' | 'none';
  speed: number;
  glow: 'cloud' | 'sprites';
  bloom: boolean;
  spin: boolean;
  fog: boolean;
  spacing: number;
  all: boolean;
  emph: Emphasis;
  spread: number;
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

export function changed<T extends Record<string, unknown>>(state: T, defaults: T): string[] {
  return Object.keys(defaults)
    .filter((k) => state[k] !== defaults[k])
    .map((k) => `${k}=${String(state[k])}`);
}

const SHARED_TONE = ['nodeSat', 'nodeLight', 'edgeDark', 'edgeAlpha', 'shadow'] as const;
const TONE_KEYS = [...SHARED_TONE, 'labelWeight', 'labelHalo'] as const;

export const toneActive = (s: Record<string, unknown>) =>
  TONE_KEYS.some((k) => k in s && s[k] !== (DEFAULT_2D as Record<string, unknown>)[k]);

export const toneChanged = (a: Tone, b: Tone) => SHARED_TONE.some((k) => a[k] !== b[k]);

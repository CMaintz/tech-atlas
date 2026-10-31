/**
 * What held navigation keys mean for the map, with no DOM: the key a press names, the
 * axes the held keys aim for in each mode, and the easing towards them.
 */
import { EXPLORER } from './explorer-config';

export type NavMode = '2d' | '3d';

export type Axes = { x: number; y: number; z: number; zoom: number; yaw: number; pitch: number };
type Axis = keyof Axes;

export const STILL: Axes = { x: 0, y: 0, z: 0, zoom: 0, yaw: 0, pitch: 0 };

const BY_PHYSICAL_CODE: Record<string, Record<NavMode, [Axis, number]>> = {
  KeyW: { '2d': ['y', -1], '3d': ['z', 1] },
  KeyS: { '2d': ['y', 1], '3d': ['z', -1] },
  KeyA: { '2d': ['x', -1], '3d': ['x', -1] },
  KeyD: { '2d': ['x', 1], '3d': ['x', 1] },
  KeyQ: { '2d': ['zoom', -1], '3d': ['y', -1] },
  KeyE: { '2d': ['zoom', 1], '3d': ['y', 1] },
  ArrowUp: { '2d': ['y', -1], '3d': ['pitch', 1] },
  ArrowDown: { '2d': ['y', 1], '3d': ['pitch', -1] },
  ArrowLeft: { '2d': ['x', -1], '3d': ['yaw', -1] },
  ArrowRight: { '2d': ['x', 1], '3d': ['yaw', 1] },
  Space: { '2d': ['zoom', 0], '3d': ['y', 1] },
};
const BY_CHARACTER: Record<string, Record<NavMode, [Axis, number]>> = {
  '+': { '2d': ['zoom', 1], '3d': ['z', 1] },
  '=': { '2d': ['zoom', 1], '3d': ['z', 1] },
  '-': { '2d': ['zoom', -1], '3d': ['z', -1] },
};

type KeyLike = { code: string; key: string };

export function navKey(e: KeyLike, mode: NavMode): string | null {
  if (e.key in BY_CHARACTER) return `char:${e.key === '=' ? '+' : e.key}`;
  const c = BY_PHYSICAL_CODE[e.code];
  return c && c[mode][1] !== 0 ? e.code : null;
}

export function targetAxes(held: Iterable<string>, mode: NavMode, fast: boolean): Axes {
  const v = { ...STILL };
  for (const k of held) {
    const m = k.startsWith('char:') ? BY_CHARACTER[k.slice(5)] : BY_PHYSICAL_CODE[k];
    if (!m) continue;
    const [axis, sign] = m[mode];
    v[axis] += sign;
  }
  const f = fast ? EXPLORER.keys.fast : 1;
  for (const a of Object.keys(v) as Axis[]) v[a] = Math.max(-1, Math.min(1, v[a])) * f;
  return v;
}

type EaseStep = { dt: number; tau: number; reduced: boolean };

export function ease(v: Axes, target: Axes, { dt, tau, reduced }: EaseStep): Axes {
  if (reduced || tau <= 0) return { ...target };
  const k = 1 - Math.exp(-dt / tau);
  const out = { ...v };
  for (const a of Object.keys(v) as Axis[]) out[a] = v[a] + (target[a] - v[a]) * k;
  return out;
}

export const isStill = (v: Axes) => Object.values(v).every((x) => Math.abs(x) < 1e-3);

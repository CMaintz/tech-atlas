import { EXPLORER } from './explorer-config';
import { listenAll, type Binding } from './listen';

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

const editsText = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
};

export type KeyNav = { destroy(): void };

type KeyNavOptions = {
  host: HTMLElement;
  mode: () => NavMode;
  reduced: () => boolean;
  move: (v: Axes, dt: number) => void;
  start?: () => void;
};

type Keys = { held: Set<string>; fast: boolean; pointerOver: boolean };

function isMapKey(host: HTMLElement, keys: Keys, e: KeyboardEvent) {
  if (host.contains(e.target as Node)) return !editsText(e.target);
  const nothingFocused = e.target === document.body || e.target === document.documentElement;
  return keys.pointerOver && nothingFocused;
}

type Glide = { opts: KeyNavOptions; keys: Keys; v: Axes; raf: number; last: number };

function glideFrame(g: Glide, t: number) {
  const dt = Math.min(0.05, Math.max(0, (t - g.last) / 1000));
  g.last = t;
  const target = targetAxes(g.keys.held, g.opts.mode(), g.keys.fast);
  g.v = ease(g.v, target, { dt, tau: EXPLORER.keys.easeS, reduced: g.opts.reduced() });
  if (!g.keys.held.size && isStill(g.v)) {
    g.v = STILL;
    g.raf = 0;
    return;
  }
  if (dt > 0) g.opts.move(g.v, dt);
  g.raf = requestAnimationFrame((next) => glideFrame(g, next));
}

function createGlide(opts: KeyNavOptions, keys: Keys) {
  const g: Glide = { opts, keys, v: STILL, raf: 0, last: 0 };
  const run = () => {
    if (g.raf) return;
    opts.start?.();
    g.last = performance.now();
    g.raf = requestAnimationFrame((t) => glideFrame(g, t));
  };
  return { run, stop: () => cancelAnimationFrame(g.raf) };
}

type KeyContext = { opts: KeyNavOptions; keys: Keys; run: () => void };

function onKeyDown({ opts, keys, run }: KeyContext, e: KeyboardEvent) {
  keys.fast = e.shiftKey;
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const k = navKey(e, opts.mode());
  if (!k || !isMapKey(opts.host, keys, e)) return;
  e.preventDefault();
  keys.held.add(k);
  run();
}

function onKeyUp({ opts, keys }: KeyContext, e: KeyboardEvent) {
  keys.fast = e.shiftKey;
  const k = navKey(e, opts.mode());
  if (k) keys.held.delete(k);
}

function keyBindings(ctx: KeyContext): Binding[] {
  const { keys, opts } = ctx;
  const clear = () => {
    keys.held.clear();
    keys.fast = false;
  };
  return [
    [window, 'keydown', (e: KeyboardEvent) => onKeyDown(ctx, e)],
    [window, 'keyup', (e: KeyboardEvent) => onKeyUp(ctx, e)],
    [window, 'blur', clear],
    [document, 'visibilitychange', () => document.hidden && clear()],
    [opts.host, 'pointerenter', () => void (keys.pointerOver = true)],
    [opts.host, 'pointerleave', () => void (keys.pointerOver = false)],
  ];
}

export function createKeyNav(opts: KeyNavOptions): KeyNav {
  const keys: Keys = { held: new Set(), fast: false, pointerOver: false };
  const glide = createGlide(opts, keys);
  const unlisten = listenAll(keyBindings({ opts, keys, run: glide.run }));
  return {
    destroy() {
      glide.stop();
      unlisten();
    },
  };
}

/**
 * Keyboard navigation for the Explorer's maps (A97). The pure part maps held keys to a
 * target velocity and eases towards it (frame-rate independent); the driver listens on
 * the window, but only acts while the map host has focus or the pointer is over it (with
 * nothing else focused), so it never takes keys from a field, a popover, the control
 * bar or the term panel (whose ←/→ step through connections).
 *
 * 2D: W A S D / arrows pan, Q/E or -/+ zoom. 3D: W/S forward and back, A/D sideways,
 * Q/E (or Space for up) down and up, arrows orbit, -/+ forward and back. Shift is faster.
 */
import { EXPLORER } from './explorer-config';
import { listenAll } from './listen';

export type NavMode = '2d' | '3d';

/**
 * A velocity, each axis in -1..1 at normal speed (±`fast` with Shift). x: right, y: 2D
 * down / 3D up, z: 3D forward, zoom: 2D in, yaw: 3D orbit right, pitch: 3D orbit up.
 */
export type Axes = { x: number; y: number; z: number; zoom: number; yaw: number; pitch: number };
type Axis = keyof Axes;

export const STILL: Axes = { x: 0, y: 0, z: 0, zoom: 0, yaw: 0, pitch: 0 };

/** Letters, arrows and Space by physical key (WASD stays WASD on any layout). */
const CODES: Record<string, Record<NavMode, [Axis, number]>> = {
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
/** + and - by character (on a Danish keyboard + is not where it is on an English one). */
const CHARS: Record<string, Record<NavMode, [Axis, number]>> = {
  '+': { '2d': ['zoom', 1], '3d': ['z', 1] },
  '=': { '2d': ['zoom', 1], '3d': ['z', 1] },
  '-': { '2d': ['zoom', -1], '3d': ['z', -1] },
};

type KeyLike = { code: string; key: string };

/** The id under which a navigation key is held, or null for any other key. */
export function navKey(e: KeyLike, mode: NavMode): string | null {
  if (e.key in CHARS) return `char:${e.key === '=' ? '+' : e.key}`;
  const c = CODES[e.code];
  return c && c[mode][1] !== 0 ? e.code : null;
}

/** The velocity the held keys ask for: opposite keys cancel, Shift multiplies. */
export function targetAxes(held: Iterable<string>, mode: NavMode, fast: boolean): Axes {
  const v = { ...STILL };
  for (const k of held) {
    const m = k.startsWith('char:') ? CHARS[k.slice(5)] : CODES[k];
    if (!m) continue;
    const [axis, sign] = m[mode];
    v[axis] += sign;
  }
  const f = fast ? EXPLORER.keys.fast : 1;
  for (const a of Object.keys(v) as Axis[]) v[a] = Math.max(-1, Math.min(1, v[a])) * f;
  return v;
}

/**
 * One step of the ease towards `target` over `dt` seconds: exponential, so two half
 * steps land where one whole step does (frame-rate independent). Reduced motion: none.
 */
export function ease(v: Axes, target: Axes, dt: number, tau: number, reduced: boolean): Axes {
  if (reduced || tau <= 0) return { ...target };
  const k = 1 - Math.exp(-dt / tau);
  const out = { ...v };
  for (const a of Object.keys(v) as Axis[]) out[a] = v[a] + (target[a] - v[a]) * k;
  return out;
}

/** Slow enough to call it stopped. */
export const isStill = (v: Axes) => Object.values(v).every((x) => Math.abs(x) < 1e-3);

/** A field, or something that edits text, owns its keys. */
const typing = (t: EventTarget | null) => {
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

/** The keys held, Shift, and whether the pointer is over the map. */
type Keys = { held: Set<string>; fast: boolean; over: boolean };

/** Whether a key is the map's: in the map (not in a field), or on the page under the pointer. */
function ours(host: HTMLElement, keys: Keys, e: KeyboardEvent) {
  if (host.contains(e.target as Node)) return !typing(e.target);
  // Nothing focused (the page itself) and the pointer over the map.
  return keys.over && (e.target === document.body || e.target === document.documentElement);
}

/** The glide: eases towards the held keys' velocity each frame until still. */
function createGlide(opts: KeyNavOptions, keys: Keys) {
  let v = STILL;
  let raf = 0;
  let last = 0;
  const frame = (t: number) => {
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    const target = targetAxes(keys.held, opts.mode(), keys.fast);
    v = ease(v, target, dt, EXPLORER.keys.easeS, opts.reduced());
    if (!keys.held.size && isStill(v)) {
      v = STILL;
      raf = 0;
      return;
    }
    if (dt > 0) opts.move(v, dt);
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (raf) return;
    opts.start?.();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  return { run, stop: () => cancelAnimationFrame(raf) };
}

/** Key presses and releases, and the resets when the page loses the keyboard. */
function keyHandlers(opts: KeyNavOptions, keys: Keys, run: () => void) {
  const down = (e: KeyboardEvent) => {
    keys.fast = e.shiftKey;
    // Alt+←/→ is history, Ctrl/⌘ combinations belong to the browser.
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = navKey(e, opts.mode());
    if (!k || !ours(opts.host, keys, e)) return;
    e.preventDefault();
    keys.held.add(k);
    run();
  };
  const up = (e: KeyboardEvent) => {
    keys.fast = e.shiftKey;
    const k = navKey(e, opts.mode());
    if (k) keys.held.delete(k);
  };
  const clear = () => {
    keys.held.clear();
    keys.fast = false;
  };
  return { down, up, clear, hidden: () => document.hidden && clear() };
}

/**
 * Drive a map from the keyboard. `move` gets the current velocity and the frame's
 * seconds; `start` runs when a key first sets the map moving (e.g. to hide a hover card).
 */
export function createKeyNav(opts: KeyNavOptions): KeyNav {
  const keys: Keys = { held: new Set(), fast: false, over: false };
  const glide = createGlide(opts, keys);
  const h = keyHandlers(opts, keys, glide.run);
  const unlisten = listenAll([
    [window, 'keydown', h.down],
    [window, 'keyup', h.up],
    [window, 'blur', h.clear],
    [document, 'visibilitychange', h.hidden],
    [opts.host, 'pointerenter', () => void (keys.over = true)],
    [opts.host, 'pointerleave', () => void (keys.over = false)],
  ]);
  return {
    destroy() {
      glide.stop();
      unlisten();
    },
  };
}

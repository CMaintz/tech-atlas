import { EXPLORER } from './explorer-config';
import {
  STILL,
  ease,
  isStill,
  navKey,
  targetAxes,
  type Axes,
  type NavMode,
} from './explorer-key-axes';
import { listenAll, type Binding } from './listen';

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

/**
 * Just enough browser for the 3D map in a node test: canvases that log what is drawn on
 * them, a window with timers and a reduced-motion switch, animation frames that wait to
 * be run, a fixed clock and a map container.
 */
import { vi } from 'vitest';

/** A 2D context that logs every text it draws with the styles in force. */
export type FakeCanvas = { width: number; height: number; ops: string[] };

function fakeContext(canvas: FakeCanvas) {
  const style: Record<string, unknown> = {};
  const draw = (kind: string) => (text: string, x: number, y: number) =>
    canvas.ops.push(
      `${kind} ${text} @${x},${y} font=${style.font} fill=${style.fillStyle} stroke=${style.strokeStyle} shadow=${style.shadowColor}`,
    );
  const methods: Record<string, unknown> = {
    measureText: (text: string) => ({ width: text.length * 10 }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    fillText: draw('fill'),
    strokeText: draw('stroke'),
  };
  return new Proxy(style, {
    get: (_, key: string) => methods[key] ?? style[key] ?? (() => undefined),
  });
}

function fakeCanvas(): FakeCanvas {
  const canvas = { width: 300, height: 150, ops: [] as string[] };
  const ctx = fakeContext(canvas);
  return Object.assign(canvas, { getContext: () => ctx });
}

export type FakeDom = {
  /** Pending animation-frame callbacks by id. */
  frames: Map<number, FrameRequestCallback>;
  /** Run every pending frame once, at time `t`. */
  runFrames: (t?: number) => void;
  win: {
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
};

function fakeFrames() {
  const frames = new Map<number, FrameRequestCallback>();
  let next = 1;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.set(next, cb);
    return next++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => void frames.delete(id));
  const runFrames = (t = 1000) => {
    const due = [...frames.values()];
    frames.clear();
    for (const cb of due) cb(t);
  };
  return { frames, runFrames };
}

/** Install the fake browser globals; `reduced` answers the reduced-motion query. */
export function installFakeDom(reduced = false): FakeDom {
  vi.useFakeTimers();
  const win = {
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: number) => clearTimeout(id),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: () => ({ matches: reduced }),
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { createElement: fakeCanvas });
  vi.spyOn(performance, 'now').mockReturnValue(1234);
  return { ...fakeFrames(), win };
}

export function removeFakeDom() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}

export type FakeContainer = HTMLElement & {
  listeners: Record<string, (e?: unknown) => void>;
  removed: string[];
};

/** An 800 × 600 map container that records its listeners. */
export function fakeContainer(): FakeContainer {
  const listeners: Record<string, (e?: unknown) => void> = {};
  const removed: string[] = [];
  const el = {
    clientWidth: 800,
    clientHeight: 600,
    style: {},
    innerHTML: 'map',
    listeners,
    removed,
    addEventListener: (type: string, fn: () => void) => void (listeners[type] = fn),
    removeEventListener: (type: string) => void removed.push(type),
  };
  return el as unknown as FakeContainer;
}

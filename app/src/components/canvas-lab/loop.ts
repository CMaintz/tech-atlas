/**
 * The canvas lab's (A91) rAF loop: advance what moves (auto-rotate, camera easing,
 * family fades, elastic snap-back) and paint only when something changed or is moving.
 */
import { springAtRest, springStep } from '../../lib/canvas-explorer';
import type { Engine } from '../../lib/canvas-explorer/engine';
import type { Cam, View } from './state';

/** Slow auto-rotation in Depth (not while dragging or with reduced motion). */
function autoRotate(c: Cam, v: View, dt: number, dragging: boolean): boolean {
  if (v.mode !== 'depth' || !v.spin || v.reduced || dragging) return false;
  c.yaw += dt * 0.06;
  c.tyaw = c.yaw;
  return true;
}

/** Camera easing (mode switch, panel open/close, search focus). */
function easeCamera(c: Cam, v: View, dt: number): boolean {
  const ease = 1 - Math.pow(0.001, dt);
  let moving = false;
  for (const [k, tk] of [
    ['yaw', 'tyaw'],
    ['pitch', 'tpitch'],
    ['cx', 'tcx'],
  ] as const) {
    const d = c[tk] - c[k];
    if (Math.abs(d) > 1e-4) {
      c[k] = v.reduced ? c[tk] : c[k] + d * ease;
      moving = true;
    }
  }
  return moving;
}

/** Family toggles fade (no relayout). */
function fadeFamilies(e: Engine, v: View, families: string[], dt: number): boolean {
  let moving = false;
  for (const f of families) {
    const target = v.families.has(f) ? 1 : 0;
    const a = e.famAlpha.get(f) ?? target;
    const next = v.reduced ? target : a + (target - a) * Math.min(1, dt * 8);
    const done = Math.abs(target - next) < 0.01 ? target : next;
    if (done !== a) moving = true;
    e.famAlpha.set(f, done);
  }
  return moving;
}

/** Elastic snap-back of released nodes. */
function springBack(e: Engine, dt: number): boolean {
  const moving = e.springing.size > 0;
  for (const i of e.springing) {
    [e.ox[i], e.vx[i]] = springStep(e.ox[i], e.vx[i], dt);
    [e.oy[i], e.vy[i]] = springStep(e.oy[i], e.vy[i], dt);
    if (springAtRest(e.ox[i], e.vx[i]) && springAtRest(e.oy[i], e.vy[i])) {
      e.ox[i] = e.oy[i] = e.vx[i] = e.vy[i] = 0;
      e.springing.delete(i);
    }
  }
  return moving;
}

export type LoopParts = {
  e: Engine;
  v: View;
  c: Cam;
  /** Every family key (their fades advance each frame). */
  families: string[];
  dragging: () => boolean;
  draw: (now: number) => void;
};

/** Start the loop; returns its stop. */
export function startLoop({ e, v, c, families, dragging, draw }: LoopParts): () => void {
  let last = performance.now();
  let raf = 0;
  const step = (now: number) => {
    raf = requestAnimationFrame(step);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const moved = [
      autoRotate(c, v, dt, dragging()),
      easeCamera(c, v, dt),
      fadeFamilies(e, v, families, dt),
      springBack(e, dt),
    ];
    // Pulses move every frame unless motion is reduced.
    const pulsing = !v.reduced;
    if (!moved.some(Boolean) && !v.dirty && !pulsing) return;
    v.dirty = false;
    draw(now);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

import { springAtRest, springStep } from '../../lib/canvas-explorer';
import type { Engine } from '../../lib/canvas-explorer/engine';
import type { Cam, Rig, View } from './state';

export type LoopParts = Rig & {
  allFamilies: string[];
  dragging: () => boolean;
  draw: (now: number) => void;
};

function autoRotate({ c, v, dragging }: LoopParts, dt: number): boolean {
  if (v.mode !== 'depth' || !v.spin || v.reduced || dragging()) return false;
  c.yaw += dt * 0.06;
  c.tyaw = c.yaw;
  return true;
}

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

function fadeFamilies({ e, v, allFamilies }: LoopParts, dt: number): boolean {
  let moving = false;
  for (const f of allFamilies) {
    const target = v.families.has(f) ? 1 : 0;
    const a = e.famAlpha.get(f) ?? target;
    const next = v.reduced ? target : a + (target - a) * Math.min(1, dt * 8);
    const done = Math.abs(target - next) < 0.01 ? target : next;
    if (done !== a) moving = true;
    e.famAlpha.set(f, done);
  }
  return moving;
}

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

function advance(p: LoopParts, dt: number): boolean {
  const rotated = autoRotate(p, dt);
  const eased = easeCamera(p.c, p.v, dt);
  const faded = fadeFamilies(p, dt);
  const sprung = springBack(p.e, dt);
  return rotated || eased || faded || sprung;
}

export function startLoop(p: LoopParts): () => void {
  let last = performance.now();
  let raf = 0;
  const step = (now: number) => {
    raf = requestAnimationFrame(step);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const moved = advance(p, dt);
    const pulsing = !p.v.reduced;
    if (!moved && !p.v.dirty && !pulsing) return;
    p.v.dirty = false;
    p.draw(now);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

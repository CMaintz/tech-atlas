/**
 * Flow (A86): a small comet drifting along every visible one-way link. One THREE.Points
 * for all of them: each comet is a head and a fading tail of points (`flow.trail`),
 * positions recomputed on the link's curve every frame for the visible one-way links
 * only (compacted to the front of the buffers, drawRange).
 */
import { EXPLORER } from '../explorer-config';
import { familyColours, isDirected } from '../graph-style';
import { atStrength } from './colour';
import { packedAt } from './curves';
import { flowMaterial } from './shaders';
import type { Ctx } from './context';
import { DRAW, inkOf, isLight, type Colour, type Link3, type Three } from './types';

/** The comets' settings: a copy, read every frame, so the hidden lab (A96) tunes it live. */
export type FlowConfig = Omit<typeof EXPLORER.three.flow, 'speed'> & { speed: number };

/** Room for `n` comet points: positions, colours and sizes, none drawn yet. */
function cometGeometry(THREE: Three, n: number) {
  const geo = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const colours = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const sizes = new THREE.BufferAttribute(new Float32Array(n), 1);
  geo.setAttribute('position', positions);
  geo.setAttribute('color', colours);
  geo.setAttribute('size', sizes);
  geo.setDrawRange(0, 0);
  return { geo, positions, colours, sizes };
}

function flowPoints(ctx: Ctx, fl: FlowConfig) {
  const { THREE } = ctx;
  const buffers = cometGeometry(THREE, ctx.model.links.length * fl.trail.length);
  const material = flowMaterial(THREE, ctx.el.clientHeight);
  const points = new THREE.Points(buffers.geo, material);
  points.frustumCulled = false;
  points.renderOrder = DRAW.flow;
  points.visible = ctx.motion;
  ctx.scene.add(points);
  return { ...buffers, material, points };
}

type Buffers = ReturnType<typeof flowPoints>;

/** A link's comet: its brightness and whether it is lit, or null for none. */
function cometOf({ lens, state }: Ctx, fl: FlowConfig, l: Link3) {
  const view = state.view;
  if (!view || !isDirected(l.type) || !lens.endsShown(l)) return null;
  const lit = lens.focusOf(l);
  // Every drawn link carries a comet: the backbone (every link with "show all") and
  // the focused ones; outside the selection they dim with it.
  if (!lit && !view.showAll && !l.bb) return null;
  const dim = !lit && lens.dimmed(l);
  return { lit, k: lit ? fl.litAlpha : dim ? fl.dimAlpha : fl.alpha };
}

/** Comet `j`'s head and tail colours and sizes. */
function writeComet(ctx: Ctx, b: Buffers, fl: FlowConfig, j: number, c: Colour, comet: Comet) {
  const light = isLight(ctx);
  const trail = fl.trail.length;
  fl.trail.forEach((f, p) => {
    const m = comet.k * f;
    b.colours.array.set(atStrength(c, light ? Math.min(1, m) : m, light), (j * trail + p) * 3);
    b.sizes.array[j * trail + p] = fl.size * (comet.lit ? 1.3 : 1) * (0.5 + 0.5 * f);
  });
}

type Comet = NonNullable<ReturnType<typeof cometOf>>;

const familyColoursOf = ({ THREE, state }: Ctx) =>
  new Map(Object.entries(familyColours(state.theme)).map(([f, hex]) => [f, new THREE.Color(hex)]));

export function createFlow(ctx: Ctx, curve: Float32Array, linkLength: number[]) {
  const fl: FlowConfig = { ...EXPLORER.three.flow };
  const b = flowPoints(ctx, fl);
  const move = createMover(b, fl, curve, linkLength);
  let familyColour = familyColoursOf(ctx);
  const paint = () => {
    move.active.length = 0;
    ctx.model.links.forEach((l, i) => {
      const comet = cometOf(ctx, fl, l);
      if (!comet) return;
      const c = familyColour.get(l.family) ?? new ctx.THREE.Color(inkOf(ctx).selected);
      writeComet(ctx, b, fl, move.active.length, c, comet);
      move.active.push(i);
    });
    b.colours.needsUpdate = true;
    b.sizes.needsUpdate = true;
    b.geo.setDrawRange(0, move.active.length * fl.trail.length);
    move.to(performance.now());
  };
  const recolour = () => void (familyColour = familyColoursOf(ctx));
  const run = createRunner(ctx, move.to);
  return { points: b.points, material: b.material, fl, paint, recolour, run };
}

/** Places the comets of the `active` links for time t (ms). */
function createMover(b: Buffers, fl: FlowConfig, curve: Float32Array, linkLength: number[]) {
  const trail = fl.trail.length;
  // Comets start spread along their links, not in step.
  const phase = linkLength.map((len, i) => ((i * 0.6180339887) % 1) * len);
  /** Indices of the links carrying a comet, in buffer order. */
  const active: number[] = [];
  const to = (t: number) => {
    const travelled = (t / 1000) * fl.speed;
    active.forEach((i, j) => {
      const len = linkLength[i] || 1;
      const head = (travelled + phase[i]) % len;
      for (let p = 0; p < trail; p++) {
        // The tail trails the head, never past the link's start.
        const u = Math.max(0, head - p * fl.tailGap) / len;
        for (let a = 0; a < 3; a++)
          b.positions.array[(j * trail + p) * 3 + a] = packedAt(curve, i, u, a);
      }
    });
    b.positions.needsUpdate = true;
  };
  return { active, to };
}

/** Moves the comets every animation frame while on (never under reduced motion). */
function createRunner(ctx: Ctx, move: (t: number) => void) {
  let raf = 0;
  const tick = (t: number) => {
    raf = requestAnimationFrame(tick);
    move(t);
  };
  return (on: boolean) => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (on && ctx.motion) raf = requestAnimationFrame(tick);
  };
}

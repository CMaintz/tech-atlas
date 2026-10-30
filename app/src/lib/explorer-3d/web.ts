/**
 * The resting web: every link as a gently curved polyline in one merged geometry
 * — a single draw call however many links. Only the lit links are 3d-force-graph
 * objects; the rest are coloured here, and links a toggle switched on arrive a batch
 * per frame.
 */
import { EXPLORER } from '../explorer-config';
import { clusterColour, homeDomain } from '../graph-style';
import { atStrength } from './colour';
import { SEGMENTS } from './curves';
import { endNode } from './model';
import type { Ctx } from './context';
import { DRAW } from './graph3d';
import { isLight } from './lens';
import type { Colour, Link3, Three } from './types';

const PER_LINK = SEGMENTS * 2;

/** A resting link's strength: 0 hidden, faint when either end recedes. */
function restStrength({ lens, state }: Ctx, l: Link3) {
  const { view } = state;
  if (!view || !lens.drawn(l) || lens.focusOf(l)) return 0;
  if (lens.dimmed(l)) return 0.02;
  const alpha = EXPLORER.three.linkAlpha;
  return view.showAll && !l.bb ? alpha * 0.6 : alpha;
}

/** Per-vertex colours, added to the night map (multiplied into the cream one: `setBlend`). */
const webMaterial = (THREE: Three) =>
  new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
    fog: true,
  });

function webLines(ctx: Ctx, segments: Float32Array) {
  const { THREE } = ctx;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(segments, 3));
  const colours = new THREE.BufferAttribute(new Float32Array(segments.length), 3);
  geo.setAttribute('color', colours);
  const web = new THREE.LineSegments(geo, webMaterial(THREE));
  web.frustumCulled = false;
  web.renderOrder = DRAW.links;
  ctx.scene.add(web);
  return { web, colours };
}

/** Each link's resting tint: its source term's cluster colour. */
const tintsOf = ({ THREE, model, state }: Ctx) =>
  model.links.map((l) => {
    const s = endNode(model, l.source);
    return new THREE.Color(clusterColour(s.cluster, homeDomain(s), state.theme));
  });

type Colours = ReturnType<typeof webLines>['colours'];

/** Writes each link's colour at a strength, and remembers the strength it was drawn at. */
function linkWriter(ctx: Ctx, colours: Colours) {
  const n = ctx.model.links.length;
  let tints = tintsOf(ctx);
  /** The hidden visual lab may scale or recolour each resting link; inert by default. */
  const gain = new Float32Array(n).fill(1);
  const tint: (Colour | null)[] = ctx.model.links.map(() => null);
  /** Each link's drawn strength (0 = hidden). */
  const shown = new Float32Array(n);
  const write = (i: number, k: number) => {
    shown[i] = k;
    const g = k * gain[i];
    const light = isLight(ctx);
    const rgb = atStrength(tint[i] ?? tints[i], light ? Math.min(1, g * 1.5) : g, light);
    for (let j = 0; j < PER_LINK; j++) colours.array.set(rgb, (i * PER_LINK + j) * 3);
  };
  return { gain, tint, shown, write, retint: () => void (tints = tintsOf(ctx)) };
}

export function createWeb(ctx: Ctx, segments: Float32Array) {
  const { web, colours } = webLines(ctx, segments);
  const links = linkWriter(ctx, colours);
  const reveal = createReveal(links.write, () => void (colours.needsUpdate = true));
  const paint = (stagger = false) => {
    const next = ctx.model.links.map((l) => restStrength(ctx, l));
    reveal.show(next, (i, k) => stagger && ctx.motion && k > 0 && links.shown[i] === 0);
  };
  const { gain, tint, retint } = links;
  return { web, gain, tint, paint, retint, stop: reveal.stop };
}

type Write = (i: number, k: number) => void;

type Pending = { i: number; k: number }[];

/** Writes the strengths it is given a batch per animation frame, until none are left. */
function frameBatches(write: Write, flush: () => void) {
  let waiting: Pending = [];
  let raf = 0;
  const tick = () => {
    for (const { i, k } of waiting.splice(0, EXPLORER.motion.revealBatch)) write(i, k);
    flush();
    raf = waiting.length ? requestAnimationFrame(tick) : 0;
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const start = (next: Pending) => {
    waiting = next;
    if (waiting.length) raf = requestAnimationFrame(tick);
  };
  return { start, stop };
}

/** Writes strengths now, or (those `later` picks) a batch per animation frame. */
function createReveal(write: Write, flush: () => void) {
  const batches = frameBatches(write, flush);
  const show = (strengths: number[], later: (i: number, k: number) => boolean) => {
    batches.stop();
    const waiting: Pending = [];
    strengths.forEach((k, i) => (later(i, k) ? waiting.push({ i, k }) : write(i, k)));
    flush();
    batches.start(waiting);
  };
  return { show, stop: batches.stop };
}

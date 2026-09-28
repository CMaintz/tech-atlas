/**
 * The 3d-force-graph instance under the map: fixed terms (no live physics), accessors
 * that read the lens, and the per-frame pass that fixes draw order and watches the
 * camera for motion. Only the lit links are its objects; the resting web is ours.
 */
import type ForceGraph3D from '3d-force-graph';
import { EXPLORER } from '../explorer-config';
import { familyColours, isDirected } from '../graph-style';
import type { GraphNode } from '../graph-model';
import { rgba } from './colour';
import type { Base, Ctx } from './context';
import { inkOf } from './lens';
import type { Camera, Graph3D, Link3, Orbit } from './types';

export type GraphClass = typeof ForceGraph3D;

/** Transparent draw order (three.js sorts by renderOrder before distance). */
export const DRAW = { glow: -1, solid: 0, links: 1, receded: 2, flow: 3, tags: 4 } as const;

export const orbitOf = (fg: Graph3D) => fg.controls() as unknown as Orbit;
export const cameraOf = (fg: Graph3D) => fg.camera() as Camera;

function withNodes(fg: Graph3D, { opts, model, lens, state }: Base) {
  const rel = EXPLORER.three.nodeRel;
  return fg
    .nodeLabel((n: GraphNode) => n.term[opts.lang])
    .nodeVal((n: GraphNode) => Math.pow(model.radius(n) / rel, 3))
    .nodeRelSize(rel)
    .nodeResolution(10)
    .nodeOpacity(0.95)
    .nodeColor(lens.nodeColour)
    .nodeVisibility((n: GraphNode) => !!state.view?.nodes.has(n.id));
}

function withLinks(fg: Graph3D, { lens, state }: Base) {
  return fg
    .linkVisibility(lens.linkShown)
    .linkColor((l: Link3) => rgba(familyColours(state.theme)[l.family], 0.9))
    .linkWidth(0)
    .linkOpacity(1)
    .linkCurvature(0.12)
    .linkDirectionalArrowLength((l: Link3) => (lens.focusOf(l) && isDirected(l.type) ? 5 : 0))
    .linkDirectionalArrowRelPos(1);
}

export function createGraph3D(Graph: GraphClass, base: Base): Graph3D {
  const { el, model, opts } = base;
  const fg = new Graph(el, { controlType: 'orbit' })
    .width(el.clientWidth)
    .height(el.clientHeight)
    .backgroundColor(inkOf(base).bg3d)
    .showNavInfo(false)
    .enableNodeDrag(false)
    .warmupTicks(0)
    .cooldownTicks(0)
    .graphData({ nodes: model.nodes, links: model.links });
  withLinks(withNodes(fg, base), base)
    .onNodeClick((n: GraphNode) => opts.onSelect(n.id))
    .onBackgroundClick(() => opts.onSelect(null));
  // The wheel (and pinch) zooms towards the point under the cursor, not the orbit centre.
  orbitOf(fg).zoomToCursor = true;
  return fg;
}

/** A 3d-force-graph object as the per-frame draw-order pass sees it. */
type Obj3 = {
  __graphObjType?: string;
  renderOrder: number;
  material?: { opacity: number; depthWrite: boolean };
};

/**
 * Draw order (A97): every sphere is transparent (nodeOpacity < 1), so three.js sorted
 * each against the one merged web by distance, and a receded sphere drawn first wrote
 * depth and erased every line behind it. A fixed order instead: glow, the solid spheres
 * (they write depth, so they still hide what is behind them), the lines, the receded
 * spheres (no depth write: the lines show through), the comets. The sphere materials
 * are 3d-force-graph's, swapped on its schedule: every frame.
 */
function orderDraws(scene: Ctx['scene']) {
  scene.traverse((obj) => {
    const o = obj as unknown as Obj3;
    if (o.__graphObjType === 'link') o.renderOrder = DRAW.links;
    if (o.__graphObjType !== 'node') return;
    const solid = (o.material?.opacity ?? 1) >= EXPLORER.three.solidOpacity;
    if (o.material) o.material.depthWrite = solid;
    o.renderOrder = solid ? DRAW.solid : DRAW.receded;
  });
}

/** Whether the camera moved (or turned) since the last call. */
function cameraWatch({ THREE, fg }: Ctx) {
  const lastPos = new THREE.Vector3(NaN, NaN, NaN);
  const lastTurn = new THREE.Quaternion();
  return () => {
    const cam = cameraOf(fg);
    const moved =
      !(cam.position.distanceToSquared(lastPos) < 1e-6) ||
      1 - Math.abs(cam.quaternion.dot(lastTurn)) > 1e-10;
    lastPos.copy(cam.position);
    lastTurn.copy(cam.quaternion);
    return moved;
  };
}

/**
 * Before every render: fix the draw order, feed camera motion to the gate (A97a) —
 * `onMoveStart` when it starts, after the render — and run `eachFrame`.
 */
export function watchFrames(ctx: Ctx, onMoveStart: () => void, eachFrame: () => void) {
  const moved = cameraWatch(ctx);
  ctx.scene.onBeforeRender = () => {
    orderDraws(ctx.scene);
    // Restyling re-evaluates 3d-force-graph's objects: not in the middle of a render.
    if (ctx.gate.motion(moved())) window.setTimeout(onMoveStart, 0);
    eachFrame();
  };
}

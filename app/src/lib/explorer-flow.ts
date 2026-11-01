import type cytoscape from 'cytoscape';
import { EXPLORER } from './explorer-config';
import { groupPaths } from './explorer-flow-edges';
import { eachDot, type Box, type DotSpacing, type Path } from './explorer-flow-path';
import { orThrow } from './or-throw';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const SCENE_EVENTS = 'class style data position add remove';

export type DotsConfig = { readonly [K in keyof typeof EXPLORER.dots]: number };

type SceneState = { groups: Map<string, Path[]>; dirty: boolean; moved: boolean };

function scenePaths(state: SceneState, directed: cytoscape.EdgeCollection) {
  if (state.dirty) {
    state.dirty = false;
    state.groups = groupPaths(directed);
  }
  return state.groups;
}

function takeMoved(state: SceneState) {
  const was = state.moved;
  state.moved = false;
  return was;
}

function watchScene(cy: cytoscape.Core, edges: cytoscape.EdgeCollection) {
  const directed = edges.filter((e) => e.data('directed') === 1);
  const state: SceneState = { groups: new Map(), dirty: true, moved: false };
  const markDirty = () => void (state.dirty = true);
  const onViewport = () => void (state.moved = true);
  cy.on(SCENE_EVENTS, markDirty);
  cy.on('viewport', onViewport);
  const stop = () => {
    cy.removeListener(SCENE_EVENTS, markDirty);
    cy.removeListener('viewport', onViewport);
  };
  return { paths: () => scenePaths(state, directed), takeMoved: () => takeMoved(state), stop };
}

type Scene = ReturnType<typeof watchScene>;

function pointerTransparentOverlay(container: HTMLElement) {
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2';
  container.appendChild(canvas);
  return canvas;
}

type Layer = {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  drawn: boolean;
};

function resizeLayer(layer: Layer) {
  const { canvas, container } = layer;
  layer.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(container.clientWidth * layer.dpr);
  canvas.height = Math.round(container.clientHeight * layer.dpr);
  canvas.style.width = `${container.clientWidth}px`;
  canvas.style.height = `${container.clientHeight}px`;
}

function clearLayer(layer: Layer) {
  if (!layer.drawn) return;
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  layer.drawn = false;
}

function mountCanvas(container: HTMLElement): Layer {
  const canvas = pointerTransparentOverlay(container);
  const ctx = orThrow(canvas.getContext('2d'), 'The flow canvas 2D context');
  const layer = { container, canvas, ctx, dpr: 1, drawn: false };
  resizeLayer(layer);
  return layer;
}

type Frame = DotSpacing & { ext: Box; r: number; litAlpha: number; restAlpha: number };

const onScreen = (b: Box, ext: Box) =>
  !(b.x2 < ext.x1 || b.x1 > ext.x2 || b.y2 < ext.y1 || b.y1 > ext.y2);

function fillOnScreenDots(ctx: CanvasRenderingContext2D, paths: Path[], f: Frame) {
  ctx.beginPath();
  for (const p of paths) {
    if (!onScreen(p.box, f.ext)) continue;
    eachDot(p, f, (x, y) => {
      ctx.moveTo(x + f.r, y);
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
    });
  }
  ctx.fill();
}

/**
 * What the map steers the dots by, all read every frame: its tunables (the lab edits
 * them live), the theme's resting alpha, and whether they hold still.
 */
type Controls = { cfg: DotsConfig; restAlpha: () => number; paused: () => boolean };

type Flow = { cy: cytoscape.Core; layer: Layer; scene: Scene; controls: Controls };

function frameOnViewport({ cy, layer, controls }: Flow, t: number): Frame {
  const { cfg } = controls;
  const zoom = cy.zoom();
  const pan = cy.pan();
  const k = layer.dpr * zoom;
  layer.ctx.setTransform(k, 0, 0, k, layer.dpr * pan.x, layer.dpr * pan.y);
  const shift = ((t / 1000) * cfg.speed) % cfg.spacing;
  const alpha = { litAlpha: cfg.litAlpha, restAlpha: controls.restAlpha() };
  return { ext: cy.extent(), r: cfg.radius / zoom, shift, spacing: cfg.spacing, ...alpha };
}

function drawDotsByColour(layer: Layer, groups: Map<string, Path[]>, f: Frame) {
  const { ctx } = layer;
  for (const [key, paths] of groups) {
    ctx.globalAlpha = key.endsWith('|1') ? f.litAlpha : f.restAlpha;
    ctx.fillStyle = key.slice(0, key.lastIndexOf('|'));
    fillOnScreenDots(ctx, paths, f);
    layer.drawn = true;
  }
  ctx.globalAlpha = 1;
}

function drawFrame(flow: Flow, t: number) {
  clearLayer(flow.layer);
  if (flow.controls.paused() || !flow.layer.container.offsetParent) return;
  drawDotsByColour(flow.layer, flow.scene.paths(), frameOnViewport(flow, t));
}

type LoopHooks = { draw: (t: number) => void; moved: () => boolean; still: () => void };

type Loop = {
  cfg: DotsConfig;
  on: LoopHooks;
  motion: MediaQueryList | undefined;
  raf: number;
  last: number;
  stopped: boolean;
};

function tick(loop: Loop, t: number) {
  loop.raf = 0;
  if (loop.stopped) return;
  if (loop.motion?.matches) return loop.on.still();
  loop.raf = requestAnimationFrame((next) => tick(loop, next));
  if (!loop.on.moved() && t - loop.last < 1000 / loop.cfg.fps) return;
  loop.last = t;
  loop.on.draw(t);
}

function wake(loop: Loop) {
  if (!loop.raf && !loop.stopped) loop.raf = requestAnimationFrame((t) => tick(loop, t));
}

function runLoop(cfg: DotsConfig, on: LoopHooks) {
  const motion = window.matchMedia?.(REDUCED_MOTION);
  const loop: Loop = { cfg, on, motion, raf: 0, last: 0, stopped: false };
  const onMotionChange = () => wake(loop);
  motion?.addEventListener?.('change', onMotionChange);
  wake(loop);
  const stop = () => {
    loop.stopped = true;
    cancelAnimationFrame(loop.raf);
    motion?.removeEventListener?.('change', onMotionChange);
  };
  return { stop };
}

export function startDots(
  cy: cytoscape.Core,
  edges: cytoscape.EdgeCollection,
  controls: Controls,
): { stop: () => void; resize: () => void } {
  const layer = mountCanvas(orThrow(cy.container(), 'The map container'));
  const flow: Flow = { cy, layer, scene: watchScene(cy, edges), controls };
  const draw = (t: number) => drawFrame(flow, t);
  const still = () => clearLayer(layer);
  const loop = runLoop(controls.cfg, { draw, moved: flow.scene.takeMoved, still });
  const stop = () => {
    loop.stop();
    flow.scene.stop();
    layer.canvas.remove();
  };
  return { resize: () => resizeLayer(layer), stop };
}

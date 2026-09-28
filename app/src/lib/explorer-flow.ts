/**
 * The Explorer's flow (A86): small dots drift source → target along every visible
 * one-way edge of the 2D map, all the time. They are drawn on a canvas laid over the
 * map, so Cytoscape never restyles or redraws for the animation — the only per-frame
 * work is one clear and a few batched fills of on-screen dots. Edge geometry is sampled
 * once and re-sampled only when edges, classes or positions change. Symmetric
 * relationships never move; nothing moves under prefers-reduced-motion. Browser-only.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from './explorer-config';
import { eachDot, pathOf, sample, type Box, type Path } from './explorer-flow-path';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const SCENE_EVENTS = 'class style data position add remove';

/** The dots' settings (`EXPLORER.dots`), as plain numbers. */
export type DotsConfig = { readonly [K in keyof typeof EXPLORER.dots]: number };

/** A drawn one-way edge's path and its fill group (colour, lit), or null when hidden. */
function edgeDots(e: cytoscape.EdgeSingular) {
  if (e.hasClass('off') || e.hasClass('dim') || e.hasClass('faded')) return null;
  if (e.source().hasClass('gone') || e.target().hasClass('gone')) return null;
  const lit = e.hasClass('focus') || e.hasClass('lit');
  const s = e.sourceEndpoint();
  const t = e.targetEndpoint();
  if (!s || !t || !Number.isFinite(s.x) || !Number.isFinite(t.x)) return null;
  const colour = (lit || e.hasClass('all') ? e.data('colour') : e.data('tint')) as string;
  return { key: `${colour}|${lit ? 1 : 0}`, path: pathOf(sample(s, e.controlPoints() ?? [], t)) };
}

/** Paths grouped by colour, so a frame is one fill per colour. */
function groupPaths(directed: cytoscape.EdgeCollection) {
  const groups = new Map<string, Path[]>();
  directed.forEach((e) => {
    const d = edgeDots(e);
    if (!d) return;
    if (!groups.has(d.key)) groups.set(d.key, []);
    groups.get(d.key)!.push(d.path);
  });
  return groups;
}

/**
 * The one-way edges' paths, re-sampled only after edges, classes or positions change;
 * and whether the view moved since the last frame (pan and zoom: the dots follow the
 * live viewport in the very next frame, outside the fps throttle, so they stay locked to
 * the map and never blink out mid-gesture, A86).
 */
function watchScene(cy: cytoscape.Core, edges: cytoscape.EdgeCollection) {
  const directed = edges.filter((e) => e.data('directed') === 1);
  let groups = new Map<string, Path[]>();
  let dirty = true;
  let moved = false;
  const markDirty = () => void (dirty = true);
  const onViewport = () => void (moved = true);
  cy.on(SCENE_EVENTS, markDirty);
  cy.on('viewport', onViewport);
  const paths = () => {
    if (dirty) {
      dirty = false;
      groups = groupPaths(directed);
    }
    return groups;
  };
  const takeMoved = () => {
    const was = moved;
    moved = false;
    return was;
  };
  const stop = () => {
    cy.removeListener(SCENE_EVENTS, markDirty);
    cy.removeListener('viewport', onViewport);
  };
  return { paths, takeMoved, stop };
}

/** A canvas laid over the map, letting the pointer through. */
function overlay(container: HTMLElement) {
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2';
  container.appendChild(canvas);
  return canvas;
}

/** The overlay, sized to the map at the device's pixel ratio (at most 2). */
function mountCanvas(container: HTMLElement) {
  const canvas = overlay(container);
  const ctx = canvas.getContext('2d')!;
  const layer = {
    container,
    canvas,
    ctx,
    dpr: 1,
    /** Whether anything is on the canvas (a clear is skipped otherwise). */
    drawn: false,
    resize() {
      layer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(container.clientWidth * layer.dpr);
      canvas.height = Math.round(container.clientHeight * layer.dpr);
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
    },
    clear() {
      if (!layer.drawn) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      layer.drawn = false;
    },
  };
  layer.resize();
  return layer;
}

type Layer = ReturnType<typeof mountCanvas>;

type Frame = { ext: Box; r: number; shift: number; spacing: number };

const onScreen = (b: Box, ext: Box) =>
  !(b.x2 < ext.x1 || b.x1 > ext.x2 || b.y2 < ext.y1 || b.y1 > ext.y2);

/** One fill of a group's on-screen dots. */
function fillGroup(ctx: CanvasRenderingContext2D, paths: Path[], f: Frame) {
  ctx.beginPath();
  for (const p of paths) {
    if (!onScreen(p.box, f.ext)) continue;
    eachDot(p, f.shift, f.spacing, (x, y) => {
      ctx.moveTo(x + f.r, y);
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
    });
  }
  ctx.fill();
}

type Look = { cfg: DotsConfig; restAlpha: () => number };

/** Lay the canvas over the live viewport; the dots' size and shift at time `t` (ms). */
function viewFrame(cy: cytoscape.Core, layer: Layer, cfg: DotsConfig, t: number): Frame {
  const zoom = cy.zoom();
  const pan = cy.pan();
  const k = layer.dpr * zoom;
  layer.ctx.setTransform(k, 0, 0, k, layer.dpr * pan.x, layer.dpr * pan.y);
  const shift = ((t / 1000) * cfg.speed) % cfg.spacing;
  return { ext: cy.extent(), r: cfg.radius / zoom, shift, spacing: cfg.spacing };
}

/** Draw every group's dots, one fill per colour. */
function drawDots(layer: Layer, groups: Map<string, Path[]>, f: Frame, look: Look) {
  const { ctx } = layer;
  for (const [key, paths] of groups) {
    ctx.globalAlpha = key.endsWith('|1') ? look.cfg.litAlpha : look.restAlpha();
    ctx.fillStyle = key.slice(0, key.lastIndexOf('|'));
    fillGroup(ctx, paths, f);
    layer.drawn = true;
  }
  ctx.globalAlpha = 1;
}

type LoopHooks = { draw: (t: number) => void; moved: () => boolean; still: () => void };

/**
 * The frame loop: `draw` at most `cfg.fps` times a second (every frame while the view
 * moves); none under reduced motion (`still` clears), resumed when that changes.
 */
function runLoop(cfg: DotsConfig, on: LoopHooks) {
  const motion = window.matchMedia?.(REDUCED_MOTION);
  let raf = 0;
  let last = 0;
  let stopped = false;
  const tick = (t: number) => {
    raf = 0;
    if (stopped) return;
    if (motion?.matches) return on.still();
    raf = requestAnimationFrame(tick);
    if (!on.moved() && t - last < 1000 / cfg.fps) return;
    last = t;
    on.draw(t);
  };
  const wake = () => {
    if (!raf && !stopped) raf = requestAnimationFrame(tick);
  };
  motion?.addEventListener?.('change', wake);
  wake();
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    motion?.removeEventListener?.('change', wake);
  };
  return { stop };
}

/**
 * Start the flow over `cy`'s `edges` (the one-way ones are chosen here). `paused` is
 * checked every frame (e.g. while nodes glide to a new layout). Returns a stop function
 * and a `resize` to call when the container changes size.
 */
export function startDots(
  cy: cytoscape.Core,
  edges: cytoscape.EdgeCollection,
  paused: () => boolean,
  /** Resting opacity (the cream map needs more than the night map). */
  restAlpha: () => number = () => EXPLORER.dots.alpha,
  /** The settings, read every frame (the hidden visual lab tunes a copy live, A96). */
  cfg: DotsConfig = EXPLORER.dots,
): { stop: () => void; resize: () => void } {
  const layer = mountCanvas(cy.container()!);
  const scene = watchScene(cy, edges);
  const draw = (t: number) => {
    layer.clear();
    if (paused() || !layer.container.offsetParent) return;
    drawDots(layer, scene.paths(), viewFrame(cy, layer, cfg, t), { cfg, restAlpha });
  };
  const loop = runLoop(cfg, { draw, moved: scene.takeMoved, still: layer.clear });
  const stop = () => {
    loop.stop();
    scene.stop();
    layer.canvas.remove();
  };
  return { resize: layer.resize, stop };
}

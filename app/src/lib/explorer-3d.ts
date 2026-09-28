/**
 * The Explorer's 3D map (A86): galaxies of terms, computed once (`galaxyLayout`) and
 * fixed — no live physics, so the GPU only draws. One scene for the life of the page:
 * filters, hover and selection re-evaluate accessors in place. Glow is a single
 * additive point cloud (a shared term's glow is its second domain's colour — a halo
 * round a sphere in its own), hubs carry text sprites, and one more point cloud carries
 * a small comet drifting along every visible one-way relationship. Browser-only.
 *
 * This module composes the parts in `explorer-3d/`: the model and lens (what is where,
 * what is lit), the painter (glow, web, comets, names), hover, and the camera.
 */
import type { MapTheme } from './graph-style';
import type { Axes } from './explorer-keys';
import { createContext, type Ctx } from './explorer-3d/context';
import { watchFrames } from './explorer-3d/graph3d';
import { createPainter, type Painter } from './explorer-3d/paint';
import { createHover } from './explorer-3d/hover';
import { createCamera, spinner, watchDrags } from './explorer-3d/camera';
import { applyView } from './explorer-3d/apply';
import type { Map3DOptions, View3D } from './explorer-3d/types';

export type { View3D } from './explorer-3d/types';

type Camera3 = ReturnType<typeof createCamera>;
type Parts = { painter: Painter; camera: Camera3; hover: ReturnType<typeof createHover> };

/** Hooks for the hidden visual lab only (A96): the three.js objects it restyles. */
function labObjects({ fg, THREE, scene }: Ctx, { web, glow, flow }: Painter) {
  return {
    fg,
    THREE,
    scene,
    web: web.web,
    glow: glow.points,
    glowMat: glow.material,
    flow: flow.points,
    flowMat: flow.material,
    flowCfg: flow.fl,
  };
}

/** Hooks for the hidden visual lab only (A96): the data and predicates it reads or tunes. */
function labData({ model, lens }: Ctx, p: Painter) {
  return {
    /** Each link's length along its curve (the comets wrap at it), term radius, hub labels. */
    linkLength: p.linkLength,
    radius: model.radius,
    labels: p.hubs.labels,
    webGain: p.web.gain,
    webTint: p.web.tint,
    /** Repaint the resting web (after changing `webGain` / `webTint`). */
    repaint: () => p.paint(),
    /** Each link's quadratic curve (start, bend, end), shared by the web and comets. */
    curve: p.curve,
    /** Drawn in the overview (the backbone, or every link with "show all"). */
    drawn: lens.drawn,
    focusOf: lens.focusOf,
    faded: lens.faded,
  };
}

/**
 * Switch palettes (A92) in place: background, fog, blending (additive glow on the
 * night map, a multiplied soft shadow on the cream one), labels and colours. Term
 * fills come from the View's `colour`, so the caller applies a new view as well.
 */
function retheme(ctx: Ctx, painter: Painter, next: MapTheme) {
  if (next === ctx.state.theme) return;
  ctx.state.theme = next;
  painter.repalette();
  painter.refresh();
}

function show({ fg }: Ctx, { painter, camera }: Parts, on: boolean) {
  if (on) {
    camera.resize();
    fg.resumeAnimation();
  } else fg.pauseAnimation();
  painter.flow.run(on);
}

function destroy(ctx: Ctx, { painter, camera, hover }: Parts, undrag: () => void) {
  painter.flow.run(false);
  painter.web.stop();
  hover.destroy();
  camera.destroy();
  undrag();
  ctx.fg._destructor();
  ctx.el.innerHTML = '';
}

function handleOf(ctx: Ctx, parts: Parts, undrag: () => void) {
  const { painter, camera } = parts;
  return {
    apply: (next: View3D) => applyView(ctx, painter, camera, next),
    /** Hooks for the hidden visual lab only (A96); the Explorer never uses them. */
    lab: { ...labObjects(ctx, painter), ...labData(ctx, painter) },
    /** Bring a term into view (Find a term, even when it is already selected). */
    focus: (id: string) => camera.flyTo(id),
    /**
     * Keyboard navigation (A97), for dt seconds: fly (the orbit centre travels with the
     * camera, so a mouse orbit afterwards turns about what is in front) and orbit.
     */
    nudge: (v: Axes, dt: number) => camera.nudge(v, dt),
    /** Slow auto-rotation about the scene centre (off under reduced motion). */
    spin: spinner(ctx),
    retheme: (next: MapTheme) => retheme(ctx, painter, next),
    /** Re-frame after the clear part of the canvas changed (e.g. the legend toggled). */
    reframe: () => camera.resize(),
    show: (on: boolean) => show(ctx, parts, on),
    destroy: () => destroy(ctx, parts, undrag),
  };
}

export async function createMap3D(opts: Map3DOptions) {
  const [{ default: ForceGraph3D }, THREE] = await Promise.all([
    import('3d-force-graph'),
    import('three'),
  ]);
  const ctx = createContext(ForceGraph3D, THREE, opts);
  const painter = createPainter(ctx);
  const hover = createHover(ctx, painter.refresh);
  const undrag = watchDrags(ctx);
  const camera = createCamera(ctx, [painter.glow.material, painter.flow.material]);
  watchFrames(ctx, hover.stop, painter.tags.place);
  return handleOf(ctx, { painter, camera, hover }, undrag);
}

export type Map3D = Awaited<ReturnType<typeof createMap3D>>;

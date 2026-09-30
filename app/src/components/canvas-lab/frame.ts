/**
 * One frame of the canvas lab (A91): project the terms, glide to a search focus, sort,
 * light the selection, then run the painters in order over a shared frame state. The
 * painters leave canvas state (alpha, line cap, text alignment) to the next on purpose.
 */
import { LAB, project, type Projected } from '../../lib/canvas-explorer';
import type { Engine } from '../../lib/canvas-explorer/engine';
import { lightSelection } from '../../lib/canvas-explorer/edges';
import { familyColours, type MapTheme } from '../../lib/graph-style';
import { midY, type Cam, type View } from './state';
import { LAB_INK, type Ink } from './text';
import { paintEdges, paintPulses } from './paint-edges';
import { paintNodes } from './paint-nodes';
import { paintLabels } from './paint-labels';

/** What every painter reads: the canvas, engine, view and camera, and this frame's own. */
export type Frame = {
  ctx: CanvasRenderingContext2D;
  e: Engine;
  v: View;
  c: Cam;
  /** This frame: time, selected index (-1), what is lit, ink and family colours. */
  now: number;
  sel: number;
  lit: Uint8Array;
  litEdge: Uint8Array;
  ink: Ink;
  fams: Record<string, string>;
  /** Text width in px for a font, cached. */
  measure: (font: string, s: string) => number;
  /** Reused by the projection (no allocation per term). */
  u: Projected;
};

/** The frame state for one canvas, reused every frame. */
export function newFrame(ctx: CanvasRenderingContext2D, e: Engine, v: View, c: Cam): Frame {
  return {
    ctx,
    e,
    v,
    c,
    now: 0,
    sel: -1,
    ink: LAB_INK.dark,
    fams: {},
    lit: new Uint8Array(e.n),
    litEdge: new Uint8Array(e.es.length),
    measure: textMeasure(ctx),
    u: { x: 0, y: 0, z: 0, s: 1 },
  };
}

/** A cached text measure (fonts and names repeat every frame). */
function textMeasure(ctx: CanvasRenderingContext2D) {
  const textWidth = new Map<string, number>();
  return (font: string, s: string) => {
    const key = `${font}|${s}`;
    let w = textWidth.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(s).width;
      textWidth.set(key, w);
    }
    return w;
  };
}

/** Paint one frame; the hit grid is rebuilt from this frame's projection. */
export function drawFrame(f: Frame, now: number, theme: MapTheme) {
  const { ctx, e, v, c } = f;
  const depth = projectNodes(f);
  glideToFocus(e, c, v, now);
  sortDrawOrder(e, depth);
  f.sel = lightSelection(e, v.selected, v.families, f.lit, f.litEdge);
  f.now = now;
  f.ink = LAB_INK[theme];
  f.fams = familyColours(theme) as Record<string, string>;
  ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  ctx.clearRect(0, 0, c.w, c.h);
  const drawn = paintEdges(f);
  if (!v.reduced) paintPulses(f, drawn);
  paintNodes(f);
  paintLabels(f);
  ctx.globalAlpha = 1;
  e.grid.build(e.sx, e.sy, e.dr, (i) => e.visible[i] === 1);
}

/** Project every term: screen position, depth, drawn radius and fog. True in depth. */
function projectNodes({ e, v, c, u }: Frame): boolean {
  const cam3 = { yaw: c.yaw, pitch: c.pitch };
  const scale = c.fit * c.zoom * (v.mode === 'depth' ? 0.9 : 1);
  const ox = c.cx + c.panX;
  const oy = midY(c.h) + c.panY;
  const depth = v.mode === 'depth' || Math.abs(c.yaw) + Math.abs(c.pitch) > 1e-3;
  const focal = depth ? LAB.focal : Infinity;
  for (let i = 0; i < e.n; i++) {
    project({ x: e.wx[i], y: e.wy[i], z: e.wz[i] }, cam3, focal, u);
    e.sx[i] = ox + u.x * scale + e.ox[i];
    e.sy[i] = oy + u.y * scale + e.oy[i];
    e.sz[i] = u.z;
    e.dr[i] = Math.max(1.5, e.r[i] * scale * u.s);
    // Fog: far nodes fade towards the background (Depth only).
    e.fog[i] = depth ? 1 - 0.55 * Math.min(1, Math.max(0, (u.z + e.bound) / (2 * e.bound))) : 1;
  }
  return depth;
}

/** Search focus: glide the view so the term sits in the middle. */
function glideToFocus(e: Engine, c: Cam, v: View, now: number) {
  if (c.focus < 0) return;
  const f = c.focus;
  c.panX += (c.cx - e.sx[f]) * 0.15;
  c.panY += (midY(c.h) - e.sy[f]) * 0.15;
  if (now > c.focusUntil) c.focus = -1;
  v.dirty = true;
}

/** Draw order: back to front in Depth; small under big in Flat. */
function sortDrawOrder(e: Engine, depth: boolean) {
  const ord = e.drawOrder;
  if (depth) ord.sort((a, b) => e.sz[b] - e.sz[a]);
  else ord.sort((a, b) => e.rank[a] - e.rank[b]);
  ord.forEach((i, k) => (e.order[i] = k));
}

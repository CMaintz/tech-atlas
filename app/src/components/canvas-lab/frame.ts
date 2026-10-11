import { LAB, project, type Projected } from '../../lib/canvas-explorer';
import type { Engine } from '../../lib/canvas-explorer/engine';
import { lightSelection } from '../../lib/canvas-explorer/edges';
import { familyColours, type MapTheme } from '../../lib/graph-style';
import { midY, type Cam, type Rig, type View } from './state';
import { LAB_INK, type Ink } from './text';
import { paintEdges, paintPulses } from './paint-edges';
import { paintNodes } from './paint-nodes';
import { paintLabels } from './paint-labels';

export type Frame = Rig & {
  ctx: CanvasRenderingContext2D;
  now: number;
  sel: number;
  lit: Uint8Array;
  litEdge: Uint8Array;
  ink: Ink;
  fams: Record<string, string>;
  textWidth: (font: string, s: string) => number;
  projected: Projected;
};

export function newFrame(ctx: CanvasRenderingContext2D, rig: Rig): Frame {
  return {
    ...rig,
    ctx,
    now: 0,
    sel: -1,
    ink: LAB_INK.dark,
    fams: {},
    lit: new Uint8Array(rig.e.n),
    litEdge: new Uint8Array(rig.e.es.length),
    textWidth: cachedTextWidth(ctx),
    projected: { x: 0, y: 0, z: 0, s: 1 },
  };
}

function cachedTextWidth(ctx: CanvasRenderingContext2D) {
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

export function drawFrame(f: Frame, now: number, theme: MapTheme) {
  prepareFrame(f, now, theme);
  paintFrame(f);
}

function prepareFrame(f: Frame, now: number, theme: MapTheme) {
  const { e, v, c } = f;
  const depth = seenInDepth(v, c);
  projectNodes(f, depth);
  glideToFocus(f, now);
  sortDrawOrder(e, depth);
  f.sel = lightSelection(e, v, f);
  f.now = now;
  f.ink = LAB_INK[theme];
  f.fams = familyColours(theme) as Record<string, string>;
}

function paintFrame(f: Frame) {
  const { ctx, e, v, c } = f;
  ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
  ctx.clearRect(0, 0, c.w, c.h);
  const drawn = paintEdges(f);
  if (!v.reduced) paintPulses(f, drawn);
  paintNodes(f);
  paintLabels(f);
  ctx.globalAlpha = 1;
  e.grid.build((i) => e.visible[i] === 1);
}

const seenInDepth = (v: View, c: Cam) =>
  v.mode === 'depth' || Math.abs(c.yaw) + Math.abs(c.pitch) > 1e-3;

const depthFog = (z: number, bound: number) =>
  1 - 0.55 * Math.min(1, Math.max(0, (z + bound) / (2 * bound)));

function projectNodes({ e, v, c, projected: u }: Frame, depth: boolean) {
  const scale = c.fit * c.zoom * (v.mode === 'depth' ? 0.9 : 1);
  const cam3 = { yaw: c.yaw, pitch: c.pitch, focal: depth ? LAB.focal : Infinity };
  const ox = c.cx + c.panX;
  const oy = midY(c.h) + c.panY;
  for (let i = 0; i < e.n; i++) {
    project({ x: e.wx[i], y: e.wy[i], z: e.wz[i] }, cam3, u);
    e.sx[i] = ox + u.x * scale + e.ox[i];
    e.sy[i] = oy + u.y * scale + e.oy[i];
    e.sz[i] = u.z;
    e.dr[i] = Math.max(1.5, e.r[i] * scale * u.s);
    e.fog[i] = depth ? depthFog(u.z, e.bound) : 1;
  }
}

function glideToFocus({ e, c, v }: Rig, now: number) {
  if (c.focus < 0) return;
  const f = c.focus;
  c.panX += (c.cx - e.sx[f]) * 0.15;
  c.panY += (midY(c.h) - e.sy[f]) * 0.15;
  if (now > c.focusUntil) c.focus = -1;
  v.dirty = true;
}

function sortDrawOrder(e: Engine, depth: boolean) {
  const ord = e.drawOrder;
  if (depth) ord.sort((a, b) => e.sz[b] - e.sz[a]);
  else ord.sort((a, b) => e.rank[a] - e.rank[b]);
  ord.forEach((i, k) => (e.order[i] = k));
}

import { LAB } from '../../lib/canvas-explorer';
import type { Frame } from './frame';

const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(colour: string): HTMLCanvasElement {
  let c = glowCache.get(colour);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) throw new Error('canvas lab: no 2D context for the glow sprite');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `${colour}aa`);
  grad.addColorStop(0.35, `${colour}44`);
  grad.addColorStop(1, `${colour}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(colour, c);
  return c;
}

export function paintNodes(f: Frame) {
  for (const i of f.e.drawOrder) if (f.e.visible[i]) paintNode(f, i);
}

function paintNode(f: Frame, i: number) {
  const { e, c } = f;
  const x = e.sx[i];
  const y = e.sy[i];
  const r = e.dr[i];
  if (x < -r * 3 || x > c.w + r * 3 || y < -r * 3 || y > c.h + r * 3) return;
  const al = e.fog[i] * (f.sel < 0 || f.lit[i] ? 1 : LAB.dimAlpha);
  paintGlow(f, i, al);
  f.ctx.globalAlpha = al;
  paintDisc(f, i);
  if (i === f.sel || i === f.v.hover) paintRing(f, i);
}

function paintGlow(f: Frame, i: number, al: number) {
  const { ctx, e } = f;
  const bands = e.bands[i];
  const g = e.dr[i] * 2.6;
  ctx.globalAlpha = al * (f.sel >= 0 && f.lit[i] ? 0.8 : 0.45) * f.ink.glow;
  const sprite = glowSprite(bands.length ? bands[0] : e.fill[i]);
  ctx.drawImage(sprite, e.sx[i] - g, e.sy[i] - g, g * 2, g * 2);
}

function paintDisc(f: Frame, i: number) {
  const { ctx, e, ink } = f;
  const bands = e.bands[i];
  ctx.beginPath();
  ctx.arc(e.sx[i], e.sy[i], e.dr[i], 0, 6.2832);
  if (bands.length < 2) {
    ctx.fillStyle = e.fill[i];
    ctx.fill();
  } else paintBands(f, i);
  ctx.lineWidth = bands.length > 1 ? 1.2 : 0.8;
  ctx.strokeStyle = bands.length > 1 ? ink.ring : ink.outline;
  ctx.stroke();
}

function paintBands({ ctx, e }: Frame, i: number) {
  const [x, y, r, bands] = [e.sx[i], e.sy[i], e.dr[i], e.bands[i]];
  ctx.save();
  ctx.clip();
  const bw = (2 * r) / bands.length;
  bands.forEach((col, k) => {
    ctx.fillStyle = col;
    ctx.fillRect(x - r + k * bw - 0.5, y - r, bw + 1, 2 * r);
  });
  ctx.restore();
}

function paintRing(f: Frame, i: number) {
  const { ctx, e } = f;
  const isSel = i === f.sel;
  const pulse = isSel && !f.v.reduced ? 1.5 * Math.sin(f.now / 420) : 0;
  ctx.lineWidth = isSel ? 2 : 1.4;
  ctx.strokeStyle = isSel ? f.ink.sel : f.ink.hover;
  ctx.beginPath();
  ctx.arc(e.sx[i], e.sy[i], e.dr[i] + 4 + pulse, 0, 6.2832);
  ctx.stroke();
}

/** The canvas lab's node painter: glow, solid disc or vertical bands, outline, ring. */
import { LAB } from '../../lib/canvas-explorer';
import type { Frame } from './frame';

/** A soft radial glow per colour, drawn once and stamped with drawImage. */
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(colour: string): HTMLCanvasElement {
  let c = glowCache.get(colour);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `${colour}aa`);
  grad.addColorStop(0.35, `${colour}44`);
  grad.addColorStop(1, `${colour}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(colour, c);
  return c;
}

/** Every visible term, in draw order. */
export function paintNodes(f: Frame) {
  for (const i of f.e.drawOrder) if (f.e.visible[i]) paintNode(f, i);
}

/** One term (skipped off screen): glow, disc, thin outline, and a selection/hover ring. */
function paintNode(f: Frame, i: number) {
  const { e, c } = f;
  const [x, y, r] = [e.sx[i], e.sy[i], e.dr[i]];
  if (x < -r * 3 || x > c.w + r * 3 || y < -r * 3 || y > c.h + r * 3) return;
  const al = e.fog[i] * (f.sel < 0 || f.lit[i] ? 1 : LAB.dimAlpha);
  paintGlow(f, i, x, y, r, al);
  f.ctx.globalAlpha = al;
  paintDisc(f, i, x, y, r);
  if (i === f.sel || i === f.v.hover) paintRing(f, i, x, y, r);
}

/** The soft glow under a term (brighter when lit), in its first domain's colour. */
function paintGlow(f: Frame, i: number, x: number, y: number, r: number, al: number) {
  const { ctx, e } = f;
  const bands = e.bands[i];
  const g = r * 2.6;
  ctx.globalAlpha = al * (f.sel >= 0 && f.lit[i] ? 0.8 : 0.45) * f.ink.glow;
  ctx.drawImage(glowSprite(bands.length ? bands[0] : e.fill[i]), x - g, y - g, g * 2, g * 2);
}

/** The disc (one fill, or bands for a multi-domain term) and its thin outline or ring. */
function paintDisc({ ctx, e, ink }: Frame, i: number, x: number, y: number, r: number) {
  const bands = e.bands[i];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  if (bands.length < 2) {
    ctx.fillStyle = e.fill[i];
    ctx.fill();
  } else paintBands(ctx, x, y, r, bands);
  ctx.lineWidth = bands.length > 1 ? 1.2 : 0.8;
  ctx.strokeStyle = bands.length > 1 ? ink.ring : ink.outline;
  ctx.stroke();
}

/** Clean vertical bands (one per domain), clipped to the disc's path. */
function paintBands(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  bands: string[],
) {
  ctx.save();
  ctx.clip();
  const bw = (2 * r) / bands.length;
  bands.forEach((col, k) => {
    ctx.fillStyle = col;
    ctx.fillRect(x - r + k * bw - 0.5, y - r, bw + 1, 2 * r);
  });
  ctx.restore();
}

/** The ring round the selected (gently pulsing) or hovered term. */
function paintRing(f: Frame, i: number, x: number, y: number, r: number) {
  const { ctx } = f;
  const isSel = i === f.sel;
  const pulse = isSel && !f.v.reduced ? 1.5 * Math.sin(f.now / 420) : 0;
  ctx.lineWidth = isSel ? 2 : 1.4;
  ctx.strokeStyle = isSel ? f.ink.sel : f.ink.hover;
  ctx.beginPath();
  ctx.arc(x, y, r + 4 + pulse, 0, 6.2832);
  ctx.stroke();
}

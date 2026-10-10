import { LabelSlots, labelCandidates, type LabelBox } from '../../lib/canvas-explorer/labels';
import type { Frame } from './frame';

const BIG_FONT = '700 13px system-ui, sans-serif';
const SMALL_FONT = '600 11px system-ui, sans-serif';

const isBig = (f: Frame, i: number) => i === f.sel || i === f.v.hover;

export function paintLabels(f: Frame) {
  const { ctx, e, v } = f;
  const slots = new LabelSlots(f.c.w, f.c.h);
  const box: LabelBox = { x: 0, y: 0, r: 0, tw: 0, size: 0, big: false };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  for (const i of labelCandidates(e, { lit: f.lit, sel: f.sel, hover: v.hover })) {
    const top = slots.place(measureLabel(f, i, box));
    if (top !== undefined) paintLabel(f, i, top);
  }
}

function measureLabel(f: Frame, i: number, box: LabelBox): LabelBox {
  const { e } = f;
  box.big = isBig(f, i);
  box.size = box.big ? 13 : 11;
  box.tw = f.textWidth(box.big ? BIG_FONT : SMALL_FONT, e.names[i]);
  box.x = e.sx[i];
  box.y = e.sy[i];
  box.r = e.dr[i];
  return box;
}

function paintLabel(f: Frame, i: number, top: number) {
  const { ctx, e, ink } = f;
  const big = isBig(f, i);
  ctx.font = big ? BIG_FONT : SMALL_FONT;
  ctx.globalAlpha = e.fog[i];
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink.halo;
  ctx.strokeText(e.names[i], e.sx[i], top);
  ctx.fillStyle = big ? ink.big : ink.text;
  ctx.fillText(e.names[i], e.sx[i], top);
}

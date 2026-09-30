/** The canvas lab's (A91) label painter: priority order, collision-checked, haloed. */
import { LabelSlots, labelCandidates } from '../../lib/canvas-explorer/labels';
import type { Frame } from './frame';

/** Labels for the selection, hover, lit neighbours and hubs, where each fits. */
export function paintLabels(f: Frame) {
  const { ctx, e, v } = f;
  const slots = new LabelSlots(f.c.w, f.c.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  for (const i of labelCandidates(e, f.lit, f.sel, v.hover)) {
    const big = i === f.sel || i === v.hover;
    const size = big ? 13 : 11;
    const font = `${big ? 700 : 600} ${size}px system-ui, sans-serif`;
    const tw = f.measure(font, e.names[i]);
    const top = slots.place(e.sx[i], e.sy[i], e.dr[i], tw, size, big);
    if (top !== undefined) paintLabel(f, i, font, top, big);
  }
}

/** One label: a halo stroke under the text, fogged with its term. */
function paintLabel({ ctx, e, ink }: Frame, i: number, font: string, top: number, big: boolean) {
  ctx.font = font;
  ctx.globalAlpha = e.fog[i];
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink.halo;
  ctx.strokeText(e.names[i], e.sx[i], top);
  ctx.fillStyle = big ? ink.big : ink.text;
  ctx.fillText(e.names[i], e.sx[i], top);
}

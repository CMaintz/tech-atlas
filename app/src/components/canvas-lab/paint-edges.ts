/** The canvas lab's edge painters: batched strokes, then pulses on one-way edges. */
import { pulseAt } from '../../lib/canvas-explorer';
import { edgeBatches, pulseBatches, type EdgeBatches } from '../../lib/canvas-explorer/edges';
import type { Frame } from './frame';

const FALLBACK = '#94a3b8';

/** Edges, batched by family × alpha step × lit: one stroke per batch. */
export function paintEdges(f: Frame): EdgeBatches {
  const { ctx, e } = f;
  const drawn = edgeBatches(e, f.litEdge, f.v.showAll, f.sel >= 0);
  ctx.lineCap = 'round';
  for (const [key, list] of drawn.batches) {
    const [fam, step, hot] = key.split('|');
    ctx.globalAlpha = Number(step) / 12;
    ctx.strokeStyle = f.fams[fam] ?? FALLBACK;
    ctx.lineWidth = hot === '1' ? 1.8 : 1;
    ctx.beginPath();
    for (const k of list) {
      ctx.moveTo(e.sx[e.es[k]], e.sy[e.es[k]]);
      ctx.lineTo(e.sx[e.et[k]], e.sy[e.et[k]]);
    }
    ctx.stroke();
  }
  return drawn;
}

/** Pulses along one-way edges: source → target, slow; one fill per family and state. */
export function paintPulses(f: Frame, drawn: EdgeBatches) {
  const { ctx } = f;
  for (const [key, list] of pulseBatches(f.e, drawn, f.litEdge, f.sel >= 0)) {
    const [fam, state] = key.split('|');
    ctx.globalAlpha = state === '1' ? 1 : state === 'd' ? 0.18 : 0.75;
    ctx.fillStyle = f.fams[fam] ?? FALLBACK;
    const rad = state === '1' ? 2.4 : 1.6;
    ctx.beginPath();
    for (const k of list) pulseDot(f, k, rad);
    ctx.fill();
  }
}

/** Add edge k's pulse dot to the path (none on edges too short to show it). */
function pulseDot({ ctx, e, now }: Frame, k: number, rad: number) {
  const a = e.es[k];
  const b = e.et[k];
  const dx = e.sx[b] - e.sx[a];
  const dy = e.sy[b] - e.sy[a];
  const len = Math.hypot(dx, dy);
  if (len < e.dr[a] + e.dr[b] + 6) return;
  const t = pulseAt(now, len, e.ephase[k]);
  const x = e.sx[a] + dx * t;
  const y = e.sy[a] + dy * t;
  ctx.moveTo(x + rad, y);
  ctx.arc(x, y, rad, 0, 6.2832);
}

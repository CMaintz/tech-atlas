import { bendPoint, quadAt } from '../../../lib/explorer-lab/geometry';
import { endNode, type Lab3, type Three } from './context';

type Web = { arr: Float32Array; seg: number };

export type Bender = ReturnType<typeof createBender>;

export function createBender(ctx: Lab3) {
  const webPos = ctx.L.web.geometry.getAttribute('position') as InstanceType<
    Three['BufferAttribute']
  >;
  const seg = webPos.count / ctx.links.length / 2;
  let bentAt = 0.12;
  const bend = (k: number) => {
    if (k === bentAt) return;
    bentAt = k;
    bendAll(ctx, { arr: webPos.array as Float32Array, seg }, k);
    webPos.needsUpdate = true;
  };
  const rebend = (k: number) => {
    bentAt = NaN;
    bend(k);
  };
  return { bend, rebend };
}

function bendAll(ctx: Lab3, web: Web, k: number) {
  const { arr, seg } = web;
  ctx.links.forEach((l, i) => {
    const a = endNode(ctx, l.source);
    const b = endNode(ctx, l.target);
    const c = bendPoint(a, b, k);
    ctx.L.curve.set([a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z], i * 9);
    for (let j = 0; j < seg; j++) {
      arr.set(quadAt({ a, c, b }, j / seg), (i * seg + j) * 6);
      arr.set(quadAt({ a, c, b }, (j + 1) / seg), (i * seg + j) * 6 + 3);
    }
  });
}

export function measureLinks(ctx: Lab3) {
  const { curve, linkLength } = ctx.L;
  ctx.links.forEach((_, i) => {
    const o = i * 9;
    linkLength[i] = Math.hypot(
      curve[o + 6] - curve[o],
      curve[o + 7] - curve[o + 1],
      curve[o + 8] - curve[o + 2],
    );
  });
}

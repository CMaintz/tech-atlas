/** Link curvature in the visual lab's 3D map: re-bend the merged web and comets. */
import { bendPoint, quadAt } from '../../../lib/explorer-lab/geometry';
import { endOf, type Lab3, type Three } from './context';

export type Bender = ReturnType<typeof createBender>;

/** Bend every link by k (as explorer-3d does); a no-op when already bent by k. */
export function createBender(ctx: Lab3) {
  const webPos = ctx.L.web.geometry.getAttribute('position') as InstanceType<
    Three['BufferAttribute']
  >;
  const seg = webPos.count / ctx.links.length / 2;
  let bentAt = 0.12;
  const bend = (k: number) => {
    if (k === bentAt) return;
    bentAt = k;
    const arr = webPos.array as Float32Array;
    ctx.links.forEach((_, i) => bendLink(ctx, arr, seg, i, k));
    webPos.needsUpdate = true;
  };
  /** Bend again from the current positions (after a relayout). */
  const rebend = (k: number) => {
    bentAt = NaN;
    bend(k);
  };
  return { bend, rebend };
}

/** Link i's shared curve (start, bend, end) and its `seg` web segments. */
function bendLink(ctx: Lab3, arr: Float32Array, seg: number, i: number, k: number) {
  const l = ctx.links[i];
  const a = ctx.byId.get(endOf(l.source))!;
  const b = ctx.byId.get(endOf(l.target))!;
  const c = bendPoint(a, b, k);
  ctx.L.curve.set([a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z], i * 9);
  for (let j = 0; j < seg; j++) {
    arr.set(quadAt(a, c, b, j / seg), (i * seg + j) * 6);
    arr.set(quadAt(a, c, b, (j + 1) / seg), (i * seg + j) * 6 + 3);
  }
}

/** Each link's length along its curve, start to end (the comets wrap at it). */
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

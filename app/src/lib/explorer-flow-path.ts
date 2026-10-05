/**
 * Edge geometry for the flow dots (`explorer-flow.ts`): an edge's curve sampled as
 * Cytoscape draws it, its cumulative lengths and box, and where its dots sit at a given
 * shift along it. Pure.
 */

/** Samples per quadratic piece of an edge's curve. */
const STEPS = 8;

type Point = { x: number; y: number };
export type Box = { x1: number; y1: number; x2: number; y2: number };
export type Path = {
  /** Sampled points (x0, y0, x1, y1, …) and cumulative lengths, in model coordinates. */
  pts: number[];
  cum: number[];
  box: Box;
};

/** Cytoscape's curve through its control points: quadratic pieces joined at midpoints. */
export function sample(s: Point, cps: Point[], t: Point): number[] {
  if (!cps.length) return [s.x, s.y, t.x, t.y];
  const out: number[] = [s.x, s.y];
  let from = s;
  cps.forEach((c, i) => {
    const next = cps[i + 1];
    const to = next ? { x: (c.x + next.x) / 2, y: (c.y + next.y) / 2 } : t;
    for (let k = 1; k <= STEPS; k++) {
      const u = k / STEPS;
      const v = 1 - u;
      out.push(
        v * v * from.x + 2 * v * u * c.x + u * u * to.x,
        v * v * from.y + 2 * v * u * c.y + u * u * to.y,
      );
    }
    from = to;
  });
  return out;
}

/** A sampled curve with its cumulative lengths and bounding box. */
export function pathOf(pts: number[]): Path {
  const cum = [0];
  const box = { x1: pts[0], y1: pts[1], x2: pts[0], y2: pts[1] };
  for (let i = 2; i < pts.length; i += 2) {
    cum.push(cum[cum.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
    box.x1 = Math.min(box.x1, pts[i]);
    box.y1 = Math.min(box.y1, pts[i + 1]);
    box.x2 = Math.max(box.x2, pts[i]);
    box.y2 = Math.max(box.y2, pts[i + 1]);
  }
  return { pts, cum, box };
}

type DotAt = (x: number, y: number) => void;

/**
 * Call `at` for each dot on a path: short edges carry one dot, longer ones one per
 * `spacing`, all moved along by `shift`.
 */
export function eachDot(p: Path, shift: number, spacing: number, at: DotAt) {
  const len = p.cum[p.cum.length - 1];
  if (len < 1) return;
  const gap = len < spacing ? len : len / Math.floor(len / spacing);
  let seg = 1;
  for (let d = shift % gap; d < len; d += gap) {
    while (seg < p.cum.length - 1 && p.cum[seg] < d) seg++;
    const a = p.cum[seg - 1];
    const k = (d - a) / (p.cum[seg] - a || 1);
    at(
      p.pts[seg * 2 - 2] + (p.pts[seg * 2] - p.pts[seg * 2 - 2]) * k,
      p.pts[seg * 2 - 1] + (p.pts[seg * 2 + 1] - p.pts[seg * 2 - 1]) * k,
    );
  }
}

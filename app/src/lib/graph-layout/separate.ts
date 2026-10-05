/** Overlap removal for term positions, in 2D or 3D. */

type Pt = { x: number; y: number; z?: number };
type Offset = { dx: number; dy: number; dz: number; d: number };

/** The vector from `a` to `b` and its length (z counts as 0 where missing). */
const offset = (a: Pt, b: Pt): Offset => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = (b.z ?? 0) - (a.z ?? 0);
  return { dx, dy, dz, d: Math.sqrt(dx * dx + dy * dy + dz * dz) };
};

/** A unit direction fixed by a pair's indices, for splitting coincident points. */
const splitDirection = (i: number, j: number): Offset => {
  const t = (i * 7 + j * 13) % 360;
  return { dx: Math.cos(t), dy: Math.sin(t), dz: 0, d: 1 };
};

/**
 * Push points `i` and `j` apart to `want`, each by half the shortfall (and a hair more,
 * so a pair does not settle just under its minimum). Returns whether they moved.
 */
export function pushApart(a: Pt, b: Pt, want: number, i: number, j: number): boolean {
  const raw = offset(a, b);
  if (raw.d >= want) return false;
  const { dx, dy, dz, d } = raw.d < 1e-6 ? splitDirection(i, j) : raw;
  const k = ((want - d) / d) * 0.5 * 1.02;
  a.x -= dx * k;
  a.y -= dy * k;
  b.x += dx * k;
  b.y += dy * k;
  if (a.z !== undefined && b.z !== undefined) {
    a.z -= dz * k;
    b.z += dz * k;
  }
  return true;
}

/** One sweep over every pair; returns whether any pair moved. */
function sweep(pts: Pt[], min: (i: number, j: number) => number): boolean {
  let moved = false;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      if (pushApart(pts[i], pts[j], min(i, j), i, j)) moved = true;
  return moved;
}

/**
 * Push points apart until every pair `i`, `j` is at least `min(i, j)` apart, in
 * place, in 2D or 3D. Each sweep moves both points of a too-close pair half the
 * shortfall along the line between them; coincident points split along a fixed
 * direction, so the result is deterministic. A dense cluster grows instead of stacking
 * nodes on top of each other. O(n²) per sweep — run it per cluster, or on a few hundred
 * points.
 */
export function separate(
  pts: { x: number; y: number; z?: number }[],
  min: (i: number, j: number) => number,
  sweeps = 80,
): void {
  for (let s = 0; s < sweeps; s++) if (!sweep(pts, min)) return;
}

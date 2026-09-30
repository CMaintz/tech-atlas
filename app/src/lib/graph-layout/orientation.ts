/** Map orientation: turn a point cloud so it lies landscape. */
import type { Point } from '../graph-style';

/**
 * The rotation (radians) that lays a point cloud's long axis horizontal (principal
 * component), so a map fills a landscape screen instead of standing on end.
 */
export function levelAngle(points: Point[]): number {
  if (points.length < 2) return 0;
  const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const my = points.reduce((s, p) => s + p.y, 0) / points.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return -axis;
}

export const rotateAbout = (p: Point, c: Point, a: number): Point => ({
  x: c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a),
  y: c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a),
});

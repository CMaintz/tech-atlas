/**
 * Each link's gentle curve (A86): a quadratic bend sideways from the link, like
 * 3d-force-graph's curvature. The curves are packed nine floats a link (start, bend,
 * end) and shared by the resting web, the comets and the relationship names. Pure.
 */
import type { Point3 } from '../graph-layout';

/** How far a link bends sideways, as a share of its length. */
const BEND = 0.12;
/** Straight pieces each curve of the resting web is drawn with. */
export const SEGMENTS = 8;

export type Bend = { a: Point3; c: Point3; b: Point3 };

/** The control point bending a link a → b sideways (across the ground). */
export function bend(a: Point3, b: Point3): Bend {
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
  let sx = -(b.z - a.z);
  let sz = b.x - a.x;
  const sl = Math.hypot(sx, sz) || 1;
  sx = (sx / sl) * len * BEND;
  sz = (sz / sl) * len * BEND;
  const c = { x: (a.x + b.x) / 2 + sx, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 + sz };
  return { a, c, b };
}

/** The point at t (0–1) along a bent link. */
export function pointAt({ a, c, b }: Bend, t: number): [number, number, number] {
  const u = 1 - t;
  return [
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  ];
}

/** Every link's curve, packed, and the web's line segments along them. */
export function packCurves(bends: readonly Bend[]) {
  const curve = new Float32Array(bends.length * 9);
  const segments = new Float32Array(bends.length * SEGMENTS * 2 * 3);
  bends.forEach((k, i) => {
    curve.set([k.a.x, k.a.y, k.a.z, k.c.x, k.c.y, k.c.z, k.b.x, k.b.y, k.b.z], i * 9);
    for (let s = 0; s < SEGMENTS; s++) {
      const o = (i * SEGMENTS + s) * 6;
      segments.set(pointAt(k, s / SEGMENTS), o);
      segments.set(pointAt(k, (s + 1) / SEGMENTS), o + 3);
    }
  });
  return { curve, segments };
}

/** Each link's length, end to end (the comets wrap at it). */
export const curveLengths = (curve: Float32Array, count: number) =>
  Array.from({ length: count }, (_, i) =>
    Math.hypot(
      curve[i * 9 + 6] - curve[i * 9],
      curve[i * 9 + 7] - curve[i * 9 + 1],
      curve[i * 9 + 8] - curve[i * 9 + 2],
    ),
  );

/** Coordinate `axis` of the point at u along packed curve `i`. */
export function packedAt(curve: Float32Array, i: number, u: number, axis: number) {
  const o = i * 9 + axis;
  const v = 1 - u;
  return v * v * curve[o] + 2 * v * u * curve[o + 3] + u * u * curve[o + 6];
}

/** The curve's midpoint: a quarter of each end and half of the bend. */
export function midpoint(curve: Float32Array, i: number): [number, number, number] {
  const o = i * 9;
  const at = (a: number) => 0.25 * curve[o + a] + 0.5 * curve[o + 3 + a] + 0.25 * curve[o + 6 + a];
  return [at(0), at(1), at(2)];
}

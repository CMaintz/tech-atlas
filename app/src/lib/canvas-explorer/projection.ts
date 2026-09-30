/** The canvas lab's (A91) "fake 3D": rotate a world point and apply a simple perspective. */
import type { Vec3 } from './config';

export type Camera = { yaw: number; pitch: number };
export type Projected = { x: number; y: number; z: number; s: number };

/**
 * Rotate a world point by yaw (about y) then pitch (about x) and apply a simple
 * perspective: `s` = focal / (focal + depth). yaw = pitch = 0 with `focal` = Infinity is
 * the flat front view (x, y unchanged, s = 1). `out` is reused to avoid allocation.
 */
export function project(
  p: Vec3,
  cam: Camera,
  focal: number,
  out: Projected = { x: 0, y: 0, z: 0, s: 1 },
): Projected {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const x1 = p.x * cy - p.z * sy;
  const z1 = p.x * sy + p.z * cy;
  const y1 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const s = Number.isFinite(focal) ? focal / Math.max(focal * 0.1, focal + z2) : 1;
  return Object.assign(out, { x: x1 * s, y: y1 * s, z: z2, s });
}

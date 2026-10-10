import type { Vec3 } from './config';

export type Camera = { yaw: number; pitch: number; focal: number };
export type Projected = { x: number; y: number; z: number; s: number };

export function project(
  p: Vec3,
  cam: Camera,
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
  const { focal } = cam;
  const s = Number.isFinite(focal) ? focal / Math.max(focal * 0.1, focal + z2) : 1;
  return Object.assign(out, { x: x1 * s, y: y1 * s, z: z2, s });
}

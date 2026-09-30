import { describe, expect, it } from 'vitest';
import { separate } from '../graph-layout';
import { pushApart } from './separate';

const gap = (p: { x: number; y: number; z?: number }, q: typeof p) =>
  Math.hypot(p.x - q.x, p.y - q.y, (p.z ?? 0) - (q.z ?? 0));

describe('separate', () => {
  it('pushes every pair at least their minimum distance apart', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 60;
    const pts = Array.from({ length: 60 }, () => ({ x: rnd(), y: rnd() }));
    const min = (i: number, j: number) => 20 + (i % 3) + (j % 3);
    separate(pts, min);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(gap(pts[i], pts[j])).toBeGreaterThanOrEqual(min(i, j) - 0.5);
  });
  it('works in 3D and splits coincident points deterministically', () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    separate(pts, () => 10);
    expect(gap(pts[0], pts[1])).toBeGreaterThanOrEqual(9.5);
    expect(gap(pts[1], pts[2])).toBeGreaterThanOrEqual(9.5);
  });
  it('leaves points that are already apart where they are', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    separate(pts, () => 10);
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });
});

describe('pushApart', () => {
  it('moves a too-close pair symmetrically, a hair past the minimum', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 4, y: 0 };
    expect(pushApart(a, b, 10, 0, 1)).toBe(true);
    expect(a.x).toBeCloseTo(-3.06);
    expect(b.x).toBeCloseTo(7.06);
    expect(a.y).toBe(0);
  });
  it('reports no move for a pair already far enough apart', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 10 };
    expect(pushApart(a, b, 10, 0, 1)).toBe(false);
    expect(b).toEqual({ x: 0, y: 0, z: 10 });
  });
  it('moves z only when both points have one', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 1 };
    pushApart(a, b, 10, 0, 1);
    expect(a.z).toBeLessThan(0);
    const flat = { x: 0, y: 0 };
    pushApart(flat, b, 20, 0, 1);
    expect(flat).not.toHaveProperty('z');
  });
});

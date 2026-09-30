import { describe, expect, it } from 'vitest';
import { SEGMENTS, bend, curveLengths, midpoint, packCurves, packedAt, pointAt } from './curves';

const a = { x: 0, y: 0, z: 0 };
const b = { x: 100, y: 20, z: 0 };

describe('bend', () => {
  it('bends a link sideways across the ground by 12% of its length', () => {
    const { c } = bend(a, b);
    const len = Math.hypot(100, 20);
    expect(c.x).toBeCloseTo(50);
    expect(c.y).toBeCloseTo(10);
    expect(c.z).toBeCloseTo(len * 0.12);
  });
  it('keeps a vertical link straight rather than failing', () => {
    const { c } = bend(a, { x: 0, y: 50, z: 0 });
    expect(c).toEqual({ x: 0, y: 25, z: 0 });
  });
});

describe('pointAt / packedAt / midpoint', () => {
  const k = bend(a, b);
  const { curve, segments } = packCurves([k, bend(b, a)]);
  it('runs from the start to the end through the bend', () => {
    expect(pointAt(k, 0)).toEqual([0, 0, 0]);
    expect(pointAt(k, 1)).toEqual([100, 20, 0]);
  });
  it('reads the same curve back from the packed floats', () => {
    for (const u of [0, 0.3, 1])
      for (let axis = 0; axis < 3; axis++)
        expect(packedAt(curve, 0, u, axis)).toBeCloseTo(pointAt(k, u)[axis], 3);
  });
  it('puts the midpoint at t = ½', () => {
    midpoint(curve, 0).forEach((v, axis) => expect(v).toBeCloseTo(pointAt(k, 0.5)[axis], 3));
  });
  it('packs nine floats a curve and joined segments for the web', () => {
    expect(curve).toHaveLength(18);
    expect(segments).toHaveLength(2 * SEGMENTS * 6);
    // Each segment starts where the last one ended.
    expect([...segments.slice(3, 6)]).toEqual([...segments.slice(6, 9)]);
  });
  it('measures each link end to end', () => {
    const [first, second] = curveLengths(curve, 2);
    expect(first).toBeCloseTo(Math.hypot(100, 20), 3);
    expect(second).toBeCloseTo(first, 6);
  });
});

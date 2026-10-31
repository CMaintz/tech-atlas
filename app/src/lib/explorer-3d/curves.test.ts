import { describe, expect, it } from 'vitest';
import { SEGMENTS, bend, curveLengths, curveOf, midpoint, packCurves, packedAt } from './curves';

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

describe('the web segments / packedAt / midpoint', () => {
  const { curve, segments } = packCurves([bend(a, b), bend(b, a)]);
  /** The first link's web point at t = s / SEGMENTS (the last segment's end for t = 1). */
  const web = (s: number) => {
    const o = s < SEGMENTS ? s * 6 : s * 6 - 3;
    return [...segments.slice(o, o + 3)];
  };
  it('runs from the start to the end through the bend', () => {
    expect(web(0)).toEqual([0, 0, 0]);
    expect(web(SEGMENTS)).toEqual([100, 20, 0]);
  });
  it('reads the same curve back from the packed floats', () => {
    for (const s of [0, 3, SEGMENTS])
      for (let axis = 0; axis < 3; axis++)
        expect(packedAt(curveOf(curve, 0), s / SEGMENTS, axis)).toBeCloseTo(web(s)[axis], 3);
  });
  it('puts the midpoint at t = ½', () => {
    midpoint(curve, 0).forEach((v, axis) => expect(v).toBeCloseTo(web(SEGMENTS / 2)[axis], 3));
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

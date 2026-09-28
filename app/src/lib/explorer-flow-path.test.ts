import { describe, expect, it } from 'vitest';
import { eachDot, pathOf, sample } from './explorer-flow-path';

const dots = (pts: number[], shift: number, spacing: number) => {
  const out: [number, number][] = [];
  eachDot(pathOf(pts), shift, spacing, (x, y) => out.push([x, y]));
  return out;
};

describe('sample', () => {
  it('is the straight segment without control points', () => {
    expect(sample({ x: 0, y: 0 }, [], { x: 10, y: 5 })).toEqual([0, 0, 10, 5]);
  });
  it('follows one quadratic piece through a control point', () => {
    const pts = sample({ x: 0, y: 0 }, [{ x: 50, y: 100 }], { x: 100, y: 0 });
    expect(pts).toHaveLength(2 + 8 * 2);
    expect(pts.slice(-2)).toEqual([100, 0]);
    // Halfway along a quadratic Bézier: a quarter start, half control, a quarter end.
    expect(pts.slice(8, 10)).toEqual([50, 50]);
  });
  it('joins pieces at the midpoints between control points', () => {
    const pts = sample(
      { x: 0, y: 0 },
      [
        { x: 0, y: 10 },
        { x: 10, y: 10 },
      ],
      { x: 10, y: 0 },
    );
    expect(pts).toHaveLength(2 + 2 * 8 * 2);
    expect(pts.slice(16, 18)).toEqual([5, 10]);
  });
});

describe('pathOf', () => {
  it('measures cumulative length and the bounding box', () => {
    const p = pathOf([0, 0, 3, 4, 3, -2]);
    expect(p.cum).toEqual([0, 5, 11]);
    expect(p.box).toEqual({ x1: 0, y1: -2, x2: 3, y2: 4 });
  });
});

describe('eachDot', () => {
  it('puts one dot per spacing along a long edge, shifted', () => {
    expect(dots([0, 0, 100, 0], 0, 25)).toEqual([
      [0, 0],
      [25, 0],
      [50, 0],
      [75, 0],
    ]);
    expect(dots([0, 0, 100, 0], 10, 25).map(([x]) => x)).toEqual([10, 35, 60, 85]);
  });
  it('evens the gap out and gives a short edge one dot', () => {
    expect(dots([0, 0, 90, 0], 0, 40).map(([x]) => x)).toEqual([0, 45]);
    expect(dots([0, 0, 10, 0], 4, 40)).toEqual([[4, 0]]);
  });
  it('walks bent paths segment by segment; a point-like edge has none', () => {
    expect(dots([0, 0, 10, 0, 10, 10], 5, 10)).toEqual([
      [5, 0],
      [10, 5],
    ]);
    expect(dots([0, 0, 0.5, 0], 0, 10)).toEqual([]);
  });
});

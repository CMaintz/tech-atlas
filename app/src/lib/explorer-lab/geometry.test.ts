import { describe, expect, it } from 'vitest';
import { bendPoint, centroid, groupIndices, quadAt, subClusters } from './geometry';

describe('visual lab 3D geometry', () => {
  const a = { x: 0, y: 0, z: 0 };
  const b = { x: 10, y: 0, z: 0 };
  it('bends a link sideways in the ground plane by k × its length', () => {
    expect(bendPoint(a, b, 0)).toEqual({ x: 5, y: 0, z: 0 });
    expect(bendPoint(a, b, 0.5)).toEqual({ x: 5, y: 0, z: 5 });
  });
  it('walks the quadratic curve from start to end through the bend', () => {
    const c = { x: 5, y: 0, z: 5 };
    expect(quadAt(a, c, b, 0)).toEqual([0, 0, 0]);
    expect(quadAt(a, c, b, 1)).toEqual([10, 0, 0]);
    expect(quadAt(a, c, b, 0.5)).toEqual([5, 0, 2.5]);
  });
  it('groups indices by key and averages them', () => {
    expect([...groupIndices(['x', 'y', 'x'], (s) => s)]).toEqual([
      ['x', [0, 2]],
      ['y', [1]],
    ]);
    expect(centroid([0, 1], [a, b])).toEqual({ x: 5, y: 0, z: 0 });
  });
  it('pushes clusters out from their domain centre and draws each in', () => {
    const orig = [a, { x: 2, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, b];
    const ps = orig.map((p) => ({ ...p }));
    const clusters = new Map([
      ['left', [0, 1]],
      ['right', [2, 3]],
    ]);
    subClusters(ps, orig, clusters, new Map([['d', [0, 1, 2, 3]]]), () => 'd', {
      spread: 2,
      tight: 0.5,
    });
    expect(ps.map((p) => p.x)).toEqual([-3.5, -2.5, 12.5, 13.5]);
  });
});

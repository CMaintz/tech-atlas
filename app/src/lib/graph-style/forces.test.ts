import { describe, expect, it } from 'vitest';
import { clusterForce, idealEdgeLength } from '../graph-style';

describe('idealEdgeLength', () => {
  it('is shortest within a cluster and longest across domains', () => {
    const a = { domain: ['security'], cluster: 'controls' };
    const b = { domain: ['security'], cluster: 'compliance' };
    const c = { domain: ['cs'], cluster: 'networking' };
    expect(idealEdgeLength(a, a)).toBeLessThan(idealEdgeLength(a, b));
    expect(idealEdgeLength(a, b)).toBeLessThan(idealEdgeLength(a, c));
  });
});

describe('clusterForce', () => {
  it('pulls nodes towards their cluster centre in x and z only', () => {
    const nodes = [
      { cluster: 'a', x: 0, z: 0, vx: 0, vz: 0 },
      { cluster: 'a', x: 10, z: 20, vx: 0, vz: 0 },
      { cluster: 'b', x: 100, z: 100, vx: 0, vz: 0 },
    ];
    const f = clusterForce(0.1);
    f.initialize(nodes);
    f(1);
    expect(nodes[0].vx).toBeCloseTo(0.5);
    expect(nodes[0].vz).toBeCloseTo(1);
    expect(nodes[1].vx).toBeCloseTo(-0.5);
    // A lone node has nothing to gather towards.
    expect(nodes[2].vx).toBe(0);
  });
});

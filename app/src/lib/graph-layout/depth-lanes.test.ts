import { describe, expect, it } from 'vitest';
import { depthLanes } from '../graph-layout';
import { neighbourMap } from './depth-lanes';
import { term } from './test-fixtures';

describe('depthLanes', () => {
  const nodes = [
    term('s0', 'security', 'fundamentals', 0),
    term('s1', 'security', 'fundamentals', 1),
    term('c0', 'cs', 'networking', 0),
    term('c1', 'cs', 'networking', 1),
    term('c2', 'cs', 'networking', 1),
  ];
  const { positions, lanes, ticks } = depthLanes(nodes, [{ source: 'c2', target: 'c0' }]);
  it('puts foundations at the bottom, one lane per domain, rows shared across lanes', () => {
    expect(positions.s1.y).toBeLessThan(positions.s0.y);
    expect(positions.s0.y).toBe(positions.c0.y);
    expect(positions.s1.y).toBe(positions.c1.y);
    expect(lanes.map((l) => l.domain)).toEqual(['security', 'cs']);
    expect(Math.max(positions.s0.x, positions.s1.x)).toBeLessThan(
      Math.min(positions.c0.x, positions.c1.x, positions.c2.x),
    );
    expect(ticks.map((t) => t.label)).toEqual(['0', '1']);
  });
  it('wraps long rows so a lane stays compact', () => {
    const many = Array.from({ length: 60 }, (_, i) => term(`t${i}`, 'ai', 'llm', 0));
    const p = depthLanes(many, []).positions;
    const ys = new Set(Object.values(p).map((q) => q.y));
    expect(ys.size).toBeGreaterThan(1);
    const xs = Object.values(p).map((q) => q.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(60 * 48);
  });
  it('is deterministic', () => {
    expect(depthLanes(nodes, [])).toEqual(depthLanes([...nodes].reverse(), []));
  });
});

describe('neighbourMap', () => {
  it('links both ends and ignores links to unknown terms', () => {
    const nodes = [term('a', 'cs', 'web'), term('b', 'cs', 'web'), term('c', 'cs', 'web')];
    const near = neighbourMap(nodes, [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'ghost' },
      { source: 'c', target: 'a' },
    ]);
    expect(Object.fromEntries(near)).toEqual({ a: ['b', 'c'], b: ['a'], c: ['a'] });
  });
});

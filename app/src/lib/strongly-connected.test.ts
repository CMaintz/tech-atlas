import { describe, expect, it } from 'vitest';
import { stronglyConnected } from './strongly-connected';

const graph = (edges: Record<string, string[]>) => (id: string) => edges[id] ?? [];
const sorted = (cs: string[][]) =>
  cs.map((c) => [...c].sort()).sort((a, b) => a[0].localeCompare(b[0]));

describe('stronglyConnected', () => {
  it('finds loops and leaves every other node on its own', () => {
    const next = graph({ a: ['b'], b: ['c'], c: ['a', 'd'], d: ['e'], e: ['d'], f: ['a'] });
    expect(sorted(stronglyConnected(['a', 'b', 'c', 'd', 'e', 'f'], next))).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
      ['f'],
    ]);
  });

  it('completes a component only after everything it reaches', () => {
    const next = graph({ a: ['b'], b: ['a', 'c'], c: [] });
    expect(stronglyConnected(['a', 'b', 'c'], next)).toEqual([['c'], ['b', 'a']]);
  });

  it('survives a chain far deeper than the call stack', () => {
    const n = 50_000;
    const next = (id: string) => (Number(id) < n ? [String(Number(id) + 1)] : ['0']);
    const nodes = Array.from({ length: n + 1 }, (_, i) => String(i));
    expect(stronglyConnected(nodes, next)).toHaveLength(1);
  });
});

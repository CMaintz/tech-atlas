import { describe, expect, it } from 'vitest';
import { buildGraph, type ModelTerm } from './graph-model';
import {
  closure,
  edgesOf,
  ends,
  indexGraph,
  kin,
  mentioned,
  neighbours,
  relatives,
} from './quiz-graph';

const term = (id: string, edges: ModelTerm['edges'] = {}): ModelTerm => ({
  id,
  term: { en: id, da: id },
  domain: ['security'],
  cluster: 'c',
  summary: { en: `summary of ${id}`, da: `resumé af ${id}` },
  edges,
});

const graph = buildGraph([
  term('a', { requires: ['b'] }),
  term('b', { requires: ['c'] }),
  term('c'),
  term('d', { 'kind-of': ['a'], 'contrasts-with': ['e'] }),
  term('e'),
]);
// e's prose names c (mentions are otherwise found by linking prose to names).
graph.nodes.find((n) => n.id === 'e')!.mentions = ['c'];
const g = indexGraph(graph);

describe('indexGraph', () => {
  it('sees each edge from both ends', () => {
    expect(edgesOf(g, 'b')).toEqual(
      expect.arrayContaining([
        { type: 'requires', dir: 'in', other: 'a' },
        { type: 'requires', dir: 'out', other: 'c' },
      ]),
    );
    expect(edgesOf(g, 'nope')).toEqual([]);
  });

  it('keeps a direction apart, except for symmetric types', () => {
    expect(ends(g, 'b', 'requires', 'out')).toEqual(['c']);
    expect(ends(g, 'b', 'requires', 'in')).toEqual(['a']);
    expect(ends(g, 'e', 'contrasts-with', 'out')).toEqual(['d']);
  });

  it('collects neighbours whatever the edge', () => {
    expect([...neighbours(g, 'a')].sort()).toEqual(['b', 'd']);
  });
});

describe('what counts as related', () => {
  it('follows a chain to everything also right, never back to the start', () => {
    expect([...closure(g, 'a', 'requires', 'out')].sort()).toEqual(['b', 'c']);
    expect([...closure(g, 'c', 'requires', 'in')].sort()).toEqual(['a', 'b']);
  });

  it('treats structural relatives as kin, and confusable terms too', () => {
    expect(relatives(g, 'd')).toEqual(['a']);
    expect(kin(g, 'd').sort()).toEqual(['a', 'e']);
  });

  it('counts a prose mention either way', () => {
    expect(mentioned(g, 'e')).toContain('c');
    expect(mentioned(g, 'c')).toContain('e');
  });
});

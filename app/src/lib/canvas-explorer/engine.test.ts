import { describe, expect, it } from 'vitest';
import type { Graph } from '../graph-model';
import { buildEngine } from './engine';
import { edgeAlpha, edgeBatches, lightSelection, pulseBatches } from './edges';
import { LAB } from './config';

const node = (id: string, cluster: string, depth: number) => ({
  id,
  cluster,
  domain: ['cs'],
  depth,
  term: { en: id, da: id },
});
// A small chain a–b–c–d plus a one-way link a→c and a link to a missing term.
const graph = {
  nodes: [node('a', 'c1', 0), node('b', 'c1', 1), node('c', 'c1', 2), node('d', 'c2', 0)],
  links: [
    { source: 'a', target: 'b', type: 'used-with', family: 'association', weight: 1 },
    { source: 'b', target: 'c', type: 'used-with', family: 'association', weight: 1 },
    { source: 'c', target: 'd', type: 'used-with', family: 'association', weight: 1 },
    { source: 'a', target: 'c', type: 'requires', family: 'dependency', weight: 2 },
    { source: 'a', target: 'zz', type: 'requires', family: 'dependency', weight: 2 },
  ],
} as unknown as Graph;

describe('buildEngine', () => {
  const e = buildEngine(graph);
  it('keeps only links between known terms, with ends, direction and adjacency', () => {
    expect(e.n).toBe(4);
    expect([...e.es]).toEqual([0, 1, 2, 0]);
    expect([...e.et]).toEqual([1, 2, 3, 2]);
    expect([...e.edir]).toEqual([0, 0, 0, 1]);
    expect(e.adj[0]).toEqual([0, 3]);
    expect(e.adj[2]).toEqual([1, 2, 3]);
  });
  it('puts every requires link on the backbone and measures the world', () => {
    expect(e.eback[3]).toBe(1);
    expect(e.span.w).toBeGreaterThan(0);
    expect(e.bound).toBeGreaterThan(0);
    expect(e.drawOrder).toEqual([0, 1, 2, 3]);
  });
});

describe('edge alpha and batches', () => {
  const e = { ...buildEngine(graph), famAlpha: new Map([['association', 1]]) };
  const none = new Uint8Array(4);
  it('draws backbone edges at rest, others only with "all"', () => {
    expect(edgeAlpha(e, 3, false, false, false)).toBeCloseTo(0.38);
    e.eback[0] = 0;
    expect(edgeAlpha(e, 0, false, false, false)).toBeUndefined();
    expect(edgeAlpha(e, 0, false, true, false)).toBeCloseTo(0.2);
  });
  it('dims unlit edges beside a selection and hides faded families', () => {
    expect(edgeAlpha(e, 3, false, false, true)).toBeCloseTo(0.38 * LAB.dimAlpha);
    expect(edgeAlpha(e, 3, true, false, true)).toBeCloseTo(0.95);
    e.famAlpha.set('dependency', 0);
    expect(edgeAlpha(e, 3, false, false, false)).toBeUndefined();
    e.famAlpha.delete('dependency');
  });
  it('batches by family, alpha step and lit; pulses only one-way edges', () => {
    const drawn = edgeBatches(e, none, false, false);
    expect(drawn.batches.get('dependency|5|0')).toEqual([3]);
    expect(drawn.alpha[3]).toBeCloseTo(0.38);
    expect([...pulseBatches(e, drawn, none, false)]).toEqual([['dependency|0', [3]]]);
  });
});

describe('lightSelection', () => {
  const e = buildEngine(graph);
  const lit = new Uint8Array(4);
  const litEdge = new Uint8Array(4);
  it('lights the term, its neighbours over enabled families, and those edges', () => {
    expect(lightSelection(e, 0, new Set(['association']), lit, litEdge)).toBe(0);
    expect([...lit]).toEqual([1, 1, 0, 0]);
    expect([...litEdge]).toEqual([1, 0, 0, 0]);
  });
  it('lights nothing for a hidden or no selection', () => {
    e.visible[0] = 0;
    expect(lightSelection(e, 0, new Set(['association']), lit, litEdge)).toBe(-1);
    expect([...lit, ...litEdge].every((x) => x === 0)).toBe(true);
  });
});
